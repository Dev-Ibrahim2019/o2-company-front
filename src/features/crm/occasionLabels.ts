import type { CrmContactMethod, CrmOccasionType } from "./types";

/**
 * Extracted from OccasionsPanel so the detail drawer can label an occasion
 * without importing the panel that renders it — the panel opens the drawer,
 * and a shared leaf module is what keeps that from becoming a cycle.
 *
 * Mirrors the customer_occasions enum constrained in 2027_01_18_000001.
 */
export const OCCASION_TYPE_LABELS: Record<CrmOccasionType, string> = {
  birthday: "عيد ميلاد",
  anniversary: "ذكرى سنوية",
  graduation: "تخرّج",
  company_founding: "تأسيس",
  contract_renewal: "تجديد عقد",
  other: "أخرى",
};

export const CONTACT_METHOD_LABELS: Record<CrmContactMethod, string> = {
  call: "اتصال",
  sms: "رسالة نصية",
  email: "بريد إلكتروني",
  whatsapp: "واتساب",
};
