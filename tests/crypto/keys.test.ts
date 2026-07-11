// file: tests/crypto/keys.test.ts

import { describe, expect, test } from "bun:test";
import { execFileSync } from "child_process";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
    CSR_TEMPLATE_NAMES,
    derivePublicKey,
    generateCSR,
    generateKeyPair,
    parsePrivateKey,
    type CSRInput,
} from "../../src/lib/crypto/keys";
import { OFFICIAL_KEY } from "../fixtures";

const CSR_INPUT: CSRInput = {
    commonName: "TST-886431145-399999999900003",
    organizationName: "Maximum Speed Tech Supply LTD",
    organizationUnit: "Riyadh Branch",
    countryCode: "SA",
    egsSerialNumber: "1-TST|2-TST|3-ed22f1d8-e6a2-1118-9b58-d9a8f11e445f",
    vatNumber: "399999999900003",
    invoiceType: "1100",
    location: "RRRD2929",
    industry: "Supply activities",
};

function opensslAvailable(): boolean {
    try {
        execFileSync("openssl", ["version"], { stdio: "pipe" });
        return true;
    } catch {
        return false;
    }
}
const hasOpenssl = opensslAvailable();

describe("key generation", () => {
    test("generates parseable secp256k1 PKCS#8 keys", () => {
        const result = generateKeyPair();
        expect(result.success).toBe(true);
        if (!result.success) return;

        expect(result.data.privateKey).toContain("-----BEGIN PRIVATE KEY-----");
        expect(result.data.publicKey).toContain("-----BEGIN PUBLIC KEY-----");
        expect(parsePrivateKey(result.data.privateKey)).toHaveLength(32);
        expect(derivePublicKey(result.data.privateKey)).toBe(result.data.publicKey);
    });

    test.skipIf(!hasOpenssl)("openssl can read the generated key", () => {
        const result = generateKeyPair();
        if (!result.success) throw result.error;
        const dir = mkdtempSync(join(tmpdir(), "zatca-test-"));
        try {
            writeFileSync(join(dir, "key.pem"), result.data.privateKey);
            const out = execFileSync(
                "openssl",
                ["ec", "-in", join(dir, "key.pem"), "-noout", "-text"],
                { stdio: "pipe" },
            ).toString();
            expect(out).toContain("secp256k1");
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    test("parses the official SDK key (headerless SEC1)", () => {
        expect(parsePrivateKey(OFFICIAL_KEY)).toHaveLength(32);
    });
});

describe("CSR generation", () => {
    test("produces a PEM CSR whose base64 field wraps the full PEM (ZATCA API format)", () => {
        const keys = generateKeyPair();
        if (!keys.success) throw keys.error;

        const csr = generateCSR(CSR_INPUT, keys.data.privateKey, "sandbox");
        expect(csr.success).toBe(true);
        if (!csr.success) return;

        expect(csr.data.pem).toContain("-----BEGIN CERTIFICATE REQUEST-----");
        expect(Buffer.from(csr.data.base64, "base64").toString("utf8")).toBe(csr.data.pem);
    });

    test.skipIf(!hasOpenssl)("openssl verifies the CSR self-signature and content", () => {
        const keys = generateKeyPair();
        if (!keys.success) throw keys.error;
        const csr = generateCSR(CSR_INPUT, keys.data.privateKey, "sandbox");
        if (!csr.success) throw csr.error;

        const dir = mkdtempSync(join(tmpdir(), "zatca-test-"));
        try {
            const csrPath = join(dir, "req.csr");
            writeFileSync(csrPath, csr.data.pem);
            execFileSync("openssl", ["req", "-in", csrPath, "-verify", "-noout"], { stdio: "pipe" });
            const text = execFileSync("openssl", ["req", "-in", csrPath, "-noout", "-text"], {
                stdio: "pipe",
            }).toString();
            expect(text).toContain("1.3.6.1.4.1.311.20.2");
            expect(text).toContain("TSTZATCA-Code-Signing");
            expect(text).toContain("SN=1-TST|2-TST|3-ed22f1d8-e6a2-1118-9b58-d9a8f11e445f");
            expect(text).toContain("UID=399999999900003");
            expect(text).toContain("title=1100");
            expect(text).toContain("registeredAddress=RRRD2929");
            expect(text).toContain("businessCategory=Supply activities");
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    test.skipIf(!hasOpenssl)("each environment's CSR carries its certificate template name", () => {
        const keys = generateKeyPair();
        if (!keys.success) throw keys.error;
        const dir = mkdtempSync(join(tmpdir(), "zatca-test-"));
        try {
            for (const [env, templateName] of Object.entries(CSR_TEMPLATE_NAMES)) {
                const csr = generateCSR(CSR_INPUT, keys.data.privateKey, env as keyof typeof CSR_TEMPLATE_NAMES);
                if (!csr.success) throw csr.error;
                const csrPath = join(dir, `${env}.csr`);
                writeFileSync(csrPath, csr.data.pem);
                const text = execFileSync("openssl", ["req", "-in", csrPath, "-noout", "-text"], {
                    stdio: "pipe",
                }).toString();
                expect(text).toContain(templateName);
            }
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    test("rejects invalid input", () => {
        const keys = generateKeyPair();
        if (!keys.success) throw keys.error;

        const bad = generateCSR({ ...CSR_INPUT, vatNumber: "123" }, keys.data.privateKey, "sandbox");
        expect(bad.success).toBe(false);
        if (!bad.success) expect(bad.error.message).toContain("vatNumber");

        const badType = generateCSR({ ...CSR_INPUT, invoiceType: "2100" }, keys.data.privateKey, "sandbox");
        expect(badType.success).toBe(false);
    });
});
