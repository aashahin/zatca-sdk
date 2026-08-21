// file: tests/client.test.ts

import { describe, expect, test } from "bun:test";
import { ZATCAClient } from "../src/lib/client";
import { INITIAL_PREVIOUS_HASH } from "../src/lib/crypto/signing";
import { CREDENTIALS, sampleSimplifiedInvoice } from "./fixtures";
import type { EGSUnitInfo } from "../src/lib/types";

const EGS_UNIT: EGSUnitInfo = {
    uuid: "11111111-1111-1111-1111-111111111111",
    branchName: "Riyadh Branch",
    branchIndustry: "Supply activities",
    location: "RRRD2929",
    commonName: "TST-886431145-399999999900003",
    organizationName: "Maximum Speed Tech Supply LTD",
    countryCode: "SA",
    vatNumber: "399999999900003",
    invoiceType: "1100",
};

function onboardedClient(invoiceCounter = 0, previousInvoiceHash?: string): ZATCAClient {
    const client = new ZATCAClient({ env: "sandbox", egsUnit: EGS_UNIT });
    client.restoreState({
        egsState: {
            privateKey: CREDENTIALS.privateKey,
            productionCertificate: CREDENTIALS.certificate,
            productionSecret: "secret",
        },
        invoiceCounter,
        previousInvoiceHash,
    });
    return client;
}

function icvFromXml(xml: string): number {
    const match = xml.match(/<cbc:ID>ICV<\/cbc:ID>\s*<cbc:UUID>(\d+)<\/cbc:UUID>/);
    if (!match) throw new Error("signed XML is missing the ICV UUID");
    return Number(match[1]);
}

describe("ZATCAClient ICV/PIH chain", () => {
    test("empty PIH on the first invoice embeds the initial hash", async () => {
        const client = onboardedClient();
        const result = await client.sign(
            sampleSimplifiedInvoice({ invoiceCounterValue: 0, previousInvoiceHash: "" }),
        );
        if (!result.success) throw result.error;
        expect(result.data.signedXml).toContain(INITIAL_PREVIOUS_HASH);
    });

    test("empty PIH on a later invoice chains the stored hash", async () => {
        const storedPih = "z5F9qsS6oWyDhehD8u8S0DaxV+2CUiUz9Y+UsR61JgQ=";
        const client = onboardedClient(4, storedPih);
        const result = await client.sign(
            sampleSimplifiedInvoice({ invoiceCounterValue: 0, previousInvoiceHash: "" }),
        );
        if (!result.success) throw result.error;
        expect(result.data.signedXml).toContain(storedPih);
        expect(result.data.signedXml).not.toContain(INITIAL_PREVIOUS_HASH);
    });

    test("concurrent sign calls receive distinct sequential ICVs", async () => {
        const client = onboardedClient(5, INITIAL_PREVIOUS_HASH);
        const results = await Promise.all(
            [1, 2, 3].map((n) =>
                client.sign(
                    sampleSimplifiedInvoice({
                        id: `CONC-${n}`,
                        uuid: crypto.randomUUID(),
                        invoiceCounterValue: 0,
                        previousInvoiceHash: "",
                    }),
                ),
            ),
        );
        const icvs = results.map((result) => {
            if (!result.success) throw result.error;
            return icvFromXml(result.data.signedXml);
        });
        expect(new Set(icvs).size).toBe(3);
        expect(icvs.sort((a, b) => a - b)).toEqual([6, 7, 8]);
        expect(client.getInvoiceCounter()).toBe(8);
    });
});
