// file: src/lib/egs/device.ts
// ZATCA SDK - EGS (E-Invoice Generation System) device lifecycle

import { ZATCAAPIClient } from "../api/client";
import { issueComplianceCSID, checkInvoiceCompliance } from "../api/compliance";
import { issueProductionCSID } from "../api/production";
import { renewProductionCSID } from "../api/renewal";
import { generateKeyPair, generateCSR, type CSRInput } from "../crypto/keys";
import { ConfigurationError } from "../errors";
import type {
    ComplianceCSID,
    EGSUnitInfo,
    ProductionCSID,
    Result,
    ValidationResults,
    ZATCAEnvironment,
} from "../types";

export interface EGSState {
    privateKey?: string;
    publicKey?: string;
    csr?: string;
    complianceCertificate?: string;
    complianceSecret?: string;
    complianceRequestId?: number;
    productionCertificate?: string;
    productionSecret?: string;
}

export interface EGSCredentials {
    /** binarySecurityToken (works both for API auth and for signing) */
    certificate: string;
    privateKey: string;
    secret: string;
}

/**
 * Manages a ZATCA invoicing device: keys/CSR, compliance CSID, compliance
 * checks, production CSID, and renewal. State is a plain object the caller
 * persists (encrypt the private key and secrets at rest).
 */
export class EGS {
    private readonly unitInfo: EGSUnitInfo;
    private readonly env: ZATCAEnvironment;
    private state: EGSState = {};
    private apiClient: ZATCAAPIClient;

    constructor(unitInfo: EGSUnitInfo, env: ZATCAEnvironment = "sandbox") {
        this.unitInfo = unitInfo;
        this.env = env;
        this.apiClient = new ZATCAAPIClient({ env });
    }

    getState(): EGSState {
        return { ...this.state };
    }

    setState(state: Partial<EGSState>): void {
        this.state = { ...this.state, ...state };
        this.applyCredentialsToClient();
    }

    private applyCredentialsToClient(): void {
        if (this.state.productionCertificate && this.state.productionSecret) {
            this.apiClient.updateCredentials(this.state.productionCertificate, this.state.productionSecret);
        } else if (this.state.complianceCertificate && this.state.complianceSecret) {
            this.apiClient.updateCredentials(this.state.complianceCertificate, this.state.complianceSecret);
        }
    }

    /** Production credentials for signing + submission (null until onboarded) */
    getCredentials(): EGSCredentials | null {
        if (this.state.productionCertificate && this.state.productionSecret && this.state.privateKey) {
            return {
                certificate: this.state.productionCertificate,
                privateKey: this.state.privateKey,
                secret: this.state.productionSecret,
            };
        }
        return null;
    }

    /** Compliance credentials (for compliance invoice checks during onboarding) */
    getComplianceCredentials(): EGSCredentials | null {
        if (this.state.complianceCertificate && this.state.complianceSecret && this.state.privateKey) {
            return {
                certificate: this.state.complianceCertificate,
                privateKey: this.state.privateKey,
                secret: this.state.complianceSecret,
            };
        }
        return null;
    }

    private buildCSRInput(solutionName: string): CSRInput {
        return {
            commonName: this.unitInfo.commonName,
            organizationName: this.unitInfo.organizationName,
            organizationUnit: this.unitInfo.branchName,
            countryCode: this.unitInfo.countryCode,
            egsSerialNumber: `1-${solutionName}|2-${this.unitInfo.model ?? solutionName}|3-${this.unitInfo.uuid}`,
            vatNumber: this.unitInfo.vatNumber,
            invoiceType: this.unitInfo.invoiceType,
            location: this.unitInfo.location,
            industry: this.unitInfo.branchIndustry,
        };
    }

    /** Generate a fresh key pair + CSR and store them in state */
    generateKeysAndCSR(solutionName: string): Result<{ privateKey: string; csr: string }> {
        const keyResult = generateKeyPair();
        if (!keyResult.success) return keyResult;

        const csrResult = generateCSR(this.buildCSRInput(solutionName), keyResult.data.privateKey, this.env);
        if (!csrResult.success) return csrResult;

        this.state.privateKey = keyResult.data.privateKey;
        this.state.publicKey = keyResult.data.publicKey;
        this.state.csr = csrResult.data.base64;

        return {
            success: true,
            data: { privateKey: keyResult.data.privateKey, csr: csrResult.data.base64 },
        };
    }

