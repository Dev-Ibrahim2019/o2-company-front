/**
 * DepartmentDetailPage.tsx — تفصيل قسم في فرع (/inventory/departments/:id?branch=&from=&to=&tab=).
 *
 * التبويبات: أصناف البيع، استهلاك المواد، الإحصائيات (بصلاحية التحليلات)، والجرد (بصلاحية الجرد، ولقسم مربوط
 * بمخزن فقط). الفترة والفرع والتبويب في الرابط، فتبقى عند التحديث ومشاركة الرابط.
 */

import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, BarChart3, ChevronRight, ClipboardCheck, PackageSearch, UtensilsCrossed, Warehouse as WarehouseIcon } from "lucide-react";
import { useAuth } from "../../../../auth";
import { INVENTORY_PERMISSIONS } from "../../../../auth/permissions";
import { inventoryErrorMessage } from "../../../../services/inventoryService";
import { departmentsService, type DepartmentUnit, type DeptQuery } from "../../../../services/departmentsService";
import { EmptyBlock, inputClass } from "../ui";
import { PeriodBar, Spinner, usePeriodParams } from "./shared";
import { SaleItemsTab } from "./SaleItemsTab";
import { ConsumptionTab } from "./ConsumptionTab";
import { StatsTab } from "./StatsTab";
import { CountTab } from "./CountTab";

type TabKey = "items" | "materials" | "stats" | "count";

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "items", label: "أصناف البيع", icon: UtensilsCrossed },
  { key: "materials", label: "استهلاك المواد", icon: PackageSearch },
  { key: "stats", label: "الإحصائيات", icon: BarChart3 },
  { key: "count", label: "الجرد", icon: ClipboardCheck },
];

/** ما يحتاجه كل تبويب: القسم والفترة والفرع. */
export interface TabProps {
  departmentId: number;
  unit: DepartmentUnit;
  query: DeptQuery;
  /** الفترة الفعلية (بعد افتراضي الخادم) — يبلّغ بها التبويب بعد التحميل. */
  onPeriod: (p: { from: string; to: string }) => void;
}

export const DepartmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const departmentId = Number(id);
  const { hasPermission } = useAuth();
  const { from, to, branch, query, update, params } = usePeriodParams();
  const [unit, setUnit] = useState<DepartmentUnit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<{ from: string; to: string } | null>(null);

  const canReports = hasPermission(INVENTORY_PERMISSIONS.ANALYTICS_VIEW);
  const canCount = canReports || hasPermission(INVENTORY_PERMISSIONS.COUNTS_MANAGE);
  const tabs = TABS.filter((t) => (t.key === "count" ? canCount : canReports));
  const requested = (params.get("tab") as TabKey | null) ?? tabs[0]?.key;
  const tab: TabKey | undefined = tabs.some((t) => t.key === requested) ? requested : tabs[0]?.key;

  useEffect(() => {
    if (!branch) {
      setError("اختر القسم من قائمة الأقسام (الفرع غير محدد).");
      return;
    }
    let cancelled = false;
    setUnit(null);
    setError(null);
    departmentsService
      .unit(departmentId, branch)
      .then((u) => !cancelled && setUnit(u))
      .catch((e) => !cancelled && setError(inventoryErrorMessage(e)));
    return () => {
      cancelled = true;
    };
  }, [departmentId, branch]);

  const backParams = new URLSearchParams(params);
  backParams.delete("tab");
  const back = `/inventory/departments?${backParams.toString()}`;

  if (error) {
    return (
      <div className="space-y-4" dir="rtl">
        <Link to={back} className="inline-flex items-center gap-1 text-sm font-bold text-slate-400 hover:text-white">
          <ChevronRight size={16} /> الأقسام
        </Link>
        <EmptyBlock icon={AlertTriangle} text={error} />
      </div>
    );
  }
  if (!unit) return <Spinner />;

  const q: DeptQuery = { ...query, branch_id: unit.branch.id };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="min-w-0">
          <Link to={back} className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-white mb-1">
            <ChevronRight size={14} /> الأقسام
          </Link>
          <h1 className="text-2xl font-black text-white truncate">{unit.department.name}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-sm font-semibold text-slate-500">
            <span>{unit.branch.name}</span>
            {unit.warehouse ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black bg-sky-500/10 text-sky-300">
                <WarehouseIcon size={12} aria-hidden /> {unit.warehouse.name}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black bg-amber-500/10 text-amber-300">
                <AlertTriangle size={12} aria-hidden /> بدون مخزن — مبيعاته تُخصم من مخزن البيع الافتراضي للفرع
              </span>
            )}
          </div>
        </div>
        {unit.branches.length > 1 && (
          <select
            className={`${inputClass} !w-auto !py-2`}
            value={unit.branch.id}
            onChange={(e) => update({ branch: e.target.value })}
            aria-label="فرع القسم"
          >
            {unit.branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <PeriodBar from={from} to={to} effective={period} onChange={(r) => update(r)} />

      {tabs.length === 0 || !tab ? (
        <EmptyBlock icon={AlertTriangle} text="لا تملك صلاحية تقارير الأقسام أو جردها" />
      ) : (
        <>
          <div role="tablist" aria-label="تبويبات القسم" className="flex gap-1 relative overflow-x-auto custom-scrollbar border-b border-white/5" data-print-hide>
            {tabs.map((t) => {
              const Icon = t.icon;
              const selected = t.key === tab;
              return (
                <button
                  key={t.key}
                  id={`tab-${t.key}`}
                  role="tab"
                  type="button"
                  aria-selected={selected}
                  aria-controls={`panel-${t.key}`}
                  onClick={() => update({ tab: t.key })}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-black whitespace-nowrap border-b-2 -mb-px transition-colors ${
                    selected ? "border-red-500 text-white" : "border-transparent text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <Icon size={15} aria-hidden /> {t.label}
                </button>
              );
            })}
          </div>

          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
            {tab === "items" && <SaleItemsTab departmentId={departmentId} unit={unit} query={q} onPeriod={setPeriod} />}
            {tab === "materials" && <ConsumptionTab departmentId={departmentId} unit={unit} query={q} onPeriod={setPeriod} />}
            {tab === "stats" && <StatsTab departmentId={departmentId} unit={unit} query={q} onPeriod={setPeriod} />}
            {tab === "count" && <CountTab departmentId={departmentId} unit={unit} query={q} onPeriod={setPeriod} />}
          </div>
        </>
      )}
    </div>
  );
};
