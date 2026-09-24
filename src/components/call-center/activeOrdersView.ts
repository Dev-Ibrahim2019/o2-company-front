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
// نعرض مقطع مختصر بالواجهة، مع الاحتفاظ بالرقم الكامل داخل تفاصيل الطلب/الفاتورة (tooltip/تفاصيل).
// ما بيغيّر أي معرف بقاعدة البيانات، عرض فقط.
//
// مهم: التسلسل (XXXX) بالباك اند مُولَّد عالميًا لكل الفروع سوية *لكل يوم* (راجع
// Order::generateOrderNumber بالباك اند — الاستعلام ما بيفلتر على branch_id، فالتفرّد مضمون
// ضمن نفس اليوم عبر كل الفروع). كان الكود القديم هون ياخذ آخر مقطع رقمي بس (#0001) ويطرح
// اليوم/الشهر — فطلبين من يومين مختلفين (نفس التسلسل اليومي) كانوا يظهروا بنفس الرقم المختصر
// "#0001" رغم إنهم فعليًا مختلفين تمامًا بقاعدة البيانات. الإصلاح: نضيف الشهر/اليوم (MMDD) قبل
// التسلسل، يبقى مختصر وقابل للإملاء هاتفيًا لكن بلا تصادم عملي.
export function getOrderReference(orderNumber: string): string {
  const parts = orderNumber.split("-");
  const sequence = parts.pop() || orderNumber;
  const dateSegment = parts.pop(); // YYYYMMDD لو الصيغة ORD-YYYYMMDD-XXXX
  if (dateSegment && /^\d{8}$/.test(dateSegment)) {
    return `#${dateSegment.slice(4)}-${sequence}`; // MMDD-XXXX
  }
  return `#${sequence}`;
}

