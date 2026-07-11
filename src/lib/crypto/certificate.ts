// file: src/lib/crypto/certificate.ts
// ZATCA SDK - X.509 certificate parsing (pure JS DER walker)
//
// Bun's X509Certificate cannot expose secp256k1 public keys, and shelling out to
// `openssl x509 -text` is fragile across OpenSSL versions, so the fields ZATCA
// needs are read directly from the certificate DER.

import { createHash } from "crypto";
import { CertificateError } from "../errors";
import type { Result } from "../types";
import {
    TAG,
    type DerNode,
    decodeOid,
    decodeTime,
    derChildren,
    derContent,
    pemDecode,
    readDer,
} from "./asn1";

// ============================================================================
// Input normalization
// ============================================================================

export interface NormalizedCertificate {
    /** Raw certificate DER */
    der: Uint8Array;
    /** Single base64 of the DER (PEM body, one line, no headers) */
    base64Body: string;
    /** Standard PEM encoding */
    pem: string;
}

/**
 * Accepts a certificate in any of the forms it shows up in a ZATCA flow:
 * - PEM (-----BEGIN CERTIFICATE-----)
 * - base64 DER body ("MII...")
 * - ZATCA binarySecurityToken (base64 of the base64 DER body — double encoded)
 */
export function normalizeCertificate(input: string): Result<NormalizedCertificate> {
    try {
        const trimmed = input.trim();

        if (trimmed.includes("-----BEGIN CERTIFICATE-----")) {
            return { success: true, data: fromDer(pemDecode(trimmed)) };
        }

        const decoded = Buffer.from(trimmed, "base64");
        if (decoded[0] === 0x30) {
            // Input was the base64 DER body directly
            return { success: true, data: fromDer(decoded) };
        }

        // ZATCA binarySecurityToken: decodes to text (PEM or base64 body)
        const decodedText = decoded.toString("utf8").trim();
        if (decodedText.includes("-----BEGIN CERTIFICATE-----")) {
            return { success: true, data: fromDer(pemDecode(decodedText)) };
        }
        const inner = Buffer.from(decodedText, "base64");
        if (inner[0] === 0x30) {
            return { success: true, data: fromDer(inner) };
        }

        return {
            success: false,
            error: new CertificateError("Unrecognized certificate format"),
        };
    } catch (error) {
        return {
            success: false,
            error: new CertificateError(
                `Failed to normalize certificate: ${error instanceof Error ? error.message : "Unknown"}`,
            ),
        };
    }
}

function fromDer(der: Uint8Array): NormalizedCertificate {
    // Validate it parses as a Certificate SEQUENCE before returning
    const root = readDer(der, 0);
    if (root.tag !== TAG.SEQUENCE || root.end !== der.length) {
        throw new CertificateError("Certificate DER is malformed");
    }
    const base64Body = Buffer.from(der).toString("base64");
    const lines = base64Body.match(/.{1,64}/g) ?? [];
    return {
        der,
        base64Body,
        pem: `-----BEGIN CERTIFICATE-----\n${lines.join("\n")}\n-----END CERTIFICATE-----`,
    };
}

// ============================================================================
// Parsing
// ============================================================================

export interface CertificateDetails {
    /** Issuer DN, most-specific first: "CN=..., DC=..., DC=..." (ZATCA XAdES format) */
    issuer: string;
    /** Subject DN in the same format */
    subject: string;
    /** Serial number as a decimal string (ZATCA XAdES format) */
    serialNumber: string;
    validFrom: Date;
    validTo: Date;
    /** SubjectPublicKeyInfo DER — QR tag 8 uses these raw bytes */
    publicKeyDer: Buffer;
    /** SubjectPublicKeyInfo as base64 */
    publicKeyBase64: string;
    /** Uncompressed EC public point (65 bytes) for signature verification */
    publicPoint: Buffer;
    /** Certificate's own signature bytes (issuer's ECDSA sig) — QR tag 9 */
    signature: Buffer;
    /**
     * Certificate hash in ZATCA XAdES format:
     * base64( hex( sha256( base64-DER-body-text ) ) )
     */
    hash: string;
    /** Normalized forms of the certificate itself */
    cert: NormalizedCertificate;
}

const DN_LABELS: Record<string, string> = {
    "2.5.4.3": "CN",
    "2.5.4.4": "SN",
    "2.5.4.5": "SERIALNUMBER",
    "2.5.4.6": "C",
    "2.5.4.7": "L",
    "2.5.4.8": "ST",
    "2.5.4.10": "O",
    "2.5.4.11": "OU",
    "2.5.4.12": "T",
    "0.9.2342.19200300.100.1.1": "UID",
    "0.9.2342.19200300.100.1.25": "DC",
    "1.2.840.113549.1.9.1": "E",
};

function decodeDnValue(buf: Uint8Array, node: DerNode): string {
    const content = Buffer.from(derContent(buf, node));
    // UTF8String / PrintableString / IA5String / T61 all decode fine as UTF-8 here
    return content.toString("utf8");
}

/**
 * Format an X.500 Name the way ZATCA's XAdES templates expect:
 * RDNs reversed (most specific first), joined with ", ".
 */
