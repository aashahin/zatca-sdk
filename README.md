# ZATCA E-Invoicing SDK

TypeScript SDK for Saudi Arabia's ZATCA Phase 2 e-invoicing (Fatoora). Runs on Bun with **zero OpenSSL/CLI dependencies** — all cryptography (secp256k1 keys, CSR, XAdES signatures) is pure JS.

Every signed invoice is verified end-to-end before it leaves the SDK: the invoice hash is recomputed from the final XML bytes exactly the way ZATCA's validator recomputes it, and the ECDSA signature is verified against the signing key. Output passes the **official ZATCA SDK validator** (XSD, EN 16931, KSA schematron, QR, signature, PIH) and the **live sandbox** compliance/reporting/clearance APIs.

## Environments

| Env | Base URL | CSR template | OTP |
|---|---|---|---|
| `sandbox` | `…/developer-portal` | `TSTZATCA-Code-Signing` | any value |
| `simulation` | `…/simulation` | `PREZATCA-Code-Signing` | from Fatoora portal |
| `production` | `…/core` | `ZATCA-Code-Signing` | from Fatoora portal |

> **Sandbox quirk:** the developer portal issues a canned certificate that never matches your CSR key. The SDK detects this and relaxes its cert/key self-check on `sandbox` only; on `simulation`/`production` a mismatch is a hard error.

## Quick start

```typescript
import { ZATCAClient, type EGSUnitInfo, type Invoice } from "zatca-sdk";

const egsUnit: EGSUnitInfo = {
    uuid: crypto.randomUUID(),
    branchName: "Riyadh Branch",
    branchIndustry: "Supply activities",
    location: "RRRD2929",                       // national short address
    commonName: "TST-886431145-399999999900003",
    organizationName: "My Company LTD",
    countryCode: "SA",
    vatNumber: "399999999900003",               // 15 digits, starts/ends with 3
    invoiceType: "1100",                        // standard + simplified
};

const client = new ZATCAClient({ env: "sandbox", egsUnit, solutionName: "MyERP" });

// 1. Onboard once (OTP from the Fatoora portal; any value on sandbox)
await client.onboard("123456");
persist(client.getState()); // contains private key + secrets — encrypt at rest

// 2. Sign + submit (simplified → reporting, standard → clearance)
const result = await client.submitInvoice(invoice);
if (result.success && result.data.accepted) {
    console.log("hash:", result.data.signedInvoice.invoiceHash);
    console.log("QR:", result.data.signedInvoice.qrTlvBase64);
}
persist(client.getState()); // ICV + PIH chain advanced — always persist
```

Restore across restarts with `new ZATCAClient({ ..., state: persistedState })`. The ICV counter and PIH chain live in that state — losing it breaks the invoice chain.

### Onboarding on simulation/production

Those environments require compliance checks between the compliance CSID and production CSID:

```typescript
await client.startOnboarding(otp);                    // keys + CSR + compliance CSID
await client.checkInvoiceCompliance(sampleInvoice);   // once per declared invoice type
await client.finishOnboarding();                      // production CSID
```

### Low-level API

Every step is usable standalone:

```typescript
import {
    generateKeyPair, generateCSR,             // secp256k1 + ZATCA CSR (pure JS)
    signInvoice, computeInvoiceHash,          // signing pipeline
    parseCertificate, validateCertificate,    // X.509 DER parsing
    generateTLVString, decodeTLVString,       // Phase 2 QR TLV
    buildInvoiceXml,                          // UBL 2.1 document
} from "zatca-sdk";
```

`signInvoice(invoice, { credentials })` returns the signed XML, invoice hash, base64 payload, and QR — with post-signing hash/signature self-checks already done.

## Invoice model

`Invoice` covers: standard (`invoiceSubType` `01…`) and simplified (`02…`) invoices, credit notes (`381`) and debit notes (`383`, both need `billingReference` + `creditDebitReason`), line discounts, document-level allowances, zero-rated/exempt lines (`exemptionReasonCode`), non-SAR document currencies (`taxExchangeRate`, `taxTotalInSAR`), and prepaid/rounding amounts.

`validateInvoice(invoice)` runs structural + arithmetic checks (BR-KSA seller address rules, BR-CO totals consistency) and is called automatically by `signInvoice`.

## Verification

```bash
bun test                        # unit + golden-fixture tests (offline)
bun run test:sandbox            # live sandbox: onboarding → compliance → reporting/clearance
bun run validate:fatoora        # official ZATCA validator (needs Java 11, see below)
```

The golden fixtures are the official ZATCA SDK's test certificate/key and its own signed output — the tests assert byte-exact agreement on certificate digests, issuer formatting, QR TLV bytes, and signature verification.

`validate:fatoora` runs the official Java validator vendored in `resources/`. It needs **Java 11** (17+ removed secp256k1 from the JVM); set `JAVA_HOME_11` if `java` isn't v11.

## Design notes (read before touching signing)

- **Hash-consistency by construction.** The builder emits the complete document — including the QR `AdditionalDocumentReference` (placeholder) and `cac:Signature` scaffolding — *before* hashing. The hash is computed by stripping UBLExtensions/Signature/QR and canonicalizing, which is exactly what ZATCA's validator does to the submitted bytes. UBLExtensions is inserted byte-adjacent after `<Invoice …>` so stripping it restores the hashed byte stream.
- **ZATCA's non-standard XAdES quirks** (all deliberate, all validator-verified): the ECDSA signature is over the invoice-hash bytes (not SignedInfo); the certificate digest is SHA-256 of the base64 DER *text*, hex-encoded then base64; the SignedProperties digest is computed from a byte-exact template with 36-space indentation.
- **QR TLV** uses single-byte lengths (max 255 bytes per tag). Tags 6–7 store base64 *strings*; tags 8–9 store raw bytes (SPKI DER, cert signature). The timestamp is the literal `issueDate`T`issueTime` — never routed through `Date`.

## Requirements

- Bun ≥ 1.0 (Node ≥ 18 works too — no Bun-specific APIs in `src/`)
- No OpenSSL, no Java at runtime (Java 11 only for the optional official-validator script)
