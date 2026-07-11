// file: tests/xml/builder.test.ts

import { describe, expect, test } from "bun:test";
import { QR_PLACEHOLDER, buildInvoiceXml, replaceQrPlaceholder } from "../../src/lib/xml/builder";
import { parseXML } from "../../src/lib/xml/canonicalize";
import { sampleSimplifiedInvoice, sampleStandardInvoice } from "../fixtures";

function build(invoice = sampleSimplifiedInvoice()): string {
    const result = buildInvoiceXml(invoice);
    if (!result.success) throw result.error;
    return result.data;
}

describe("invoice XML structure", () => {
    test("parses as XML and contains the signature scaffolding", () => {
        const xml = build();
        expect(parseXML(xml).success).toBe(true);
        expect(xml).toContain("<cbc:ID>ICV</cbc:ID>");
        expect(xml).toContain("<cbc:ID>PIH</cbc:ID>");
        expect(xml).toContain("<cbc:ID>QR</cbc:ID>");
        expect(xml).toContain(QR_PLACEHOLDER);
        expect(xml).toContain("<cac:Signature>");
        expect(xml).toContain("urn:oasis:names:specification:ubl:signature:Invoice");
    });

    test("emits UBL-ordered children: AllowanceCharge BEFORE TaxTotal within a line", () => {
        const xml = build(sampleSimplifiedInvoice({
            lineExtensionAmount: 90,
            taxExclusiveAmount: 90,
            taxInclusiveAmount: 103.5,
            payableAmount: 103.5,
            taxTotal: 13.5,
            taxSubtotals: [{ taxableAmount: 90, taxAmount: 13.5, taxCategory: "S", taxPercent: 15 }],
            lines: [{
                id: "1", name: "منتج", quantity: 1, unitCode: "PCE", unitPrice: 100,
                lineTotal: 90, vatCategory: "S", vatPercent: 15, vatAmount: 13.5,
                discount: 10, discountReason: "خصم",
            }],
        }));
        const line = xml.slice(xml.indexOf("<cac:InvoiceLine>"));
        const allowanceIdx = line.indexOf("<cac:AllowanceCharge>");
        const taxTotalIdx = line.indexOf("<cac:TaxTotal>");
        expect(allowanceIdx).toBeGreaterThan(-1);
        expect(allowanceIdx).toBeLessThan(taxTotalIdx);
    });

    test("credit notes carry BillingReference and InstructionNote", () => {
        const xml = build(sampleSimplifiedInvoice({
            invoiceTypeCode: "381",
            billingReference: { invoiceId: "SME00009" },
            creditDebitReason: "Cancellation",
        }));
        expect(xml).toContain("<cac:BillingReference>");
        expect(xml).toContain("<cbc:ID>SME00009</cbc:ID>");
        expect(xml).toContain("<cbc:InstructionNote>Cancellation</cbc:InstructionNote>");
    });

    test("standard invoices include buyer and delivery date", () => {
        const xml = build(sampleStandardInvoice());
        expect(xml).toContain("<cac:AccountingCustomerParty>");
        expect(xml).toContain("<cbc:ActualDeliveryDate>2022-08-17</cbc:ActualDeliveryDate>");
        expect(xml).toContain('name="0100000"');
    });

    test("simplified invoices without a buyer emit an empty customer party", () => {
        const xml = build();
        expect(xml).toContain("<cac:AccountingCustomerParty/>");
    });

    test("two TaxTotal blocks: SAR summary first, then breakdown", () => {
        const xml = build();
        const first = xml.indexOf("<cac:TaxTotal>");
        const second = xml.indexOf("<cac:TaxTotal>", first + 1);
        expect(second).toBeGreaterThan(first);
        const firstBlock = xml.slice(first, xml.indexOf("</cac:TaxTotal>", first));
        expect(firstBlock).not.toContain("TaxSubtotal");
        const secondBlock = xml.slice(second, xml.indexOf("</cac:TaxTotal>", second));
        expect(secondBlock).toContain("TaxSubtotal");
    });

    test("XML special characters are escaped", () => {
        const xml = build(sampleSimplifiedInvoice({
            note: `<script>&"'</script>`,
        }));
        expect(xml).toContain("&lt;script&gt;&amp;&quot;&apos;&lt;/script&gt;");
    });

    test("QR placeholder substitution", () => {
        const xml = build();
        const replaced = replaceQrPlaceholder(xml, "QRDATA==");
        expect(replaced.success).toBe(true);
        if (!replaced.success) return;
        expect(replaced.data).toContain(">QRDATA==</cbc:EmbeddedDocumentBinaryObject>");
        expect(replaced.data).not.toContain(QR_PLACEHOLDER);

        // A second substitution on the same document must fail loudly
        expect(replaceQrPlaceholder(replaced.data, "AGAIN").success).toBe(false);
    });
});
