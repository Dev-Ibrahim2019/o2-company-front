// Combined, de-duplicated list of category values accepted across the
// backend's write paths today. The CRM category field has no single
// canonical enum yet (documented separately), so this list is a superset
// used only for filtering (an exact-match filter, safe with any value).
export const CRM_CATEGORY_OPTIONS: Array<[string, string]> = [
  ["", "كل التصنيفات"],
  ["retail", "تجزئة"],
  ["wholesale", "جملة"],
  ["vip", "VIP"],
  ["corporate", "شركات"],
  ["government", "حكومي"],
  ["service", "خدمي"],
  ["new", "جديد"],
  ["important", "مهم"],
  ["follow_up", "متابعة"],
  ["complaints", "شكاوى"],
  ["regular", "عادي"],
  ["inactive", "غير نشط"],
];

// Plain-text label lookup for contexts that want the Arabic category label
// without the colored-badge treatment (e.g. a data-dense table cell) —
// reuses the same option list rather than duplicating the value→label map.
const CATEGORY_LABEL_MAP: Record<string, string> = Object.fromEntries(
  CRM_CATEGORY_OPTIONS.filter(([v]) => v !== ""),
);

export function categoryLabel(value?: string | null): string {
  if (!value) return "—";
  return CATEGORY_LABEL_MAP[value] || value;
}
