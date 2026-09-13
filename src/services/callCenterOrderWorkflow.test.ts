import { describe, expect, it } from "vitest";
import { validateCallCenterPayments } from "./callCenterOrderWorkflow";

describe("validateCallCenterPayments", () => {
  it("rejects raw non-positive and non-finite rows before normalization", () => {
    expect(validateCallCenterPayments([{ method:"cash", amount:0 }],0)).toContain("مبلغ الدفعة 1 يجب أن يكون رقماً موجباً");
    expect(validateCallCenterPayments([{ method:"cash", amount:Number.NaN }],10)[0]).toContain("مبلغ الدفعة");
  });

  it("requires exact total and method references", () => {
    expect(validateCallCenterPayments([{ method:"card", amount:10 }],10)).toContain("الرقم المرجعي مطلوب للدفعة 1");
    expect(validateCallCenterPayments([{ method:"cash", amount:9 }],10)).toContain("يجب أن يساوي مجموع الدفعات إجمالي الطلب تماماً");
  });

  it("requires deterministic matching entity and subledger metadata", () => {
    expect(validateCallCenterPayments([{
      method:"account", amount:10,
      entity_type:"supplier", entity_id:7,
      subledger_type:"supplier", subledger_id:8,
    }],10)).toContain("بيانات الجهة المالية غير مكتملة للدفعة 1");
    expect(validateCallCenterPayments([{
      method:"account", amount:10,
      entity_type:"employee", entity_id:7,
      subledger_type:"employee", subledger_id:7,
    }],10)).toEqual([]);
  });

  it("does not allow entity metadata on direct methods", () => {
    expect(validateCallCenterPayments([{
      method:"cash", amount:10,
      entity_type:"customer", entity_id:1,
      subledger_type:"customer", subledger_id:1,
    }],10)).toContain("لا تقبل الدفعة 1 بيانات جهة مالية");
  });
});
