// file: examples/onboarding.ts
// Full device onboarding against the ZATCA sandbox.
// Run: bun run examples/onboarding.ts

import { ZATCAClient, type EGSUnitInfo } from "../src";

const egsUnit: EGSUnitInfo = {
    uuid: crypto.randomUUID(),
    branchName: "Riyadh Branch",
    branchIndustry: "Supply activities",
    location: "RRRD2929", // National short address or street address
    commonName: "TST-886431145-399999999900003",
    organizationName: "Maximum Speed Tech Supply LTD",
    countryCode: "SA",
    vatNumber: "399999999900003",
    invoiceType: "1100", // standard + simplified
};

const client = new ZATCAClient({
    env: "sandbox",
    egsUnit,
    solutionName: "MyERP",
});

// On the sandbox any OTP is accepted; on simulation/production use the OTP
// generated in the Fatoora portal for this device.
const result = await client.onboard("123456");

if (!result.success) {
    console.error("Onboarding failed:", result.error.message);
    process.exit(1);
}

console.log("Production CSID issued.");
console.log("Request ID:", result.data.requestId);

// Persist this — it contains the private key, certificates, and secrets.
// Encrypt at rest in a real integration.
const state = client.getState();
console.log("State keys:", Object.keys(state.egsState));
