import { describe, expect, it } from "vitest";
import { getChartDomainMax, getPreviousOrders, toggleExclusiveId } from "./CustomerProfileDrawer";

describe("customer profile overview behavior", () => {
  it("excludes the featured last order from previous orders", () => {
    expect(getPreviousOrders([1, 2, 3, 4, 5, 6])).toEqual([2, 3, 4, 5, 6]);
  });

  it("keeps only one accordion order open", () => {
    expect(toggleExclusiveId(null, 2)).toBe(2);
    expect(toggleExclusiveId(2, 3)).toBe(3);
    expect(toggleExclusiveId(3, 3)).toBeNull();
  });

  it("allows accordion and rating selections to be tracked independently", () => {
    const expandedOrderId = toggleExclusiveId(null, 2);
    const ratingOrderId = 3;
    expect({ expandedOrderId, ratingOrderId }).toEqual({ expandedOrderId: 2, ratingOrderId: 3 });
  });

  it("adds chart headroom and preserves a useful empty minimum", () => {
    expect(getChartDomainMax(0)).toBe(2);
    expect(getChartDomainMax(10)).toBe(12);
  });
});
