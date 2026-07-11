// file: src/lib/client.ts
// ZATCA SDK - High-level client

import { EGS, type EGSState } from "./egs/device";
import { signInvoice, type SignedInvoice } from "./egs/invoice-signer";
import { clearInvoice } from "./api/clearance";
import { reportInvoice } from "./api/reporting";
import { ConfigurationError } from "./errors";
import type {
    ClearanceResponse,
    ComplianceCSID,
    EGSUnitInfo,
    Invoice,
    ProductionCSID,
    ReportingResponse,
    Result,
    ValidationResults,
    ZATCAEnvironment,
} from "./types";

export interface ZATCAClientOptions {
    env: ZATCAEnvironment;
    egsUnit: EGSUnitInfo;
    /** Solution name embedded in the EGS serial number (default "ZATCA-SDK") */
    solutionName?: string;
    /** Persisted state to restore */
    state?: ZATCAClientState;
}

export interface ZATCAClientState {
    egsState: Partial<EGSState>;
    previousInvoiceHash?: string;
    invoiceCounter?: number;
}

export interface SubmissionResult {
    type: "clearance" | "reporting";
    /** True when ZATCA accepted the invoice (REPORTED/CLEARED) */
    accepted: boolean;
    signedInvoice: SignedInvoice;
    response?: ClearanceResponse | ReportingResponse;
    /** Decoded cleared invoice XML (standard invoices only) */
    clearedXml?: string;
    /** Submission error, when accepted is false */
    error?: Error;
}

/**
 * High-level ZATCA e-invoicing client.
 *
 * Manages the device lifecycle (onboarding → signing → submission) plus the
 * ICV counter and PIH chain. Persist getState() after every operation — the
 * ICV/PIH chain must survive restarts.
 *
 * @example
 * const client = new ZATCAClient({ env: "sandbox", egsUnit, solutionName: "MyERP" });
 * await client.onboard("123456");                  // OTP from the Fatoora portal
 * const result = await client.submitInvoice(inv);  // sign + report/clear
 * persist(client.getState());
 */
export class ZATCAClient {
    private readonly egs: EGS;
    private readonly solutionName: string;
    private previousInvoiceHash?: string;
    private invoiceCounter = 0;

    constructor(options: ZATCAClientOptions) {
        this.egs = new EGS(options.egsUnit, options.env);
        this.solutionName = options.solutionName ?? "ZATCA-SDK";
        if (options.state) this.restoreState(options.state);
    }

    getState(): ZATCAClientState {
        return {
            egsState: this.egs.getState(),
            previousInvoiceHash: this.previousInvoiceHash,
            invoiceCounter: this.invoiceCounter,
        };
    }

    restoreState(state: ZATCAClientState): void {
        if (state.egsState) this.egs.setState(state.egsState);
        this.previousInvoiceHash = state.previousInvoiceHash;
        this.invoiceCounter = state.invoiceCounter ?? 0;
    }

    /**
     * Full onboarding: keys + CSR → compliance CSID → production CSID.
     *
     * NOTE: between the compliance CSID and the production CSID, ZATCA expects
     * the device to pass compliance invoice checks for every invoice type it
     * declared (see checkInvoiceCompliance). The sandbox does not enforce this;
     * simulation and production do.
     */
    async onboard(otp: string): Promise<Result<ProductionCSID>> {
        const csrResult = this.egs.generateKeysAndCSR(this.solutionName);
        if (!csrResult.success) return csrResult;

        const complianceResult = await this.egs.issueComplianceCertificate(otp);
        if (!complianceResult.success) return complianceResult;

        return this.egs.issueProductionCertificate();
    }

    /** Onboarding step 1+2 only: keys, CSR, compliance CSID */
    async startOnboarding(otp: string): Promise<Result<ComplianceCSID>> {
        const csrResult = this.egs.generateKeysAndCSR(this.solutionName);
        if (!csrResult.success) return csrResult;
        return this.egs.issueComplianceCertificate(otp);
    }

    /** Onboarding step 4: production CSID (after compliance checks pass) */
    async finishOnboarding(): Promise<Result<ProductionCSID>> {
        return this.egs.issueProductionCertificate();
    }

