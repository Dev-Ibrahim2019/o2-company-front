/**
 * تبويب "أصناف البيع": كل أصناف القسم بكمياتها ومبيعاتها وتكلفة استهلاكها وربحها ونسبتها من مبيعات القسم.
 * الضغط على صنف يفتح تحته المواد الخام التي استهلكها في الفترة (من حركات "استهلاك بيع").
 */

import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronLeft, History, Printer } from "lucide-react";
import { fmtNum } from "../../../../services/inventoryService";
import { departmentsService, type DepartmentSaleItem } from "../../../../services/departmentsService";
import { printReport } from "../printReport";
import { SearchBox } from "../ui";
import type { TabProps } from "./DepartmentDetailPage";
import {
  EmptyRow,
  ExportButton,
  foodCostTone,
  kardexLink,
  money,
  pct,
  qtyUnit,
  sortRows,
  SortTh,
  Spinner,
  tdNum,
  thClass,
  ToolButton,
  UndeductedBanner,
  useTabData,
  type SortState,
} from "./shared";

type Key = "name" | "quantity" | "sales" | "cost" | "profit" | "food_cost_percent" | "share_percent";
const COLS = 7;

export const SaleItemsTab: React.FC<TabProps> = ({ departmentId, unit, query, onPeriod }) => {
  const { data, loading } = useTabData((q) => departmentsService.saleItems(departmentId, q), query, onPeriod, "تعذّر تحميل أصناف البيع");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState<Key>>({ key: "sales", dir: "desc" });
  const [open, setOpen] = useState<Set<number>>(new Set());
  const costs = data?.costs_visible ?? true;

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = (data?.rows ?? []).filter((r) => !term || r.name.toLowerCase().includes(term) || (r.code ?? "").toLowerCase().includes(term));
    return sortRows(list, sort, (r, k) => r[k]);
  }, [data, search, sort]);

  const toggle = (id: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const print = () => {
    if (!data) return;
    const out: (string | number)[][] = [];
    for (const r of rows) {
      out.push([r.code ?? "", r.name, fmtNum(r.quantity), money(r.sales), money(r.cost), money(r.profit), pct(r.food_cost_percent), pct(r.share_percent)]);
      for (const m of r.materials) out.push(["", `↳ ${m.name}`, qtyUnit(m.quantity, m.base_unit), "", money(m.cost), "", "", ""]);
    }
    printReport({
      title: `أصناف البيع — ${unit.department.name}`,
      subtitle: unit.branch.name,
      filters: [["الفترة", `${data.filters.from} — ${data.filters.to}`]],
      columns: [
        { label: "الكود" },
        { label: "الصنف / المادة" },
        { label: "الكمية", num: true },
        { label: "المبيعات", num: true },
        { label: "تكلفة الاستهلاك", num: true },
        { label: "الربح", num: true },
        { label: "نسبة التكلفة", num: true },
        { label: "من مبيعات القسم", num: true },
      ],
      rows: out,
      footRow: ["", "الإجمالي", fmtNum(data.totals.quantity), money(data.totals.sales), money(data.totals.cost), money(data.totals.profit), pct(data.totals.food_cost_percent), "100%"],
      landscape: true,
    });
  };

  if (loading && !data) return <Spinner />;
  if (!data) return null;

  return (
    <div className="space-y-3 pt-3">
      <UndeductedBanner count={data.undeducted_orders} />
      <div className="flex flex-wrap items-center gap-2" data-print-hide>
        <SearchBox value={search} onChange={setSearch} placeholder="ابحث باسم الصنف أو الكود..." />
        <ExportButton onExport={() => departmentsService.exportTable(departmentId, query, "sale_items")} />
        <ToolButton icon={Printer} onClick={print}>
          طباعة
        </ToolButton>
      </div>

      <div className={`bg-slate-900 rounded-2xl border border-white/5 relative overflow-x-auto custom-scrollbar transition-opacity ${loading ? "opacity-60" : ""}`}>
        <table className="w-full text-sm min-w-[860px]">
          <caption className="sr-only">أصناف البيع في القسم — اضغط على صنف لعرض المواد التي استهلكها</caption>
          <thead className="bg-slate-800/50 border-b border-white/5">
            <tr>
              <SortTh label="صنف البيع" k="name" sort={sort} onSort={setSort} />
              <SortTh label="الكمية المباعة" k="quantity" sort={sort} onSort={setSort} />
              <SortTh label="قيمة المبيعات" k="sales" sort={sort} onSort={setSort} />
              <SortTh label="تكلفة الاستهلاك" k="cost" sort={sort} onSort={setSort} />
              <SortTh label="الربح الإجمالي" k="profit" sort={sort} onSort={setSort} />
              <SortTh label="نسبة التكلفة" k="food_cost_percent" sort={sort} onSort={setSort} />
              <SortTh label="من مبيعات القسم" k="share_percent" sort={sort} onSort={setSort} />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.length === 0 && <EmptyRow colSpan={COLS} text={search ? "لا يوجد صنف مطابق" : "لا توجد أصناف بيع لهذا القسم"} />}
            {rows.map((r) => (
              <ItemRow
                key={r.item_id}
                r={r}
                open={open.has(r.item_id)}
                onToggle={() => toggle(r.item_id)}
                costs={costs}
                kardex={(id) => kardexLink(id, unit.warehouse?.id, data.filters.from, data.filters.to)}
              />
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="bg-slate-800/50 border-t border-white/10 font-black text-white">
              <tr>
                <td className="px-3 py-2.5">الإجمالي ({data.rows.length} صنف)</td>
                <td className={tdNum}>{fmtNum(data.totals.quantity)}</td>
                <td className={tdNum}>{money(data.totals.sales)}</td>
                <td className={`${tdNum} text-red-400`}>{costs ? money(data.totals.cost) : "—"}</td>
                <td className={`${tdNum} text-green-400`}>{costs ? money(data.totals.profit) : "—"}</td>
                <td className={`${tdNum} ${foodCostTone(data.totals.food_cost_percent)}`}>{costs ? pct(data.totals.food_cost_percent) : "—"}</td>
                <td className={tdNum}>100%</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

const ItemRow: React.FC<{
  r: DepartmentSaleItem;
  open: boolean;
  onToggle: () => void;
  costs: boolean;
  kardex: (stockItemId: number) => string;
}> = ({ r, open, onToggle, costs, kardex }) => {
  const Icon = open ? ChevronDown : ChevronLeft;
  const share = r.share_percent === null ? 0 : Math.min(100, Number(r.share_percent));
  return (
    <>
      <tr className={`cursor-pointer hover:bg-white/[0.03] ${open ? "bg-white/[0.03]" : ""}`} onClick={onToggle}>
        <td className="px-3 py-2.5">
          <button
            type="button"
            aria-expanded={open}
            aria-label={`${open ? "إخفاء" : "عرض"} مواد ${r.name}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="flex items-center gap-2 text-right w-full"
          >
            <Icon size={15} className="text-slate-500 shrink-0" aria-hidden />
            <span className="min-w-0">
              <span className="block font-bold text-white truncate">{r.name}</span>
              <span className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                {r.code && <bdi className="font-mono">{r.code}</bdi>}
                {!r.has_recipe && <span className="px-1.5 rounded bg-amber-500/10 text-amber-300 font-black">بلا وصفة</span>}
                {!r.is_active && <span className="px-1.5 rounded bg-slate-700 text-slate-400 font-black">موقوف</span>}
              </span>
            </span>
          </button>
        </td>
        <td className={`${tdNum} text-slate-200`}>{fmtNum(r.quantity)}</td>
        <td className={`${tdNum} text-white font-bold`}>{money(r.sales)}</td>
        <td className={`${tdNum} text-red-400`}>{costs ? money(r.cost) : "—"}</td>
        <td className={`${tdNum} ${Number(r.profit) < 0 ? "text-red-400" : "text-green-400"}`}>{costs ? money(r.profit) : "—"}</td>
        <td className={`${tdNum} font-bold ${foodCostTone(r.food_cost_percent)}`}>{costs ? pct(r.food_cost_percent) : "—"}</td>
        <td className={tdNum}>
          <div className="flex items-center gap-2">
            <span className="text-slate-300 w-14">{pct(r.share_percent)}</span>
            <span className="h-1.5 w-16 rounded-full bg-slate-800 overflow-hidden" aria-hidden>
              <span className="block h-full bg-sky-500 rounded-full" style={{ width: `${share}%` }} />
            </span>
          </div>
        </td>
      </tr>
      {open && (
        <tr className="bg-slate-950/30">
          <td colSpan={COLS} className="px-3 py-3">
            {r.materials.length === 0 ? (
              <p className="text-xs text-slate-500 font-bold pr-6">
                {r.has_recipe ? "لا يوجد استهلاك مسجّل لهذا الصنف في الفترة." : "الصنف بلا وصفة — لا يُخصم له استهلاك."}
              </p>
            ) : (
              <table className="w-full text-xs border-r-2 border-r-red-500/40">
                <thead>
                  <tr>
                    <th className={thClass}>المادة الخام</th>
                    <th className={thClass}>الكمية المستهلكة</th>
                    <th className={thClass}>الوحدة</th>
                    <th className={thClass}>التكلفة</th>
                    <th className={thClass}>
                      <span className="sr-only">كرت الصنف</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {r.materials.map((m) => (
                    <tr key={m.stock_item_id}>
                      <td className="px-3 py-2 text-slate-200 font-bold">
                        {m.name} <bdi className="text-slate-500 font-mono font-normal">{m.code}</bdi>
                      </td>
                      <td className="px-3 py-2 tabular-nums whitespace-nowrap text-red-300">{fmtNum(m.quantity)}</td>
                      <td className="px-3 py-2 text-slate-400">{m.base_unit}</td>
                      <td className="px-3 py-2 tabular-nums whitespace-nowrap text-slate-300">{costs ? money(m.cost) : "—"}</td>
                      <td className="px-3 py-2">
                        <Link
                          to={kardex(m.stock_item_id)}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 font-bold"
                        >
                          <History size={12} aria-hidden /> كرت الصنف
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </td>
        </tr>
      )}
    </>
  );
};
