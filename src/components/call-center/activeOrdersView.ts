// عرض "الطلبات النشطة" — دوال صافية يستخدمها ActiveOrdersPage (ومختبرة بمعزل عن الواجهة).
//
// الباك اند يرجّع الطلبات مبوّبة بحسب النطاق (scope): نفس الطلب ممكن ينتمي لأكثر من نطاق واحد
// بشكل شرعي (كل طلب نشط ينتمي لـ operational_active دائمًا، وممكن ينتمي كمان لـ awaiting_payment
// أو kitchen_active... الخ حسب حالته) — هيك التصنيف Many-to-many مقصود ومو خطأ. الخطأ كان إن
// الواجهة كانت تعمل flatten لكل النطاقات مع بعض لعرض "الكل"، فأي طلب منتمي لأكثر من نطاق (وهذا
// شبه كل الطلبات، لأن operational_active غير شرطي) كان يظهر أكتر من مرة والعداد يحسبه أكتر من مرة.
// الحل: ندمج كل النطاقات بـ id فريد قبل ما نعرض "الكل" أو نحسب العداد.

import type { ActiveCallCenterOrder, ActiveOrderGroups, ActiveOrderScope, BackendPaymentStatus } from "./services/callCenterService";

export function dedupeActiveOrders(groups: ActiveOrderGroups): ActiveCallCenterOrder[] {
  const byId = new Map<number, ActiveCallCenterOrder>();
  (Object.keys(groups) as ActiveOrderScope[]).forEach(scope => {
    groups[scope].forEach(order => {
      if (!byId.has(order.id)) byId.set(order.id, order);
    });
  });
  return Array.from(byId.values());
}

// إزالة تكرار دفاعية عامة بالاعتماد على id الحقيقي (مش index) — تُستخدم لأي قائمة طلبات مسطّحة
// (الطلبات المغلقة مثلاً) ممكن يوصلها نفس السجل مرتين (صفحتين متداخلتين، إعادة جلب متراكبة...).
export function dedupeById<T extends { id: number }>(list: T[]): T[] {
  const byId = new Map<number, T>();
  list.forEach(item => { if (!byId.has(item.id)) byId.set(item.id, item); });
  return Array.from(byId.values());
}

// رقم الطلب الكامل (ORD-20260903-0001) طويل وصعب على موظف الكول سنتر يحفظه أو يمليه بالهاتف —
// نعرض آخر مقطع رقمي بس (#0001) بالواجهة، مع الاحتفاظ بالرقم الكامل داخل تفاصيل الطلب/الفاتورة.
// ما بيغيّر أي معرف بقاعدة البيانات، عرض فقط.
export function getOrderReference(orderNumber: string): string {
  const lastSegment = orderNumber.split("-").pop() || orderNumber;
  return `#${lastSegment}`;
}

// عملة الكول سنتر: شيكل (₪) — مصدر واحد للتنسيق بدل ما كل صفحة (Active/Closed/Details) تعيد
// كتابة نفس المنطق بصيغة مختلفة (كانت متفرقة بين "د.إ" و"₪" حسب الملف).
export function formatShekel(amount: number): string {
  return `₪ ${amount.toLocaleString("ar-EG", { minimumFractionDigits: 2 })}`;
}

// مصدر الحقيقة الوحيد لـ Active/Closed بالفرونت — نفس قاعدة CallCenterService::determineLifecycle
// بالباك اند بالضبط (مكرّرة هون لأن صفحة تفاصيل الطلب تحتاجها فورًا من بيانات order اللي وصلت
// أصلاً، بدون رحلة API إضافية). الدفع وحده لا يُغلق الطلب أبدًا.
export type OrderLifecycle = "active" | "closed";

export function determineOrderLifecycle(status: string, invoiceStatus?: string | null): OrderLifecycle {
  if (status === "cancelled" || status === "canceled" || status === "CANCELLED") return "closed";
  const isCompleted = status === "served" || status === "DELIVERED";
  const isFullyPaid = invoiceStatus === "paid";
  return isCompleted && isFullyPaid ? "closed" : "active";
}

// عتبات تحذير الطلبات القديمة (بالساعات) — قيمة مركزية قابلة للتعديل، مش hard-code جوا الكومبوننت،
// لأنه مش شرط عمل موثّق إن ساعة وحدة أو 4 ساعات هي الحد الصحيح؛ لو تغيّرت المتطلبات نعدّل هون بس.
export const STALE_ORDER_WARNING_HOURS = 1;
export const STALE_ORDER_CRITICAL_HOURS = 4;

export type OrderStaleness = "normal" | "warning" | "critical";

export function getOrderStaleness(createdAt: string, now: number = Date.now()): OrderStaleness {
  const hours = (now - new Date(createdAt).getTime()) / 3_600_000;
  if (hours >= STALE_ORDER_CRITICAL_HOURS) return "critical";
  if (hours >= STALE_ORDER_WARNING_HOURS) return "warning";
  return "normal";
}

// حالة الدفع مستقلة تمامًا عن حالة الطلب: تقدّم حالة الطلب (تأكيد/تحضير...) ما يعني تلقائيًا إن
// الدفع تم تحصيله (دفع عند الاستلام مثلاً). المصدر الموثوق هو الباك اند (order.payment_status —
// مبني فعليًا على Invoice.status، راجع CallCenterService::derivePaymentStatus)؛ لو ما وصل (نسخة
// باك اند أقدم مثلاً) نرجع لتخمين محلي من payments/status كـ fallback بس.
export type DerivedPaymentStatus = "paid" | "awaiting_payment" | "unpaid";

export const PAYMENT_STATUS_LABELS: Record<DerivedPaymentStatus, string> = {
  paid: "مدفوع",
  awaiting_payment: "بانتظار الدفع",
  unpaid: "غير مدفوع",
};

const BACKEND_TO_DERIVED: Record<BackendPaymentStatus, DerivedPaymentStatus> = {
  paid: "paid",
  pending: "awaiting_payment",
  unpaid: "unpaid",
};

// طرق الدفع — مصدر واحد للتسميات العربية، يُستخدم بصفحة تفاصيل الطلب، معاينة الفاتورة، ونافذة
// تسجيل الدفع، بدل ما كل ملف يعيد كتابة نفس القاموس بصيغة مختلفة.
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "نقدي",
  card: "بطاقة",
  wallet: "محفظة",
  bank: "تحويل",
  account: "حساب",
};

export function derivePaymentStatus(
  order: Pick<ActiveCallCenterOrder, "status" | "payments" | "total" | "scopes"> & { payment_status?: BackendPaymentStatus },
): DerivedPaymentStatus {
  if (order.payment_status) return BACKEND_TO_DERIVED[order.payment_status];

  const paidAmount = (order.payments || []).reduce((sum, p) => sum + p.amount, 0);
  if (order.status === "paid" || (order.total > 0 && paidAmount >= order.total)) return "paid";
  if (order.scopes.includes("awaiting_payment")) return "awaiting_payment";
  return "unpaid";
}