    /**
     * Issue a compliance CSID.
     * @param otp OTP from the Fatoora portal (any value on the sandbox env)
     */
    async issueComplianceCertificate(otp: string): Promise<Result<ComplianceCSID>> {
        if (!this.state.csr) {
            return {
                success: false,
                error: new ConfigurationError("CSR not generated. Call generateKeysAndCSR() first."),
            };
        }

        const result = await issueComplianceCSID(this.apiClient, this.state.csr, otp);
        if (!result.success) return result;

        this.state.complianceCertificate = result.data.binarySecurityToken;
        this.state.complianceSecret = result.data.secret;
        this.state.complianceRequestId = result.data.requestId;
        this.applyCredentialsToClient();
        return result;
    }

    /**
     * Run a signed invoice through the compliance checks endpoint.
     * Uses the COMPLIANCE credentials (this is an onboarding-phase call).
     */
    async checkInvoiceCompliance(
        signedInvoiceXml: string,
        invoiceHash: string,
        uuid: string,
    ): Promise<Result<ValidationResults>> {
        if (!this.state.complianceCertificate || !this.state.complianceSecret) {
            return {
                success: false,
                error: new ConfigurationError("Compliance credentials missing. Issue a compliance CSID first."),
            };
        }
        // Temporarily pin compliance credentials for this call
        const complianceClient = new ZATCAAPIClient({
            env: this.env,
            certificate: this.state.complianceCertificate,
            secret: this.state.complianceSecret,
        });
        const result = await checkInvoiceCompliance(complianceClient, {
            invoiceHash,
            uuid,
            invoice: Buffer.from(signedInvoiceXml, "utf8").toString("base64"),
        });
        if (!result.success) return result;
        return { success: true, data: result.data.validationResults };
    }

    /** Issue the production CSID (after compliance checks pass) */
    async issueProductionCertificate(): Promise<Result<ProductionCSID>> {
        if (!this.state.complianceRequestId) {
            return {
                success: false,
                error: new ConfigurationError("Compliance request ID missing. Issue a compliance CSID first."),
            };
        }
        if (!this.state.complianceCertificate || !this.state.complianceSecret) {
            return {
                success: false,
                error: new ConfigurationError("Compliance credentials missing. Issue a compliance CSID first."),
            };
        }

        const complianceClient = new ZATCAAPIClient({
            env: this.env,
            certificate: this.state.complianceCertificate,
            secret: this.state.complianceSecret,
        });
        const result = await issueProductionCSID(complianceClient, this.state.complianceRequestId);
        if (!result.success) return result;

        this.state.productionCertificate = result.data.binarySecurityToken;
        this.state.productionSecret = result.data.secret;
        this.applyCredentialsToClient();
        return result;
    }

    /**
     * Renew the production CSID with a fresh key pair + CSR.
     * State is only replaced after the renewal succeeds — a failed renewal
     * leaves the current working credentials untouched.
     */
    async renewCertificate(otp: string, solutionName: string): Promise<Result<ProductionCSID>> {
        if (!this.apiClient.hasCredentials()) {
            return {
                success: false,
                error: new ConfigurationError("Production credentials required for renewal."),
            };
        }

        const keyResult = generateKeyPair();
        if (!keyResult.success) return keyResult;
        const csrResult = generateCSR(this.buildCSRInput(solutionName), keyResult.data.privateKey, this.env);
        if (!csrResult.success) return csrResult;

        const result = await renewProductionCSID(this.apiClient, csrResult.data.base64, otp);
        if (!result.success) return result;

        // Commit only after success
        this.state.privateKey = keyResult.data.privateKey;
        this.state.publicKey = keyResult.data.publicKey;
        this.state.csr = csrResult.data.base64;
        this.state.productionCertificate = result.data.binarySecurityToken;
        this.state.productionSecret = result.data.secret;
        this.applyCredentialsToClient();
        return result;
    }

    getAPIClient(): ZATCAAPIClient {
        return this.apiClient;
    }

    getUnitInfo(): EGSUnitInfo {
        return { ...this.unitInfo };
    }

    getEnvironment(): ZATCAEnvironment {
        return this.env;
    }
}
