import type {
  CrmComplaintChannel, CrmComplaintDepartment, CrmComplaintPriority,
  CrmComplaintSeverity, CrmComplaintStatus,
} from "../types";

/**
 * Mirrors CustomerComplaint::ALLOWED_TRANSITIONS exactly.
 *
 * The backend does not expose this table on any endpoint — it is a model
 * constant consumed by canTransition(). Duplicating it here is a display
 * concern only: it decides which options a reader is offered, never whether a
 * change is permitted. The server stays the sole authority and still rejects
 * anything invalid with a 422, which is why callers surface its message
 * verbatim rather than assuming this copy is in step.
 *
 * Shared between the customer-profile tab and the CRM-wide screen so the two
 * can never offer different transitions for the same status.
 */
export const COMPLAINT_TRANSITIONS: Record<CrmComplaintStatus, CrmComplaintStatus[]> = {
  new: ["open", "cancelled"],
  open: ["in_progress", "resolved", "cancelled"],
  in_progress: ["waiting_customer", "resolved", "cancelled"],
  waiting_customer: ["in_progress", "resolved", "cancelled"],
  resolved: ["closed", "open"],
  closed: ["open"],
  cancelled: ["open"],
};

// Local to complaints on purpose: the shared StatusChip's map is built around
// customer statuses and only happens to know two of these seven words.
export const COMPLAINT_STATUS_TONE: Record<CrmComplaintStatus, { label: string; tone: string }> = {
  new: { label: "جديدة", tone: "bg-[var(--crmx-info-soft)] text-[var(--crmx-info-text)]" },
  open: { label: "مفتوحة", tone: "bg-[var(--crmx-info-soft)] text-[var(--crmx-info-text)]" },
  in_progress: { label: "قيد المعالجة", tone: "bg-[var(--crmx-warning-soft)] text-[var(--crmx-warning-text)]" },
  waiting_customer: { label: "بانتظار العميل", tone: "bg-[var(--crmx-orange-soft)] text-[var(--crmx-orange-text)]" },
  resolved: { label: "محلولة", tone: "bg-[var(--crmx-success-soft)] text-[var(--crmx-success-text)]" },
  closed: { label: "مغلقة", tone: "bg-[var(--crmx-neutral-soft)] text-[var(--crmx-text-secondary)]" },
  cancelled: { label: "ملغاة", tone: "bg-[var(--crmx-danger-soft)] text-[var(--crmx-danger-text)]" },
};

export const COMPLAINT_PRIORITY_TONE: Record<CrmComplaintPriority, { label: string; tone: string }> = {
  low: { label: "منخفضة", tone: "bg-[var(--crmx-neutral-soft)] text-[var(--crmx-text-secondary)]" },
  normal: { label: "عادية", tone: "bg-[var(--crmx-info-soft)] text-[var(--crmx-info-text)]" },
  high: { label: "مرتفعة", tone: "bg-[var(--crmx-warning-soft)] text-[var(--crmx-warning-text)]" },
  critical: { label: "حرجة", tone: "bg-[var(--crmx-danger-soft)] text-[var(--crmx-danger-text)]" },
};

export const COMPLAINT_CHANNEL_LABELS: Record<CrmComplaintChannel, string> = {
  call_center: "كول سنتر",
  crm: "CRM",
  website: "الموقع",
};

export const COMPLAINT_SEVERITY_LABELS: Record<CrmComplaintSeverity, string> = {
  info: "معلومة",
  warning: "تحذير",
  critical: "حرجة",
};

/** Mirrors CustomerComplaint::DEPARTMENT_LABELS. */
export const COMPLAINT_DEPARTMENT_LABELS: Record<CrmComplaintDepartment, string> = {
  hospitality: "الضيافة",
  pos: "الكاشير الفوري",
  call_center: "الكول سنتر",
  kitchen: "المطبخ",
  delivery: "التوصيل",
  accounting: "المحاسبة",
  management: "الإدارة العامة",
};

export const COMPLAINT_PILL =
  "inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-bold whitespace-nowrap";

/**
 * The happy-path lifecycle, in order — what the detail page draws as
 * «مسار المعالجة».
 *
 * `cancelled` is deliberately off this track: it is an exit, not a stage, and
 * a complaint can be cancelled from almost anywhere. The stepper renders it as
 * a separate terminal state rather than a node on the line.
 */
