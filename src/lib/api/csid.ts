// file: src/lib/api/csid.ts
// Shared CSID response parsing (compliance / production / renewal)

import { APIError } from "../errors";
import type { Result } from "../types";

export interface CsidResponseBody {
    requestID?: unknown;
    binarySecurityToken?: string;
    secret?: string;
    tokenType?: string;
}

export interface ParsedCsid {
    requestId: number;
    binarySecurityToken: string;
    secret: string;
    tokenType?: string;
}

export function parseCsidResponse(body: CsidResponseBody, source: string): Result<ParsedCsid> {
    const requestId = Number(body.requestID);
    if (!Number.isFinite(requestId) || !Number.isInteger(requestId) || requestId <= 0) {
        return {
            success: false,
            error: new APIError(`Invalid requestID in ${source} response: ${body.requestID}`, 200, body),
        };
    }
    if (!body.binarySecurityToken || !body.secret) {
        return {
            success: false,
            error: new APIError(`${source} response missing binarySecurityToken or secret`, 200, body),
        };
    }
    return {
        success: true,
        data: {
            requestId,
            binarySecurityToken: body.binarySecurityToken,
            secret: body.secret,
            tokenType: body.tokenType,
        },
    };
}
