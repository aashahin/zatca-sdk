// file: src/lib/egs/invoice-signer.ts
// ZATCA SDK - Invoice signing pipeline
//
// Order of operations matters:
// 1. Build the COMPLETE document (QR placeholder + cac:Signature scaffolding).
// 2. Hash it with the validator's semantics (strip UBLExtensions/Signature/QR,
//    canonicalize, SHA-256). The scaffolding is part of the document, so the
//    whitespace the validator sees is exactly what we hashed.
// 3. Sign the hash, build UBLExtensions, insert it hash-neutrally.
// 4. Fill in the QR payload (excluded from the hash by the transforms).
// 5. Self-check: re-hash the FINAL document and verify the ECDSA signature —
//    a signing bug fails here instead of at ZATCA.

import { derivePublicPoint, resolvePreviousInvoiceHash, verifyInvoiceSignature } from "../crypto/signing";
import {
    formatAmount,
    formatQrTimestamp,
    generateQRDataURL,
    generateTLVString,
} from "../crypto/qr";
import { buildInvoiceXml, replaceQrPlaceholder } from "../xml/builder";
import { computeInvoiceHash as hashInvoiceDocument } from "../xml/canonicalize";
import { createUBLExtensions, insertUBLExtensions } from "../xml/xades";
import { SigningError, ValidationError } from "../errors";
import type { DocumentAllowance, Invoice, InvoiceLine, Result, SignedInvoiceData, TaxSubtotal } from "../types";

export interface SignedInvoice {
    /** Complete signed XML, ready for submission */
    signedXml: string;
    /** Base64 invoice hash (API invoiceHash field; PIH for the next invoice) */
    invoiceHash: string;
    /** Invoice UUID */
    uuid: string;
    /** Base64 of signedXml (API invoice field) */
    invoiceBase64: string;
    /** TLV QR payload (base64) — also embedded in the XML */
    qrTlvBase64: string;
    /** QR rendered as a PNG data URL (omitted if rendering fails) */
    qrDataUrl?: string;
}

export interface SignerCredentials {
    /** Certificate: PEM, base64 DER body, or ZATCA binarySecurityToken */
    certificate: string;
    /** Private key: PKCS#8/SEC1 PEM or bare base64 body */
    privateKey: string;
}

export interface SignerConfig {
    credentials: SignerCredentials;
    /** PIH override; defaults to invoice.previousInvoiceHash, then the initial hash */
    previousInvoiceHash?: string;
    /** Fixed signing time (reproducible tests) */
    signingTime?: string;
    /** Skip PNG rendering of the QR (payload is still embedded in the XML) */
    skipQrImage?: boolean;
    /**
     * Allow the certificate's public key to differ from the signing key.
     * ONLY valid on the developer sandbox, whose CSID endpoints return a
     * canned certificate that never matches your CSR. On simulation and
     * production a mismatch means ZATCA WILL reject the signature.
     */
    allowCertificateKeyMismatch?: boolean;
}

/**
 * Sign an invoice and produce all submission artifacts.
 */
