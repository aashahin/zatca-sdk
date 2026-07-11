// file: src/lib/egs/onboarding.ts
// ZATCA SDK - Standalone onboarding helpers (keys → CSR → CSIDs)
//
// For most integrations prefer ZATCAClient.onboard() / the EGS class, which
// manage state for you. These helpers exist for step-by-step flows.

import { generateKeyPair, generateCSR, type CSRInput } from "../crypto/keys";
import { validateCertificate } from "../crypto/certificate";
import { ZATCAAPIClient } from "../api/client";
import { issueComplianceCSID } from "../api/compliance";
import { issueProductionCSID } from "../api/production";
import type { ComplianceCSID, ProductionCSID, Result, ZATCAEnvironment } from "../types";

export interface KeysAndCSR {
    /** PKCS#8 PEM private key — store encrypted */
    privateKey: string;
    /** SPKI PEM public key */
    publicKey: string;
    /** Base64 CSR, ready for the compliance endpoint */
    csr: string;
}

/**
 * Step 1: generate a key pair and ZATCA CSR.
 */
export function generateOnboardingKeys(
    csrInput: CSRInput,
    env: ZATCAEnvironment,
): Result<KeysAndCSR> {
    const keys = generateKeyPair();
    if (!keys.success) return keys;

    const csr = generateCSR(csrInput, keys.data.privateKey, env);
    if (!csr.success) return csr;

    return {
        success: true,
        data: {
            privateKey: keys.data.privateKey,
            publicKey: keys.data.publicKey,
            csr: csr.data.base64,
        },
    };
}

/**
 * Step 2: exchange CSR + OTP for a compliance CSID.
 */
export async function requestComplianceCertificate(
    csrBase64: string,
    otp: string,
    env: ZATCAEnvironment = "sandbox",
): Promise<Result<ComplianceCSID>> {
    const client = new ZATCAAPIClient({ env });
    return issueComplianceCSID(client, csrBase64, otp);
}

/**
 * Step 4 (after compliance invoice checks pass): request the production CSID.
 */
export async function requestProductionCertificate(
    compliance: ComplianceCSID,
    env: ZATCAEnvironment = "sandbox",
): Promise<Result<ProductionCSID>> {
    const client = new ZATCAAPIClient({
        env,
        certificate: compliance.binarySecurityToken,
        secret: compliance.secret,
    });
    return issueProductionCSID(client, compliance.requestId);
}

/**
 * Check whether stored credentials are still usable (certificate validity).
 */
export function validateCredentials(
    certificate: string,
): Result<{ valid: boolean; daysUntilExpiry: number }> {
    const certResult = validateCertificate(certificate);
    if (!certResult.success) return certResult;
    return {
        success: true,
        data: {
            valid: certResult.data.isValid,
            daysUntilExpiry: certResult.data.daysUntilExpiry,
        },
    };
}
