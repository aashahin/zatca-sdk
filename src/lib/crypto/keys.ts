// file: src/lib/crypto/keys.ts
// ZATCA SDK - Key generation and CSR creation (pure JS, no OpenSSL CLI)
//
// ZATCA requires ECDSA keys on the secp256k1 curve. Bun's node:crypto (BoringSSL)
// does not support secp256k1, so key operations use @noble/curves and the CSR is
// assembled as raw DER via the local asn1 module.

import { secp256k1 } from "@noble/curves/secp256k1.js";
import { createHash } from "crypto";
import { CSRError } from "../errors";
import type { Result, ZATCAEnvironment } from "../types";
import {
    TAG,
    derBitString,
    derChildren,
    derContent,
    derContextExplicit,
    derInteger,
    derOctetString,
    derOid,
    derPrintableString,
    derSequence,
    derSet,
    derUtf8String,
    pemDecode,
    pemEncode,
    readDer,
} from "./asn1";

// ============================================================================
// OIDs
// ============================================================================

const OID = {
    ecPublicKey: "1.2.840.10045.2.1",
    secp256k1: "1.3.132.0.10",
    ecdsaWithSha256: "1.2.840.10045.4.3.2",
    commonName: "2.5.4.3",
    surname: "2.5.4.4",
    countryName: "2.5.4.6",
    organizationName: "2.5.4.10",
    organizationalUnitName: "2.5.4.11",
    title: "2.5.4.12",
    businessCategory: "2.5.4.15",
    registeredAddress: "2.5.4.26",
    userId: "0.9.2342.19200300.100.1.1",
    extensionRequest: "1.2.840.113549.1.9.14",
    subjectAltName: "2.5.29.17",
    certificateTemplateName: "1.3.6.1.4.1.311.20.2",
} as const;

/**
 * Certificate template name per ZATCA environment.
 * This extension is MANDATORY in the CSR — without it ZATCA rejects onboarding
 * or issues the wrong certificate type.
 */
export const CSR_TEMPLATE_NAMES: Record<ZATCAEnvironment, string> = {
    sandbox: "TSTZATCA-Code-Signing",
    simulation: "PREZATCA-Code-Signing",
    production: "ZATCA-Code-Signing",
};

// ============================================================================
// Key pair generation & PEM handling
// ============================================================================

export interface KeyPair {
    /** PKCS#8 PEM private key */
    privateKey: string;
    /** SPKI PEM public key */
    publicKey: string;
}

function spkiFromPublicPoint(publicPoint: Uint8Array): Buffer {
    return derSequence(
        derSequence(derOid(OID.ecPublicKey), derOid(OID.secp256k1)),
        derBitString(publicPoint),
    );
}

function pkcs8FromScalar(d: Uint8Array, publicPoint: Uint8Array): Buffer {
    // Inner SEC1 ECPrivateKey (without curve parameters; carried by PKCS#8 header)
    const sec1 = derSequence(
        derInteger(1),
        derOctetString(d),
        derContextExplicit(1, derBitString(publicPoint)),
    );
    return derSequence(
        derInteger(0),
        derSequence(derOid(OID.ecPublicKey), derOid(OID.secp256k1)),
        derOctetString(sec1),
    );
}

/**
 * Generate an ECDSA secp256k1 key pair (ZATCA requirement).
 */