export async function signInvoice(
    invoice: Invoice,
    config: SignerConfig,
): Promise<Result<SignedInvoice>> {
    const prepared: Invoice = {
        ...invoice,
        previousInvoiceHash: resolvePreviousInvoiceHash(
            config.previousInvoiceHash,
            invoice.previousInvoiceHash,
        ),
    };

    const validationErrors = validateInvoice(prepared);
    if (validationErrors.length > 0) {
        return {
            success: false,
            error: ValidationError.fromFields(
                validationErrors.map((message) => ({ field: "invoice", message })),
            ),
        };
    }

    // 1. Assemble the full document (QR placeholder + signature scaffolding)
    const xmlResult = buildInvoiceXml(prepared);
    if (!xmlResult.success) return xmlResult;
    const assembledXml = xmlResult.data;

    // 2. Invoice hash — computed exactly as the validator will recompute it
    const hashResult = hashInvoiceDocument(assembledXml);
    if (!hashResult.success) return hashResult;
    const invoiceHash = hashResult.data;

    // 3. Signature envelope
    const xadesResult = createUBLExtensions(invoiceHash, {
        privateKey: config.credentials.privateKey,
        certificate: config.credentials.certificate,
        signingTime: config.signingTime,
    });
    if (!xadesResult.success) return xadesResult;
    const { ublExtensions, signatureValue, certificate } = xadesResult.data;

    const withExtensions = insertUBLExtensions(assembledXml, ublExtensions);
    if (!withExtensions.success) return withExtensions;

    // 4. QR payload
    const qrData: SignedInvoiceData = {
        sellerName: prepared.seller.registrationName,
        vatNumber: prepared.seller.vatNumber ?? "",
        timestamp: formatQrTimestamp(prepared.issueDate, prepared.issueTime),
        invoiceTotal: formatAmount(prepared.taxInclusiveAmount),
        vatTotal: formatAmount(prepared.taxTotal),
        invoiceHash,
        digitalSignature: signatureValue,
        publicKey: certificate.publicKeyBase64,
        certificateSignature: certificate.signature.toString("base64"),
    };
    let qrTlvBase64: string;
    try {
        qrTlvBase64 = generateTLVString(qrData);
    } catch (error) {
        return {
            success: false,
            error: new SigningError(
                `QR encoding failed: ${error instanceof Error ? error.message : "Unknown"}`,
                "signInvoice",
            ),
        };
    }

    const finalResult = replaceQrPlaceholder(withExtensions.data, qrTlvBase64);
    if (!finalResult.success) return finalResult;
    const signedXml = finalResult.data;

    // 5. Self-checks — never emit an invoice the validator would reject
    const finalHash = hashInvoiceDocument(signedXml);
    if (!finalHash.success) return finalHash;
    if (finalHash.data !== invoiceHash) {
        return {
            success: false,
            error: new SigningError(
                `Post-signing hash mismatch: signed=${invoiceHash} final=${finalHash.data}. ` +
                    "The signature insertion changed the hashed byte stream — this is an SDK bug.",
                "signInvoice",
            ),
        };
    }
    if (!verifyInvoiceSignature(invoiceHash, signatureValue, derivePublicPoint(config.credentials.privateKey))) {
        return {
            success: false,
            error: new SigningError(
                "Post-signing signature verification failed — the produced signature is invalid.",
                "signInvoice",
            ),
        };
    }
    const certMatchesKey = verifyInvoiceSignature(invoiceHash, signatureValue, certificate.publicPoint);
    if (!certMatchesKey && !config.allowCertificateKeyMismatch) {
        return {
            success: false,
            error: new SigningError(
                "The signing certificate's public key does not match the private key — ZATCA will reject this signature. " +
                    "(On the developer sandbox this is expected — its CSID endpoints return a canned certificate; " +
                    "set allowCertificateKeyMismatch: true there.)",
                "signInvoice",
            ),
        };
    }

    const result: SignedInvoice = {
        signedXml,
        invoiceHash,
        uuid: prepared.uuid,
        invoiceBase64: Buffer.from(signedXml, "utf8").toString("base64"),
        qrTlvBase64,
    };

    if (!config.skipQrImage) {
        const qrImage = await generateQRDataURL(qrTlvBase64);
        if (qrImage.success) result.qrDataUrl = qrImage.data;
    }

    return { success: true, data: result };
}

/**
 * Compute the hash an invoice WOULD get when signed (e.g. to pre-compute a
 * PIH chain). Uses the same assembled-document semantics as signInvoice.
 */
export function computeInvoiceHash(invoice: Invoice): Result<string> {
    const xmlResult = buildInvoiceXml({
        ...invoice,
        previousInvoiceHash: resolvePreviousInvoiceHash(invoice.previousInvoiceHash),
    });
    if (!xmlResult.success) return xmlResult;
    return hashInvoiceDocument(xmlResult.data);
}

// ============================================================================
// Validation
// ============================================================================

const AMOUNT_TOLERANCE = 0.011;

function isFiniteNumber(n: unknown): n is number {
    return typeof n === "number" && Number.isFinite(n);
}

function isZeroRateCategory(category: string | undefined): boolean {
    return category === "Z" || category === "E" || category === "O";
}

function offBy(a: number, b: number): boolean {
    if (!isFiniteNumber(a) || !isFiniteNumber(b)) return true;
    return Math.abs(a - b) > AMOUNT_TOLERANCE;
}

function requireFiniteAmount(
    value: unknown,
    label: string,
    errors: string[],
    bounds: { min?: number; max?: number } = {},
): boolean {
    if (!isFiniteNumber(value)) {
        errors.push(`${label} must be a finite number`);
        return false;
    }
    if (bounds.min !== undefined && value < bounds.min) {
        errors.push(`${label} must be >= ${bounds.min}`);
        return false;
    }
    if (bounds.max !== undefined && value > bounds.max) {
        errors.push(`${label} must be <= ${bounds.max}`);
        return false;
    }
    return true;
}