    /**
     * Sign an invoice with COMPLIANCE credentials and run it through ZATCA's
     * compliance checks (onboarding step 3).
     */
    async checkInvoiceCompliance(invoice: Invoice): Promise<Result<ValidationResults>> {
        const credentials = this.egs.getComplianceCredentials();
        if (!credentials) {
            return {
                success: false,
                error: new ConfigurationError("No compliance credentials. Call startOnboarding() first."),
            };
        }
        const signResult = await signInvoice(this.prepareInvoice(invoice), {
            credentials,
            skipQrImage: true,
            allowCertificateKeyMismatch: this.egs.getEnvironment() === "sandbox",
        });
        if (!signResult.success) return signResult;
        return this.egs.checkInvoiceCompliance(
            signResult.data.signedXml,
            signResult.data.invoiceHash,
            signResult.data.uuid,
        );
    }

    private prepareInvoice(invoice: Invoice): Invoice {
        return {
            ...invoice,
            invoiceCounterValue: invoice.invoiceCounterValue || this.invoiceCounter + 1,
            previousInvoiceHash: invoice.previousInvoiceHash || this.previousInvoiceHash || "",
        };
    }

    /**
     * Sign an invoice with production credentials.
     * On success the ICV counter and PIH chain advance — persist getState().
     */
    async sign(invoice: Invoice): Promise<Result<SignedInvoice>> {
        const credentials = this.egs.getCredentials();
        if (!credentials) {
            return {
                success: false,
                error: new ConfigurationError("Not onboarded. Call onboard() first or restore state."),
            };
        }

        const prepared = this.prepareInvoice(invoice);
        const result = await signInvoice(prepared, {
            credentials,
            // The developer sandbox issues canned certificates that never match
            // the CSR key; simulation/production certificates must match.
            allowCertificateKeyMismatch: this.egs.getEnvironment() === "sandbox",
        });
        if (result.success) {
            this.invoiceCounter = prepared.invoiceCounterValue;
            this.previousInvoiceHash = result.data.invoiceHash;
        }
        return result;
    }

    /**
     * Sign and submit an invoice. Simplified invoices (02xxxxx) are reported;
     * standard invoices (01xxxxx) are cleared.
     *
     * Returns success even when ZATCA rejects the submission — check
     * `data.accepted`. The signed artifacts are always returned so a failed
     * submission can be retried without re-signing (the ICV was consumed).
     */
    async submitInvoice(invoice: Invoice): Promise<Result<SubmissionResult>> {
        const signResult = await this.sign(invoice);
        if (!signResult.success) return signResult;

        const signedInvoice = signResult.data;
        const isStandard = invoice.invoiceSubType.startsWith("01");
        const request = {
            invoiceHash: signedInvoice.invoiceHash,
            uuid: signedInvoice.uuid,
            invoice: signedInvoice.invoiceBase64,
        };
        const apiClient = this.egs.getAPIClient();

        const response = isStandard
            ? await clearInvoice(apiClient, request)
            : await reportInvoice(apiClient, request);

        if (!response.success) {
            return {
                success: true,
                data: {
                    type: isStandard ? "clearance" : "reporting",
                    accepted: false,
                    signedInvoice,
                    error: response.error,
                },
            };
        }

        const clearedXml =
            isStandard && "clearedInvoice" in response.data && response.data.clearedInvoice
                ? Buffer.from(response.data.clearedInvoice, "base64").toString("utf8")
                : undefined;

        return {
            success: true,
            data: {
                type: isStandard ? "clearance" : "reporting",
                accepted: true,
                signedInvoice,
                response: response.data,
                clearedXml,
            },
        };
    }

    /** Renew the production certificate (new OTP from the portal) */
    async renewCertificate(otp: string): Promise<Result<ProductionCSID>> {
        return this.egs.renewCertificate(otp, this.solutionName);
    }

    getInvoiceCounter(): number {
        return this.invoiceCounter;
    }

    getPreviousInvoiceHash(): string | undefined {
        return this.previousInvoiceHash;
    }

    getEGS(): EGS {
        return this.egs;
    }
}
