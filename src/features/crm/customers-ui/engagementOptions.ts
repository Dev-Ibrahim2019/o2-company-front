// The Call Center's engagement tag — the only vocabulary this field carries.
//
// It replaces CRM_CATEGORY_OPTIONS, which was a union of two unrelated
// vocabularies that shared one column: business classification
// (retail/wholesale/…) and these engagement tags. The classification now lives
// on the customer's group (customer_groups.group_type); this list is what
// remains on the customer itself.
//
// Mirrors the backend enum in CallCenterController's validation rules.
export const CRM_ENGAGEMENT_OPTIONS: Array<[string, string]> = [
  ["", "كل الحالات"],
  ["regular", "عميل عادي"],
  ["important", "عميل مهم"],
  ["vip", "VIP"],
  ["new", "عميل جديد"],
  ["inactive", "عميل غير نشط"],
  ["follow_up", "يحتاج متابعة"],
  ["complaints", "لديه شكاوى"],
];

const LABELS = new Map(CRM_ENGAGEMENT_OPTIONS.filter(([v]) => v !== ""));

export function engagementLabel(value?: string | null): string {
  if (!value) return "";
  return LABELS.get(value) ?? value;
}

// Business classification, shown read-only wherever a customer's group is
// displayed. Writing it belongs to the (not yet built) group-management screen.
export const CRM_GROUP_TYPE_LABELS: Record<string, string> = {
  retail: "تجزئة",
  wholesale: "جملة",
  corporate: "شركات",
  government: "حكومي",
  service: "خدمي",
};