function formatName(buf: Uint8Array, nameNode: DerNode): string {
    const parts: string[] = [];
    for (const rdnSet of derChildren(buf, nameNode)) {
        const attrs = derChildren(buf, rdnSet);
        const attr = attrs[0];
        if (!attr) continue;
        const [oidNode, valueNode] = derChildren(buf, attr);
        if (!oidNode || !valueNode) continue;
        const oid = decodeOid(derContent(buf, oidNode));
        const label = DN_LABELS[oid] ?? oid;
        parts.push(`${label}=${decodeDnValue(buf, valueNode)}`);
    }
    return parts.reverse().join(", ");
}

/**
 * Parse the certificate fields ZATCA signing and QR generation need.
 */
export function parseCertificate(input: string): Result<CertificateDetails> {
    const normalized = normalizeCertificate(input);
    if (!normalized.success) return normalized;
    const { der } = normalized.data;

    try {
        const root = readDer(der, 0);
        const [tbs, , signatureBitString] = derChildren(der, root);
        if (!tbs || !signatureBitString || signatureBitString.tag !== TAG.BIT_STRING) {
            throw new CertificateError("Unexpected certificate structure");
        }

        const tbsChildren = derChildren(der, tbs);
        // tbsCertificate: [0] version (optional), serial, sigAlg, issuer, validity, subject, SPKI, ...
        const hasVersion = tbsChildren[0]?.tag === 0xa0;
        const offset = hasVersion ? 1 : 0;
        const serialNode = tbsChildren[offset];
        const issuerNode = tbsChildren[offset + 2];
        const validityNode = tbsChildren[offset + 3];
        const subjectNode = tbsChildren[offset + 4];
        const spkiNode = tbsChildren[offset + 5];
        if (!serialNode || !issuerNode || !validityNode || !subjectNode || !spkiNode) {
            throw new CertificateError("Certificate is missing required TBS fields");
        }

        // Serial → decimal string
        const serialBytes = Buffer.from(derContent(der, serialNode));
        const serialNumber = BigInt(`0x${serialBytes.toString("hex")}`).toString(10);

        // Validity
        const [notBeforeNode, notAfterNode] = derChildren(der, validityNode);
        if (!notBeforeNode || !notAfterNode) throw new CertificateError("Invalid validity field");

        // SPKI + public point
        const publicKeyDer = Buffer.from(der.subarray(spkiNode.start, spkiNode.end));
        const spkiChildren = derChildren(der, spkiNode);
        const pointBits = spkiChildren[1];
        if (!pointBits || pointBits.tag !== TAG.BIT_STRING) {
            throw new CertificateError("Invalid SubjectPublicKeyInfo");
        }
        const publicPoint = Buffer.from(derContent(der, pointBits)).subarray(1); // drop pad byte

        // Certificate signature (issuer's) — drop BIT STRING pad byte
        const signature = Buffer.from(derContent(der, signatureBitString)).subarray(1);

        // ZATCA certificate hash quirk: sha256 over the base64 body TEXT, hex, then base64
        const hash = Buffer.from(
            createHash("sha256").update(normalized.data.base64Body, "utf8").digest("hex"),
        ).toString("base64");

        return {
            success: true,
            data: {
                issuer: formatName(der, issuerNode),
                subject: formatName(der, subjectNode),
                serialNumber,
                validFrom: decodeTime(notBeforeNode, der),
                validTo: decodeTime(notAfterNode, der),
                publicKeyDer,
                publicKeyBase64: publicKeyDer.toString("base64"),
                publicPoint,
                signature,
                hash,
                cert: normalized.data,
            },
        };
    } catch (error) {
        return {
            success: false,
            error: new CertificateError(
                `Certificate parsing failed: ${error instanceof Error ? error.message : "Unknown"}`,
            ),
        };
    }
}

// ============================================================================
// Validation helpers
// ============================================================================

export interface CertificateValidation {
    isValid: boolean;
    isExpired: boolean;
    isNotYetValid: boolean;
    daysUntilExpiry: number;
    warnings: string[];
}

export function validateCertificate(input: string): Result<CertificateValidation> {
    const parsed = parseCertificate(input);
    if (!parsed.success) return parsed;

    const { validFrom, validTo } = parsed.data;
    const now = new Date();
    const warnings: string[] = [];

    const isExpired = now > validTo;
    const isNotYetValid = now < validFrom;
    const daysUntilExpiry = Math.floor((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (isExpired) warnings.push("Certificate has expired");
    if (isNotYetValid) warnings.push("Certificate is not yet valid");
    if (!isExpired && daysUntilExpiry <= 30) warnings.push(`Certificate expires in ${daysUntilExpiry} days`);

    return {
        success: true,
        data: { isValid: !isExpired && !isNotYetValid, isExpired, isNotYetValid, daysUntilExpiry, warnings },
    };
}

/** True when the certificate expires within 30 days (or cannot be parsed) */
export function needsRenewal(input: string): boolean {
    const result = validateCertificate(input);
    if (!result.success) return true;
    return result.data.daysUntilExpiry <= 30;
}
