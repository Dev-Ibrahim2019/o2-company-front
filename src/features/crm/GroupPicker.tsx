import { useEffect, useState } from "react";
import { crmApi } from "./api";
import type { CrmCustomerGroup } from "./types";

const selectCls =
  "h-11 w-full rounded-xl border border-[var(--crmx-border)] bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none focus:border-[var(--crmx-primary)] focus:ring-2 focus:ring-[var(--crmx-primary)]/10";

/**
 * A plain dropdown over GET /crm/customer-groups. Groups are a short,
 * branch-independent list (the same one GroupsPage renders in full), so this
 * mirrors DepartmentPicker/ProductPicker rather than CustomerPicker's
 * search-as-you-type shape.
 */
export function GroupPicker({
  value,
  onChange,
  disabled,
}: {
  value: number | null;
  onChange: (id: number | null) => void;
  disabled?: boolean;
}) {
  const [groups, setGroups] = useState<CrmCustomerGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void crmApi.customerGroups()
      .then((rows) => { if (alive) setGroups(rows); })
      .catch(() => { if (alive) setGroups([]); })
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
      <option value="">{loading ? "جارٍ التحميل..." : "اختر المجموعة"}</option>
      {groups.map((g) => (
        <option key={String(g.id)} value={String(g.id)}>{g.name}</option>
      ))}
    </select>
  );
}
