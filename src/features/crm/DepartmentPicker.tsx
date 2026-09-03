import { useEffect, useState } from "react";
import { departmentService, type Department } from "../../services/departmentService";

const selectCls =
  "h-11 w-full rounded-xl border border-[var(--crmx-border)] bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none focus:border-[var(--crmx-primary)] focus:ring-2 focus:ring-[var(--crmx-primary)]/10";

/**
 * A plain dropdown, not a search-and-pick component like CustomerPicker: the
 * department list is small (a handful of kitchen sections) and already
 * loaded whole by every menu screen in the app — GET /departments needs only
 * auth:sanctum, no extra permission — so there is nothing here worth
 * debouncing or paginating.
 *
 * Reused as-is by the "category" scope on a loyalty rule: order_items carries
 * department_id directly, and that is exactly what LoyaltyRule.scope_id means
 * for scope_type="category".
 */
export function DepartmentPicker({
  value,
  onChange,
  disabled,
}: {
  value: number | null;
  onChange: (id: number | null) => void;
  disabled?: boolean;
}) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void departmentService.getAll()
      .then((rows) => { if (alive) setDepartments(rows); })
      .catch(() => { if (alive) setDepartments([]); })
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
      <option value="">{loading ? "جارٍ التحميل..." : "اختر القسم"}</option>
      {departments.map((d) => (
        <option key={d.id} value={d.id}>{d.nameAr || d.name}</option>
      ))}
    </select>
  );
}