export const COMPLAINT_STATUS_STEPS: CrmComplaintStatus[] = [
  "new", "open", "in_progress", "resolved", "closed",
];

/** One-line "what this status means" copy — the guide page and the stepper. */
export const COMPLAINT_STATUS_DESCRIPTIONS: Record<CrmComplaintStatus, string> = {
  new: "شكوى سُجّلت للتو ولم تُفتح للمعالجة بعد — بانتظار المراجعة الأولى.",
  open: "تمت مراجعة الشكوى وقبولها، وهي في قائمة العمل بانتظار من يبدأ معالجتها.",
  in_progress: "موظف يعمل على الشكوى فعلياً الآن — تظل مُسندة إليه حتى يُغلقها.",
  waiting_customer: "المعالجة متوقفة بانتظار رد أو معلومة من العميل.",
  resolved: "تمّت معالجة الشكوى وسُجّل نص الحل — بانتظار الإغلاق النهائي.",
  closed: "الشكوى مغلقة نهائياً؛ لا إجراء إضافي عليها.",
  cancelled: "أُلغيت الشكوى (مكرّرة أو غير صحيحة أو تراجع عنها العميل) دون معالجة.",
};

/** Priority = how fast this needs a response. */
export const COMPLAINT_PRIORITY_DESCRIPTIONS: Record<CrmComplaintPriority, string> = {
  low: "لا تأثير تشغيلي مباشر — تُعالَج ضمن الدور الطبيعي.",
  normal: "شكوى اعتيادية تُعالَج خلال يوم العمل.",
  high: "تحتاج متابعة سريعة اليوم — عميل غاضب أو خطأ متكرّر.",
  critical: "تصعيد فوري — خسارة عميل أو ضرر مالي/سمعة محتمل.",
};

export const COMPLAINT_SEVERITY_TONE: Record<CrmComplaintSeverity, { label: string; tone: string }> = {
  info: { label: "معلومة", tone: "bg-[var(--crmx-info-soft)] text-[var(--crmx-info-text)]" },
  warning: { label: "تحذير", tone: "bg-[var(--crmx-warning-soft)] text-[var(--crmx-warning-text)]" },
  critical: { label: "حرجة", tone: "bg-[var(--crmx-danger-soft)] text-[var(--crmx-danger-text)]" },
};

/** Severity = how bad the underlying problem is, regardless of urgency. */
export const COMPLAINT_SEVERITY_DESCRIPTIONS: Record<CrmComplaintSeverity, string> = {
  info: "ملاحظة بسيطة أو استفسار — لا خلل فعلي في الخدمة.",
  warning: "خلل حقيقي أثّر على تجربة العميل لكنه قابل للإصلاح.",
  critical: "ضرر جسيم — تسمّم غذائي محتمل، إصابة، أو خسارة مالية كبيرة.",
};

export const COMPLAINT_CHANNEL_DESCRIPTIONS: Record<CrmComplaintChannel, string> = {
  call_center: "وردت عبر مكالمة أو رسالة إلى الكول سنتر.",
  crm: "سجّلها موظف CRM أثناء متابعة العميل أو تقييم أصناف طلب.",
  website: "وردت عبر الموقع أو التطبيق (محجوزة — لا مصدر يكتبها بعد).",
};

export const COMPLAINT_DEPARTMENT_DESCRIPTIONS: Record<CrmComplaintDepartment, string> = {
  hospitality: "استقبال، خدمة الطاولات، نظافة الصالة، تعامل الطاقم.",
  pos: "الكاشير الفوري — الطلب، الفاتورة، وقت التحضير على نقطة البيع.",
  call_center: "استقبال الطلبات الهاتفية، دقّة الطلب، سلوك موظف الكول سنتر.",
  kitchen: "جودة الطعام، المكوّنات، وقت التحضير، مطابقة الطلب.",
  delivery: "زمن التوصيل، حالة الطلب عند الاستلام، سلوك السائق.",
  accounting: "الفواتير، المبالغ، الاسترجاع، نقاط الولاء.",
  management: "سياسات عامة، شكاوى متكرّرة، تصعيدات تتجاوز قسماً واحداً.",
};
