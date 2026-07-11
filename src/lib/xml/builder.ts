// file: src/lib/xml/builder.ts
// ZATCA SDK - UBL 2.1 invoice XML builder
//
// The builder emits the COMPLETE document skeleton, including the QR
// AdditionalDocumentReference (with a placeholder payload) and the
// cac:Signature reference. The invoice hash is computed on this assembled
// document, so signing later only substitutes values — it never changes the
// document's whitespace structure.

import { XMLError } from "../errors";
import type { Invoice, InvoiceLine, InvoiceParty, Result, TaxSubtotal } from "../types";
import { XML_NS_DECLARATIONS } from "./namespaces";

/** Placeholder replaced with the real TLV payload after signing */
export const QR_PLACEHOLDER = "SET_QR_CODE_DATA";

function escapeXml(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function money(num: number): string {
    return num.toFixed(2);
}

/** Drop empty strings and join lines */
function lines(...parts: Array<string | false | undefined>): string {
    return parts.filter((p): p is string => Boolean(p)).join("\n");
}

// ============================================================================
// Party
// ============================================================================

function buildPartyXml(party: InvoiceParty, role: "Supplier" | "Customer", indent: string): string {
    const i = indent;
    const address = party.address;
    return lines(
        `${i}<cac:Accounting${role}Party>`,
        `${i}  <cac:Party>`,
        party.identification &&
            `${i}    <cac:PartyIdentification>
${i}      <cbc:ID schemeID="${party.identification.schemeId}">${escapeXml(party.identification.value)}</cbc:ID>
${i}    </cac:PartyIdentification>`,
        `${i}    <cac:PostalAddress>`,
        `${i}      <cbc:StreetName>${escapeXml(address.street)}</cbc:StreetName>`,
        address.additionalStreet && `${i}      <cbc:AdditionalStreetName>${escapeXml(address.additionalStreet)}</cbc:AdditionalStreetName>`,
        `${i}      <cbc:BuildingNumber>${escapeXml(address.buildingNumber)}</cbc:BuildingNumber>`,
        address.plotIdentification && `${i}      <cbc:PlotIdentification>${escapeXml(address.plotIdentification)}</cbc:PlotIdentification>`,
        address.citySubdivision && `${i}      <cbc:CitySubdivisionName>${escapeXml(address.citySubdivision)}</cbc:CitySubdivisionName>`,
        `${i}      <cbc:CityName>${escapeXml(address.city)}</cbc:CityName>`,
        `${i}      <cbc:PostalZone>${escapeXml(address.postalCode)}</cbc:PostalZone>`,
        address.countrySubentity && `${i}      <cbc:CountrySubentity>${escapeXml(address.countrySubentity)}</cbc:CountrySubentity>`,
        `${i}      <cac:Country>`,
        `${i}        <cbc:IdentificationCode>${escapeXml(address.country)}</cbc:IdentificationCode>`,
        `${i}      </cac:Country>`,
        `${i}    </cac:PostalAddress>`,
        party.vatNumber &&
            `${i}    <cac:PartyTaxScheme>
${i}      <cbc:CompanyID>${escapeXml(party.vatNumber)}</cbc:CompanyID>
${i}      <cac:TaxScheme>
${i}        <cbc:ID>VAT</cbc:ID>
${i}      </cac:TaxScheme>
${i}    </cac:PartyTaxScheme>`,
        `${i}    <cac:PartyLegalEntity>`,
        `${i}      <cbc:RegistrationName>${escapeXml(party.registrationName)}</cbc:RegistrationName>`,
        `${i}    </cac:PartyLegalEntity>`,
        `${i}  </cac:Party>`,
        `${i}</cac:Accounting${role}Party>`,
    );
}

// ============================================================================
// Lines & taxes
// ============================================================================

function buildLineXml(line: InvoiceLine, currency: string): string {
    const hasDiscount = (line.discount ?? 0) > 0;
    return lines(
        `  <cac:InvoiceLine>`,
        `    <cbc:ID>${escapeXml(line.id)}</cbc:ID>`,
        `    <cbc:InvoicedQuantity unitCode="${escapeXml(line.unitCode)}">${line.quantity.toFixed(6)}</cbc:InvoicedQuantity>`,
        `    <cbc:LineExtensionAmount currencyID="${currency}">${money(line.lineTotal)}</cbc:LineExtensionAmount>`,
        hasDiscount &&
            `    <cac:AllowanceCharge>
      <cbc:ChargeIndicator>false</cbc:ChargeIndicator>
      <cbc:AllowanceChargeReason>${escapeXml(line.discountReason ?? "Discount")}</cbc:AllowanceChargeReason>
      <cbc:Amount currencyID="${currency}">${money(line.discount ?? 0)}</cbc:Amount>
    </cac:AllowanceCharge>`,
        `    <cac:TaxTotal>`,
        `      <cbc:TaxAmount currencyID="${currency}">${money(line.vatAmount)}</cbc:TaxAmount>`,
        `      <cbc:RoundingAmount currencyID="${currency}">${money(line.lineTotal + line.vatAmount)}</cbc:RoundingAmount>`,
        `    </cac:TaxTotal>`,
        `    <cac:Item>`,
        `      <cbc:Name>${escapeXml(line.name)}</cbc:Name>`,
        `      <cac:ClassifiedTaxCategory>`,
        `        <cbc:ID>${line.vatCategory}</cbc:ID>`,
        `        <cbc:Percent>${money(line.vatPercent)}</cbc:Percent>`,
        `        <cac:TaxScheme>`,
        `          <cbc:ID>VAT</cbc:ID>`,
        `        </cac:TaxScheme>`,
        `      </cac:ClassifiedTaxCategory>`,
        `    </cac:Item>`,
        `    <cac:Price>`,
        `      <cbc:PriceAmount currencyID="${currency}">${money(line.unitPrice)}</cbc:PriceAmount>`,
        `    </cac:Price>`,
        `  </cac:InvoiceLine>`,
    );
}

function buildTaxSubtotalXml(subtotal: TaxSubtotal, currency: string): string {
    const needsReason = subtotal.taxCategory !== "S";
    return lines(
        `    <cac:TaxSubtotal>`,
        `      <cbc:TaxableAmount currencyID="${currency}">${money(subtotal.taxableAmount)}</cbc:TaxableAmount>`,
        `      <cbc:TaxAmount currencyID="${currency}">${money(subtotal.taxAmount)}</cbc:TaxAmount>`,
        `      <cac:TaxCategory>`,
        `        <cbc:ID schemeID="UN/ECE 5305" schemeAgencyID="6">${subtotal.taxCategory}</cbc:ID>`,
        `        <cbc:Percent>${money(subtotal.taxPercent)}</cbc:Percent>`,
        needsReason && subtotal.exemptionReasonCode &&
            `        <cbc:TaxExemptionReasonCode>${escapeXml(subtotal.exemptionReasonCode)}</cbc:TaxExemptionReasonCode>`,
        needsReason && subtotal.exemptionReason &&
            `        <cbc:TaxExemptionReason>${escapeXml(subtotal.exemptionReason)}</cbc:TaxExemptionReason>`,
        `        <cac:TaxScheme>`,
        `          <cbc:ID schemeID="UN/ECE 5153" schemeAgencyID="6">VAT</cbc:ID>`,
        `        </cac:TaxScheme>`,
        `      </cac:TaxCategory>`,
        `    </cac:TaxSubtotal>`,
    );
}

// ============================================================================
// Invoice
// ============================================================================

/**
 * Build the complete UBL 2.1 invoice document, including signature scaffolding
 * (cac:Signature reference and QR AdditionalDocumentReference placeholder).
 */
export function buildInvoiceXml(invoice: Invoice): Result<string> {
    try {
        const currency = invoice.documentCurrency;
        const taxCurrency = invoice.taxCurrency;
        const isCreditOrDebit = invoice.invoiceTypeCode === "381" || invoice.invoiceTypeCode === "383";
        const taxTotalInSAR = invoice.taxTotalInSAR ?? invoice.taxTotal;

        const allowancesXml = (invoice.allowances ?? [])
            .map((allowance) => lines(
                `  <cac:AllowanceCharge>`,
                `    <cbc:ChargeIndicator>false</cbc:ChargeIndicator>`,
                `    <cbc:AllowanceChargeReason>${escapeXml(allowance.reason)}</cbc:AllowanceChargeReason>`,
                `    <cbc:Amount currencyID="${currency}">${money(allowance.amount)}</cbc:Amount>`,
                `    <cac:TaxCategory>`,
                `      <cbc:ID schemeID="UN/ECE 5305" schemeAgencyID="6">${allowance.vatCategory}</cbc:ID>`,
                `      <cbc:Percent>${money(allowance.vatPercent)}</cbc:Percent>`,
                `      <cac:TaxScheme>`,
                `        <cbc:ID schemeID="UN/ECE 5153" schemeAgencyID="6">VAT</cbc:ID>`,
                `      </cac:TaxScheme>`,
                `    </cac:TaxCategory>`,
                `  </cac:AllowanceCharge>`,
            ))
            .join("\n");

        const xml = lines(
            `<?xml version="1.0" encoding="UTF-8"?>`,
            `<Invoice ${XML_NS_DECLARATIONS}>`,
            `  <cbc:ProfileID>reporting:1.0</cbc:ProfileID>`,
            `  <cbc:ID>${escapeXml(invoice.id)}</cbc:ID>`,
            `  <cbc:UUID>${escapeXml(invoice.uuid)}</cbc:UUID>`,
            `  <cbc:IssueDate>${invoice.issueDate}</cbc:IssueDate>`,
            `  <cbc:IssueTime>${invoice.issueTime}</cbc:IssueTime>`,
            `  <cbc:InvoiceTypeCode name="${invoice.invoiceSubType}">${invoice.invoiceTypeCode}</cbc:InvoiceTypeCode>`,
            invoice.note && `  <cbc:Note languageID="ar">${escapeXml(invoice.note)}</cbc:Note>`,
            `  <cbc:DocumentCurrencyCode>${escapeXml(currency)}</cbc:DocumentCurrencyCode>`,
            `  <cbc:TaxCurrencyCode>${escapeXml(taxCurrency)}</cbc:TaxCurrencyCode>`,
            invoice.billingReference &&
                `  <cac:BillingReference>
    <cac:InvoiceDocumentReference>
      <cbc:ID>${escapeXml(invoice.billingReference.invoiceId)}</cbc:ID>
    </cac:InvoiceDocumentReference>
  </cac:BillingReference>`,
            `  <cac:AdditionalDocumentReference>`,
            `    <cbc:ID>ICV</cbc:ID>`,
            `    <cbc:UUID>${invoice.invoiceCounterValue}</cbc:UUID>`,
            `  </cac:AdditionalDocumentReference>`,
            `  <cac:AdditionalDocumentReference>`,
            `    <cbc:ID>PIH</cbc:ID>`,
            `    <cac:Attachment>`,
            `      <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${escapeXml(invoice.previousInvoiceHash)}</cbc:EmbeddedDocumentBinaryObject>`,
            `    </cac:Attachment>`,
            `  </cac:AdditionalDocumentReference>`,
            `  <cac:AdditionalDocumentReference>`,
            `    <cbc:ID>QR</cbc:ID>`,
            `    <cac:Attachment>`,
            `      <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${QR_PLACEHOLDER}</cbc:EmbeddedDocumentBinaryObject>`,
            `    </cac:Attachment>`,
            `  </cac:AdditionalDocumentReference>`,
            `  <cac:Signature>`,
            `    <cbc:ID>urn:oasis:names:specification:ubl:signature:Invoice</cbc:ID>`,
            `    <cbc:SignatureMethod>urn:oasis:names:specification:ubl:dsig:enveloped:xades</cbc:SignatureMethod>`,
            `  </cac:Signature>`,
            buildPartyXml(invoice.seller, "Supplier", "  "),
            invoice.buyer
                ? buildPartyXml(invoice.buyer, "Customer", "  ")
                : `  <cac:AccountingCustomerParty/>`,
            invoice.actualDeliveryDate &&
                lines(
                    `  <cac:Delivery>`,
                    `    <cbc:ActualDeliveryDate>${invoice.actualDeliveryDate}</cbc:ActualDeliveryDate>`,
                    invoice.latestDeliveryDate && `    <cbc:LatestDeliveryDate>${invoice.latestDeliveryDate}</cbc:LatestDeliveryDate>`,
                    `  </cac:Delivery>`,
                ),
            `  <cac:PaymentMeans>`,
            `    <cbc:PaymentMeansCode>${escapeXml(invoice.paymentMeansCode)}</cbc:PaymentMeansCode>`,
            isCreditOrDebit && invoice.creditDebitReason &&
                `    <cbc:InstructionNote>${escapeXml(invoice.creditDebitReason)}</cbc:InstructionNote>`,
            `  </cac:PaymentMeans>`,
            allowancesXml,
            `  <cac:TaxTotal>`,
            `    <cbc:TaxAmount currencyID="${taxCurrency}">${money(taxTotalInSAR)}</cbc:TaxAmount>`,
            `  </cac:TaxTotal>`,
            `  <cac:TaxTotal>`,
            `    <cbc:TaxAmount currencyID="${currency}">${money(invoice.taxTotal)}</cbc:TaxAmount>`,
            invoice.taxSubtotals.map((s) => buildTaxSubtotalXml(s, currency)).join("\n"),
            `  </cac:TaxTotal>`,
            `  <cac:LegalMonetaryTotal>`,
            `    <cbc:LineExtensionAmount currencyID="${currency}">${money(invoice.lineExtensionAmount)}</cbc:LineExtensionAmount>`,
            `    <cbc:TaxExclusiveAmount currencyID="${currency}">${money(invoice.taxExclusiveAmount)}</cbc:TaxExclusiveAmount>`,
            `    <cbc:TaxInclusiveAmount currencyID="${currency}">${money(invoice.taxInclusiveAmount)}</cbc:TaxInclusiveAmount>`,
            `    <cbc:AllowanceTotalAmount currencyID="${currency}">${money(invoice.allowanceTotalAmount ?? 0)}</cbc:AllowanceTotalAmount>`,
            `    <cbc:PrepaidAmount currencyID="${currency}">${money(invoice.prepaidAmount ?? 0)}</cbc:PrepaidAmount>`,
            invoice.payableRoundingAmount !== undefined &&
                `    <cbc:PayableRoundingAmount currencyID="${currency}">${money(invoice.payableRoundingAmount)}</cbc:PayableRoundingAmount>`,
            `    <cbc:PayableAmount currencyID="${currency}">${money(invoice.payableAmount)}</cbc:PayableAmount>`,
            `  </cac:LegalMonetaryTotal>`,
            invoice.lines.map((line) => buildLineXml(line, currency)).join("\n"),
            `</Invoice>`,
        );

        return { success: true, data: xml };
    } catch (error) {
        return {
            success: false,
            error: new XMLError(
                `Failed to build invoice XML: ${error instanceof Error ? error.message : "Unknown error"}`,
            ),
        };
    }
}

/**
 * Substitute the QR placeholder with the real TLV payload.
 * Text-only substitution — leaves the document's whitespace untouched, and the
 * QR reference is excluded from the invoice hash anyway.
 */
export function replaceQrPlaceholder(xml: string, qrBase64: string): Result<string> {
    if (!xml.includes(QR_PLACEHOLDER)) {
        return {
            success: false,
            error: new XMLError("QR placeholder not found in invoice XML"),
        };
    }
    // Function replacement: immune to `$`-pattern expansion in the payload
    return { success: true, data: xml.replace(QR_PLACEHOLDER, () => qrBase64) };
}
