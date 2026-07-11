// file: scripts/validate-with-fatoora.ts
// Validate a signed invoice (or a freshly signed sample) with the OFFICIAL
// ZATCA Java SDK validator vendored under resources/.
//
// Requirements:
//   - Java 11 (Java 17+ removed secp256k1 from SunEC and cannot verify
//     ZATCA signatures). Point JAVA_HOME_11 at it or have `java` be v11.
//
// Usage:
//   bun run scripts/validate-with-fatoora.ts               # sign + validate the sample invoice
//   bun run scripts/validate-with-fatoora.ts path/to.xml   # validate an existing signed XML

import { execFileSync } from "child_process";
import { mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { signInvoice } from "../src/lib/egs/invoice-signer";
import { CREDENTIALS, sampleSimplifiedInvoice } from "../tests/fixtures";

const SDK_DIR = resolve(import.meta.dir, "../resources/examples/zatca-einvoicing-sdk-Java-238-R3.4.8");
const JAR = join(SDK_DIR, "Apps/zatca-einvoicing-sdk-238-R3.4.8.jar");

function findJava(): string {
    if (process.env.JAVA_HOME_11) return join(process.env.JAVA_HOME_11, "bin/java");
    return "java";
}

function writeConfig(dir: string): string {
    const config = {
        xsdPath: join(SDK_DIR, "Data/Schemas/xsds/UBL2.1/xsd/maindoc/UBL-Invoice-2.1.xsd"),
        enSchematron: join(SDK_DIR, "Data/Rules/Schematrons/CEN-EN16931-UBL.xsl"),
        zatcaSchematron: join(SDK_DIR, "Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl"),
        certPath: join(SDK_DIR, "Data/Certificates/cert.pem"),
        privateKeyPath: join(SDK_DIR, "Data/Certificates/ec-secp256k1-priv-key.pem"),
        pihPath: join(SDK_DIR, "Data/PIH/pih.txt"),
        inputPath: join(SDK_DIR, "Data/Input"),
        usagePathFile: join(SDK_DIR, "Configuration/usage.txt"),
    };
    const configPath = join(dir, "config.json");
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    return configPath;
}

const workDir = mkdtempSync(join(tmpdir(), "fatoora-validate-"));
let invoicePath = process.argv[2];

if (!invoicePath) {
    console.log("No invoice given — signing the sample simplified invoice first…");
    const signed = await signInvoice(sampleSimplifiedInvoice(), {
        credentials: CREDENTIALS,
        skipQrImage: true,
    });
    if (!signed.success) {
        console.error("Signing failed:", signed.error.message);
        process.exit(1);
    }
    invoicePath = join(workDir, "signed.xml");
    writeFileSync(invoicePath, signed.data.signedXml);
    console.log("Signed. Invoice hash:", signed.data.invoiceHash);
}

const output = execFileSync(
    findJava(),
    ["-Djdk.sunec.disableNative=false", "-jar", JAR, "-validate", "-invoice", resolve(invoicePath)],
    {
        env: { ...process.env, SDK_CONFIG: writeConfig(workDir) },
        stdio: "pipe",
        maxBuffer: 32 * 1024 * 1024,
    },
).toString();

const relevant = output
    .split("\n")
    .filter((line) => /validation result|GLOBAL VALIDATION|ERROR/.test(line) && !/warnings :\s*$/.test(line));
console.log(relevant.join("\n"));

if (!output.includes("GLOBAL VALIDATION RESULT = PASSED")) {
    console.error("\n❌ Validation FAILED");
    process.exit(1);
}
console.log("\n✅ GLOBAL VALIDATION RESULT = PASSED");
