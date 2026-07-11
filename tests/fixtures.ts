// file: tests/fixtures.ts
// Shared fixtures: the official ZATCA SDK test certificate/key and golden
// values captured from the official Java SDK's own signed output.

import { readFileSync } from "fs";
import { join } from "path";
import type { Invoice } from "../src/lib/types";

const CERT_DIR = join(
    import.meta.dir,
    "../resources/examples/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Certificates",
);

/** Official ZATCA SDK test certificate (PEM) */
export const OFFICIAL_CERT = readFileSync(join(CERT_DIR, "cert.pem"), "utf8");

/** Official ZATCA SDK test private key (headerless base64 SEC1) */
export const OFFICIAL_KEY = readFileSync(join(CERT_DIR, "ec-secp256k1-priv-key.pem"), "utf8");

/** Golden values from the official certificate, as they appear in the
 *  official SDK's signed XML output */
export const GOLDEN_CERT = {
    issuer: "CN=PRZEINVOICESCA4-CA, DC=extgazt, DC=gov, DC=local",
    serialNumber: "379112742831380471835263969587287663520528387",
    hash: "ZDMwMmI0MTE1NzVjOTU2NTk4YzVlODhhYmI0ODU2NDUyNTU2YTVhYjhhMDFmN2FjYjk1YTA2OWQ0NjY2MjQ4NQ==",
    publicKeyBase64:
        "MFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAEoWCKa0Sa9FIErTOv0uAkC1VIKXxU9nPpx2vlf4yhMejy8c02XJblDq7tPydo8mq0ahOMmNo8gwni7Xt1KT9UeA==",
    signatureBase64:
        "MEUCIQCxP4nIZp1lwlClG3Gt8nIvKKsGi7xXR1Y0K73iPbqgGwIgPYQuDPI4DAQAz0s5ndrojyQOoCkdyxNN1O+Xqmwv61w=",
} as const;

/** A hash + matching signature produced by the official Java SDK (-sign) */
export const GOLDEN_SIGNATURE = {
    invoiceHash: "z5F9qsS6oWyDhehD8u8S0DaxV+2CUiUz9Y+UsR61JgQ=",
    signature:
        "MEUCIQDSuISFt+w5fn29f7GymdmrOvAbCPONtPMmhMeqXjhCBAIgHhGEeNmY7m6pEqGlhEMnmJqJOyA6BV8npVpxGnF8Tn8=",
} as const;

/** Complete QR TLV payload emitted by the official Java SDK for the sample invoice */
export const GOLDEN_QR_TLV =
    "AW/YtNix2YPYqSDYqtmI2LHZitivINin2YTYqtmD2YbZiNmE2YjYrNmK2Kcg2KjYo9mC2LXZiSDYs9ix2LnYqSDYp9mE2YXYrdiv2YjYr9ipIHwgTWF4aW11bSBTcGVlZCBUZWNoIFN1cHBseSBMVEQCDzM5OTk5OTk5OTkwMDAwMwMTMjAyMi0wOC0xN1QxNzo0MTowOAQGMjMxLjE1BQUzMC4xNQYsejVGOXFzUzZvV3lEaGVoRDh1OFMwRGF4VisyQ1VpVXo5WStVc1I2MUpnUT0HYE1FVUNJUURTdUlTRnQrdzVmbjI5ZjdHeW1kbXJPdkFiQ1BPTnRQTW1oTWVxWGpoQ0JBSWdIaEdFZU5tWTdtNnBFcUdsaEVNbm1KcUpPeUE2QlY4bnBWcHhHbkY4VG44PQhYMFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAEoWCKa0Sa9FIErTOv0uAkC1VIKXxU9nPpx2vlf4yhMejy8c02XJblDq7tPydo8mq0ahOMmNo8gwni7Xt1KT9UeAlHMEUCIQCxP4nIZp1lwlClG3Gt8nIvKKsGi7xXR1Y0K73iPbqgGwIgPYQuDPI4DAQAz0s5ndrojyQOoCkdyxNN1O+Xqmwv61w=";

export const SELLER = {
    registrationName:
        "شركة توريد التكنولوجيا بأقصى سرعة المحدودة | Maximum Speed Tech Supply LTD",
    vatNumber: "399999999900003",
    identification: { schemeId: "CRN" as const, value: "1010010000" },
    address: {
        street: "الامير سلطان | Prince Sultan",
        buildingNumber: "2322",
        citySubdivision: "المربع | Al-Murabba",
        city: "الرياض | Riyadh",
        postalCode: "23333",
        country: "SA",
    },
};

export const BUYER = {
    registrationName: "شركة نماذج فاتورة المحدودة | Fatoora Samples LTD",
    vatNumber: "399999999800003",
    address: {
        street: "صلاح الدين | Salah Al-Din",
        buildingNumber: "1111",
        citySubdivision: "المروج | Al-Murooj",
        city: "الرياض | Riyadh",
        postalCode: "12222",
        country: "SA",
    },
};

/** The official SDK's sample simplified invoice, expressed in SDK types */
export function sampleSimplifiedInvoice(overrides: Partial<Invoice> = {}): Invoice {
    return {
        id: "SME00010",
        uuid: "8e6000cf-1a98-4174-b3e7-b5d5954bc10d",
        issueDate: "2022-08-17",
        issueTime: "17:41:08",
        invoiceTypeCode: "388",
        invoiceSubType: "0200000",
        documentCurrency: "SAR",
        taxCurrency: "SAR",
        invoiceCounterValue: 10,
        previousInvoiceHash:
            "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==",
        note: "ABC",
        seller: SELLER,
        paymentMeansCode: "10",
        lineExtensionAmount: 201,
        taxExclusiveAmount: 201,
        taxInclusiveAmount: 231.15,
        payableAmount: 231.15,
        taxTotal: 30.15,
        taxSubtotals: [{ taxableAmount: 201, taxAmount: 30.15, taxCategory: "S", taxPercent: 15 }],
        lines: [
            { id: "1", name: "كتاب", quantity: 33, unitCode: "PCE", unitPrice: 3, lineTotal: 99, vatCategory: "S", vatPercent: 15, vatAmount: 14.85 },
            { id: "2", name: "قلم", quantity: 3, unitCode: "PCE", unitPrice: 34, lineTotal: 102, vatCategory: "S", vatPercent: 15, vatAmount: 15.3 },
        ],
        ...overrides,
    };
}

export function sampleStandardInvoice(overrides: Partial<Invoice> = {}): Invoice {
    return sampleSimplifiedInvoice({
        id: "STD-0001",
        uuid: "16e78469-64af-406b-9cd1-4494fdff1cf1",
        invoiceSubType: "0100000",
        buyer: BUYER,
        actualDeliveryDate: "2022-08-17",
        ...overrides,
    });
}

export const CREDENTIALS = {
    certificate: OFFICIAL_CERT,
    privateKey: OFFICIAL_KEY,
};