function pushLineErrors(line: InvoiceLine, errors: string[]): void {
    const prefix = `Line ${line.id ?? "?"}`;
    if (!isFiniteNumber(line.quantity) || line.quantity < 0) {
        errors.push(`${prefix}: quantity must be a finite number >= 0`);
    }
    if (!isFiniteNumber(line.unitPrice) || line.unitPrice < 0) {
        errors.push(`${prefix}: unitPrice must be a finite number >= 0`);
    }
    if (!isFiniteNumber(line.lineTotal) || line.lineTotal < 0) {
        errors.push(`${prefix}: lineTotal must be a finite number >= 0`);
    }
    if (!isFiniteNumber(line.vatAmount) || line.vatAmount < 0) {
        errors.push(`${prefix}: vatAmount must be a finite number >= 0`);
    }
    if (!isFiniteNumber(line.vatPercent) || line.vatPercent < 0 || line.vatPercent > 100) {
        errors.push(`${prefix}: vatPercent must be 0-100`);
    }
    if (line.discount !== undefined && (!isFiniteNumber(line.discount) || line.discount < 0)) {
        errors.push(`${prefix}: discount must be a finite number >= 0`);
    }
    if (isFiniteNumber(line.quantity) && isFiniteNumber(line.unitPrice) && isFiniteNumber(line.discount ?? 0) && isFiniteNumber(line.lineTotal)) {
        if ((line.discount ?? 0) > line.quantity * line.unitPrice + 1e-9) {
            errors.push(`${prefix}: discount ${line.discount} exceeds quantity×unitPrice (${(line.quantity * line.unitPrice).toFixed(2)})`);
        }
        const expectedNet = line.quantity * line.unitPrice - (line.discount ?? 0);
        if (offBy(expectedNet, line.lineTotal)) {
            errors.push(`${prefix}: lineTotal ${line.lineTotal} ≠ quantity×unitPrice−discount (${expectedNet.toFixed(2)})`);
        }
    }
    if (isFiniteNumber(line.lineTotal) && isFiniteNumber(line.vatPercent) && isFiniteNumber(line.vatAmount)) {
        if (isZeroRateCategory(line.vatCategory) && line.vatPercent !== 0) {
            errors.push(`${prefix}: vatPercent must be 0 for VAT category ${line.vatCategory}`);
        }
        if (line.vatCategory === "S" && line.vatPercent === 0) {
            errors.push(`${prefix}: vatPercent must be > 0 for standard-rated category S`);
        }
        const expectedVat = (line.lineTotal * line.vatPercent) / 100;
        if (offBy(expectedVat, line.vatAmount)) {
            errors.push(`${prefix}: vatAmount ${line.vatAmount} ≠ lineTotal×vatPercent (${expectedVat.toFixed(2)})`);
        }
    }
}

function pushTaxSubtotalErrors(subtotals: TaxSubtotal[] | undefined, errors: string[]): void {
    if (!subtotals || subtotals.length === 0) {
        errors.push("At least one taxSubtotal is required");
        return;
    }
    for (const [idx, subtotal] of subtotals.entries()) {
        const label = `taxSubtotal[${idx}]`;
        requireFiniteAmount(subtotal.taxableAmount, `${label}.taxableAmount`, errors, { min: 0 });
        requireFiniteAmount(subtotal.taxAmount, `${label}.taxAmount`, errors, { min: 0 });
        requireFiniteAmount(subtotal.taxPercent, `${label}.taxPercent`, errors, { min: 0, max: 100 });
        if (isZeroRateCategory(subtotal.taxCategory)) {
            if (subtotal.taxPercent !== 0) {
                errors.push(`${label}: taxPercent must be 0 for category ${subtotal.taxCategory}`);
            }
            if (!subtotal.exemptionReasonCode && !subtotal.exemptionReason) {
                errors.push(`${label}: exemptionReasonCode or exemptionReason is required for category ${subtotal.taxCategory}`);
            }
        }
    }
}

function pushAllowanceErrors(allowances: DocumentAllowance[] | undefined, errors: string[]): void {
    for (const [idx, allowance] of (allowances ?? []).entries()) {
        const label = `allowances[${idx}]`;
        requireFiniteAmount(allowance.amount, `${label}.amount`, errors, { min: 0 });
        requireFiniteAmount(allowance.vatPercent, `${label}.vatPercent`, errors, { min: 0, max: 100 });
        if (!allowance.reason) errors.push(`${label}.reason is required`);
    }
}

