import { describe, expect, it } from "vitest";
import {
  dedupeActiveOrders, derivePaymentStatus, getOrderStaleness,
  STALE_ORDER_WARNING_HOURS, STALE_ORDER_CRITICAL_HOURS,
  dedupeById, getOrderReference, formatShekel, determineOrderLifecycle,
} from "./activeOrdersView";
import type { ActiveCallCenterOrder, ActiveOrderGroups } from "./services/callCenterService";

const baseOrder = (overrides: Partial<ActiveCallCenterOrder>): ActiveCallCenterOrder => ({
  id: 1,
  order_number: "ORD-0001",
  status: "pending",
  order_type: "delivery",
  customer_id: null,
  customer_name: "أحمد",
  customer_phone: "0500000000",
  total: 100,
  branch: { id: 1, name: "الفرع الرئيسي" },
  created_at: new Date().toISOString(),
  scopes: ["operational_active"],
  ...overrides,
});

const emptyGroups = (): ActiveOrderGroups => ({
  operational_active: [], awaiting_payment: [], kitchen_active: [], delivery_active: [], no_branch: [],
});

describe("dedupeActiveOrders — نفس الطلب ما يظهر مرتين لو كان منتمي لأكثر من نطاق", () => {
  it("يدمج طلب موجود بنطاقين (operational_active + awaiting_payment) بنسخة واحدة فقط", () => {
    const a = baseOrder({ id: 1, scopes: ["operational_active", "awaiting_payment"] });
    const b = baseOrder({ id: 2, scopes: ["operational_active", "kitchen_active"] });
    const c = baseOrder({ id: 3, scopes: ["operational_active"] });

    const groups: ActiveOrderGroups = {
      ...emptyGroups(),
      operational_active: [a, b, c],
      awaiting_payment: [a],
      kitchen_active: [b],
    };

    // 5 سجلات موزعة على النطاقات، لكن 3 طلبات فريدة فقط بالـ id
    const totalRecordsAcrossScopes = Object.values(groups).reduce((sum, list) => sum + list.length, 0);
    expect(totalRecordsAcrossScopes).toBe(5);

    const unique = dedupeActiveOrders(groups);
    expect(unique).toHaveLength(3);
    expect(unique.map(o => o.id).sort()).toEqual([1, 2, 3]);
  });

  it("Test 1 من الطلب: A,A,B,B,C عبر النطاقات → 3 فريدة والعداد = 3", () => {
    const A = baseOrder({ id: 1, order_number: "A", scopes: ["operational_active", "awaiting_payment"] });
    const B = baseOrder({ id: 2, order_number: "B", scopes: ["operational_active", "kitchen_active"] });
    const C = baseOrder({ id: 3, order_number: "C", scopes: ["operational_active"] });

    const groups: ActiveOrderGroups = {
      ...emptyGroups(),
      operational_active: [A, B, C],
      awaiting_payment: [A],
      kitchen_active: [B],
    };

    const unique = dedupeActiveOrders(groups);
    expect(unique).toHaveLength(3);
    expect(unique.map(o => o.order_number).sort()).toEqual(["A", "B", "C"]);
  });

  it("طلب CONFIRMED/PAID يظهر مرة واحدة", () => {
    const order = baseOrder({ id: 5, status: "paid", scopes: ["operational_active", "kitchen_active"] });
    const groups: ActiveOrderGroups = {
      ...emptyGroups(),
      operational_active: [order],
      kitchen_active: [order],
    };
    expect(dedupeActiveOrders(groups)).toHaveLength(1);
  });

  it("طلب CONFIRMED مع دفع PENDING يظهر مرة واحدة بقائمة الكل، وينتمي كمان لبانتظار الدفع بدون تكرار", () => {
    const order = baseOrder({ id: 6, status: "confirmed", scopes: ["operational_active", "awaiting_payment"] });
    const groups: ActiveOrderGroups = {
      ...emptyGroups(),
      operational_active: [order],
      awaiting_payment: [order],
    };
    const unique = dedupeActiveOrders(groups);
    expect(unique).toHaveLength(1);
    expect(unique[0].scopes).toContain("awaiting_payment");
  });

  it("الفلترة بين الكل/نطاق معيّن ما تنتج بطاقات مكررة", () => {
    const orders = [
      baseOrder({ id: 1, scopes: ["operational_active", "awaiting_payment"] }),
      baseOrder({ id: 2, scopes: ["operational_active", "kitchen_active"] }),
    ];
    const groups: ActiveOrderGroups = {
      ...emptyGroups(),
      operational_active: orders,
      awaiting_payment: [orders[0]],
      kitchen_active: [orders[1]],
    };
    const all = dedupeActiveOrders(groups);
    const awaitingPaymentTab = all.filter(o => o.scopes.includes("awaiting_payment"));
    const ids = awaitingPaymentTab.map(o => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("إعادة الجلب (تغيّر حالة الطلب بين نطاقين) ما يراكم نسخ قديمة — كل استدعاء مستقل وصافي", () => {
    const order = baseOrder({ id: 7, scopes: ["operational_active", "awaiting_payment"] });
    const before: ActiveOrderGroups = { ...emptyGroups(), operational_active: [order], awaiting_payment: [order] };
    expect(dedupeActiveOrders(before)).toHaveLength(1);

    const movedOrder = { ...order, status: "confirmed", scopes: ["operational_active", "kitchen_active"] as const };
    const after: ActiveOrderGroups = { ...emptyGroups(), operational_active: [movedOrder], kitchen_active: [movedOrder] };
    expect(dedupeActiveOrders(after)).toHaveLength(1);
  });

  it("قائمة فارغة بكل النطاقات ترجع مصفوفة فارغة", () => {
    expect(dedupeActiveOrders(emptyGroups())).toHaveLength(0);
  });
});

describe("derivePaymentStatus — لا تفترض إن تقدّم حالة الطلب يعني إن الدفع تم", () => {
  it("حالة الطلب paid → مدفوع", () => {
    const order = baseOrder({ status: "paid", scopes: ["operational_active"] });
    expect(derivePaymentStatus(order)).toBe("paid");
  });

  it("مجموع الدفعات يغطي الإجمالي → مدفوع حتى لو status ما زال confirmed", () => {
    const order = baseOrder({ status: "confirmed", total: 100, payments: [{ method: "cash", amount: 100 }] });
    expect(derivePaymentStatus(order)).toBe("paid");
  });

  it("الطلب مؤكّد (CONFIRMED) لكن الدفع بانتظار — الحالتين مستقلتين، معتمد لا يعني مدفوع", () => {
    const order = baseOrder({ status: "confirmed", total: 100, payments: null, scopes: ["operational_active", "awaiting_payment"] });
    expect(derivePaymentStatus(order)).toBe("awaiting_payment");
  });

  it("لا دفعات ولا ضمن نطاق انتظار الدفع → غير مدفوع (fallback)", () => {
    const order = baseOrder({ status: "ready", total: 100, payments: null, scopes: ["operational_active", "kitchen_active"] });
    expect(derivePaymentStatus(order)).toBe("unpaid");
  });
});

describe("getOrderStaleness — عتبة قابلة للتعديل وليست hard-coded", () => {
  const now = Date.parse("2026-09-05T12:00:00Z");

  it("أقل من الحد الأول (ساعة افتراضيًا) → normal", () => {
    const createdAt = new Date(now - (STALE_ORDER_WARNING_HOURS * 3_600_000 - 60_000)).toISOString();
    expect(getOrderStaleness(createdAt, now)).toBe("normal");
  });

  it("بين الحدين → warning", () => {
    const createdAt = new Date(now - (STALE_ORDER_WARNING_HOURS * 3_600_000 + 60_000)).toISOString();
    expect(getOrderStaleness(createdAt, now)).toBe("warning");
  });

  it("أكبر من الحد الحرج (4 ساعات افتراضيًا) → critical", () => {
    const createdAt = new Date(now - (STALE_ORDER_CRITICAL_HOURS * 3_600_000 + 60_000)).toISOString();
    expect(getOrderStaleness(createdAt, now)).toBe("critical");
  });

  it("طلب عمره 4 أيام → critical", () => {
    const createdAt = new Date(now - 4 * 24 * 3_600_000).toISOString();
    expect(getOrderStaleness(createdAt, now)).toBe("critical");
  });
});

describe("dedupeById — إزالة تكرار دفاعية عامة لأي قائمة مسطّحة (الطلبات المغلقة مثلًا)", () => {
  it("A,A,B,B,C عبر قائمة واحدة → A,B,C والعداد 3", () => {
    const list = [
      { id: 1, label: "A" }, { id: 1, label: "A" },
      { id: 2, label: "B" }, { id: 2, label: "B" },
      { id: 3, label: "C" },
    ];
    const result = dedupeById(list);
    expect(result).toHaveLength(3);
    expect(result.map(r => r.id).sort()).toEqual([1, 2, 3]);
  });

  it("قائمة بدون تكرار ترجع كما هي", () => {
    const list = [{ id: 1 }, { id: 2 }];
    expect(dedupeById(list)).toHaveLength(2);
  });
});

describe("getOrderReference — رقم قصير للواجهة بدون تغيير المعرف الأساسي", () => {
  it("يقتطع آخر مقطع من ORD-20260903-0001", () => {
    expect(getOrderReference("ORD-20260903-0001")).toBe("#0001");
  });

  it("رقم بدون شرطات يرجع كما هو مع #", () => {
    expect(getOrderReference("1028")).toBe("#1028");
  });
});

describe("formatShekel — مصدر واحد لتنسيق العملة", () => {
  it("يعرض الرمز ₪ قبل المبلغ بمنزلتين عشريتين (أرقام ar-EG، نفس اتفاقية باقي المشروع)", () => {
    expect(formatShekel(150)).toBe("₪ " + (150).toLocaleString("ar-EG", { minimumFractionDigits: 2 }));
  });

  it("لا يغيّر قيمة المبلغ نفسها، فقط طريقة عرضه — يطابق toLocaleString لنفس الرقم", () => {
    const amount = 1234.5;
    expect(formatShekel(amount)).toBe("₪ " + amount.toLocaleString("ar-EG", { minimumFractionDigits: 2 }));
  });
});

describe("determineOrderLifecycle — نفس قاعدة الباك اند: الدفع وحده لا يغلق الطلب أبدًا", () => {
  it("CONFIRMED + UNPAID = ACTIVE", () => {
    expect(determineOrderLifecycle("confirmed", null)).toBe("active");
  });

  it("OUT_FOR_DELIVERY + PAID = ACTIVE (التسليم لسا ما صار)", () => {
    expect(determineOrderLifecycle("OUT_FOR_DELIVERY", "paid")).toBe("active");
  });

  it("COMPLETED (served) + UNPAID = NOT CLOSED", () => {
    expect(determineOrderLifecycle("served", null)).toBe("active");
  });

  it("COMPLETED (served) + PAID = CLOSED", () => {
    expect(determineOrderLifecycle("served", "paid")).toBe("closed");
  });

  it("DELIVERED + PAID = CLOSED", () => {
    expect(determineOrderLifecycle("DELIVERED", "paid")).toBe("closed");
  });

  it("CANCELLED يُغلق الطلب بغض النظر عن حالة الدفع", () => {
    expect(determineOrderLifecycle("cancelled", null)).toBe("closed");
    expect(determineOrderLifecycle("cancelled", "paid")).toBe("closed");
  });
});
