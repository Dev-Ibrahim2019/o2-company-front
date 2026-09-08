import type { CrmCustomerSource, CrmGender, CrmOrderRow } from "../types";

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

// orders.order_type — the three real values. Moved here (out of
// OrdersPage.tsx) so the order quick view can show the same label without a
// second copy of this map.
export const CRM_ORDER_TYPE_LABELS: Record<string, string> = {
  dine_in: "صالة",
  takeaway: "سفري",
  delivery: "توصيل",
};

/**
 * "النوع / الطاولة" — a dine-in order with a seated table reads as its zone
 * and table number instead of the generic "صالة" label, exactly as the
 * orders table's own column already showed it before this was extracted.
 */
export function crmOrderTypeLabel(order: Pick<CrmOrderRow, "order_type" | "table">): string {
  if (order.table?.zone || order.table?.table_number) {
    const parts = [order.table.zone, order.table.table_number ? `طاولة ${order.table.table_number}` : null].filter(Boolean);
    return parts.join(" · ");
  }
  return CRM_ORDER_TYPE_LABELS[order.order_type] || order.order_type;
}

export const CRM_GENDER_LABELS: Record<CrmGender, string> = {
  male: "ذكر",
  female: "أنثى",
};

export const CRM_GENDER_FILTER_OPTIONS: Array<[string, string]> = [
  ["", "كل الأجناس"],
  ...(Object.entries(CRM_GENDER_LABELS) as Array<[CrmGender, string]>),
];
