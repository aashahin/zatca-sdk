// file: src/lib/types.ts
// ZATCA SDK - Core type definitions (TypeBox schemas + static types)

import { Type, type Static } from "@sinclair/typebox";

// ============================================================================
// Result type (discriminated union for error handling)
// ============================================================================

export type Result<T, E = Error> =
    | { success: true; data: T }
    | { success: false; error: E };

// ============================================================================
// Environments
// ============================================================================

export const ZATCAEnvironment = Type.Union([
    Type.Literal("sandbox"),
    Type.Literal("simulation"),
    Type.Literal("production"),
]);
export type ZATCAEnvironment = Static<typeof ZATCAEnvironment>;

export const ZATCA_URLS: Record<ZATCAEnvironment, string> = {
    /** Developer sandbox — accepts any OTP, test CSIDs only */
    sandbox: "https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal",
    /** Simulation — real OTP from the Fatoora simulation portal, PREZATCA certs */
    simulation: "https://gw-fatoora.zatca.gov.sa/e-invoicing/simulation",
    /** Production */
    production: "https://gw-fatoora.zatca.gov.sa/e-invoicing/core",
};

// ============================================================================
// EGS (E-Invoice Generation System) unit
// ============================================================================

export const EGSUnitInfo = Type.Object({
    uuid: Type.String({ description: "Unique device UUID (serial part of the EGS SN)" }),
    /** Optional device model — becomes the "2-" part of the EGS serial number */
    model: Type.Optional(Type.String()),
    branchName: Type.String({ description: "Branch name (certificate OU)" }),
    branchIndustry: Type.String({ description: "Industry sector name" }),
    /** Branch location: national short address (e.g. RRRD2929) or street address */
    location: Type.String({ description: "Branch address for the CSR registeredAddress" }),
    commonName: Type.String({ description: "Certificate common name" }),
    organizationName: Type.String({ description: "Legal taxpayer name" }),
    countryCode: Type.String({ pattern: "^[A-Z]{2}$", default: "SA" }),
    vatNumber: Type.String({ pattern: "^3\\d{13}3$", description: "15-digit VAT number (starts/ends with 3)" }),
    /**
     * Invoice type functionality map "TSCZ":
     * "1000" standard tax invoices only, "0100" simplified only, "1100" both
     */
    invoiceType: Type.String({ pattern: "^[01]{4}$", default: "1100" }),
});
export type EGSUnitInfo = Static<typeof EGSUnitInfo>;

// ============================================================================
// Certificates & credentials
// ============================================================================

export const ComplianceCSID = Type.Object({
    requestId: Type.Number({ description: "Request ID needed for the production CSID call" }),
    binarySecurityToken: Type.String({ description: "Certificate token (base64)" }),
    secret: Type.String(),
});
export type ComplianceCSID = Static<typeof ComplianceCSID>;

export const ProductionCSID = Type.Object({
    requestId: Type.Number(),
    binarySecurityToken: Type.String(),
    secret: Type.String(),
    tokenType: Type.Optional(Type.String()),
});
export type ProductionCSID = Static<typeof ProductionCSID>;

// ============================================================================
// Invoice enums
// ============================================================================

export const InvoiceTypeCode = Type.Union([
    Type.Literal("388"), // Tax invoice
    Type.Literal("381"), // Credit note
    Type.Literal("383"), // Debit note
]);
export type InvoiceTypeCode = Static<typeof InvoiceTypeCode>;

/**
 * InvoiceTypeCode/@name — 7 positions "NNPNESB":
 * 01/02 = standard/simplified, then third-party, nominal, export, summary,
 * self-billed flags. Common values: "0100000" (standard), "0200000" (simplified).
 */
export const InvoiceSubType = Type.String({ pattern: "^0[12][01]{5}$" });
export type InvoiceSubType = Static<typeof InvoiceSubType>;

export const STANDARD_INVOICE: InvoiceSubType = "0100000";
export const SIMPLIFIED_INVOICE: InvoiceSubType = "0200000";

export const VATCategory = Type.Union([
    Type.Literal("S"), // Standard rate
    Type.Literal("Z"), // Zero rated
    Type.Literal("E"), // Exempt
    Type.Literal("O"), // Out of scope
]);
export type VATCategory = Static<typeof VATCategory>;

