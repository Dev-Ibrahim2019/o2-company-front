import type { CrmCustomerSource, CrmGender } from "../types";

// Single source of truth for Customer Source labels/options across the CRM
// frontend — matches CrmController::CUSTOMER_SOURCE_VALUES/SOURCE_LABELS on
// the backend exactly. This is Customer Source (how the customer first
// registered), never Order Source — see types.ts for the distinction.
export const CRM_CUSTOMER_SOURCE_LABELS: Record<CrmCustomerSource, string> = {
  website: "الموقع الإلكتروني",
  fawri: "كاشير فوري",
  families: "كاشير عائلات",
  call_center: "كاشير كول سنتر",
  walk_in: "حضور مباشر",
};

export const CRM_SOURCE_FILTER_OPTIONS: Array<[string, string]> = [
  ["", "كل المصادر"],
  ...(Object.entries(CRM_CUSTOMER_SOURCE_LABELS) as Array<[CrmCustomerSource, string]>),
];

// Order Source — which channel a specific ORDER was created through.
// Deliberately separate from Customer Source above (see CrmOrderRow.source
// in types.ts) — only "pos" and "call_center" are actually produced by the
// backend today. Unknown values fall back to the raw string, never hidden.
export const CRM_ORDER_SOURCE_LABELS: Record<string, string> = {
  pos: "نقطة بيع (POS)",
  call_center: "كول سنتر",
};

export const CRM_GENDER_LABELS: Record<CrmGender, string> = {
  male: "ذكر",
  female: "أنثى",
};

export const CRM_GENDER_FILTER_OPTIONS: Array<[string, string]> = [
  ["", "كل الأجناس"],
  ...(Object.entries(CRM_GENDER_LABELS) as Array<[CrmGender, string]>),
];
