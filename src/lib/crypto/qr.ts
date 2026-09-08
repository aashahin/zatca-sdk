// file: src/lib/crypto/qr.ts
// ZATCA SDK - Phase 2 QR code generation (TLV per BR-KSA-27 / security features spec)

import QRCode from "qrcode";
import type { Result, SignedInvoiceData } from "../types";
import { ValidationError, ZATCAError } from "../errors";
import { formatMoney } from "../money";

/**
 * ZATCA Phase 2 TLV tags
 */
export const TLV_TAGS = {
    SELLER_NAME: 1,
    VAT_NUMBER: 2,
    TIMESTAMP: 3,
    INVOICE_TOTAL: 4,
    VAT_TOTAL: 5,
    INVOICE_HASH: 6,
    DIGITAL_SIGNATURE: 7,
    PUBLIC_KEY: 8,
    CERTIFICATE_SIGNATURE: 9,
} as const;

/**
 * BER length: short form below 128; 0x81 + 1 byte at 128–255; 0x82 + 2 bytes
 * above 255. Spec text says the length "shall be stored in one byte", which
 * is only the short form — a 64-character Arabic name is already 128 UTF-8
 * bytes, and a raw 0x80 length is indefinite-form BER (QRCODE_INVALID).
 * https://zatca1.discourse.group/t/7202
 */
function encodeBerLength(length: number): Buffer {
    if (length < 0x80) return Buffer.from([length]);
    if (length <= 0xff) return Buffer.from([0x81, length]);
    if (length <= 0xffff) return Buffer.from([0x82, length >> 8, length & 0xff]);
    throw new Error(`TLV value is ${length} bytes; BER length supports at most 65535`);
}

function readBerLength(buffer: Buffer, offset: number): { length: number; headerSize: number } {
    if (offset >= buffer.length) {
        throw new Error("truncated length");
    }
    const lead = buffer[offset]!;
    if (lead < 0x80) {
        return { length: lead, headerSize: 1 };
    }
    const lengthBytes = lead & 0x7f;
    if (lengthBytes === 0) {
        throw new Error("indefinite length is not allowed");
    }
    if (lengthBytes > 2) {
        throw new Error("unsupported length encoding");
    }
    if (offset + 1 + lengthBytes > buffer.length) {
        throw new Error("truncated length");
    }
    let length = 0;
    for (let i = 0; i < lengthBytes; i++) {
        length = (length << 8) | buffer[offset + 1 + i]!;
    }
    return { length, headerSize: 1 + lengthBytes };
}

export function tlvEncode(tag: number, value: string | Buffer): Buffer {
    const valueBuffer = Buffer.isBuffer(value) ? value : Buffer.from(value, "utf8");
    return Buffer.concat([Buffer.from([tag]), encodeBerLength(valueBuffer.length), valueBuffer]);
}

/**
 * Build the base64 TLV payload for the Phase 2 QR.
 *
 * Value encodings (matching the official SDK output):
 * - Tags 1–5: UTF-8 text
 * - Tags 6–7: the base64 STRINGS of hash/signature, stored as UTF-8 text
 * - Tag 8: raw DER bytes of the certificate's SubjectPublicKeyInfo
 * - Tag 9: raw bytes of the certificate's ECDSA signature
 */
export function generateTLVString(data: SignedInvoiceData): string {
    const tlvBuffer = Buffer.concat([
        tlvEncode(TLV_TAGS.SELLER_NAME, data.sellerName),
        tlvEncode(TLV_TAGS.VAT_NUMBER, data.vatNumber),
        tlvEncode(TLV_TAGS.TIMESTAMP, data.timestamp),
        tlvEncode(TLV_TAGS.INVOICE_TOTAL, data.invoiceTotal),
        tlvEncode(TLV_TAGS.VAT_TOTAL, data.vatTotal),
        tlvEncode(TLV_TAGS.INVOICE_HASH, data.invoiceHash),
        tlvEncode(TLV_TAGS.DIGITAL_SIGNATURE, data.digitalSignature),
        tlvEncode(TLV_TAGS.PUBLIC_KEY, Buffer.from(data.publicKey, "base64")),
        tlvEncode(TLV_TAGS.CERTIFICATE_SIGNATURE, Buffer.from(data.certificateSignature, "base64")),
    ]);
    return tlvBuffer.toString("base64");
}

/**
 * Decode a TLV payload back into its fields (binary tags 8–9 are returned
 * as base64 strings, mirroring generateTLVString's input format).
 */