// ============================================================================
// Parties
// ============================================================================

export const PartyAddress = Type.Object({
    street: Type.String(),
    additionalStreet: Type.Optional(Type.String()),
    buildingNumber: Type.String(),
    plotIdentification: Type.Optional(Type.String()),
    citySubdivision: Type.Optional(Type.String({ description: "District — mandatory for the seller" })),
    city: Type.String(),
    postalCode: Type.String(),
    countrySubentity: Type.Optional(Type.String({ description: "Region/state" })),
    country: Type.String({ default: "SA" }),
});
export type PartyAddress = Static<typeof PartyAddress>;

export const PartyIdentification = Type.Object({
    schemeId: Type.Union([
        Type.Literal("CRN"), // Commercial registration
        Type.Literal("MOM"), // Momrah license
        Type.Literal("MLS"), // MHRSD license
        Type.Literal("700"), // 700 number
        Type.Literal("SAG"), // MISA license
        Type.Literal("NAT"), // National ID
        Type.Literal("GCC"), // GCC ID
        Type.Literal("IQA"), // Iqama
        Type.Literal("PAS"), // Passport
        Type.Literal("TIN"), // Tax identification number
        Type.Literal("OTH"), // Other
    ]),
    value: Type.String(),
});
export type PartyIdentification = Static<typeof PartyIdentification>;

export const InvoiceParty = Type.Object({
    registrationName: Type.String(),
    /** Required for the seller; optional for buyers without VAT registration */
    vatNumber: Type.Optional(Type.String({ pattern: "^3\\d{13}3$" })),
    identification: Type.Optional(PartyIdentification),
    address: PartyAddress,
});
export type InvoiceParty = Static<typeof InvoiceParty>;

// ============================================================================
// Invoice content
// ============================================================================

export const InvoiceLine = Type.Object({
    id: Type.String(),
    name: Type.String(),
    quantity: Type.Number({ minimum: 0 }),
    unitCode: Type.String({ default: "PCE" }),
    /** Unit price, VAT-exclusive, after item price discounts */
    unitPrice: Type.Number({ minimum: 0 }),
    /** VAT-exclusive line net = round2(quantity × unitPrice − discount) */
    lineTotal: Type.Number(),
    vatCategory: VATCategory,
    vatPercent: Type.Number({ default: 15 }),
    vatAmount: Type.Number(),
    discount: Type.Optional(Type.Number({ default: 0 })),
    discountReason: Type.Optional(Type.String()),
});
export type InvoiceLine = Static<typeof InvoiceLine>;

export const DocumentAllowance = Type.Object({
    amount: Type.Number({ minimum: 0 }),
    reason: Type.String(),
    vatCategory: VATCategory,
    vatPercent: Type.Number(),
});
export type DocumentAllowance = Static<typeof DocumentAllowance>;

export const TaxSubtotal = Type.Object({
    taxableAmount: Type.Number(),
    taxAmount: Type.Number(),
    taxCategory: VATCategory,
    taxPercent: Type.Number(),
    /** Required when taxCategory is Z/E/O */
    exemptionReasonCode: Type.Optional(Type.String()),
    exemptionReason: Type.Optional(Type.String()),
});
export type TaxSubtotal = Static<typeof TaxSubtotal>;

