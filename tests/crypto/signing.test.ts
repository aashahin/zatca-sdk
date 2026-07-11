// file: tests/crypto/signing.test.ts

import { describe, expect, test } from "bun:test";
import { createHash } from "crypto";
import {
    INITIAL_PREVIOUS_HASH,
    hashInvoiceXML,
    signInvoiceHash,
    verifyInvoiceSignature,
} from "../../src/lib/crypto/signing";
import { parseCertificate } from "../../src/lib/crypto/certificate";
import { GOLDEN_SIGNATURE, OFFICIAL_CERT, OFFICIAL_KEY } from "../fixtures";

function officialPublicPoint(): Uint8Array {
    const parsed = parseCertificate(OFFICIAL_CERT);
    if (!parsed.success) throw parsed.error;
    return parsed.data.publicPoint;
}

describe("invoice hash signing", () => {
    test("sign + verify round-trip with the official key/cert pair", () => {
        const result = signInvoiceHash(GOLDEN_SIGNATURE.invoiceHash, OFFICIAL_KEY);
        expect(result.success).toBe(true);
        if (!result.success) return;
        expect(
            verifyInvoiceSignature(GOLDEN_SIGNATURE.invoiceHash, result.data, officialPublicPoint()),
        ).toBe(true);
    });

    test("verifies the signature produced by the OFFICIAL Java SDK", () => {
        expect(
            verifyInvoiceSignature(
                GOLDEN_SIGNATURE.invoiceHash,
                GOLDEN_SIGNATURE.signature,
                officialPublicPoint(),
            ),
        ).toBe(true);
    });

    test("rejects a tampered hash", () => {
        const tampered = Buffer.from(GOLDEN_SIGNATURE.invoiceHash, "base64");
        tampered[0] = tampered[0]! ^ 0xff;
        expect(
            verifyInvoiceSignature(
                tampered.toString("base64"),
                GOLDEN_SIGNATURE.signature,
                officialPublicPoint(),
            ),
        ).toBe(false);
    });

    test("rejects input that is not a 32-byte hash", () => {
        const result = signInvoiceHash("dG9vc2hvcnQ=", OFFICIAL_KEY);
        expect(result.success).toBe(false);
    });
});

describe("hash primitives", () => {
    test("INITIAL_PREVIOUS_HASH is base64(hex(sha256('0')))", () => {
        const expected = Buffer.from(
            createHash("sha256").update("0").digest("hex"),
        ).toString("base64");
        expect(INITIAL_PREVIOUS_HASH).toBe(expected);
    });

    test("hashInvoiceXML is sha256 base64 over UTF-8", () => {
        expect(hashInvoiceXML("<Invoice/>")).toBe(
            createHash("sha256").update("<Invoice/>", "utf8").digest("base64"),
        );
    });
});
