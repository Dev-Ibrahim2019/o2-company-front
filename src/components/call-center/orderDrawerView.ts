// منطق صافي لـ Drawer تفاصيل الطلب ونموذج الدفع (بدون React) — مختبر بمعزل عن الواجهة.

import type { FlowExecutionStatus, FlowPaymentState } from "./services/callCenterService";

const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN = "۰۱۲۳۴۵۶۷۸۹";

/**
 * نفس تطبيع الباك اند للمرجع (CallCenterOrderExecutionService::normalizeReference): بدون فراغات،
 * أحرف كبيرة، وأرقام عربية/فارسية → إنجليزية. الواجهة بتستخدمه بس لتثبيت مفتاح الـidempotency
 * ("AB 123" و"ab١٢٣" نفس الدفعة)، والباك اند هو اللي بيحسم التكرار فعليًا.
 */
export function normalizeReference(reference: string): string {
  return reference
    .trim()
    .replace(/[٠-٩]/g, d => String(ARABIC_INDIC.indexOf(d)))
    .replace(/[۰-۹]/g, d => String(PERSIAN.indexOf(d)))
    .replace(/[\s ​-‏]+/g, "")
    .toUpperCase();
}

function hashString(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) hash = ((hash << 5) + hash + value.charCodeAt(i)) | 0;
  return (hash >>> 0).toString(36);
}

/**
 * مفتاح idempotency حتمي لكل (طلب، مرجع، طريقة، مبلغ): إعادة الإرسال بنفس البيانات (ضغطتين، انقطاع
 * شبكة) بترجّع نفس النتيجة بدل ما تسجّل دفعة تانية؛ وتغيير أي حقل بيعطي مفتاح جديد بدل ما يصطدم
 * بحمولة مختلفة على نفس المفتاح.
 */
export function transferIdempotencyKey(orderId: number, reference: string, methodId: number, amount: number): string {
  return `cc-transfer-${orderId}-${methodId}-${Math.round(amount * 100)}-${hashString(normalizeReference(reference))}`;
}

/** المبلغ المدخل ما بيطابق المتبقي (بفرق أكبر من نص قرش) — تحذير مش رفض. */
export function amountMismatch(amount: number, remaining: number): boolean {
  return Math.abs(amount - remaining) > 0.005;
}

/**
 * إزالة صنف تحتاج سبب لما الطلب تنفّذ أو انتهى دفعه (نفس قاعدة الباك اند OrderAmendmentService).
 * وبعد الدفع بتحتاج كمان مشرف — الباك اند بيرفض غيره، والواجهة بتنبّه مسبقًا.
 */
export function removalRequirements(execution: FlowExecutionStatus, payment: FlowPaymentState): { reason: boolean; supervisor: boolean } {
  return { reason: execution === "executed" || payment === "paid", supervisor: payment === "paid" };
}

export const MIN_REASON_LENGTH = 3;

export function formatAddress(snapshot: Record<string, unknown> | null | undefined): string {
  if (!snapshot) return "";
  const parts = ["city", "area", "street", "landmark", "building_no"]
    .map(key => snapshot[key])
    .filter((v): v is string | number => (typeof v === "string" && v.trim() !== "") || typeof v === "number");
  return parts.join("، ");
}

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO → قيمة input[type=datetime-local] بالتوقيت المحلي ("2027-02-09T14:30"). */
export function toLocalDateTimeInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** قيمة datetime-local (توقيت محلي) → ISO 8601 UTC للباك اند. فاضي/غير صالح = null. */
export function fromLocalDateTimeInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function todayDateInput(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
