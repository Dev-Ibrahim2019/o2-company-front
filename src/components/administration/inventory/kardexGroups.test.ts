import { describe, expect, it } from "vitest";
import type { KardexRow } from "../../../services/inventoryService";
import { groupSaleRuns, summarizeSaleRun } from "./kardexGroups";

let seq = 0;
const row = (type: string, out: number, extra: Partial<KardexRow> = {}): KardexRow => {
  seq++;
  return {
    id: seq,
    occurred_at: `2026-11-08T09:${String(seq).padStart(2, "0")}:00Z`,
    accounting_day: "2026-11-08",
    type,
    type_label: type,
    reversal_of_id: null,
    is_reversed: false,
    can_reverse: false,
    quantity: String(-out),
    unit_cost: "2",
    total_cost: String(-out * 2),
    avg_cost_after: "2",
    running_quantity: String(100 - seq),
    running_value: "0",
    entered_quantity: null,
    entered_unit: null,
    notes: null,
    created_by: null,
    quantity_in: "0",
    quantity_out: String(out),
    number: `ORD-${seq}`,
    warehouse: { id: 3, name: "قسم الشاورما", code: "01002" },
    account_name: "تكلفة المبيعات",
    ...extra,
  };
};
const shape = (rows: KardexRow[]) => groupSaleRuns(rows).map((e) => (e.kind === "row" ? e.row.type : `group×${e.rows.length}`));

describe("groupSaleRuns", () => {
  it("groups only consecutive sale consumption and keeps other movements as they are", () => {
    const rows = [row("sale", 1), row("sale", 1), row("sale", 1), row("transfer_in", 0), row("sale", 1), row("sale", 1), row("waste", 1)];
    expect(shape(rows)).toEqual(["group×3", "transfer_in", "group×2", "waste"]);
  });

  it("a single sale stays a normal row", () => {
    expect(shape([row("opening", 0), row("sale", 1), row("transfer_in", 0)])).toEqual(["opening", "sale", "transfer_in"]);
  });

  it("a sale reversal breaks the run and is never grouped", () => {
    const a = row("sale", 1);
    const rows = [a, row("sale", 1), row("sale", -1, { reversal_of_id: a.id }), row("sale", 1)];
    expect(shape(rows)).toEqual(["group×2", "sale", "sale"]);
  });

  it("group key is stable (first movement id)", () => {
    const rows = [row("sale", 1), row("sale", 1)];
    const g = groupSaleRuns(rows)[0];
    expect(g.kind === "group" && g.key).toBe(`sale-${rows[0].id}`);
  });
});

describe("summarizeSaleRun", () => {
  it("sums out quantity, keeps the last running balance, and counts distinct orders", () => {
    const rows = [row("sale", 1.5, { number: "ORD-A" }), row("sale", 2, { number: "ORD-A" }), row("sale", 0.5, { number: "ORD-B" })];
    const s = summarizeSaleRun(rows);
    expect(s.quantityOut).toBeCloseTo(4);
    expect(s.runningQuantity).toBe(rows[2].running_quantity);
    expect(s.orders).toBe(2);
    expect(s.movements).toBe(3);
    expect(s.uniformCost).toBe(true);
    expect(s.unitCost).toBe(2);
    expect(s.warehouse).toBe("قسم الشاورما");
  });

  it("uses the weighted average when unit costs differ", () => {
    // (1 × 2 + 3 × 4) ÷ 4 = 3.5
    const s = summarizeSaleRun([row("sale", 1, { unit_cost: "2" }), row("sale", 3, { unit_cost: "4" })]);
    expect(s.uniformCost).toBe(false);
    expect(s.unitCost).toBeCloseTo(3.5);
  });

  it("reports mixed warehouses and the date range", () => {
    const s = summarizeSaleRun([
      row("sale", 1, { accounting_day: "2026-11-07" }),
      row("sale", 1, { warehouse: { id: 4, name: "الايطالي", code: "1102" }, accounting_day: "2026-11-08" }),
    ]);
    expect(s.warehouse).toBeNull();
    expect([s.firstDay, s.lastDay]).toEqual(["2026-11-07", "2026-11-08"]);
  });
});
