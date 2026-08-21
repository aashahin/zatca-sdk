// file: src/lib/crypto/signing.ts
// ZATCA SDK - ECDSA signing over the invoice hash (pure JS secp256k1)

import { secp256k1 } from "@noble/curves/secp256k1.js";
import { createHash } from "crypto";
import { SigningError } from "../errors";
import type { Result } from "../types";
import { parsePrivateKey } from "./keys";

/**
 * Previous Invoice Hash (PIH) for the very first invoice of a chain:
 * base64 of the hex of sha256("0"), per the ZATCA security features spec.
 */
export const INITIAL_PREVIOUS_HASH =
    "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==";

/** First non-blank candidate, or the chain-start hash. */
export function resolvePreviousInvoiceHash(...candidates: Array<string | undefined>): string {
    for (const candidate of candidates) {
        if (candidate?.trim()) return candidate;
    }
    return INITIAL_PREVIOUS_HASH;
}

/**
 * Create the invoice digital signature the way ZATCA defines it:
 * ECDSA-secp256k1 over SHA256(invoice-hash-bytes), DER-encoded, base64.
 *
 * Note this is NOT XML-DSig SignedInfo signing — ZATCA signs the invoice
 * digest bytes directly (matches the official SDK and passes its validator).
 */
export function signInvoiceHash(
    invoiceHashBase64: string,
    privateKeyPem: string,
): Result<string> {
    try {
        const hashBytes = Buffer.from(invoiceHashBase64, "base64");
        if (hashBytes.length !== 32) {
            return {
                success: false,
                error: new SigningError(
                    `Invoice hash must be 32 bytes (base64 of SHA-256), got ${hashBytes.length}`,
                    "signInvoiceHash",
                ),
            };
        }
        const d = parsePrivateKey(privateKeyPem);
        // noble v2 hashes the message internally (prehash), yielding
        // ECDSA(SHA256(invoice-hash-bytes)) — the ZATCA signing formula.
        const signature = secp256k1.sign(hashBytes, d, { format: "der" });
        return { success: true, data: Buffer.from(signature).toString("base64") };
    } catch (error) {
        return {
            success: false,
            error: new SigningError(
                `Failed to sign invoice hash: ${error instanceof Error ? error.message : "Unknown error"}`,
                "signInvoiceHash",
            ),
        };
    }
}

/**
 * Verify an invoice signature against the signer's uncompressed EC public point
 * (65 bytes, as extracted from the certificate SPKI). Used for post-signing
 * self-checks so a broken signature never leaves the SDK.
 */
export function verifyInvoiceSignature(
    invoiceHashBase64: string,
    signatureBase64: string,
    publicPoint: Uint8Array,
): boolean {
    try {
        return secp256k1.verify(
            Buffer.from(signatureBase64, "base64"),
            Buffer.from(invoiceHashBase64, "base64"),
            publicPoint,
            { format: "der", lowS: false },
        );
    } catch {
        return false;
    }
}

/** SHA-256 of a UTF-8 string, base64 — the ZATCA invoice hash primitive */
export function hashInvoiceXML(xmlContent: string): string {
    return createHash("sha256").update(xmlContent, "utf8").digest("base64");
}

/** Uncompressed public point (65 bytes) derived from a private key PEM */
export function derivePublicPoint(privateKeyPem: string): Uint8Array {
    return secp256k1.getPublicKey(parsePrivateKey(privateKeyPem), false);
}
