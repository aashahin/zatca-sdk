// file: tests/xml/pipeline.test.ts
// The invariants that make a ZATCA signature valid. If any of these break,
// the validator rejects the invoice — do not weaken them.

import { describe, expect, test } from "bun:test";
import { signInvoice, computeInvoiceHash, validateInvoice } from "../../src/lib/egs/invoice-signer";
import { computeInvoiceHash as hashXml } from "../../src/lib/xml/canonicalize";
import { computeSignedPropertiesHash } from "../../src/lib/xml/xades";
import { verifyInvoiceSignature } from "../../src/lib/crypto/signing";
import { parseCertificate } from "../../src/lib/crypto/certificate";
import { decodeTLVString } from "../../src/lib/crypto/qr";
import { CREDENTIALS, OFFICIAL_CERT, sampleSimplifiedInvoice, sampleStandardInvoice } from "../fixtures";

const SIGNING_TIME = "2024-01-15T10:30:00";

async function sign(invoice = sampleSimplifiedInvoice()) {
    const result = await signInvoice(invoice, {
        credentials: CREDENTIALS,
        signingTime: SIGNING_TIME,
        skipQrImage: true,
    });
    if (!result.success) throw result.error;
    return result.data;
}

describe("signing pipeline invariants", () => {
    test("hash of the FINAL signed document equals the embedded DigestValue", async () => {
        const signed = await sign();

        // The validator recomputes the hash from the submitted bytes:
        const recomputed = hashXml(signed.signedXml);
        expect(recomputed.success).toBe(true);
        if (!recomputed.success) return;
        expect(recomputed.data).toBe(signed.invoiceHash);

        // ...and the same hash is embedded in the ds:Reference:
        expect(signed.signedXml).toContain(`<ds:DigestValue>${signed.invoiceHash}</ds:DigestValue>`);
    });

    test("ECDSA signature verifies against the certificate public key", async () => {
        const signed = await sign();
        const sigMatch = signed.signedXml.match(/<ds:SignatureValue>([^<]+)<\/ds:SignatureValue>/);
        expect(sigMatch).not.toBeNull();

        const cert = parseCertificate(OFFICIAL_CERT);
        if (!cert.success) throw cert.error;
        expect(verifyInvoiceSignature(signed.invoiceHash, sigMatch![1]!, cert.data.publicPoint)).toBe(true);
    });

    test("SignedProperties digest matches the ZATCA re-serialization template", async () => {
        const signed = await sign();
        const cert = parseCertificate(OFFICIAL_CERT);
        if (!cert.success) throw cert.error;

        // Rebuild the for-hashing template exactly as the validator re-serializes it
        const template = `<xades:SignedProperties xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" Id="xadesSignedProperties">
                                    <xades:SignedSignatureProperties>
                                        <xades:SigningTime>${SIGNING_TIME}</xades:SigningTime>
                                        <xades:SigningCertificate>
                                            <xades:Cert>
                                                <xades:CertDigest>
                                                    <ds:DigestMethod xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
                                                    <ds:DigestValue xmlns:ds="http://www.w3.org/2000/09/xmldsig#">${cert.data.hash}</ds:DigestValue>
                                                </xades:CertDigest>
                                                <xades:IssuerSerial>
                                                    <ds:X509IssuerName xmlns:ds="http://www.w3.org/2000/09/xmldsig#">${cert.data.issuer}</ds:X509IssuerName>
                                                    <ds:X509SerialNumber xmlns:ds="http://www.w3.org/2000/09/xmldsig#">${cert.data.serialNumber}</ds:X509SerialNumber>
                                                </xades:IssuerSerial>
                                            </xades:Cert>
                                        </xades:SigningCertificate>
                                    </xades:SignedSignatureProperties>
                                </xades:SignedProperties>`;
        const expectedDigest = computeSignedPropertiesHash(template);
        expect(signed.signedXml).toContain(`<ds:DigestValue>${expectedDigest}</ds:DigestValue>`);
    });

    test("QR payload matches the invoice and signature values", async () => {
        const signed = await sign();
        expect(signed.signedXml).toContain(signed.qrTlvBase64);

        const decoded = decodeTLVString(signed.qrTlvBase64);
        expect(decoded.success).toBe(true);
        if (!decoded.success) return;
        expect(decoded.data.vatNumber).toBe("399999999900003");
        expect(decoded.data.timestamp).toBe("2022-08-17T17:41:08");
        expect(decoded.data.invoiceTotal).toBe("231.15");
        expect(decoded.data.vatTotal).toBe("30.15");
        expect(decoded.data.invoiceHash).toBe(signed.invoiceHash);

        const cert = parseCertificate(OFFICIAL_CERT);
        if (!cert.success) throw cert.error;
        expect(decoded.data.publicKey).toBe(cert.data.publicKeyBase64);
    });

    test("invoiceBase64 round-trips to the signed XML", async () => {
        const signed = await sign();
        expect(Buffer.from(signed.invoiceBase64, "base64").toString("utf8")).toBe(signed.signedXml);
    });

    test("pre-computed hash equals the hash produced during signing", async () => {
        const invoice = sampleSimplifiedInvoice();
        const pre = computeInvoiceHash(invoice);
        if (!pre.success) throw pre.error;
        const signed = await sign(invoice);
        expect(signed.invoiceHash).toBe(pre.data);
    });

    test("standard invoices sign too", async () => {
        const signed = await sign(sampleStandardInvoice());
        expect(signed.signedXml).toContain('name="0100000"');
    });
});

