// file: src/lib/api/compliance.ts
// ZATCA SDK - Compliance API (CSID issuance + compliance invoice checks)

import type { ZATCAAPIClient } from "./client";
import type { ComplianceCSID, Result, ValidationResults } from "../types";
import { parseCsidResponse } from "./csid";

interface ComplianceCSIDResponse {
    requestID: number | string;
    dispositionMessage: string;
    binarySecurityToken: string;
    secret: string;
}

/**
 * Issue a compliance CSID from a CSR.
 *
 * @param csrBase64 Base64 of the PEM CSR
 * @param otp OTP from the Fatoora portal (any value works on sandbox)
 */
export async function issueComplianceCSID(
    client: ZATCAAPIClient,
    csrBase64: string,
    otp: string,
): Promise<Result<ComplianceCSID>> {
    const result = await client.post<ComplianceCSIDResponse>(
        "/compliance",
        { csr: csrBase64 },
        { authenticated: false, headers: { OTP: otp } },
    );
    if (!result.success) return result;

    const parsed = parseCsidResponse(result.data, "compliance");
    if (!parsed.success) return parsed;

    return {
        success: true,
        data: {
            requestId: parsed.data.requestId,
            binarySecurityToken: parsed.data.binarySecurityToken,
            secret: parsed.data.secret,
        },
    };
}

export interface ComplianceCheckResponse {
    validationResults: ValidationResults;
    reportingStatus?: string;
    clearanceStatus?: string;
    qrSellertStatus?: string | null;
    qrBuyertStatus?: string | null;
}

/**
 * Validate a signed invoice against ZATCA's compliance checks.
 * Requires COMPLIANCE credentials (from issueComplianceCSID).
 */
export async function checkInvoiceCompliance(
    client: ZATCAAPIClient,
    invoiceRequest: { invoiceHash: string; uuid: string; invoice: string },
): Promise<Result<ComplianceCheckResponse>> {
    return client.post<ComplianceCheckResponse>("/compliance/invoices", invoiceRequest);
}
