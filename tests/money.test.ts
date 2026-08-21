// file: tests/money.test.ts

import { describe, expect, test } from "bun:test";
import { formatMoney, formatQuantity } from "../src/lib/money";

describe("formatMoney", () => {
    test.each([
        [1.005, "1.01"],
        [2.675, "2.68"],
        [1.004, "1.00"],
        [0, "0.00"],
        [-1.005, "-1.01"],
        [-2.675, "-2.68"],
    ])("formatMoney(%s) → %s", (amount, expected) => {
        expect(formatMoney(amount)).toBe(expected);
    });

    test("rejects non-finite input", () => {
        expect(() => formatMoney(NaN)).toThrow(/finite/);
        expect(() => formatMoney(Infinity)).toThrow(/finite/);
    });
});

describe("formatQuantity", () => {
    test("emits 6 decimal places, half-up", () => {
        expect(formatQuantity(1)).toBe("1.000000");
        expect(formatQuantity(1.0000005)).toBe("1.000001");
    });
});