function pushTotalsErrors(invoice: Invoice, errors: string[]): void {
    const linesSum = (invoice.lines ?? []).reduce(
        (sum, line) => sum + (isFiniteNumber(line.lineTotal) ? line.lineTotal : 0),
        0,
    );
    if (isFiniteNumber(invoice.lineExtensionAmount) && offBy(linesSum, invoice.lineExtensionAmount)) {
        errors.push(`lineExtensionAmount ${invoice.lineExtensionAmount} ≠ sum of line totals (${linesSum.toFixed(2)})`);
    }
    const allowanceTotal = invoice.allowanceTotalAmount
        ?? (invoice.allowances ?? []).reduce(
            (sum, allowance) => sum + (isFiniteNumber(allowance.amount) ? allowance.amount : 0),
            0,
        );
    if (
        isFiniteNumber(invoice.lineExtensionAmount)
        && isFiniteNumber(invoice.taxExclusiveAmount)
        && offBy(invoice.lineExtensionAmount - allowanceTotal, invoice.taxExclusiveAmount)
    ) {
        errors.push(`taxExclusiveAmount ${invoice.taxExclusiveAmount} ≠ lineExtensionAmount − allowances (${(invoice.lineExtensionAmount - allowanceTotal).toFixed(2)})`);
    }
    if (
        isFiniteNumber(invoice.taxExclusiveAmount)
        && isFiniteNumber(invoice.taxTotal)
        && isFiniteNumber(invoice.taxInclusiveAmount)
        && offBy(invoice.taxExclusiveAmount + invoice.taxTotal, invoice.taxInclusiveAmount)
    ) {
        errors.push(`taxInclusiveAmount ${invoice.taxInclusiveAmount} ≠ taxExclusiveAmount + taxTotal (${(invoice.taxExclusiveAmount + invoice.taxTotal).toFixed(2)})`);
    }
    if (isFiniteNumber(invoice.taxInclusiveAmount) && isFiniteNumber(invoice.payableAmount)) {
        const expectedPayable = invoice.taxInclusiveAmount - (invoice.prepaidAmount ?? 0) + (invoice.payableRoundingAmount ?? 0);
        if (offBy(expectedPayable, invoice.payableAmount)) {
            errors.push(`payableAmount ${invoice.payableAmount} ≠ taxInclusive − prepaid + rounding (${expectedPayable.toFixed(2)})`);
        }
    }
    const subtotalsVat = (invoice.taxSubtotals ?? []).reduce(
        (sum, subtotal) => sum + (isFiniteNumber(subtotal.taxAmount) ? subtotal.taxAmount : 0),
        0,
    );
    if (isFiniteNumber(invoice.taxTotal) && offBy(subtotalsVat, invoice.taxTotal)) {
        errors.push(`taxTotal ${invoice.taxTotal} ≠ sum of taxSubtotals (${subtotalsVat.toFixed(2)})`);
    }
}

/**
 * Pre-signing validation: structural requirements plus the arithmetic rules
 * (BR-CO-10..15 family) ZATCA rejects most often.
 */
