// file: tests/crypto/certificate.test.ts

import { describe, expect, test } from "bun:test";
import { normalizeCertificate, parseCertificate, validateCertificate } from "../../src/lib/crypto/certificate";
import { GOLDEN_CERT, OFFICIAL_CERT } from "../fixtures";

describe("certificate parsing (golden: official ZATCA test cert)", () => {
    test("extracts the exact values the official SDK embeds in XAdES", () => {
        const result = parseCertificate(OFFICIAL_CERT);
        expect(result.success).toBe(true);
        if (!result.success) return;

        const cert = result.data;
        expect(cert.issuer).toBe(GOLDEN_CERT.issuer);
        expect(cert.serialNumber).toBe(GOLDEN_CERT.serialNumber);
        expect(cert.hash).toBe(GOLDEN_CERT.hash);
        expect(cert.publicKeyBase64).toBe(GOLDEN_CERT.publicKeyBase64);
        expect(cert.signature.toString("base64")).toBe(GOLDEN_CERT.signatureBase64);
        expect(cert.publicPoint).toHaveLength(65);
        expect(cert.publicPoint[0]).toBe(0x04); // uncompressed point
        expect(cert.validFrom.toISOString()).toBe("2024-01-11T09:19:30.000Z");
        expect(cert.validTo.toISOString()).toBe("2029-01-09T09:19:30.000Z");
    });

    test("accepts PEM, base64 body, and double-base64 token inputs", () => {
        const pemParsed = normalizeCertificate(OFFICIAL_CERT);
        expect(pemParsed.success).toBe(true);
        if (!pemParsed.success) return;
        const base64Body = pemParsed.data.base64Body;

        // base64 DER body (what a decoded binarySecurityToken looks like)
        const fromBody = normalizeCertificate(base64Body);
        expect(fromBody.success).toBe(true);
        if (fromBody.success) expect(fromBody.data.base64Body).toBe(base64Body);

        // binarySecurityToken (base64 of the base64 body)
        const token = Buffer.from(base64Body, "utf8").toString("base64");
        const fromToken = normalizeCertificate(token);
        expect(fromToken.success).toBe(true);
        if (fromToken.success) expect(fromToken.data.base64Body).toBe(base64Body);
    });

    test("rejects garbage", () => {
        expect(normalizeCertificate("not a certificate").success).toBe(false);
        expect(parseCertificate("aGVsbG8gd29ybGQ=").success).toBe(false);
    });

    test("validity window", () => {
        const result = validateCertificate(OFFICIAL_CERT);
        expect(result.success).toBe(true);
        if (!result.success) return;
        // The official test cert is valid 2024-01-11 → 2029-01-09
        const now = new Date();
        const shouldBeValid = now >= new Date("2024-01-11") && now <= new Date("2029-01-09");
        expect(result.data.isValid).toBe(shouldBeValid);
    });
});
