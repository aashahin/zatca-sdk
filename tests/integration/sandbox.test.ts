// file: tests/integration/sandbox.test.ts
// Live tests against the ZATCA developer sandbox.
// Opt in with:  ZATCA_SANDBOX=1 bun test tests/integration
// (network required; the sandbox accepts any OTP)

import { describe, expect, test } from "bun:test";
import { ZATCAClient } from "../../src/lib/client";
import type { EGSUnitInfo } from "../../src/lib/types";
import { BUYER, SELLER, sampleSimplifiedInvoice, sampleStandardInvoice } from "../fixtures";

const enabled = process.env.ZATCA_SANDBOX === "1";

const egsUnit: EGSUnitInfo = {
    uuid: crypto.randomUUID(),
    branchName: "Riyadh Branch",
    branchIndustry: "Supply activities",
    location: "RRRD2929",
    commonName: "TST-886431145-399999999900003",
    organizationName: "Maximum Speed Tech Supply LTD",
    countryCode: "SA",
    vatNumber: "399999999900003",
    invoiceType: "1100",
};

describe.skipIf(!enabled)("ZATCA sandbox end-to-end", () => {
    const client = new ZATCAClient({ env: "sandbox", egsUnit, solutionName: "zatca-sdk-test" });

    test("onboarding: CSR → compliance CSID → production CSID", async () => {
        const compliance = await client.startOnboarding("123456");
        expect(compliance.success).toBe(true);
        if (!compliance.success) throw compliance.error;
        expect(compliance.data.binarySecurityToken.length).toBeGreaterThan(100);
        expect(compliance.data.secret.length).toBeGreaterThan(10);

        const production = await client.finishOnboarding();
        expect(production.success).toBe(true);
    }, 60_000);

    test("compliance check: simplified invoice passes", async () => {
        const result = await client.checkInvoiceCompliance(
            sampleSimplifiedInvoice({ uuid: crypto.randomUUID(), seller: SELLER }),
        );
        expect(result.success).toBe(true);
        if (!result.success) throw result.error;
        expect(result.data.status).not.toBe("ERROR");
        expect(result.data.errorMessages).toEqual([]);
    }, 60_000);

    test("compliance check: standard invoice passes", async () => {
        const result = await client.checkInvoiceCompliance(
            sampleStandardInvoice({ uuid: crypto.randomUUID(), seller: SELLER, buyer: BUYER }),
        );
        expect(result.success).toBe(true);
        if (!result.success) throw result.error;
        expect(result.data.status).not.toBe("ERROR");
        expect(result.data.errorMessages).toEqual([]);
    }, 60_000);

    test("reporting: simplified invoice is accepted", async () => {
        const result = await client.submitInvoice(
            sampleSimplifiedInvoice({ uuid: crypto.randomUUID(), id: `INT-${Date.now()}` }),
        );
        expect(result.success).toBe(true);
        if (!result.success) throw result.error;
        expect(result.data.type).toBe("reporting");
        if (!result.data.accepted) throw result.data.error;
        expect(result.data.accepted).toBe(true);
    }, 60_000);

    test("clearance: standard invoice is cleared", async () => {
        const result = await client.submitInvoice(
            sampleStandardInvoice({ uuid: crypto.randomUUID(), id: `INT-STD-${Date.now()}` }),
        );
        expect(result.success).toBe(true);
        if (!result.success) throw result.error;
        expect(result.data.type).toBe("clearance");
        if (!result.data.accepted) throw result.data.error;
        expect(result.data.clearedXml).toBeDefined();
    }, 60_000);
});