// عملة الكول سنتر: شيكل (₪) — مصدر واحد للتنسيق بدل ما كل صفحة (Active/Closed/Details) تعيد
// كتابة نفس المنطق بصيغة مختلفة (كانت متفرقة بين "د.إ" و"₪" حسب الملف).
// أرقام إنجليزية (0-9) دائمًا — مش عربية (٠-٩) — عشان المبالغ تنقرأ وتنمليّ على الهاتف بدون لبس.
export function formatShekel(amount: number): string {
  return `₪ ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** تاريخ/وقت بنص عربي بس بأرقام إنجليزية (nu-latn) — نفس قاعدة الأرقام بصفحات الكول سنتر. */
export const LATIN_DIGITS_LOCALE = "ar-EG-u-nu-latn";

// مصدر الحقيقة الوحيد لـ Active/Closed بالفرونت — نفس قاعدة CallCenterService::determineLifecycle
// بالباك اند بالضبط (مكرّرة هون لأن صفحة تفاصيل الطلب تحتاجها فورًا من بيانات order اللي وصلت
// أصلاً، بدون رحلة API إضافية). الدفع وحده لا يُغلق الطلب أبدًا.
export type OrderLifecycle = "active" | "closed";

export function determineOrderLifecycle(status: string, invoiceStatus?: string | null): OrderLifecycle {
  // status="closed" هي القيمة الصريحة الجديدة (OrderStatusService::maybeAutoClose بالباك اند) —
  // تُحسم مباشرة. الشرط تحتها يبقى شبكة أمان لبيانات قديمة لم تُحدَّث بعد لهذه القيمة الصريحة.
  if (status === "closed" || status === "cancelled" || status === "canceled" || status === "CANCELLED") return "closed";
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

// مؤشر تأخر SLA (🔥) — حساسية بالدقائق، منفصل تمامًا عن getOrderStaleness أعلاه (بالساعات،
// مُختبر أصلاً بقيم 1/4 ساعات لغرض مختلف: تلوين "عمر الطلب" العام). لا نغيّر getOrderStaleness
// نفسها ولا عتباتها — نضيف ثوابت/دالة موازية بدل ما نكسر سلوك أو اختبارات موجودة.
export const SLA_WARNING_MINUTES = 20;
export const SLA_CRITICAL_MINUTES = 40;

export type SlaLevel = "normal" | "warning" | "critical";

export function getOrderSlaLevel(createdAt: string, now: number = Date.now()): SlaLevel {
  const minutes = (now - new Date(createdAt).getTime()) / 60_000;
  if (minutes >= SLA_CRITICAL_MINUTES) return "critical";
  if (minutes >= SLA_WARNING_MINUTES) return "warning";
  return "normal";
}

// حالة سير العمل (workflow stage) — طبقة بصرية إضافية فوق order.status الخام، بديل بصري واحد
// موحّد لخمس مراحل حقيقية قابلة للتحقق فعليًا بالنظام (راجع سياق الخطة بالجلسة: القيم الأخرى
// المحتملة بقيد CHECK مثل PREPARATION/ASSEMBLING/READY_FOR_DELIVERY غير قابلة للوصول عبر أي
// كنترولر حاليًا، فما بنميّزها هون). تُعرض دائمًا بجانب (وليس بدل) شارتي نوع الطلب وحالة الدفع.
// "new" و"preparing" كانوا مدموجين سابقًا بمرحلة وحدة ("preparing")، انفصلوا هون بطلب صريح:
// new = لسا ما انبعت للمطبخ (pending/pending_confirmation/scheduled/pending_payment)،
// preparing = انبعت فعليًا وجاري تحضيره (confirmed/in_progress).
export type WorkflowStage = "new" | "preparing" | "ready" | "out_for_delivery" | "completed";

export const WORKFLOW_STAGE_COLORS: Record<WorkflowStage, string> = {
  new: "#EF4444",
  preparing: "#F59E0B",
  ready: "#3B82F6",
  out_for_delivery: "#F97316",
  completed: "#22C55E",
};

const WORKFLOW_STAGE_LABELS: Record<WorkflowStage, string> = {
  new: "جديد",
  preparing: "قيد التجهيز",
  ready: "جاهز",
  out_for_delivery: "مع موظف التوصيل",
  completed: "تم التسليم",
};

export function deriveWorkflowStage(status: string, _orderType: string): WorkflowStage {
  if (status === "OUT_FOR_DELIVERY") return "out_for_delivery";
  if (status === "served" || status === "DELIVERED") return "completed";
  if (status === "ready") return "ready";
  if (status === "confirmed" || status === "in_progress") return "preparing";
  return "new"; // pending/pending_confirmation/scheduled/pending_payment/paid (لسا ما انبعت للمطبخ)
}

// "تم التسليم" لطلبات التوصيل، "تم الاستلام" لغيرها (محلي/فوري) — نفس اللون والمرحلة، نص مختلف فقط.
export function workflowStageLabel(stage: WorkflowStage, orderType: string): string {
  if (stage === "completed") return orderType === "delivery" ? "تم التسليم" : "تم الاستلام";
  return WORKFLOW_STAGE_LABELS[stage];
}

// عدد الدقائق اللي الطلب متأخر فيها عن حد التحذير (SLA_WARNING_MINUTES) — 0 لو غير متأخر بعد.
// نفس مصدر getOrderSlaLevel أعلاه (created_at)، بدون منطق توقيت جديد أو مفبرك.
export function getDelayMinutes(createdAt: string, now: number = Date.now()): number {
  const minutes = (now - new Date(createdAt).getTime()) / 60_000;
  return Math.max(0, Math.floor(minutes - SLA_WARNING_MINUTES));
}

// وقت مرجعي لحساب التأخر (يُمرَّر لـ getOrderSlaLevel/getDelayMinutes بدل created_at مباشرة):
// وقت التنفيذ الفعلي لو الطلب كان مجدولاً ونُفِّذ فعلاً (orders:execute-scheduled بالباك اند) —
// عشان ما نحسب "تأخره" من وقت الجدولة القديم بعد ما بدأ تحضيره فعليًا؛ وإلا وقت الجدولة لو لسا
// بانتظار تنفيذه (قبل الموعد بيرجع فرق سالب فتتصفّر بـ Math.max أعلاه — يعني "غير متأخر" بصورة
// صحيحة تلقائيًا)؛ وإلا وقت الإنشاء العادي لطلب فوري بلا جدولة إطلاقاً (السلوك الأصلي بدون تغيير).
export function getOrderDelayReferenceTime(order: {
  created_at: string;
  scheduled_at?: string | null;
  executed_at?: string | null;
}): string {
  return order.executed_at || order.scheduled_at || order.created_at;
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
