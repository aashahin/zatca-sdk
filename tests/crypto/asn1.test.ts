// file: tests/crypto/asn1.test.ts

import { describe, expect, test } from "bun:test";
import {
    TAG,
    decodeOid,
    derChildren,
    derContent,
    derInteger,
    derIntegerFromBytes,
    derOid,
    derSequence,
    derUtf8String,
    pemDecode,
    pemEncode,
    readDer,
} from "../../src/lib/crypto/asn1";

describe("DER encoding", () => {
    test("short and long lengths", () => {
        const short = derUtf8String("a".repeat(10));
        expect(short[1]).toBe(10);

        const long = derUtf8String("a".repeat(300));
        expect(long[1]).toBe(0x82); // 2-byte length follows
        expect((long[2]! << 8) | long[3]!).toBe(300);
    });

    test("INTEGER adds high-bit padding", () => {
        const padded = derIntegerFromBytes(Uint8Array.from([0x80]));
        expect([...padded]).toEqual([TAG.INTEGER, 2, 0x00, 0x80]);

        const unpadded = derInteger(1);
        expect([...unpadded]).toEqual([TAG.INTEGER, 1, 1]);
    });

    test("OID round-trip", () => {
        // includes 2.999.1: first-pair value > 127 exercises multi-byte varint
        for (const oid of ["2.5.4.3", "1.2.840.10045.4.3.2", "1.3.6.1.4.1.311.20.2", "0.9.2342.19200300.100.1.1", "2.999.1"]) {
            const encoded = derOid(oid);
            const node = readDer(encoded, 0);
            expect(decodeOid(derContent(encoded, node))).toBe(oid);
        }
    });

    test("SEQUENCE children walk", () => {
        const seq = derSequence(derInteger(1), derUtf8String("hello"), derOid("2.5.4.3"));
        const root = readDer(seq, 0);
        const children = derChildren(seq, root);
        expect(children).toHaveLength(3);
        expect(children[0]!.tag).toBe(TAG.INTEGER);
        expect(children[1]!.tag).toBe(TAG.UTF8_STRING);
        expect(Buffer.from(derContent(seq, children[1]!)).toString()).toBe("hello");
    });

    test("PEM round-trip", () => {
        const der = derSequence(derInteger(42));
        const pem = pemEncode("TEST BLOCK", der);
        expect(pem).toStartWith("-----BEGIN TEST BLOCK-----");
        expect(Buffer.from(pemDecode(pem))).toEqual(Buffer.from(der));
    });
});
