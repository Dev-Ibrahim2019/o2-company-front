import { describe, expect, it } from "vitest";
import { accountingToday, presetRange, varianceTone } from "../../../../services/departmentsService";
import { sortRows } from "./shared";

describe("accountingToday", () => {
  it("before 02:00 still belongs to the previous accounting day", () => {
    expect(accountingToday(new Date(2026, 10, 8, 1, 30))).toBe("2026-11-07");
    expect(accountingToday(new Date(2026, 10, 8, 2, 0))).toBe("2026-11-08");
  });
});

describe("presetRange", () => {
  const today = "2026-11-08";
  it("current month starts on the 1st", () => expect(presetRange("month", today)).toEqual({ from: "2026-11-01", to: today }));
  it("last 7 days includes today", () => expect(presetRange("week", today)).toEqual({ from: "2026-11-02", to: today }));
  it("last month is the whole previous month", () => expect(presetRange("last_month", today)).toEqual({ from: "2026-10-01", to: "2026-10-31" }));
  it("crosses the year boundary", () => expect(presetRange("last_month", "2027-01-15")).toEqual({ from: "2026-12-01", to: "2026-12-31" }));
});

describe("varianceTone", () => {
  it("not counted / match / shortage / surplus", () => {
    expect(varianceTone(null, null, "3")).toEqual({ kind: "none", big: false });
    expect(varianceTone("0", "0", "3")).toEqual({ kind: "match", big: false });
    expect(varianceTone("-5", "-0.64", "3")).toEqual({ kind: "shortage", big: false });
    expect(varianceTone("12", "4.5", "3")).toEqual({ kind: "surplus", big: true });
  });
  it("the alert threshold itself counts as big, and any difference on a zero expected is big", () => {
    expect(varianceTone("-3", "-3.00", "3").big).toBe(true);
    expect(varianceTone("2", null, "3")).toEqual({ kind: "surplus", big: true });
  });
});

describe("sortRows", () => {
  const rows = [
    { name: "ب", v: "10" },
    { name: "أ", v: "2" },
    { name: "ج", v: null },
  ];
  it("sorts numerically (not as text) and keeps empty values last", () => {
    expect(sortRows(rows, { key: "v", dir: "desc" }, (r, k) => r[k as "v"]).map((r) => r.v)).toEqual(["10", "2", null]);
    expect(sortRows(rows, { key: "v", dir: "asc" }, (r, k) => r[k as "v"]).map((r) => r.v)).toEqual(["2", "10", null]);
  });
  it("sorts Arabic text alphabetically", () => {
    expect(sortRows(rows, { key: "name", dir: "asc" }, (r, k) => r[k as "name"]).map((r) => r.name)).toEqual(["أ", "ب", "ج"]);
  });
});
