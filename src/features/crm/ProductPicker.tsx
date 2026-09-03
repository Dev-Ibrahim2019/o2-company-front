import { useEffect, useState } from "react";
import { fetchItems, type Item } from "../../services/itemService";

const selectCls =
  "h-11 w-full rounded-xl border border-[var(--crmx-border)] bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none focus:border-[var(--crmx-primary)] focus:ring-2 focus:ring-[var(--crmx-primary)]/10";

/**
 * A plain dropdown over GET /items, the same reasoning as DepartmentPicker:
 * the menu is small enough that every item fits in one request, so there is
 * nothing to search or paginate. What this picks is exactly
 * order_items.item_id — LoyaltyRule.scope_id for scope_type="product".
 */
export function ProductPicker({
  value,
  onChange,
  disabled,
}: {
  value: number | null;
  onChange: (id: number | null) => void;
  disabled?: boolean;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void fetchItems()
      .then((rows) => { if (alive) setItems(rows); })
      .catch(() => { if (alive) setItems([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  return (
    <select
      className={selectCls}
      value={value ?? ""}
      disabled={disabled || loading}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
    >
      <option value="">{loading ? "جارٍ التحميل..." : "اختر المنتج"}</option>
      {items.map((i) => (
        <option key={i.id} value={i.id}>{i.name_ar || i.name}</option>
      ))}
    </select>
  );
}
