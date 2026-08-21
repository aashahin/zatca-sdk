// file: src/lib/xml/canonicalize.ts
// ZATCA SDK - Invoice hashing exactly as the ZATCA validator computes it
//
// The validator takes the SUBMITTED document, applies the three XPath exclusions
// from ds:Reference (UBLExtensions, cac:Signature, the QR AdditionalDocumentReference),
// canonicalizes (C14N 1.1) and hashes. Whitespace text nodes AROUND excluded
// elements survive the transform, so the hash must be computed on the same
// document that gets submitted — never on a differently-formatted copy.

import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { createHash } from "crypto";
import { XmlCanonicalizer } from "xmldsigjs";
import * as xpath from "xpath";
import type { Result } from "../types";
import { XMLProcessingError } from "../errors";

const ZATCA_NAMESPACES = {
    ext: "urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2",
    cac: "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
    cbc: "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
};

/** Parse an XML string, surfacing parser failures as a Result */
export function parseXML(xml: string): Result<Document> {
    try {
        // xmldom reports recoverable problems (e.g. mismatched close tags) as
        // "warning" and keeps parsing; a well-formed document emits nothing.
        // For hashing/signing, any diagnostic means the document is unusable.
        let parseError: string | undefined;
        const parser = new DOMParser({
            onError: (_level: string, msg: string) => {
                parseError ??= msg;
            },
        });
        const doc = parser.parseFromString(xml, "text/xml") as unknown as Document;
        if (parseError || !doc.documentElement) {
            return {
                success: false,
                error: new XMLProcessingError(`XML parsing failed: ${parseError ?? "no root element"}`, "parseXML"),
            };
        }
        return { success: true, data: doc };
    } catch (error) {
        return {
            success: false,
            error: new XMLProcessingError(
                `XML parsing failed: ${error instanceof Error ? error.message : "Unknown"}`,
                "parseXML",
            ),
        };
    }
}

/**
 * Remove the three signature-related structures the ds:Reference transforms
 * exclude. Element nodes only — surrounding whitespace text nodes are kept,
 * mirroring the XPath filter semantics ZATCA's validator applies.
 */
function removeSignatureExclusions(doc: Document): void {
    const select = xpath.useNamespaces(ZATCA_NAMESPACES);
    const xpathRoot = doc as unknown as Node;
    const nodes = [
        ...(select("//ext:UBLExtensions", xpathRoot) as Node[]),
        ...(select("//cac:Signature", xpathRoot) as Node[]),
        ...(select('//cac:AdditionalDocumentReference[cbc:ID="QR"]', xpathRoot) as Node[]),
    ];
    for (const node of nodes) {
        node.parentNode?.removeChild(node);
    }
}

/**
 * Inclusive C14N of a parsed document (via xmldsigjs, the same canonicalizer
 * the reference implementations use — equivalent to C14N 1.1 for these
 * documents, which carry no xml:* attributes).
 */
function canonicalizeDocument(doc: Document): string {
    const canonicalizer = new XmlCanonicalizer(false, false);
    return canonicalizer.Canonicalize(doc as unknown as Node);
}

/**
 * The stripped, canonicalized form of an invoice — the exact byte string the
 * ZATCA validator hashes. Exposed for tests and debugging.
 */
export function canonicalizeForSigning(invoiceXml: string): Result<string> {
    const parsed = parseXML(invoiceXml);
    if (!parsed.success) return parsed;
    try {
        removeSignatureExclusions(parsed.data);
        // Serialize + re-parse so the canonicalizer sees a self-contained tree
        const stripped = new XMLSerializer()
            .serializeToString(parsed.data as unknown as Parameters<XMLSerializer["serializeToString"]>[0])
            .replace(/^<\?xml[^?]*\?>/, "");
        const reparsed = new DOMParser().parseFromString(stripped, "text/xml") as unknown as Document;
        return { success: true, data: canonicalizeDocument(reparsed) };
    } catch (error) {
        return {
            success: false,
            error: new XMLProcessingError(
                `Canonicalization failed: ${error instanceof Error ? error.message : "Unknown"}`,
                "canonicalizeForSigning",
            ),
        };
    }
}

/**
 * ZATCA invoice hash: SHA-256 (base64) over the stripped canonical form.
 *
 * IMPORTANT: pass the document in its final submitted layout (signature
 * scaffolding and QR reference already present). Hashing a differently-
 * indented draft produces a hash the validator can never reproduce.
 */
export function computeInvoiceHash(invoiceXml: string): Result<string> {
    const canonical = canonicalizeForSigning(invoiceXml);
    if (!canonical.success) return canonical;
    return {
        success: true,
        data: createHash("sha256").update(canonical.data, "utf8").digest("base64"),
    };
}
