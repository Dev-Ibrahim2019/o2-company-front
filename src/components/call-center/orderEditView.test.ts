import { describe, expect, it } from "vitest";
import {
  buildInitialLines, diffLines, editRequirements, estimateTotal, payloadFromLines, hasAnyItem, type EditLine,
} from "./orderEditView";
import type { OrderDetailItem } from "./services/callCenterService";

const item = (id: number, itemId: number | null, quantity: number, overrides: Partial<OrderDetailItem> = {}): OrderDetailItem => ({
  id, item_id: itemId, item_name: `item-${itemId}`, item_name_ar: `صنف ${itemId}`, quantity, price: 10, total: 10 * quantity, notes: null, ...overrides,
});

describe("buildInitialLines", () => {
  it("بيجمّع الأسطر بنفس الصنف وبيتجاهل الملغاة والأسطر بلا صنف", () => {
    const lines = buildInitialLines([
      item(1, 5, 2), item(2, 5, 1), item(3, 6, 1, { status: "cancelled" }), item(4, null, 1), item(5, 7, 3, { notes: "بدون بصل" }),
    ]);
    expect(lines).toEqual([
      { itemId: 5, name: "صنف 5", price: 10, quantity: 3, notes: null, original: 3 },
      { itemId: 7, name: "صنف 7", price: 10, quantity: 3, notes: "بدون بصل", original: 3 },
    ]);
  });
});

describe("diffLines", () => {
  const lines: EditLine[] = [
    { itemId: 1, name: "a", price: 10, quantity: 3, notes: null, original: 2 }, // زاد
    { itemId: 2, name: "b", price: 10, quantity: 1, notes: null, original: 3 }, // نقص
    { itemId: 3, name: "c", price: 10, quantity: 0, notes: null, original: 1 }, // أُزيل
    { itemId: 4, name: "d", price: 10, quantity: 2, notes: null, original: 0 }, // جديد
    { itemId: 5, name: "e", price: 10, quantity: 1, notes: null, original: 1 }, // بدون تغيير
  ];

  it("بيصنّف كل تغيير", () => {
    const diff = diffLines(lines);
    expect(diff.added.map(l => l.itemId)).toEqual([4]);
    expect(diff.removed.map(l => l.itemId)).toEqual([3]);
    expect(diff.increased.map(l => l.itemId)).toEqual([1]);
    expect(diff.decreased.map(l => l.itemId)).toEqual([2]);
    expect(diff).toMatchObject({ hasRemovals: true, hasAdditions: true, changed: true });
  });

  it("بدون تغيير ولا شي بيعتبر changed", () => {
    expect(diffLines([lines[4]]).changed).toBe(false);
  });

  it("سطر جديد كميته 0 ما بيحسب إضافة", () => {
    expect(diffLines([{ itemId: 9, name: "z", price: 1, quantity: 0, notes: null, original: 0 }]).changed).toBe(false);
  });
});

describe("editRequirements — مرآة قواعد الباك اند", () => {
  const removal = diffLines([{ itemId: 1, name: "a", price: 1, quantity: 0, notes: null, original: 1 }]);
  const addition = diffLines([{ itemId: 2, name: "b", price: 1, quantity: 1, notes: null, original: 0 }]);

  it("قبل التنفيذ والدفع: حر بدون شروط", () => {
    expect(editRequirements(removal, "pending", "unpaid")).toEqual({ reason: false, blocked: false });
    expect(editRequirements(addition, "pending", "unpaid")).toEqual({ reason: false, blocked: false });
  });
  it("إزالة بعد التنفيذ: سبب. إضافة بعد التنفيذ: بدون سبب", () => {
    expect(editRequirements(removal, "executed", "unpaid")).toEqual({ reason: true, blocked: false });
    expect(editRequirements(addition, "executed", "unpaid")).toEqual({ reason: false, blocked: false });
  });
  it("الطلب المدفوع ممنوع تعديله أيًا كان التغيير", () => {
    expect(editRequirements(addition, "pending", "paid").blocked).toBe(true);
    expect(editRequirements(removal, "executed", "paid").blocked).toBe(true);
    expect(editRequirements(diffLines([]), "executed", "paid").blocked).toBe(true);
  });
});

describe("estimateTotal / payloadFromLines / hasAnyItem", () => {
  const lines: EditLine[] = [
    { itemId: 1, name: "a", price: 12.5, quantity: 2, notes: "قديم", original: 1 },
    { itemId: 2, name: "b", price: 3, quantity: 0, notes: null, original: 1 },
    { itemId: 3, name: "c", price: 4, quantity: 1, notes: "بدون ثوم", original: 0 },
  ];

  it("بيقدّر الإجمالي بدون الأصناف المشالة", () => {
    expect(estimateTotal(lines)).toBe(29);
  });

  it("الحمولة: ملاحظات الأصناف الجديدة بس، والسبب بينقص من الفراغات", () => {
    expect(payloadFromLines(lines, "ملاحظة", "  سبب  ")).toEqual({
      items: [
        { item_id: 1, quantity: 2, notes: null },
        { item_id: 2, quantity: 0, notes: null },
        { item_id: 3, quantity: 1, notes: "بدون ثوم" },
      ],
      notes: "ملاحظة",
      reason: "سبب",
    });
    expect(payloadFromLines(lines, null, "   ").reason).toBeUndefined();
  });

  it("بيمنع إزالة كل الأصناف", () => {
    expect(hasAnyItem(lines)).toBe(true);
    expect(hasAnyItem(lines.map(l => ({ ...l, quantity: 0 })))).toBe(false);
  });
});
