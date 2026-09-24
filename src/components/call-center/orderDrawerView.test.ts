import { describe, expect, it } from "vitest";
import {
  normalizeReference, transferIdempotencyKey, amountMismatch, removalRequirements, formatAddress,
  toLocalDateTimeInput, fromLocalDateTimeInput, todayDateInput,
} from "./orderDrawerView";

describe("normalizeReference — نفس تطبيع الباك اند", () => {
  it("بيوحّد الحرف والفراغات والأرقام العربية والفارسية", () => {
    for (const variant of ["ab 123", "AB١٢٣", " Ab۱۲۳ ", "AB 123"]) {
      expect(normalizeReference(variant)).toBe("AB123");
    }
  });
});

describe("transferIdempotencyKey", () => {
  it("نفس البيانات (بأي كتابة للمرجع) = نفس المفتاح، وأي تغيير = مفتاح جديد", () => {
    const base = transferIdempotencyKey(7, "AB 123", 3, 100);
    expect(transferIdempotencyKey(7, "ab١٢٣", 3, 100)).toBe(base);
    expect(transferIdempotencyKey(7, "AB124", 3, 100)).not.toBe(base);
    expect(transferIdempotencyKey(7, "AB 123", 4, 100)).not.toBe(base);
    expect(transferIdempotencyKey(7, "AB 123", 3, 99.5)).not.toBe(base);
    expect(transferIdempotencyKey(8, "AB 123", 3, 100)).not.toBe(base);
  });

  it("ضمن حد الباك اند (100 حرف) حتى لو المرجع طويل", () => {
    expect(transferIdempotencyKey(123456, "X".repeat(255), 12, 123456.78).length).toBeLessThanOrEqual(100);
  });
});

describe("amountMismatch", () => {
  it("بيتجاهل فروقات أقل من نص قرش", () => {
    expect(amountMismatch(100, 100)).toBe(false);
    expect(amountMismatch(100.004, 100)).toBe(false);
    expect(amountMismatch(99, 100)).toBe(true);
  });
});

describe("removalRequirements", () => {
  it("قبل التنفيذ والدفع: بدون شروط", () => {
    expect(removalRequirements("pending", "unpaid")).toEqual({ reason: false, supervisor: false });
    expect(removalRequirements("scheduled", "unpaid")).toEqual({ reason: false, supervisor: false });
  });
  it("بعد التنفيذ: سبب. بعد الدفع: سبب + مشرف", () => {
    expect(removalRequirements("executed", "unpaid")).toEqual({ reason: true, supervisor: false });
    expect(removalRequirements("scheduled", "paid")).toEqual({ reason: true, supervisor: true });
  });
});

describe("formatAddress", () => {
  it("بيجمع الأجزاء الموجودة فقط", () => {
    expect(formatAddress({ city: "رام الله", area: "", street: "شارع الإرسال", building_no: 5 })).toBe("رام الله، شارع الإرسال، 5");
    expect(formatAddress(null)).toBe("");
  });
});

describe("datetime-local helpers", () => {
  it("بيلف ذهابًا وإيابًا بالتوقيت المحلي", () => {
    const iso = new Date(2027, 1, 9, 14, 30).toISOString();
    expect(toLocalDateTimeInput(iso)).toBe("2027-02-09T14:30");
    expect(fromLocalDateTimeInput("2027-02-09T14:30")).toBe(iso);
  });
  it("القيم الفاضية/غير الصالحة", () => {
    expect(toLocalDateTimeInput(null)).toBe("");
    expect(fromLocalDateTimeInput("")).toBeNull();
    expect(fromLocalDateTimeInput("not a date")).toBeNull();
  });
  it("تاريخ اليوم بصيغة input[type=date]", () => {
    expect(todayDateInput(new Date(2027, 0, 5))).toBe("2027-01-05");
  });
});
