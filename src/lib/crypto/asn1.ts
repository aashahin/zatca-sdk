// file: src/lib/crypto/asn1.ts
// Minimal DER (ASN.1) encoder/decoder — covers exactly what ZATCA key/CSR/X.509
// handling needs, so the SDK has no runtime dependency on the OpenSSL CLI.

// ============================================================================
// Encoding
// ============================================================================

/** DER tag numbers used by this SDK */
export const TAG = {
    BOOLEAN: 0x01,
    INTEGER: 0x02,
    BIT_STRING: 0x03,
    OCTET_STRING: 0x04,
    NULL: 0x05,
    OID: 0x06,
    UTF8_STRING: 0x0c,
    PRINTABLE_STRING: 0x13,
    IA5_STRING: 0x16,
    UTC_TIME: 0x17,
    GENERALIZED_TIME: 0x18,
    SEQUENCE: 0x30,
    SET: 0x31,
} as const;

function encodeLength(length: number): Buffer {
    if (length < 0x80) return Buffer.from([length]);
    const bytes: number[] = [];
    let remaining = length;
    while (remaining > 0) {
        bytes.unshift(remaining & 0xff);
        remaining >>= 8;
    }
    return Buffer.from([0x80 | bytes.length, ...bytes]);
}

/** Encode a TLV with the given tag byte */
export function der(tag: number, content: Buffer): Buffer {
    return Buffer.concat([Buffer.from([tag]), encodeLength(content.length), content]);
}

export function derSequence(...children: Buffer[]): Buffer {
    return der(TAG.SEQUENCE, Buffer.concat(children));
}

export function derSet(...children: Buffer[]): Buffer {
    return der(TAG.SET, Buffer.concat(children));
}

/** Encode INTEGER from unsigned big-endian bytes (adds 0x00 pad for high bit) */
export function derIntegerFromBytes(bytes: Uint8Array): Buffer {
    let start = 0;
    while (start < bytes.length - 1 && bytes[start] === 0) start++;
    const trimmed = Buffer.from(bytes.subarray(start));
    const first = trimmed[0] ?? 0;
    if (first & 0x80) {
        return der(TAG.INTEGER, Buffer.concat([Buffer.from([0]), trimmed]));
    }
    return der(TAG.INTEGER, trimmed.length ? trimmed : Buffer.from([0]));
}

export function derInteger(value: number): Buffer {
    if (value < 0 || !Number.isInteger(value)) {
        throw new Error(`derInteger only supports non-negative integers, got ${value}`);
    }
    const bytes: number[] = [];
    let remaining = value;
    do {
        bytes.unshift(remaining & 0xff);
        remaining = Math.floor(remaining / 256);
    } while (remaining > 0);
    return derIntegerFromBytes(Uint8Array.from(bytes));
}

/** Encode OBJECT IDENTIFIER from dotted string ("2.5.4.3") */
export function derOid(oid: string): Buffer {
    const parts = oid.split(".").map((p) => {
        const n = Number(p);
        if (!Number.isInteger(n) || n < 0) throw new Error(`Invalid OID: ${oid}`);
        return n;
    });
    if (parts.length < 2) throw new Error(`Invalid OID: ${oid}`);
    // First two arcs combine into one base-128 varint, like every other arc
    const arcs = [(parts[0]! * 40) + parts[1]!, ...parts.slice(2)];
    const bytes: number[] = [];
    for (const arc of arcs) {
        const stack: number[] = [arc & 0x7f];
        let v = arc >> 7;
        while (v > 0) {
            stack.unshift(0x80 | (v & 0x7f));
            v >>= 7;
        }
        bytes.push(...stack);
    }
    return der(TAG.OID, Buffer.from(bytes));
}

export function derUtf8String(value: string): Buffer {
    return der(TAG.UTF8_STRING, Buffer.from(value, "utf8"));
}

export function derPrintableString(value: string): Buffer {
    return der(TAG.PRINTABLE_STRING, Buffer.from(value, "ascii"));
}

/** BIT STRING with zero unused bits (keys, signatures) */
export function derBitString(content: Uint8Array): Buffer {
    return der(TAG.BIT_STRING, Buffer.concat([Buffer.from([0]), Buffer.from(content)]));
}

export function derOctetString(content: Uint8Array): Buffer {
    return der(TAG.OCTET_STRING, Buffer.from(content));
}

