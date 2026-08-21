// file: examples/submit-invoice.ts
// Sign and report a simplified invoice on the ZATCA sandbox.
// Run: bun run examples/submit-invoice.ts

import { ZATCAClient, type EGSUnitInfo, type Invoice } from "../src";

const egsUnit: EGSUnitInfo = {
    uuid: crypto.randomUUID(),
    branchName: "Riyadh Branch",
    branchIndustry: "Supply activities",
    location: "RRRD2929",
    commonName: "TST-886431145-399999999900003",
    organizationName: "Maximum Speed Tech Supply LTD",
    countryCode: "SA",
    vatNumber: "399999999900003",
    invoiceType: "1100",
};

const client = new ZATCAClient({ env: "sandbox", egsUnit, solutionName: "MyERP" });

// 1. Onboard (or restore persisted state instead: new ZATCAClient({ ..., state }))
const onboarding = await client.onboard("123456");
if (!onboarding.success) {
    console.error("Onboarding failed:", onboarding.error.message);
    process.exit(1);
}

// 2. Build the invoice
const now = new Date();
const invoice: Invoice = {
    id: "INV-0001",
    uuid: crypto.randomUUID(),
    issueDate: now.toISOString().slice(0, 10),
    issueTime: now.toISOString().slice(11, 19),
    invoiceTypeCode: "388",
    invoiceSubType: "0200000", // simplified (B2C)
    documentCurrency: "SAR",
    taxCurrency: "SAR",
    invoiceCounterValue: 0, // 0 → let the client assign the next ICV
    previousInvoiceHash: "", // "" or omit → client chains PIH (uses INITIAL hash for first invoice)
    seller: {
        registrationName: "شركة توريد التكنولوجيا | Maximum Speed Tech Supply LTD",
        vatNumber: "399999999900003",
        identification: { schemeId: "CRN", value: "1010010000" },
        address: {
            street: "الامير سلطان | Prince Sultan",
            buildingNumber: "2322",
            citySubdivision: "المربع | Al-Murabba",
            city: "الرياض | Riyadh",
            postalCode: "23333",
            country: "SA",
        },
    },
    paymentMeansCode: "10",
    lineExtensionAmount: 100,
    taxExclusiveAmount: 100,
    taxInclusiveAmount: 115,
    payableAmount: 115,
    taxTotal: 15,
    taxSubtotals: [{ taxableAmount: 100, taxAmount: 15, taxCategory: "S", taxPercent: 15 }],
    lines: [{
        id: "1",
        name: "منتج تجريبي | Test product",
        quantity: 1,
        unitCode: "PCE",
        unitPrice: 100,
        lineTotal: 100,
        vatCategory: "S",
        vatPercent: 15,
        vatAmount: 15,
    }],
};

// 3. Sign + submit (simplified → reporting endpoint)
const result = await client.submitInvoice(invoice);
if (!result.success) {
    console.error("Signing failed:", result.error.message);
    process.exit(1);
}

const submission = result.data;
console.log("Invoice hash:", submission.signedInvoice.invoiceHash);
console.log("QR payload:", submission.signedInvoice.qrTlvBase64.slice(0, 60), "…");

if (submission.accepted) {
    console.log("ZATCA accepted the invoice ✅");
    const validation = submission.response?.validationResults;
    if (validation) console.log("Validation status:", validation.status);
} else {
    console.error("ZATCA rejected the invoice:", submission.error?.message);
    // The signed XML is still available for retry: submission.signedInvoice
}

// 4. Persist the updated ICV/PIH chain
void client.getState();
