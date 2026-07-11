// file: src/lib/api/production.ts
// ZATCA SDK - Production CSID issuance

import type { ZATCAAPIClient } from "./client";
import type { ProductionCSID, Result } from "../types";

interface ProductionCSIDResponse {
    requestID: number | string;
    tokenType?: string;
    dispositionMessage: string;
    binarySecurityToken: string;
    secret: string;
}

/**
 * Issue a production CSID after compliance checks pass.
 * Must be called with COMPLIANCE credentials.
 */
export async function issueProductionCSID(
    client: ZATCAAPIClient,
    complianceRequestId: number,
): Promise<Result<ProductionCSID>> {
    const result = await client.post<ProductionCSIDResponse>(
        "/production/csids",
        { compliance_request_id: String(complianceRequestId) },
    );
    if (!result.success) return result;

    return {
        success: true,
        data: {
            requestId: Number(result.data.requestID),
            binarySecurityToken: result.data.binarySecurityToken,
            secret: result.data.secret,
            tokenType: result.data.tokenType,
        },
    };
}
