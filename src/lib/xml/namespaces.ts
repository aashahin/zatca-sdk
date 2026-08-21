// file: src/lib/xml/namespaces.ts
// ZATCA SDK - UBL 2.1 XML Namespaces

/**
 * UBL 2.1 and ZATCA XML namespaces
 */
export const XML_NAMESPACES = {
    // UBL Core
    ubl: "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",

    // Common components
    cac: "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
    cbc: "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
    ext: "urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2",

    // Signature components
    sig: "urn:oasis:names:specification:ubl:schema:xsd:CommonSignatureComponents-2",
    sac: "urn:oasis:names:specification:ubl:schema:xsd:SignatureAggregateComponents-2",
    sbc: "urn:oasis:names:specification:ubl:schema:xsd:SignatureBasicComponents-2",

    // XML Signature
    ds: "http://www.w3.org/2000/09/xmldsig#",

    // XAdES
    xades: "http://uri.etsi.org/01903/v1.3.2#",
} as const;

/**
 * XML namespace declarations for invoice root element
 */
export const XML_NS_DECLARATIONS = `
  xmlns="${XML_NAMESPACES.ubl}"
  xmlns:cac="${XML_NAMESPACES.cac}"
  xmlns:cbc="${XML_NAMESPACES.cbc}"
  xmlns:ext="${XML_NAMESPACES.ext}"
`.trim().replace(/\n\s+/g, " ");