export const Invoice = Type.Object({
    // Identification
    id: Type.String({ description: "Invoice number (sequential, unique per seller)" }),
    uuid: Type.String(),
    issueDate: Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" }),
    issueTime: Type.String({ pattern: "^\\d{2}:\\d{2}:\\d{2}$" }),

    // Type
    invoiceTypeCode: InvoiceTypeCode,
    invoiceSubType: InvoiceSubType,

    // Currency
    documentCurrency: Type.String({ default: "SAR" }),
    taxCurrency: Type.String({ default: "SAR" }),
    /** Required when documentCurrency ≠ SAR (KSA-8): SAR per 1 unit of document currency */
    taxExchangeRate: Type.Optional(Type.Number()),

    // Credit/debit note reference (mandatory for 381/383)
    billingReference: Type.Optional(Type.Object({
        invoiceId: Type.String({ description: "ID of the invoice being corrected" }),
    })),
    /** Reason for issuing a credit/debit note — mandatory for 381/383 (KSA-10) */
    creditDebitReason: Type.Optional(Type.String()),

    // Counter chain
    invoiceCounterValue: Type.Number({ description: "ICV — sequential counter" }),
    previousInvoiceHash: Type.String({ description: "PIH — hash of the previous invoice" }),

    // Parties
    seller: InvoiceParty,
    buyer: Type.Optional(InvoiceParty),

    // Delivery (supply date — required for standard invoices)
    actualDeliveryDate: Type.Optional(Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" })),
    latestDeliveryDate: Type.Optional(Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" })),

    // Payment
    paymentMeansCode: Type.String({ default: "10" }),

    // Document-level allowances (discounts)
    allowances: Type.Optional(Type.Array(DocumentAllowance)),

    // Totals (all in documentCurrency unless noted)
    lineExtensionAmount: Type.Number({ description: "Σ line totals" }),
    taxExclusiveAmount: Type.Number({ description: "Σ lines − document allowances" }),
    taxInclusiveAmount: Type.Number(),
    allowanceTotalAmount: Type.Optional(Type.Number()),
    prepaidAmount: Type.Optional(Type.Number()),
    payableRoundingAmount: Type.Optional(Type.Number()),
    payableAmount: Type.Number(),

    // VAT breakdown
    taxTotal: Type.Number({ description: "Total VAT in documentCurrency" }),
    /** Total VAT in SAR (defaults to taxTotal when documentCurrency is SAR) */
    taxTotalInSAR: Type.Optional(Type.Number()),
    taxSubtotals: Type.Array(TaxSubtotal),

    // Lines
    lines: Type.Array(InvoiceLine, { minItems: 1 }),

    note: Type.Optional(Type.String()),
});
export type Invoice = Static<typeof Invoice>;

// ============================================================================
// API request/response types
// ============================================================================

export const InvoiceRequest = Type.Object({
    invoiceHash: Type.String(),
    uuid: Type.String(),
    invoice: Type.String({ description: "Base64 of the signed XML" }),
});
export type InvoiceRequest = Static<typeof InvoiceRequest>;

export const ValidationMessage = Type.Object({
    type: Type.String(),
    code: Type.Union([Type.String(), Type.Null()]),
    category: Type.Union([Type.String(), Type.Null()]),
    message: Type.String(),
    status: Type.String(),
});
export type ValidationMessage = Static<typeof ValidationMessage>;

export const ValidationResults = Type.Object({
    infoMessages: Type.Array(ValidationMessage),
    warningMessages: Type.Array(ValidationMessage),
    errorMessages: Type.Array(ValidationMessage),
    status: Type.Union([
        Type.Literal("PASS"),
        Type.Literal("WARNING"),
        Type.Literal("ERROR"),
    ]),
});
export type ValidationResults = Static<typeof ValidationResults>;

export const ClearanceResponse = Type.Object({
    validationResults: Type.Optional(ValidationResults),
    clearanceStatus: Type.Optional(Type.Union([
        Type.Literal("CLEARED"),
        Type.Literal("NOT_CLEARED"),
    ])),
    clearedInvoice: Type.Optional(Type.Union([Type.String(), Type.Null()])),
});
export type ClearanceResponse = Static<typeof ClearanceResponse>;

export const ReportingResponse = Type.Object({
    validationResults: Type.Optional(ValidationResults),
    reportingStatus: Type.Optional(Type.Union([
        Type.Literal("REPORTED"),
        Type.Literal("NOT_REPORTED"),
    ])),
});
export type ReportingResponse = Static<typeof ReportingResponse>;

// ============================================================================
// QR payload
// ============================================================================

export const SignedInvoiceData = Type.Object({
    sellerName: Type.String(),
    vatNumber: Type.String(),
    timestamp: Type.String({ description: "issueDate + 'T' + issueTime, literal" }),
    invoiceTotal: Type.String(),
    vatTotal: Type.String(),
    invoiceHash: Type.String({ description: "Base64 string (stored as text)" }),
    digitalSignature: Type.String({ description: "Base64 string (stored as text)" }),
    publicKey: Type.String({ description: "Base64 of the SPKI DER (stored as raw bytes)" }),
    certificateSignature: Type.String({ description: "Base64 of the cert signature (stored as raw bytes)" }),
});
export type SignedInvoiceData = Static<typeof SignedInvoiceData>;
