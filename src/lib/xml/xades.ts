// file: src/lib/xml/xades.ts
// ZATCA SDK - XAdES B-Level signature envelope (UBLExtensions)
//
// Layout quirks in this file are DELIBERATE and match the output of the
// official ZATCA SDK byte-for-byte where it matters:
// - SignedProperties is hashed from a fixed template (36-space child indent,
//   xmlns:ds declared on each ds: element) because the validator re-serializes
//   the element that way before hashing. Its digest is hex-then-base64.
// - The certificate digest is a hash of the base64 DER TEXT, hex-then-base64.
// - The ECDSA signature is over the invoice hash bytes, not over SignedInfo.

import { createHash } from "crypto";
import { SigningError } from "../errors";
import type { Result } from "../types";
import { parseCertificate, type CertificateDetails } from "../crypto/certificate";
import { signInvoiceHash } from "../crypto/signing";

export interface XAdESResult {
    /** Complete <ext:UBLExtensions> block ready for insertion */
    ublExtensions: string;
    /** Base64 invoice hash (QR tag 6, API invoiceHash field) */
    invoiceHash: string;
    /** Base64 ECDSA signature (QR tag 7) */
    signatureValue: string;
    /** Parsed signing certificate (QR tags 8–9, self-checks) */
    certificate: CertificateDetails;
    /** XAdES signing time used in SignedProperties */
    signingTime: string;
}

/** "YYYY-MM-DDTHH:mm:ss" (UTC, no suffix) — the shape the official SDK emits */
export function defaultSigningTime(now: Date = new Date()): string {
    return now.toISOString().replace(/\.\d{3}Z$/, "");
}

/**
 * SignedProperties template used for HASHING.
 * Byte-exact: 36-space child indentation, xmlns declarations included.
 * Any change here breaks signature validation.
 */
function signedPropertiesForHashing(signingTime: string, cert: CertificateDetails): string {
    return `<xades:SignedProperties xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" Id="xadesSignedProperties">
                                    <xades:SignedSignatureProperties>
                                        <xades:SigningTime>${signingTime}</xades:SigningTime>
                                        <xades:SigningCertificate>
                                            <xades:Cert>
                                                <xades:CertDigest>
                                                    <ds:DigestMethod xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
                                                    <ds:DigestValue xmlns:ds="http://www.w3.org/2000/09/xmldsig#">${cert.hash}</ds:DigestValue>
                                                </xades:CertDigest>
                                                <xades:IssuerSerial>
                                                    <ds:X509IssuerName xmlns:ds="http://www.w3.org/2000/09/xmldsig#">${cert.issuer}</ds:X509IssuerName>
                                                    <ds:X509SerialNumber xmlns:ds="http://www.w3.org/2000/09/xmldsig#">${cert.serialNumber}</ds:X509SerialNumber>
                                                </xades:IssuerSerial>
                                            </xades:Cert>
                                        </xades:SigningCertificate>
                                    </xades:SignedSignatureProperties>
                                </xades:SignedProperties>`;
}

/**
 * SignedProperties as EMBEDDED in the final XML — same values, namespaces
 * inherited from the ds:Signature/QualifyingProperties ancestors, matching
 * the official SDK's output layout.
 */
function signedPropertiesForXml(signingTime: string, cert: CertificateDetails): string {
    return `<xades:SignedProperties Id="xadesSignedProperties">
                                    <xades:SignedSignatureProperties>
                                        <xades:SigningTime>${signingTime}</xades:SigningTime>
                                        <xades:SigningCertificate>
                                            <xades:Cert>
                                                <xades:CertDigest>
                                                    <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
                                                    <ds:DigestValue>${cert.hash}</ds:DigestValue>
                                                </xades:CertDigest>
                                                <xades:IssuerSerial>
                                                    <ds:X509IssuerName>${cert.issuer}</ds:X509IssuerName>
                                                    <ds:X509SerialNumber>${cert.serialNumber}</ds:X509SerialNumber>
                                                </xades:IssuerSerial>
                                            </xades:Cert>
                                        </xades:SigningCertificate>
                                    </xades:SignedSignatureProperties>
                                </xades:SignedProperties>`;
}

/** ZATCA SignedProperties digest: sha256 bytes → hex string → base64 */
export function computeSignedPropertiesHash(signedPropsXml: string): string {
    const hex = createHash("sha256").update(Buffer.from(signedPropsXml, "utf8")).digest("hex");
    return Buffer.from(hex).toString("base64");
}

export interface XAdESConfig {
    /** Private key (PKCS#8 or SEC1, PEM or bare base64 body) */
    privateKey: string;
    /** Certificate: PEM, base64 DER body, or ZATCA binarySecurityToken */
    certificate: string;
    /** Override the signing time (for reproducible tests) */
    signingTime?: string;
}

