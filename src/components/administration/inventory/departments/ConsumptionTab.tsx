/**
 * تبويب "استهلاك المواد": الاستهلاك النظري لكل مادة خام في القسم (من حركات "استهلاك بيع")، وقيمته،
 * وأصناف البيع التي ساهمت فيه. الضغط على المادة يفتح توزيعها على أصناف البيع.
 */

import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronLeft, History, Printer } from "lucide-react";
import { fmtNum } from "../../../../services/inventoryService";
import { departmentsService, type ConsumptionRow } from "../../../../services/departmentsService";
import { printReport } from "../printReport";
import { SearchBox } from "../ui";
import type { TabProps } from "./DepartmentDetailPage";
import {
  EmptyRow,
  ExportButton,
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

type Key = "name" | "quantity" | "cost" | "unit_cost" | "cost_share_percent" | "items";
const COLS = 7;

export const ConsumptionTab: React.FC<TabProps> = ({ departmentId, unit, query, onPeriod }) => {
  const { data, loading } = useTabData((q) => departmentsService.consumption(departmentId, q), query, onPeriod, "تعذّر تحميل استهلاك المواد");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState<Key>>({ key: "cost", dir: "desc" });
  const [open, setOpen] = useState<Set<number>>(new Set());
  const costs = data?.costs_visible ?? true;

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = (data?.rows ?? []).filter(
      (r) => !term || r.name.toLowerCase().includes(term) || r.code.toLowerCase().includes(term) || r.items.some((i) => i.name.toLowerCase().includes(term)),
    );
    return sortRows(list, sort, (r, k) => (k === "items" ? r.items.length : r[k]));
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
    printReport({
      title: `استهلاك المواد — ${unit.department.name}`,
      subtitle: unit.branch.name,
      filters: [["الفترة", `${data.filters.from} — ${data.filters.to}`]],
      columns: [
        { label: "الكود" },
        { label: "المادة" },
        { label: "الكمية", num: true },
        { label: "التكلفة", num: true },
        { label: "تكلفة الوحدة", num: true },
        { label: "من التكلفة", num: true },
        { label: "أصناف البيع المساهمة" },
      ],
      rows: rows.map((r) => [
        r.code,
        r.name,
        qtyUnit(r.quantity, r.base_unit),
        money(r.cost),
        money(r.unit_cost),
        pct(r.cost_share_percent),
        r.items.map((i) => `${i.name} (${fmtNum(i.quantity)})`).join("، "),
      ]),
      footRow: ["", "الإجمالي", null, money(data.totals.cost), null, "100%", null],
      landscape: true,
    });
  };

  if (loading && !data) return <Spinner />;
  if (!data) return null;

  return (
    <div className="space-y-3 pt-3">
      <UndeductedBanner count={data.undeducted_orders} />
      <div className="flex flex-wrap items-center gap-2" data-print-hide>
        <SearchBox value={search} onChange={setSearch} placeholder="ابحث بالمادة أو الكود أو صنف البيع..." />
        <ExportButton onExport={() => departmentsService.exportTable(departmentId, query, "consumption")} />
        <ToolButton icon={Printer} onClick={print}>
          طباعة
        </ToolButton>
      </div>

      <div className={`bg-slate-900 rounded-2xl border border-white/5 relative overflow-x-auto custom-scrollbar transition-opacity ${loading ? "opacity-60" : ""}`}>
        <table className="w-full text-sm min-w-[820px]">
          <caption className="sr-only">الاستهلاك النظري لكل مادة خام في القسم</caption>
          <thead className="bg-slate-800/50 border-b border-white/5">
            <tr>
              <SortTh label="المادة الخام" k="name" sort={sort} onSort={setSort} />
              <SortTh label="الاستهلاك النظري" k="quantity" sort={sort} onSort={setSort} />
              <SortTh label="القيمة" k="cost" sort={sort} onSort={setSort} />
              <SortTh label="تكلفة الوحدة" k="unit_cost" sort={sort} onSort={setSort} />
              <SortTh label="من تكلفة القسم" k="cost_share_percent" sort={sort} onSort={setSort} />
              <SortTh label="أصناف البيع المساهمة" k="items" sort={sort} onSort={setSort} />
              <th className={thClass}>
                <span className="sr-only">كرت الصنف</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.length === 0 && <EmptyRow colSpan={COLS} text={search ? "لا توجد مادة مطابقة" : "لا يوجد استهلاك مسجّل في هذه الفترة"} />}
            {rows.map((r) => (
              <MaterialRow
                key={r.stock_item_id}
                r={r}
                open={open.has(r.stock_item_id)}
                onToggle={() => toggle(r.stock_item_id)}
                costs={costs}
                kardex={kardexLink(r.stock_item_id, unit.warehouse?.id, data.filters.from, data.filters.to)}
              />
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="bg-slate-800/50 border-t border-white/10 font-black text-white">
              <tr>
                <td className="px-3 py-2.5">الإجمالي ({data.totals.materials} مادة)</td>
                <td className={tdNum}>—</td>
                <td className={`${tdNum} text-red-400`}>{costs ? money(data.totals.cost) : "—"}</td>
                <td className={tdNum} colSpan={4} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

const MaterialRow: React.FC<{ r: ConsumptionRow; open: boolean; onToggle: () => void; costs: boolean; kardex: string }> = ({
  r,
  open,
  onToggle,
  costs,
  kardex,
}) => {
  const Icon = open ? ChevronDown : ChevronLeft;
  const share = r.cost_share_percent === null ? 0 : Math.min(100, Number(r.cost_share_percent));
  return (
    <>
      <tr className={`cursor-pointer hover:bg-white/[0.03] ${open ? "bg-white/[0.03]" : ""}`} onClick={onToggle}>
        <td className="px-3 py-2.5">
          <button
            type="button"
            aria-expanded={open}
            aria-label={`${open ? "إخفاء" : "عرض"} أصناف البيع التي استهلكت ${r.name}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="flex items-center gap-2 text-right w-full"
          >
            <Icon size={15} className="text-slate-500 shrink-0" aria-hidden />
            <span className="min-w-0">
              <span className="block font-bold text-white truncate">{r.name}</span>
              <bdi className="text-[11px] text-slate-500 font-mono">{r.code}</bdi>
            </span>
          </button>
        </td>
        <td className={`${tdNum} text-red-300 font-bold`}>{qtyUnit(r.quantity, r.base_unit)}</td>
        <td className={`${tdNum} text-white`}>{costs ? money(r.cost) : "—"}</td>
        <td className={`${tdNum} text-slate-400`}>{costs && r.unit_cost !== null ? `${money(r.unit_cost)} / ${r.base_unit}` : "—"}</td>
        <td className={tdNum}>
          {costs ? (
            <div className="flex items-center gap-2">
              <span className="text-slate-300 w-14">{pct(r.cost_share_percent)}</span>
              <span className="h-1.5 w-16 rounded-full bg-slate-800 overflow-hidden" aria-hidden>
                <span className="block h-full bg-red-500 rounded-full" style={{ width: `${share}%` }} />
              </span>
            </div>
          ) : (
            "—"
          )}
        </td>
        <td className="px-3 py-2.5 text-xs text-slate-400 max-w-[240px]">
          <span className="line-clamp-1">{r.items.map((i) => i.name).join("، ")}</span>
        </td>
        <td className="px-3 py-2.5">
          <Link
            to={kardex}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-bold whitespace-nowrap"
          >
            <History size={12} aria-hidden /> كرت الصنف
          </Link>
        </td>
      </tr>
      {open && (
        <tr className="bg-slate-950/30">
          <td colSpan={COLS} className="px-3 py-3">
            <table className="w-full text-xs border-r-2 border-r-red-500/40">
              <thead>
                <tr>
                  <th className={thClass}>صنف البيع</th>
                  <th className={thClass}>الكمية المستهلكة منه</th>
                  <th className={thClass}>نسبته من استهلاك المادة</th>
                  <th className={thClass}>التكلفة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {r.items.map((i) => (
                  <tr key={i.item_id}>
                    <td className="px-3 py-2 text-slate-200 font-bold">
                      {i.name} {i.code && <bdi className="text-slate-500 font-mono font-normal">{i.code}</bdi>}
                    </td>
                    <td className="px-3 py-2 tabular-nums whitespace-nowrap text-red-300">{qtyUnit(i.quantity, r.base_unit)}</td>
                    <td className="px-3 py-2 tabular-nums whitespace-nowrap text-slate-300">{pct(i.share_percent)}</td>
                    <td className="px-3 py-2 tabular-nums whitespace-nowrap text-slate-300">{costs ? money(i.cost) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
};