export function decodeTLVString(base64String: string): Result<Partial<SignedInvoiceData>> {
    try {
        const buffer = Buffer.from(base64String, "base64");
        const result: Partial<SignedInvoiceData> = {};
        let offset = 0;

        while (offset < buffer.length) {
            const tag = buffer[offset]!;
            const { length, headerSize } = readBerLength(buffer, offset + 1);
            const valueStart = offset + 1 + headerSize;
            if (valueStart + length > buffer.length) {
                return { success: false, error: new ValidationError("TLV decoding failed: truncated value") };
            }
            const raw = buffer.subarray(valueStart, valueStart + length);
            offset = valueStart + length;

            switch (tag) {
                case TLV_TAGS.SELLER_NAME: result.sellerName = raw.toString("utf8"); break;
                case TLV_TAGS.VAT_NUMBER: result.vatNumber = raw.toString("utf8"); break;
                case TLV_TAGS.TIMESTAMP: result.timestamp = raw.toString("utf8"); break;
                case TLV_TAGS.INVOICE_TOTAL: result.invoiceTotal = raw.toString("utf8"); break;
                case TLV_TAGS.VAT_TOTAL: result.vatTotal = raw.toString("utf8"); break;
                case TLV_TAGS.INVOICE_HASH: result.invoiceHash = raw.toString("utf8"); break;
                case TLV_TAGS.DIGITAL_SIGNATURE: result.digitalSignature = raw.toString("utf8"); break;
                case TLV_TAGS.PUBLIC_KEY: result.publicKey = raw.toString("base64"); break;
                case TLV_TAGS.CERTIFICATE_SIGNATURE: result.certificateSignature = raw.toString("base64"); break;
                default:
                    break;
            }
        }

        return { success: true, data: result };
    } catch (error) {
        return {
            success: false,
            error: new ValidationError(
                `TLV decoding failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            ),
        };
    }
}

/**
 * QR timestamp: the literal issue date/time from the invoice, joined with "T".
 * Never route these through Date — timezone conversion would desync the QR
 * from the XML's IssueDate/IssueTime.
 */
export function formatQrTimestamp(issueDate: string, issueTime: string): string {
    return `${issueDate}T${issueTime}`;
}

/** Format an amount with exactly 2 decimals, as ZATCA expects in QR tags 4–5 — decimal half-up */
export function formatAmount(amount: number | string): string {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    if (!Number.isFinite(num)) throw new Error(`formatAmount: expected finite number, got ${amount}`);
    return formatMoney(num);
}

// ============================================================================
// QR image rendering
// ============================================================================

export interface QROptions {
    width?: number;
    margin?: number;
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
}

/** Render the TLV payload as a PNG data URL */
export async function generateQRDataURL(
    tlvBase64: string,
    options: QROptions = {},
): Promise<Result<string>> {
    try {
        const dataURL = await QRCode.toDataURL(tlvBase64, {
            errorCorrectionLevel: options.errorCorrectionLevel ?? "M",
            width: options.width ?? 300,
            margin: options.margin ?? 2,
            type: "image/png",
        });
        return { success: true, data: dataURL };
    } catch (error) {
        return {
            success: false,
            error: new ZATCAError(`QR generation failed: ${error instanceof Error ? error.message : "Unknown error"}`, "QR_ERROR"),
        };
    }
}

/** Render the TLV payload as a PNG buffer */
export async function generateQRBuffer(
    tlvBase64: string,
    options: QROptions = {},
): Promise<Result<Buffer>> {
    try {
        const buffer = await QRCode.toBuffer(tlvBase64, {
            errorCorrectionLevel: options.errorCorrectionLevel ?? "M",
            width: options.width ?? 300,
            margin: options.margin ?? 2,
            type: "png",
        });
        return { success: true, data: buffer };
    } catch (error) {
        return {
            success: false,
            error: new ZATCAError(`QR buffer generation failed: ${error instanceof Error ? error.message : "Unknown error"}`, "QR_ERROR"),
        };
    }
}

/** Render the TLV payload as an SVG string */
export async function generateQRSVG(
    tlvBase64: string,
    options: QROptions = {},
): Promise<Result<string>> {
    try {
        const svg = await QRCode.toString(tlvBase64, {
            errorCorrectionLevel: options.errorCorrectionLevel ?? "M",
            width: options.width ?? 300,
            margin: options.margin ?? 2,
            type: "svg",
        });
        return { success: true, data: svg };
    } catch (error) {
        return {
            success: false,
            error: new ZATCAError(`QR SVG generation failed: ${error instanceof Error ? error.message : "Unknown error"}`, "QR_ERROR"),
        };
    }
}
