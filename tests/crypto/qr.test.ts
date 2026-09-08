// file: tests/crypto/qr.test.ts

import { describe, expect, test } from "bun:test";
import {
    decodeTLVString,
    formatAmount,
    formatQrTimestamp,
    generateTLVString,
    tlvEncode,
} from "../../src/lib/crypto/qr";
import { GOLDEN_CERT, GOLDEN_QR_TLV, GOLDEN_SIGNATURE } from "../fixtures";

function issue1QrFields(sellerName: string) {
    return {
        sellerName,
        vatNumber: "310122393500003",
        timestamp: "2022-04-25T15:30:00Z",
        invoiceTotal: "1000.00",
        vatTotal: "150.00",
        invoiceHash: "aGFzaA==",
        digitalSignature: "c2ln",
        publicKey: "a2V5",
        certificateSignature: "Y2VydA==",
    };
}

describe("TLV encoding", () => {
    test("single-byte length format", () => {
        const encoded = tlvEncode(1, "hello");
        expect([...encoded.subarray(0, 2)]).toEqual([1, 5]);
        expect(encoded.subarray(2).toString("utf8")).toBe("hello");
    });

    test.each([
        { label: "127 ASCII bytes stay in the short form", value: "x".repeat(127), header: [1, 127] },
        { label: "128 ASCII bytes use BER 0x81", value: "x".repeat(128), header: [1, 0x81, 0x80] },
        { label: "256 ASCII bytes use BER 0x82", value: "x".repeat(256), header: [1, 0x82, 0x01, 0x00] },
    ])("$label", ({ value, header }) => {
        const encoded = tlvEncode(1, value);
        expect([...encoded.subarray(0, header.length)]).toEqual(header);
        expect(encoded.subarray(header.length).toString("utf8")).toBe(value);
    });

    // https://github.com/aashahin/zatca-sdk/issues/1
    test("64-character Arabic seller name encodes as 01 81 80 — issue #1", () => {
        const name = "ش".repeat(64);
        const qr = generateTLVString(issue1QrFields(name));
        expect([...Buffer.from(qr, "base64").subarray(0, 4)]).toEqual([0x01, 0x81, 0x80, 0xd8]);

        const decoded = decodeTLVString(qr);
        expect(decoded.success).toBe(true);
        if (decoded.success) expect(decoded.data.sellerName).toBe(name);
    });

    // https://github.com/aashahin/zatca-sdk/issues/1
    test("128-character Arabic seller name encodes as 01 82 01 00 — issue #1", () => {
        const name = "ش".repeat(128);
        const qr = generateTLVString(issue1QrFields(name));
        expect([...Buffer.from(qr, "base64").subarray(0, 4)]).toEqual([0x01, 0x82, 0x01, 0x00]);

        const decoded = decodeTLVString(qr);
        expect(decoded.success).toBe(true);
        if (decoded.success) expect(decoded.data.sellerName).toBe(name);
    });

    test("decoder reads BER 0x81 instead of treating it as length 129", () => {
        const name = "ش".repeat(64);
        const value = Buffer.from(name, "utf8");
        const crafted = Buffer.concat([Buffer.from([1, 0x81, 0x80]), value]).toString("base64");
        const decoded = decodeTLVString(crafted);
        expect(decoded.success).toBe(true);
        if (decoded.success) expect(decoded.data.sellerName).toBe(name);
    });

    test("round-trip through generate + decode", () => {
        const data = {
            sellerName: "شركة الاختبار",
            vatNumber: "399999999900003",
            timestamp: "2024-01-15T10:30:00",
            invoiceTotal: "115.00",
            vatTotal: "15.00",
            invoiceHash: GOLDEN_SIGNATURE.invoiceHash,
            digitalSignature: GOLDEN_SIGNATURE.signature,
            publicKey: GOLDEN_CERT.publicKeyBase64,
            certificateSignature: GOLDEN_CERT.signatureBase64,
        };
        const decoded = decodeTLVString(generateTLVString(data));
        expect(decoded.success).toBe(true);
        if (decoded.success) expect(decoded.data).toEqual(data);
    });
});

describe("golden: QR payload from the official Java SDK", () => {
    test("decodes with the exact field values", () => {
        const decoded = decodeTLVString(GOLDEN_QR_TLV);
        expect(decoded.success).toBe(true);
        if (!decoded.success) return;

        expect(decoded.data.vatNumber).toBe("399999999900003");
        expect(decoded.data.timestamp).toBe("2022-08-17T17:41:08");
        expect(decoded.data.invoiceTotal).toBe("231.15");
        expect(decoded.data.vatTotal).toBe("30.15");
        expect(decoded.data.invoiceHash).toBe(GOLDEN_SIGNATURE.invoiceHash);
        expect(decoded.data.publicKey).toBe(GOLDEN_CERT.publicKeyBase64);
        expect(decoded.data.certificateSignature).toBe(GOLDEN_CERT.signatureBase64);
    });

    test("re-encoding the decoded payload reproduces the official bytes", () => {
        const decoded = decodeTLVString(GOLDEN_QR_TLV);
        if (!decoded.success) throw decoded.error;
        expect(generateTLVString(decoded.data as Parameters<typeof generateTLVString>[0])).toBe(
            GOLDEN_QR_TLV,
        );
    });
});

describe("formatting helpers", () => {
    test("QR timestamp is the literal issue date/time — no timezone math", () => {
        expect(formatQrTimestamp("2024-06-30", "23:59:59")).toBe("2024-06-30T23:59:59");
    });

    test("amounts always carry 2 decimals", () => {
        expect(formatAmount(115)).toBe("115.00");
        expect(formatAmount("30.1")).toBe("30.10");
    });

    test("QR amounts round half-up (not binary toFixed)", () => {
        expect(formatAmount(1.005)).toBe("1.01");
        expect(formatAmount(2.675)).toBe("2.68");
    });
});

describe("TLV decode strictness", () => {
    test("rejects a payload with trailing bytes after the last tag", () => {
        const payload = generateTLVString({
            sellerName: "A",
            vatNumber: "399999999900003",
            timestamp: "2022-01-01T00:00:00",
            invoiceTotal: "1.00",
            vatTotal: "0.15",
            invoiceHash: GOLDEN_SIGNATURE.invoiceHash,
            digitalSignature: GOLDEN_SIGNATURE.signature,
            publicKey: GOLDEN_CERT.publicKeyBase64,
            certificateSignature: GOLDEN_CERT.signatureBase64,
        });
        const trailing = Buffer.concat([Buffer.from(payload, "base64"), Buffer.from([0xff])]).toString("base64");
        const decoded = decodeTLVString(trailing);
        expect(decoded.success).toBe(false);
    });
});