export function validateInvoice(invoice: Invoice): string[] {
    const errors: string[] = [];

    if (!invoice.id) errors.push("Invoice ID is required");
    if (!invoice.uuid) errors.push("Invoice UUID is required");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(invoice.issueDate ?? "")) errors.push("issueDate must be YYYY-MM-DD");
    if (!/^\d{2}:\d{2}:\d{2}$/.test(invoice.issueTime ?? "")) errors.push("issueTime must be HH:mm:ss");
    if (!/^0[12][01]{5}$/.test(invoice.invoiceSubType ?? "")) {
        errors.push(`invoiceSubType must match 0[12] + 5 flag digits (e.g. "0200000"), got "${invoice.invoiceSubType}"`);
    }
    if (!Number.isInteger(invoice.invoiceCounterValue) || invoice.invoiceCounterValue < 1) {
        errors.push("invoiceCounterValue (ICV) must be a positive integer");
    }
    if (invoice.previousInvoiceHash?.trim() && !/^[A-Za-z0-9+/]+={0,2}$/.test(invoice.previousInvoiceHash)) {
        errors.push("previousInvoiceHash (PIH) must be base64");
    }
    if (!["388", "381", "383"].includes(invoice.invoiceTypeCode as string)) {
        errors.push(`invoiceTypeCode must be 388, 381 or 383, got "${invoice.invoiceTypeCode}"`);
    }
    if (!/^[A-Z]{3}$/.test(invoice.documentCurrency ?? "")) {
        errors.push(`documentCurrency must be a 3-letter ISO code, got "${invoice.documentCurrency}"`);
    }
    if (!/^[A-Z]{3}$/.test(invoice.taxCurrency ?? "")) {
        errors.push(`taxCurrency must be a 3-letter ISO code, got "${invoice.taxCurrency}"`);
    }

    const amounts: Array<[unknown, string, number?]> = [
        [invoice.lineExtensionAmount, "lineExtensionAmount", 0],
        [invoice.taxExclusiveAmount, "taxExclusiveAmount", 0],
        [invoice.taxInclusiveAmount, "taxInclusiveAmount", 0],
        [invoice.payableAmount, "payableAmount", 0],
        [invoice.taxTotal, "taxTotal", 0],
        [invoice.allowanceTotalAmount, "allowanceTotalAmount", 0],
        [invoice.prepaidAmount, "prepaidAmount", 0],
        [invoice.payableRoundingAmount, "payableRoundingAmount"],
        [invoice.taxTotalInSAR, "taxTotalInSAR", 0],
    ];
    for (const [amount, label, min] of amounts) {
        if (amount !== undefined) requireFiniteAmount(amount, label, errors, min !== undefined ? { min } : {});
    }

    if (!invoice.seller?.registrationName) errors.push("Seller registration name is required");
    if (!invoice.seller?.vatNumber) {
        errors.push("Seller VAT number is required");
    } else if (!/^3\d{13}3$/.test(invoice.seller.vatNumber)) {
        errors.push("Seller VAT number must be 15 digits starting and ending with 3");
    }
    const sellerAddress = invoice.seller?.address;
    if (sellerAddress) {
        if (!sellerAddress.citySubdivision) errors.push("Seller district (citySubdivision) is required (BR-KSA-09)");
        if (!/^\d{4}$/.test(sellerAddress.buildingNumber ?? "")) errors.push("Seller building number must be 4 digits (BR-KSA-37)");
        if (!/^\d{5}$/.test(sellerAddress.postalCode ?? "")) errors.push("Seller postal code must be 5 digits (BR-KSA-66)");
        if (!sellerAddress.street) errors.push("Seller street is required");
        if (!sellerAddress.city) errors.push("Seller city is required");
    } else {
        errors.push("Seller address is required");
    }

    const isStandard = invoice.invoiceSubType?.startsWith("01");
    if (isStandard) {
        if (!invoice.buyer) {
            errors.push("Buyer is required for standard invoices");
        } else if (!invoice.buyer.vatNumber && !invoice.buyer.identification) {
            errors.push("Standard invoice buyer needs a VAT number or another identification");
        }
        if (!invoice.actualDeliveryDate) {
            errors.push("actualDeliveryDate is required for standard invoices (supply date)");
        } else if (!/^\d{4}-\d{2}-\d{2}$/.test(invoice.actualDeliveryDate)) {
            errors.push("actualDeliveryDate must be YYYY-MM-DD");
        }
        if (invoice.latestDeliveryDate && !/^\d{4}-\d{2}-\d{2}$/.test(invoice.latestDeliveryDate)) {
            errors.push("latestDeliveryDate must be YYYY-MM-DD");
        }
    }

    const isCreditOrDebit = invoice.invoiceTypeCode === "381" || invoice.invoiceTypeCode === "383";
    if (isCreditOrDebit) {
        if (!invoice.billingReference) errors.push("Credit/debit notes require billingReference (original invoice)");
        if (!invoice.creditDebitReason) errors.push("Credit/debit notes require creditDebitReason (KSA-10)");
    }

    if (!invoice.lines || invoice.lines.length === 0) {
        errors.push("At least one invoice line is required");
    } else {
        for (const line of invoice.lines) pushLineErrors(line, errors);
    }

    pushTaxSubtotalErrors(invoice.taxSubtotals, errors);
    pushAllowanceErrors(invoice.allowances, errors);
    pushTotalsErrors(invoice, errors);

    if (invoice.documentCurrency !== "SAR" && invoice.taxCurrency !== "SAR") {
        errors.push("taxCurrency must be SAR (BR-KSA-EN16931-02)");
    }
    if (invoice.documentCurrency !== "SAR" && invoice.taxTotalInSAR === undefined) {
        errors.push("taxTotalInSAR is required when documentCurrency is not SAR");
    }

    return errors;
}
