// file: src/lib/money.ts
// Decimal-safe money formatting — round half away from zero to 2 decimals.
//
// JavaScript `Number.prototype.toFixed` is binary-float based: (1.005).toFixed(2)
// is "1.00" because 1.005 cannot be represented exactly. ZATCA BR-DEC rules
// require decimal round-half-up, so we shift via exponent strings which avoids
// the binary representation error.

/** Round half away from zero to `decimals` places, return string with exact decimals */
function toFixedHalfUp(value: number, decimals: number): string {
    if (!Number.isFinite(value)) {
        throw new Error(`toFixedHalfUp: expected finite number, got ${value}`);
    }
    // Exponential shift: "1.005e2" → 100.5 → round → "101e-2" → 1.01
    // Math.round is half-towards-+∞, so negate around the round for negatives
    // (half away from zero). Invoice amounts are typically ≥0; rounding
    // adjustments (payableRoundingAmount) can be negative.
    const shifted = parseFloat(`${value}e${decimals}`);
    const rounded = shifted < 0 ? -Math.round(-shifted) : Math.round(shifted);
    const unshifted = Number(`${rounded}e-${decimals}`);
    const normalized = Object.is(unshifted, -0) ? 0 : unshifted;
    return normalized.toFixed(decimals);
}

/** Format a monetary amount to exactly 2 decimals, decimal half-up */
export function formatMoney(value: number): string {
    return toFixedHalfUp(value, 2);
}

/** Format a quantity-like value to 6 decimals (UBL InvoicedQuantity) — half-up */
export function formatQuantity(value: number): string {
    return toFixedHalfUp(value, 6);
}
