// file: src/lib/egs/index.ts
// ZATCA SDK - EGS module exports

export { EGS, type EGSCredentials, type EGSState } from "./device";
export {
    computeInvoiceHash,
    signInvoice,
    validateInvoice,
    type SignedInvoice,
    type SignerConfig,
    type SignerCredentials,
} from "./invoice-signer";
export {
    generateOnboardingKeys,
    requestComplianceCertificate,
    requestProductionCertificate,
    validateCredentials,
    type KeysAndCSR,
} from "./onboarding";
