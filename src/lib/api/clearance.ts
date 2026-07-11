// file: src/lib/api/clearance.ts
// ZATCA SDK - Clearance API (standard invoices, B2B)

import type { ZATCAAPIClient } from "./client";
import type { ClearanceResponse, InvoiceRequest, Result } from "../types";

/**
 * Clear a signed standard invoice. ZATCA validates, stamps, and returns the
 * cleared invoice (base64) which is the legally valid document to deliver.
 * Requires PRODUCTION credentials.
 */
export async function clearInvoice(
    client: ZATCAAPIClient,
    invoice: InvoiceRequest,
): Promise<Result<ClearanceResponse>> {
    return client.post<ClearanceResponse>("/invoices/clearance/single", invoice, {
        headers: { "Clearance-Status": "1" },
    });
}