export function generateKeyPair(): Result<KeyPair> {
    try {
        const d = secp256k1.utils.randomSecretKey();
        const publicPoint = secp256k1.getPublicKey(d, false);
        return {
            success: true,
            data: {
                privateKey: pemEncode("PRIVATE KEY", pkcs8FromScalar(d, publicPoint)),
                publicKey: pemEncode("PUBLIC KEY", spkiFromPublicPoint(publicPoint)),
            },
        };
    } catch (error) {
        return {
            success: false,
            error: new CSRError(
                `Key generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            ),
        };
    }
}

/**
 * Extract the raw 32-byte private scalar from a PEM private key.
 * Supports PKCS#8 ("PRIVATE KEY") and SEC1 ("EC PRIVATE KEY"), with or
 * without PEM headers (bare base64 DER body is accepted too).
 */
export function parsePrivateKey(privateKeyPem: string): Uint8Array {
    const derBytes = pemDecode(
        privateKeyPem.includes("-----BEGIN")
            ? privateKeyPem
            : `-----BEGIN PRIVATE KEY-----\n${privateKeyPem.trim()}\n-----END PRIVATE KEY-----`,
    );

    const root = readDer(derBytes, 0);
    if (root.tag !== TAG.SEQUENCE) throw new CSRError("Invalid private key: not a DER SEQUENCE");
    const children = derChildren(derBytes, root);
    const first = children[0];
    if (!first || first.tag !== TAG.INTEGER) throw new CSRError("Invalid private key structure");

    const version = derContent(derBytes, first);

    // SEC1: SEQ { INTEGER(1), OCTET STRING(d), ... }
    if (version.length === 1 && version[0] === 1) {
        const octet = children[1];
        if (!octet || octet.tag !== TAG.OCTET_STRING) throw new CSRError("Invalid SEC1 key");
        return normalizeScalar(derContent(derBytes, octet));
    }

    // PKCS#8: SEQ { INTEGER(0), SEQ{alg}, OCTET STRING(SEC1) }
    if (version.length === 1 && version[0] === 0) {
        const inner = children[2];
        if (!inner || inner.tag !== TAG.OCTET_STRING) throw new CSRError("Invalid PKCS#8 key");
        const sec1Bytes = derContent(derBytes, inner);
        const sec1Root = readDer(sec1Bytes, 0);
        const sec1Children = derChildren(sec1Bytes, sec1Root);
        const octet = sec1Children[1];
        if (!octet || octet.tag !== TAG.OCTET_STRING) throw new CSRError("Invalid PKCS#8 inner key");
        return normalizeScalar(derContent(sec1Bytes, octet));
    }

    throw new CSRError("Unsupported private key format");
}

function normalizeScalar(bytes: Uint8Array): Uint8Array {
    if (bytes.length === 32) return Uint8Array.from(bytes);
    const out = new Uint8Array(32);
    if (bytes.length < 32) {
        out.set(bytes, 32 - bytes.length);
    } else {
        out.set(bytes.subarray(bytes.length - 32));
    }
    return out;
}

/** Derive the SPKI PEM public key from a private key PEM */
export function derivePublicKey(privateKeyPem: string): string {
    const d = parsePrivateKey(privateKeyPem);
    return pemEncode("PUBLIC KEY", spkiFromPublicPoint(secp256k1.getPublicKey(d, false)));
}

// ============================================================================
// CSR generation
// ============================================================================

export interface CSRInput {
    /** Common name for the certificate (free text, e.g. "TST-886431145-3999...") */
    commonName: string;
    /** Legal organization (taxpayer) name */
    organizationName: string;
    /** Organization unit — branch name (for VAT groups: 10-digit TIN of member) */
    organizationUnit: string;
    /** ISO2 country code, "SA" */
    countryCode: string;
    /** EGS serial in ZATCA format: "1-<solution>|2-<model>|3-<serial/uuid>" */
    egsSerialNumber: string;
    /** 15-digit VAT registration number (starts and ends with 3) */
    vatNumber: string;
    /**
     * Invoice type functionality map "TSCZ" (T=standard tax, S=simplified):
     * "1000" standard only, "0100" simplified only, "1100" both
     */
    invoiceType: string;
    /** Branch location / address (e.g. short address "RRRD2929" or street) */
    location: string;
    /** Industry / business category (e.g. "Supply activities") */
    industry: string;
}

export interface GeneratedCSR {
    /** PEM-encoded CSR */
    pem: string;
    /** Base64 of the full PEM — the format the ZATCA compliance API expects */
    base64: string;
}

function rdn(oid: string, value: Buffer): Buffer {
    return derSet(derSequence(derOid(oid), value));
}

function validateCSRInput(input: CSRInput): string[] {
    const errors: string[] = [];
    if (!/^3\d{13}3$/.test(input.vatNumber)) {
        errors.push(`vatNumber must be 15 digits starting and ending with 3, got "${input.vatNumber}"`);
    }
    if (!/^[01]{4}$/.test(input.invoiceType)) {
        errors.push(`invoiceType must be 4 binary flags (e.g. "1100"), got "${input.invoiceType}"`);
    }
    if (!/^[A-Z]{2}$/.test(input.countryCode)) {
        errors.push(`countryCode must be 2 uppercase letters, got "${input.countryCode}"`);
    }
    if (!/^1-.+\|2-.+\|3-.+$/.test(input.egsSerialNumber)) {
        errors.push(`egsSerialNumber must match "1-...|2-...|3-...", got "${input.egsSerialNumber}"`);
    }
    for (const field of ["commonName", "organizationName", "organizationUnit", "location", "industry"] as const) {
        if (!input[field]?.trim()) errors.push(`${field} is required`);
    }
    return errors;
}

/**
 * Generate a ZATCA-compliant CSR.
 *
 * The environment selects the mandatory certificateTemplateName extension value:
 * sandbox → TSTZATCA-Code-Signing, simulation → PREZATCA-Code-Signing,
 * production → ZATCA-Code-Signing.
 */
export function generateCSR(
    input: CSRInput,
    privateKeyPem: string,
    env: ZATCAEnvironment,
): Result<GeneratedCSR> {
    try {
        const inputErrors = validateCSRInput(input);
        if (inputErrors.length > 0) {
            return { success: false, error: new CSRError(`Invalid CSR input: ${inputErrors.join("; ")}`) };
        }

        const d = parsePrivateKey(privateKeyPem);
        const publicPoint = secp256k1.getPublicKey(d, false);

        const subject = derSequence(
            rdn(OID.countryName, derPrintableString(input.countryCode)),
            rdn(OID.organizationalUnitName, derUtf8String(input.organizationUnit)),
            rdn(OID.organizationName, derUtf8String(input.organizationName)),
            rdn(OID.commonName, derUtf8String(input.commonName)),
        );

        // subjectAltName: dirName with the ZATCA-specific RDNs
        const sanDirName = derSequence(
            rdn(OID.surname, derUtf8String(input.egsSerialNumber)),
            rdn(OID.userId, derUtf8String(input.vatNumber)),
            rdn(OID.title, derUtf8String(input.invoiceType)),
            rdn(OID.registeredAddress, derUtf8String(input.location)),
            rdn(OID.businessCategory, derUtf8String(input.industry)),
        );
        // GeneralNames: [4] directoryName (explicit constructed)
        const generalNames = derSequence(derContextExplicit(4, sanDirName));

        const extensions = derSequence(
            derSequence(
                derOid(OID.certificateTemplateName),
                derOctetString(derUtf8String(CSR_TEMPLATE_NAMES[env])),
            ),
            derSequence(
                derOid(OID.subjectAltName),
                derOctetString(generalNames),
            ),
        );

        const attributes = derContextExplicit(
            0,
            derSequence(derOid(OID.extensionRequest), derSet(extensions)),
        );
        // NOTE: [0] here is an IMPLICIT context tag over SET OF Attribute, but since
        // Attribute content has identical byte layout, constructed [0] wrapping is
        // compatible with OpenSSL `req -verify` (manually verified against the
        // generated CSR). Tests cover key/CSR structural round-trips.

        const certificationRequestInfo = derSequence(
            derInteger(0),
            subject,
            spkiFromPublicPoint(publicPoint),
            attributes,
        );

        // noble hashes the message internally (prehash: true by default)
        const signature = secp256k1.sign(certificationRequestInfo, d, { format: "der" });

        const csrDer = derSequence(
            certificationRequestInfo,
            derSequence(derOid(OID.ecdsaWithSha256)),
            derBitString(signature),
        );

        const pem = pemEncode("CERTIFICATE REQUEST", csrDer);
        return {
            success: true,
            data: { pem, base64: Buffer.from(pem).toString("base64") },
        };
    } catch (error) {
        return {
            success: false,
            error: new CSRError(
                `CSR generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            ),
        };
    }
}

// ============================================================================
// Hash helpers
// ============================================================================

/** SHA-256 → Base64 */
export function sha256(content: string | Buffer): string {
    return createHash("sha256").update(content).digest("base64");
}

/** SHA-256 → hex */
export function sha256Hex(content: string | Buffer): string {
    return createHash("sha256").update(content).digest("hex");
}
