// file: src/lib/api/renewal.ts
// ZATCA SDK - Production CSID renewal

import type { ZATCAAPIClient } from "./client";
import type { ProductionCSID, Result } from "../types";
import { parseCsidResponse } from "./csid";

interface RenewalResponse {
    requestID: number | string;
    tokenType?: string;
    dispositionMessage: string;
    binarySecurityToken: string;
    secret: string;
}

/**
 * Renew a production CSID with a new CSR.
 * Requires the CURRENT production credentials plus a fresh OTP.
 */
export async function renewProductionCSID(
    client: ZATCAAPIClient,
    csrBase64: string,
    otp: string,
): Promise<Result<ProductionCSID>> {
    const result = await client.patch<RenewalResponse>(
        "/production/csids",
        { csr: csrBase64 },
        { headers: { OTP: otp } },
    );
    if (!result.success) return result;

    const parsed = parseCsidResponse(result.data, "renewal");
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