/**
 * Produce the UBLExtensions signature envelope for an invoice whose hash was
 * already computed from the assembled document.
 */
export function createUBLExtensions(
    invoiceHash: string,
    config: XAdESConfig,
): Result<XAdESResult> {
    const certResult = parseCertificate(config.certificate);
    if (!certResult.success) return certResult;
    const cert = certResult.data;

    const signingTime = config.signingTime ?? defaultSigningTime();

    const signatureResult = signInvoiceHash(invoiceHash, config.privateKey);
    if (!signatureResult.success) return signatureResult;
    const signatureValue = signatureResult.data;

    const propsDigest = computeSignedPropertiesHash(
        signedPropertiesForHashing(signingTime, cert),
    );

    const ublExtensions = `<ext:UBLExtensions>
    <ext:UBLExtension>
        <ext:ExtensionURI>urn:oasis:names:specification:ubl:dsig:enveloped:xades</ext:ExtensionURI>
        <ext:ExtensionContent>
            <sig:UBLDocumentSignatures xmlns:sig="urn:oasis:names:specification:ubl:schema:xsd:CommonSignatureComponents-2" xmlns:sac="urn:oasis:names:specification:ubl:schema:xsd:SignatureAggregateComponents-2" xmlns:sbc="urn:oasis:names:specification:ubl:schema:xsd:SignatureBasicComponents-2">
                <sac:SignatureInformation>
                    <cbc:ID>urn:oasis:names:specification:ubl:signature:1</cbc:ID>
                    <sbc:ReferencedSignatureID>urn:oasis:names:specification:ubl:signature:Invoice</sbc:ReferencedSignatureID>
                    <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="signature">
                        <ds:SignedInfo>
                            <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2006/12/xml-c14n11"/>
                            <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha256"/>
                            <ds:Reference Id="invoiceSignedData" URI="">
                                <ds:Transforms>
                                    <ds:Transform Algorithm="http://www.w3.org/TR/1999/REC-xpath-19991116">
                                        <ds:XPath>not(//ancestor-or-self::ext:UBLExtensions)</ds:XPath>
                                    </ds:Transform>
                                    <ds:Transform Algorithm="http://www.w3.org/TR/1999/REC-xpath-19991116">
                                        <ds:XPath>not(//ancestor-or-self::cac:Signature)</ds:XPath>
                                    </ds:Transform>
                                    <ds:Transform Algorithm="http://www.w3.org/TR/1999/REC-xpath-19991116">
                                        <ds:XPath>not(//ancestor-or-self::cac:AdditionalDocumentReference[cbc:ID='QR'])</ds:XPath>
                                    </ds:Transform>
                                    <ds:Transform Algorithm="http://www.w3.org/2006/12/xml-c14n11"/>
                                </ds:Transforms>
                                <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
                                <ds:DigestValue>${invoiceHash}</ds:DigestValue>
                            </ds:Reference>
                            <ds:Reference Type="http://www.w3.org/2000/09/xmldsig#SignatureProperties" URI="#xadesSignedProperties">
                                <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
                                <ds:DigestValue>${propsDigest}</ds:DigestValue>
                            </ds:Reference>
                        </ds:SignedInfo>
                        <ds:SignatureValue>${signatureValue}</ds:SignatureValue>
                        <ds:KeyInfo>
                            <ds:X509Data>
                                <ds:X509Certificate>${cert.cert.base64Body}</ds:X509Certificate>
                            </ds:X509Data>
                        </ds:KeyInfo>
                        <ds:Object>
                            <xades:QualifyingProperties xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" Target="signature">
                                ${signedPropertiesForXml(signingTime, cert)}
                            </xades:QualifyingProperties>
                        </ds:Object>
                    </ds:Signature>
                </sac:SignatureInformation>
            </sig:UBLDocumentSignatures>
        </ext:ExtensionContent>
    </ext:UBLExtension>
</ext:UBLExtensions>`;

    return {
        success: true,
        data: { ublExtensions, invoiceHash, signatureValue, certificate: cert, signingTime },
    };
}

/**
 * Insert the UBLExtensions block immediately after the root open tag with NO
 * added whitespace. This keeps the insertion hash-neutral: when the validator
 * strips the element, the surrounding text nodes are exactly those of the
 * document the hash was computed on.
 */
export function insertUBLExtensions(invoiceXml: string, ublExtensions: string): Result<string> {
    const match = invoiceXml.match(/<Invoice[^>]*>/);
    if (!match) {
        return {
            success: false,
            error: new SigningError("Cannot insert UBLExtensions: no <Invoice> root tag found", "insertUBLExtensions"),
        };
    }
    return {
        success: true,
        // Function replacement: immune to `$`-pattern expansion in the payload
        data: invoiceXml.replace(match[0], () => `${match[0]}${ublExtensions}`),
    };
}