describe("invoice validation", () => {
    test("accepts the sample invoices", () => {
        expect(validateInvoice(sampleSimplifiedInvoice())).toEqual([]);
        expect(validateInvoice(sampleStandardInvoice())).toEqual([]);
    });

    test("catches arithmetic inconsistencies", () => {
        const errors = validateInvoice(sampleSimplifiedInvoice({ taxInclusiveAmount: 999 }));
        expect(errors.some((e) => e.includes("taxInclusiveAmount"))).toBe(true);
    });

    test("requires buyer for standard invoices", () => {
        const errors = validateInvoice(sampleStandardInvoice({ buyer: undefined }));
        expect(errors.some((e) => e.includes("Buyer"))).toBe(true);
    });

    test("requires reference + reason for credit notes", () => {
        const errors = validateInvoice(sampleSimplifiedInvoice({ invoiceTypeCode: "381" }));
        expect(errors.some((e) => e.includes("billingReference"))).toBe(true);
        expect(errors.some((e) => e.includes("creditDebitReason"))).toBe(true);
    });

    test("rejects a malformed invoice subtype", () => {
        const errors = validateInvoice(sampleSimplifiedInvoice({ invoiceSubType: "9900000" }));
        expect(errors.some((e) => e.includes("invoiceSubType"))).toBe(true);
    });

    test("rejects a PIH that is not base64", () => {
        const errors = validateInvoice(sampleSimplifiedInvoice({ previousInvoiceHash: "<not base64!>" }));
        expect(errors.some((e) => e.includes("PIH"))).toBe(true);
    });

    test("enforces seller address rules (BR-KSA)", () => {
        const invoice = sampleSimplifiedInvoice();
        invoice.seller = {
            ...invoice.seller,
            address: { ...invoice.seller.address, buildingNumber: "12", citySubdivision: undefined },
        };
        const errors = validateInvoice(invoice);
        expect(errors.some((e) => e.includes("building number"))).toBe(true);
        expect(errors.some((e) => e.includes("district"))).toBe(true);
    });

    test("signing refuses an invalid invoice", async () => {
        const result = await signInvoice(
            sampleSimplifiedInvoice({ taxInclusiveAmount: 999 }),
            { credentials: CREDENTIALS, skipQrImage: true },
        );
        expect(result.success).toBe(false);
    });
});