/** Context-specific constructed tag: [n] — used for explicit tagging */
export function derContextExplicit(tagNumber: number, content: Buffer): Buffer {
    return der(0xa0 | tagNumber, content);
}

// ============================================================================
// Decoding
// ============================================================================

export interface DerNode {
    /** Full tag byte (class + constructed bit + number) */
    tag: number;
    /** Offset of this TLV within the parent buffer */
    start: number;
    /** Offset of the content bytes */
    contentStart: number;
    /** Content length */
    length: number;
    /** Offset just past the end of this TLV */
    end: number;
}

/** Read one TLV header at `offset` */
export function readDer(buf: Uint8Array, offset: number): DerNode {
    if (offset + 2 > buf.length) throw new Error("DER: read past end of buffer");
    const tag = buf[offset]!;
    let cursor = offset + 1;
    let length = buf[cursor]!;
    cursor++;
    if (length & 0x80) {
        const numBytes = length & 0x7f;
        if (numBytes === 0 || numBytes > 4) throw new Error("DER: unsupported length encoding");
        length = 0;
        for (let i = 0; i < numBytes; i++) {
            length = (length << 8) | buf[cursor + i]!;
        }
        cursor += numBytes;
    }
    if (cursor + length > buf.length) throw new Error("DER: content exceeds buffer");
    return { tag, start: offset, contentStart: cursor, length, end: cursor + length };
}

/** Content bytes of a node */
export function derContent(buf: Uint8Array, node: DerNode): Uint8Array {
    return buf.subarray(node.contentStart, node.contentStart + node.length);
}

/** Direct children of a constructed node */
export function derChildren(buf: Uint8Array, node: DerNode): DerNode[] {
    const children: DerNode[] = [];
    let cursor = node.contentStart;
    while (cursor < node.contentStart + node.length) {
        const child = readDer(buf, cursor);
        children.push(child);
        cursor = child.end;
    }
    return children;
}

/** Decode an OBJECT IDENTIFIER node's content to a dotted string */
export function decodeOid(content: Uint8Array): string {
    if (content.length === 0) throw new Error("DER: empty OID");
    // Every arc (including the combined first one) is a base-128 varint;
    // the first varint packs arc1*40 + arc2, where arc1 is capped at 2.
    const arcs: number[] = [];
    let value = 0;
    for (const byte of content) {
        value = (value << 7) | (byte & 0x7f);
        if (!(byte & 0x80)) {
            arcs.push(value);
            value = 0;
        }
    }
    const combined = arcs[0]!;
    const arc1 = Math.min(2, Math.floor(combined / 40));
    return [arc1, combined - arc1 * 40, ...arcs.slice(1)].join(".");
}

/** Decode UTCTime/GeneralizedTime content to a Date */
export function decodeTime(node: DerNode, buf: Uint8Array): Date {
    const text = Buffer.from(derContent(buf, node)).toString("ascii");
    if (node.tag === TAG.UTC_TIME) {
        // YYMMDDHHMMSSZ — RFC 5280: YY >= 50 → 19YY, else 20YY
        const yy = Number(text.slice(0, 2));
        const year = yy >= 50 ? 1900 + yy : 2000 + yy;
        return new Date(Date.UTC(
            year,
            Number(text.slice(2, 4)) - 1,
            Number(text.slice(4, 6)),
            Number(text.slice(6, 8)),
            Number(text.slice(8, 10)),
            Number(text.slice(10, 12)),
        ));
    }
    // GeneralizedTime: YYYYMMDDHHMMSSZ
    return new Date(Date.UTC(
        Number(text.slice(0, 4)),
        Number(text.slice(4, 6)) - 1,
        Number(text.slice(6, 8)),
        Number(text.slice(8, 10)),
        Number(text.slice(10, 12)),
        Number(text.slice(12, 14)),
    ));
}

// ============================================================================
// PEM helpers
// ============================================================================

export function pemEncode(label: string, der: Uint8Array): string {
    const base64 = Buffer.from(der).toString("base64");
    const lines = base64.match(/.{1,64}/g) ?? [];
    return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----`;
}

/** Extract DER bytes from a PEM block (first block if multiple) */
export function pemDecode(pem: string): Uint8Array {
    const body = pem
        .replace(/-----BEGIN [^-]+-----/g, "")
        .replace(/-----END [^-]+-----/g, "")
        .replace(/\s/g, "");
    if (!body) throw new Error("PEM: no content found");
    return Buffer.from(body, "base64");
}
