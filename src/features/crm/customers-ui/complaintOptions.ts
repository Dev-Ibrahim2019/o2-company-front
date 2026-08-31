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
