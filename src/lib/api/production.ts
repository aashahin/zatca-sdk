// file: src/lib/api/production.ts
// ZATCA SDK - Production CSID issuance

import type { ZATCAAPIClient } from "./client";
import type { ProductionCSID, Result } from "../types";
import { parseCsidResponse } from "./csid";

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

    const parsed = parseCsidResponse(result.data, "production");
    if (!parsed.success) return parsed;

    return {
        success: true,
        data: {
            requestId: parsed.data.requestId,
            binarySecurityToken: parsed.data.binarySecurityToken,
            secret: parsed.data.secret,
            tokenType: parsed.data.tokenType,
        },
    };
}
