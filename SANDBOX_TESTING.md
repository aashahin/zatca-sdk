# ZATCA Testing Guide

Three verification layers, from fastest to most authoritative.

## 1. Offline tests (no network)

```bash
bun test
```

Covers DER/ASN.1, key + CSR generation (cross-checked with `openssl` when available), certificate parsing, ECDSA signing, QR TLV, the UBL builder, and the signing-pipeline invariants — all pinned against golden values produced by the **official ZATCA Java SDK** (its test cert/key and its own signed output live in `resources/`).

## 2. Official validator (offline, needs Java 11)

```bash
bun run validate:fatoora                    # signs the sample invoice, then validates
bun run validate:fatoora path/to/signed.xml # validates an existing file
```

Runs the official `zatca-einvoicing-sdk` jar: XSD + EN 16931 + KSA schematron + QR + signature + PIH checks. This is the same code ZATCA runs server-side — a `GLOBAL VALIDATION RESULT = PASSED` here means the invoice will pass ZATCA's own validation.

**Java 11 required** — Java 17+ removed secp256k1 from the JVM's crypto provider, which breaks signature verification (you'll see `Curve not supported: secp256k1`). Point `JAVA_HOME_11` at a Java 11 installation if your default `java` is newer, e.g.:

```bash
JAVA_HOME_11=/opt/temurin-11 bun run validate:fatoora
```

## 3. Live sandbox (network)

```bash
bun run test:sandbox
```

Runs the full flow against `gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal`:

1. CSR → compliance CSID (sandbox accepts any OTP)
2. compliance CSID → production CSID
3. compliance invoice checks (simplified + standard)
4. reporting of a simplified invoice → `REPORTED`
5. clearance of a standard invoice → `CLEARED`

### Sandbox quirks to know

- **Any OTP works** — no portal account needed for the developer sandbox.
- **Canned certificates**: sandbox CSID endpoints return a fixed test certificate that does not match your CSR's key. The SDK's cert/key self-check is auto-relaxed on `env: "sandbox"` only. Don't be surprised that the embedded X509 data is not "your" certificate there.
- The sandbox does **not** enforce compliance checks between the compliance and production CSID calls; simulation and production do.

## Moving to simulation / production

1. Log into the [Fatoora portal](https://fatoora.zatca.gov.sa) (or the simulation portal) and generate an OTP for the device.
2. Use `env: "simulation"` (CSR template `PREZATCA-Code-Signing`) or `env: "production"` (`ZATCA-Code-Signing`) — the SDK selects the right CSR extension automatically.
3. Run `startOnboarding(otp)` → `checkInvoiceCompliance(...)` for **each invoice type you declared** in `egsUnit.invoiceType` → `finishOnboarding()`.
4. Persist `client.getState()` (encrypted) after every call — it holds the private key, secrets, ICV counter, and PIH chain.
