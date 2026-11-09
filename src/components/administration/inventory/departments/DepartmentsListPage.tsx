/**
 * DepartmentsListPage.tsx — الأقسام (/inventory/departments): بطاقة لكل قسم في فرع بمبيعاته وتكلفة استهلاكه
 * ونسبة التكلفة في الفترة. الضغط على القسم يفتح تفصيله (أصناف البيع، المواد، الإحصائيات، الجرد).
 * كل الأرقام من الخادم (/api/inventory/departments/summary).
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ChevronLeft, Layers, Printer, Warehouse as WarehouseIcon } from "lucide-react";
import { toast } from "../../../shared/Toast";
import { fmtNum, inventoryErrorMessage, inventoryService } from "../../../../services/inventoryService";
import { departmentsService, type DepartmentSummary, type DepartmentSummaryRow } from "../../../../services/departmentsService";
import { printReport } from "../printReport";
import { EmptyBlock, inputClass, PageHeader } from "../ui";
import { ExportButton, foodCostTone, Kpi, money, pct, PeriodBar, Spinner, ToolButton, UndeductedBanner, usePeriodParams } from "./shared";

export const DepartmentsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { from, to, branch, query, update, params } = usePeriodParams();
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [data, setData] = useState<DepartmentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);

  useEffect(() => {
    inventoryService.lookups().then((l) => setBranches(l.branches ?? [])).catch(() => undefined);
  }, []);

  const load = useCallback(async () => {
    const s = ++seq.current;
    setLoading(true);
    try {
      const res = await departmentsService.summary({ ...query, branch_id: branch });
      if (s === seq.current) setData(res);
    } catch (e) {
      if (s === seq.current) toast.error("تعذّر تحميل الأقسام", inventoryErrorMessage(e));
    } finally {
      if (s === seq.current) setLoading(false);
    }
  }, [query, branch]);

  useEffect(() => {
    load();
  }, [load]);

  const open = (r: DepartmentSummaryRow) => {
    const next = new URLSearchParams(params);
    next.set("branch", String(r.branch.id));
    navigate(`/inventory/departments/${r.department.id}?${next.toString()}`);
  };

  const costs = data?.costs_visible ?? true;
  const period = data?.filters;

  const print = () => {
    if (!data) return;
    printReport({
      title: "الأقسام",
      subtitle: "المبيعات وتكلفة الاستهلاك ونسبة التكلفة",
      filters: [
        ["الفترة", period ? `${period.from} — ${period.to}` : ""],
        ["الفرع", branches.find((b) => b.id === branch)?.name ?? "كل الفروع"],
      ],
      columns: [
        { label: "القسم" },
        { label: "الفرع" },
        { label: "المخزن" },
        { label: "أصناف البيع", num: true },
        { label: "الطلبات", num: true },
        { label: "المبيعات", num: true },
        { label: "تكلفة الاستهلاك", num: true },
        { label: "نسبة التكلفة", num: true },
      ],
      rows: data.rows.map((r) => [
        r.department.name,
        r.branch.name,
        r.warehouse?.name ?? "بدون مخزن",
        r.sale_items_count,
        r.orders,
        money(r.sales),
        money(r.cost),
        pct(r.food_cost_percent),
      ]),
      footRow: ["الإجمالي", null, null, null, data.totals.orders, money(data.totals.sales), money(data.totals.cost), pct(data.totals.food_cost_percent)],
      landscape: true,
    });
  };

  return (
    <div className="space-y-5" dir="rtl">
      <PageHeader title="الأقسام" subtitle="مبيعات واستهلاك وجرد كل قسم — الاستهلاك من حركات «استهلاك بيع» في كرت الصنف" />

      <PeriodBar from={from} to={to} effective={period} onChange={(r) => update(r)}>
        <select
          className={`${inputClass} !w-auto !py-2`}
          value={branch ?? ""}
          onChange={(e) => update({ branch: e.target.value || null })}
          aria-label="الفرع"
        >
          <option value="">كل الفروع</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <ExportButton onExport={() => departmentsService.exportSummary({ ...query, branch_id: branch })} />
        <ToolButton icon={Printer} onClick={print} disabled={!data}>
          طباعة
        </ToolButton>
      </PeriodBar>

      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi label="إجمالي المبيعات" value={money(data.totals.sales)} sub={`${fmtNum(data.totals.orders)} طلب`} />
          <Kpi label="تكلفة الاستهلاك" value={costs ? money(data.totals.cost) : "—"} tone="text-red-400" />
          <Kpi label="نسبة التكلفة (Food cost)" value={costs ? pct(data.totals.food_cost_percent) : "—"} tone={foodCostTone(data.totals.food_cost_percent)} />
          <Kpi label="الربح الإجمالي" value={costs ? money(data.totals.profit) : "—"} tone="text-green-400" sub={`${data.totals.departments} قسم`} />
        </div>
      )}

      {data && <UndeductedBanner count={data.totals.undeducted_orders} />}

      {loading && !data ? (
        <Spinner />
      ) : !data || data.rows.length === 0 ? (
        <EmptyBlock icon={Layers} text="لا توجد أقسام ظاهرة لك في هذا الفرع" />
      ) : (
        <div className={`grid gap-3 sm:grid-cols-2 xl:grid-cols-3 transition-opacity ${loading ? "opacity-60" : ""}`}>
          {data.rows.map((r) => (
            <DepartmentCard key={r.key} row={r} costs={costs} onOpen={() => open(r)} />
          ))}
        </div>
      )}
    </div>
  );
};

const DepartmentCard: React.FC<{ row: DepartmentSummaryRow; costs: boolean; onOpen: () => void }> = ({ row: r, costs, onOpen }) => {
  const fc = r.food_cost_percent === null ? 0 : Math.min(100, Math.max(0, Number(r.food_cost_percent)));
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group text-right bg-slate-900 rounded-2xl border border-white/5 p-4 space-y-3 hover:border-red-500/40 hover:bg-slate-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 transition-colors"
      aria-label={`فتح قسم ${r.department.name} — ${r.branch.name}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-base font-black text-white truncate">{r.department.name}</p>
          <p className="text-xs text-slate-500 font-bold truncate">
            {r.branch.name}
            {r.department.code && (
              <>
                {" · "}
                <bdi className="font-mono">{r.department.code}</bdi>
              </>
            )}
          </p>
        </div>
        <ChevronLeft size={18} className="text-slate-600 group-hover:text-red-400 shrink-0 mt-1" aria-hidden />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {r.warehouse ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black bg-sky-500/10 text-sky-300">
            <WarehouseIcon size={12} aria-hidden /> {r.warehouse.name}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black bg-amber-500/10 text-amber-300">
            <AlertTriangle size={12} aria-hidden /> بدون مخزن
          </span>
        )}
        <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-slate-800 text-slate-400">{r.sale_items_count} صنف بيع</span>
        {r.undeducted_orders > 0 && (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-amber-500/10 text-amber-300">{r.undeducted_orders} طلب بلا خصم</span>
        )}
      </div>

      <dl className="grid grid-cols-3 gap-2 text-xs">
        <div className="min-w-0">
          <dt className="text-slate-500 font-bold">المبيعات</dt>
          <dd className="text-white font-black tabular-nums truncate">{money(r.sales)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-slate-500 font-bold">التكلفة</dt>
          <dd className="text-red-400 font-black tabular-nums truncate">{costs ? money(r.cost) : "—"}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-slate-500 font-bold">نسبة التكلفة</dt>
          <dd className={`font-black tabular-nums ${foodCostTone(r.food_cost_percent)}`}>{costs ? pct(r.food_cost_percent) : "—"}</dd>
        </div>
      </dl>
      {costs && (
        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden" aria-hidden>
          <div className={`h-full rounded-full ${fc <= 35 ? "bg-green-500" : fc <= 45 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${fc}%` }} />
        </div>
      )}
      <p className="text-[11px] text-slate-500 font-bold">{fmtNum(r.orders)} طلب في الفترة</p>
    </button>
  );
};
