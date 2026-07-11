// file: src/lib/api/reporting.ts
// ZATCA SDK - Reporting API (simplified invoices, B2C)

import type { ZATCAAPIClient } from "./client";
import type { InvoiceRequest, ReportingResponse, Result } from "../types";

/**
 * Report a signed simplified invoice (must be reported within 24h of issuance).
 * Requires PRODUCTION credentials.
 */
export async function reportInvoice(
    client: ZATCAAPIClient,
    invoice: InvoiceRequest,
): Promise<Result<ReportingResponse>> {
    return client.post<ReportingResponse>("/invoices/reporting/single", invoice);
}
