import { describe, expect, it } from "vitest";
import { calculateCartTotals, type CartLine } from "./cartTotals";

const baseInput = {
  discountValue: 0,
  discountType: "AMOUNT" as const,
  taxEnabled: false,
  taxRate: 0,
  deliveryFee: 0,
  isDelivery: false,
};

describe("calculateCartTotals — single source of truth for the invoice table", () => {
  it("sums visible row totals to exactly the same subtotal shown as the grand total (no discount/tax/delivery)", () => {
    const items: CartLine[] = [
      { price: 12.5, quantity: 2 },
      { price: 7, quantity: 3 },
      { price: 40, quantity: 1 },
    ];
    const result = calculateCartTotals({ ...baseInput, items });

    const sumOfVisibleRows = result.lineTotals.reduce((sum, t) => sum + t, 0);
    expect(sumOfVisibleRows).toBeCloseTo(result.total, 5);
    expect(result.lineTotals).toEqual([25, 21, 40]);
    expect(result.total).toBe(86);
  });

  it("keeps line totals in sync with an empty cart (grand total is zero, not stale)", () => {
    const result = calculateCartTotals({ ...baseInput, items: [] });
    expect(result.lineTotals).toEqual([]);
    expect(result.subtotal).toBe(0);
    expect(result.total).toBe(0);
  });

  it("still reconciles row-sum vs grand total once discount, tax and delivery are applied", () => {
    const items: CartLine[] = [
      { price: 15, quantity: 2 },
      { price: 9.5, quantity: 4 },
    ];
    const result = calculateCartTotals({
      items,
      discountValue: 10,
      discountType: "PERCENT",
      taxEnabled: true,
      taxRate: 5,
      deliveryFee: 12,
      isDelivery: true,
    });

    const subtotalFromRows = result.lineTotals.reduce((sum, t) => sum + t, 0);
    expect(subtotalFromRows).toBe(result.subtotal);

    const expectedDiscount = result.subtotal * 0.1;
    const expectedTaxable = result.subtotal - expectedDiscount;
    const expectedTax = expectedTaxable * 0.05;
    const expectedTotal = expectedTaxable + expectedTax + 12;

    expect(result.total).toBeCloseTo(expectedTotal, 5);
  });

  it("never lets the taxable base go negative when discount exceeds the subtotal", () => {
    const result = calculateCartTotals({
      ...baseInput,
      items: [{ price: 10, quantity: 1 }],
      discountValue: 999,
    });
    expect(result.taxableBase).toBe(0);
    expect(result.total).toBe(0);
  });
});
