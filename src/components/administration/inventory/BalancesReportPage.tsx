/**
 * BalancesReportPage.tsx — "أرصدة المخازن في تاريخ" (/inventory/balances/report).
 * الحساب في الخادم من دفتر الحركات حتى اليوم المحاسبي المختار (وأول الفترة/الوارد/الصادر إن حُدّد "من").
 * أنواع التقرير: فهرس الأصناف، إحصائية حسب التصنيف، كشف الجرد (للطباعة والعد اليدوي)، الكميات حسب المخازن.
 * الفلاتر في الرابط، والعرض في جدول مع معاينة الطباعة.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FileBarChart, LogOut, Play, Printer } from "lucide-react";
import { toast } from "../../shared/Toast";
import {
  fmtNum,
  inventoryErrorMessage,
  inventoryService,
  type BalancesReport,
  type BalancesReportParams,
  type BalancesReportType,
  type StockCategory,
  type Warehouse,
} from "../../../services/inventoryService";
import { flattenTree } from "./CategoriesPage";
import { DocToolbar, type ToolbarItem } from "./DocToolbar";
import { printReport, type ReportColumn } from "./printReport";
import { EmptyBlock, Field, LoadingBlock, inputClass } from "./ui";

const REPORT_LABELS: Record<BalancesReportType, string> = {
  index: "فهرس الأصناف",
  category: "إحصائية حسب التصنيف",
  count_sheet: "كشف الجرد",
  matrix: "الكميات حسب المخازن",
};

const th = "bg-slate-800 text-slate-400 text-[11px] font-black px-2 py-2 border border-white/10 text-right whitespace-nowrap";
const td = "border border-white/10 px-2 py-1.5";
const num = `${td} tabular-nums text-left`;

type Cell = string | number | null | undefined;

export const BalancesReportPage: React.FC = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [categories, setCategories] = useState<StockCategory[]>([]);
  const [data, setData] = useState<BalancesReport | null>(null);
  const [loading, setLoading] = useState(false);

  const f = useMemo(
    () => ({
      to: params.get("to") ?? "",
      from: params.get("from") ?? "",
      wh: (params.get("wh") ?? "").split(",").filter(Boolean).map(Number),
      cat: params.get("cat") ?? "",
      status: (params.get("status") ?? "active") as "active" | "inactive" | "all",
      codeFrom: params.get("code_from") ?? "",
      codeTo: params.get("code_to") ?? "",
      zeros: params.get("zeros") === "1",
      valuation: (params.get("valuation") ?? "avg") as "avg" | "last",
      report: (params.get("report") ?? "index") as BalancesReportType,
    }),
    [params],
  );

  const set = (patch: Record<string, string>) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
        return next;
      },
      { replace: true },
    );

  useEffect(() => {
    inventoryService.warehouses().then(setWarehouses).catch((e) => toast.error("تعذّر تحميل المخازن", inventoryErrorMessage(e)));
    inventoryService.categories().then(setCategories).catch(() => undefined);
  }, []);

  const apiParams = useMemo(
    (): BalancesReportParams => ({
      to: f.to || undefined,
      from: f.from || undefined,
      warehouse_ids: f.wh.length ? f.wh : undefined,
      category_id: f.cat ? Number(f.cat) : undefined,
      status: f.status,
      code_from: f.codeFrom || undefined,
      code_to: f.codeTo || undefined,
      zeros: f.zeros ? 1 : undefined,
      valuation: f.valuation,
      report: f.report,
    }),
    [f],
  );

  const run = useCallback(async () => {
    setLoading(true);
    try {
      setData(await inventoryService.balancesReport(apiParams));
    } catch (e) {
      toast.error("تعذّر إعداد التقرير", inventoryErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [apiParams]);

  // يُعاد الحساب مع كل تغيير في الفلاتر (بتأخير قصير لخانات الكتابة).
  useEffect(() => {
    const t = setTimeout(run, 250);
    return () => clearTimeout(t);
  }, [run]);

  const costs = Boolean(data?.costs_visible);
  const ranged = Boolean(data?.from);
  const tree = useMemo(() => flattenTree(categories), [categories]);

  /** أعمدة وصفوف التقرير الحالي (للجدول والطباعة معاً). */
  const table = useMemo((): { columns: ReportColumn[]; rows: Cell[][]; foot?: (string | number | null)[] } => {
    if (!data) return { columns: [], rows: [] };
    const q = (v: string | null | undefined) => (v === null || v === undefined ? null : fmtNum(v));
    const money = (v: string | null | undefined) => (v === null || v === undefined ? null : fmtNum(v, 2));
    switch (data.report) {
      case "category":
        return {
          columns: [{ label: "التصنيف" }, { label: "عدد الأصناف", num: true }, { label: "الكمية", num: true }, ...(costs ? [{ label: "القيمة (₪)", num: true }] : [])],
          rows: data.rows.map((r) => [r.category, r.items_count, q(r.quantity), ...(costs ? [money(r.value)] : [])]),
          foot: ["الإجمالي", data.rows.reduce((s, r) => s + (r.items_count ?? 0), 0), q(data.totals.quantity), ...(costs ? [money(data.totals.value)] : [])],
        };
      case "count_sheet":
        return {
          columns: [
            { label: "المخزن" },
            { label: "رقم الصنف" },
            { label: "اسم الصنف" },
            { label: "الوحدة" },
            { label: "الرصيد الدفتري", num: true },
            { label: "المعدود", num: true },
            { label: "الفرق", num: true },
          ],
          rows: data.rows.map((r) => [r.warehouse, r.code, r.name, r.unit, q(r.quantity), "", ""]),
        };
      case "matrix":
        return {
          columns: [{ label: "رقم الصنف" }, { label: "اسم الصنف" }, { label: "الوحدة" }, ...data.warehouses.map((w) => ({ label: w.name, num: true })), { label: "الإجمالي", num: true }],
          rows: data.rows.map((r) => [
            r.code,
            r.name,
            r.unit,
            ...data.warehouses.map((w) => (Number(r.by_warehouse?.[w.id] ?? 0) ? fmtNum(r.by_warehouse?.[w.id]) : "")),
            q(r.quantity),
          ]),
          foot: ["", "الإجمالي", "", ...data.warehouses.map((w) => fmtNum(data.rows.reduce((s, r) => s + Number(r.by_warehouse?.[w.id] ?? 0), 0))), q(data.totals.quantity)],
        };
      default:
        return {
          columns: [
            { label: "م", num: true },
            { label: "رقم الصنف" },
            { label: "اسم الصنف" },
            { label: "الوحدة" },
            ...(ranged ? [{ label: "أول الفترة", num: true }, { label: "الوارد", num: true }, { label: "الصادر", num: true }] : []),
            { label: "الرصيد", num: true },
            ...(costs ? [{ label: data.valuation === "last" ? "آخر سعر شراء" : "متوسط التكلفة", num: true }, { label: "القيمة (₪)", num: true }] : []),
          ],
          rows: data.rows.map((r, i) => [
            i + 1,
            r.code,
            r.name + (r.is_active === false ? " (موقوف)" : ""),
            r.unit,
            ...(ranged ? [q(r.opening), q(r.quantity_in), q(r.quantity_out)] : []),
            q(r.quantity),
            ...(costs ? [r.unit_cost ? fmtNum(r.unit_cost, 4) : null, money(r.value)] : []),
          ]),
          foot: ["", "", "الإجمالي", "", ...(ranged ? [null, null, null] : []), q(data.totals.quantity), ...(costs ? [null, money(data.totals.value)] : [])],
        };
    }
  }, [data, costs, ranged]);

  const print = () => {
    if (!data) return;
    const whNames = f.wh.length
      ? warehouses
          .filter((w) => f.wh.includes(w.id))
          .map((w) => w.name)
          .join("، ")
      : "كل المخازن";
    printReport({
      title: `أرصدة المخازن — ${REPORT_LABELS[data.report]}`,
      subtitle: `حتى ${data.to}${data.from ? ` (من ${data.from})` : ""}`,
      filters: [
        ["المخازن", whNames],
        ["التصنيف", tree.find((t) => String(t.category.id) === f.cat)?.category.name ?? "الكل"],
        ["الحالة", f.status === "active" ? "نشط" : f.status === "inactive" ? "موقوف" : "الكل"],
        ...(costs ? ([["التقييم", data.valuation === "last" ? "آخر سعر شراء" : "متوسط التكلفة"]] as [string, string][]) : []),
        ...(f.codeFrom || f.codeTo ? ([["رقم الصنف", `${f.codeFrom || "…"} — ${f.codeTo || "…"}`]] as [string, string][]) : []),
      ],
      columns: table.columns,
      rows: table.rows,
      footRow: table.foot,
      totals: [["عدد الأسطر", String(data.totals.rows)]],
      landscape: data.report === "matrix" || data.report === "index",
    });
  };

  const items: ToolbarItem[] = [
    { id: "run", label: "عرض", icon: Play, keys: "F8", tone: "primary", loading, onClick: run },
    { id: "print", label: "معاينة الطباعة", icon: Printer, keys: "Ctrl+P", disabled: !data || data.rows.length === 0, onClick: print },
    "sep",
    { id: "exit", label: "خروج", icon: LogOut, keys: "Esc", onClick: () => navigate("/inventory/balances") },
  ];

  const toggleWarehouse = (id: number) => {
    const next = f.wh.includes(id) ? f.wh.filter((x) => x !== id) : [...f.wh, id];
    set({ wh: next.join(",") });
  };

  return (
    <div className="space-y-4" dir="rtl">
      <DocToolbar items={items} title="أرصدة المخازن في تاريخ" />

      <section aria-label="فلاتر التقرير" className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3 bg-slate-900 border border-white/5 rounded-2xl p-3 pt-2">
        <Field label="نوع التقرير">
          <select className={inputClass} value={f.report} onChange={(e) => set({ report: e.target.value === "index" ? "" : e.target.value })}>
            {(Object.keys(REPORT_LABELS) as BalancesReportType[]).map((k) => (
              <option key={k} value={k}>
                {REPORT_LABELS[k]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="من تاريخ" hint="اختياري: يضيف أول الفترة والوارد والصادر">
          <input type="date" className={inputClass} value={f.from} max={f.to || data?.to || undefined} onChange={(e) => set({ from: e.target.value })} dir="ltr" />
        </Field>
        <Field label="الرصيد في تاريخ">
          <input type="date" className={inputClass} value={f.to || data?.to || ""} onChange={(e) => set({ to: e.target.value })} dir="ltr" />
        </Field>
        <div className="space-y-1.5">
          <span className="text-xs font-black text-slate-400 tracking-wider">المخازن</span>
          <details className="relative">
            <summary className={`${inputClass} cursor-pointer list-none truncate`}>
              {f.wh.length === 0
                ? "كل المخازن"
                : warehouses
                    .filter((w) => f.wh.includes(w.id))
                    .map((w) => w.name)
                    .join("، ")}
            </summary>
            <div className="absolute z-30 mt-1 w-64 max-h-64 overflow-y-auto custom-scrollbar bg-slate-900 border border-white/10 rounded-xl shadow-2xl p-2 space-y-1">
              {warehouses.map((w) => (
                <label key={w.id} className="flex items-center gap-2 text-sm text-slate-300 px-2 py-1 rounded-lg hover:bg-white/5 cursor-pointer">
                  <input type="checkbox" className="accent-red-600" checked={f.wh.includes(w.id)} onChange={() => toggleWarehouse(w.id)} />
                  {w.name}
                </label>
              ))}
            </div>
          </details>
        </div>
        <Field label="التصنيف">
          <select className={inputClass} value={f.cat} onChange={(e) => set({ cat: e.target.value })}>
            <option value="">الكل</option>
            {tree.map(({ category: c, depth }) => (
              <option key={c.id} value={c.id}>
                {"  ".repeat(depth * 2)}
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="حالة الصنف">
          <select className={inputClass} value={f.status} onChange={(e) => set({ status: e.target.value === "active" ? "" : e.target.value })}>
            <option value="active">نشط</option>
            <option value="inactive">موقوف</option>
            <option value="all">الكل</option>
          </select>
        </Field>
        <Field label="من رقم صنف">
          <input className={inputClass} value={f.codeFrom} onChange={(e) => set({ code_from: e.target.value })} dir="ltr" />
        </Field>
        <Field label="إلى رقم صنف">
          <input className={inputClass} value={f.codeTo} onChange={(e) => set({ code_to: e.target.value })} dir="ltr" />
        </Field>
        <Field label="طريقة التقييم">
          <select className={inputClass} value={f.valuation} onChange={(e) => set({ valuation: e.target.value === "avg" ? "" : e.target.value })}>
            <option value="avg">متوسط التكلفة</option>
            <option value="last">آخر سعر شراء</option>
          </select>
        </Field>
        <Field label="خيارات">
          <label className="flex items-center gap-2 h-[46px] text-sm font-bold text-slate-300 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-red-600" checked={f.zeros} onChange={(e) => set({ zeros: e.target.checked ? "1" : "" })} />
            إظهار الأصفار
          </label>
        </Field>
      </section>

      {!data && loading ? (
        <LoadingBlock />
      ) : !data || data.rows.length === 0 ? (
        <EmptyBlock icon={FileBarChart} text="لا توجد أرصدة مطابقة" />
      ) : (
        <div className={`rounded-xl border border-white/10 overflow-auto custom-scrollbar max-h-[62vh] bg-slate-900 transition-opacity ${loading ? "opacity-60" : ""}`}>
          <table className="w-full border-collapse text-sm" style={{ minWidth: Math.max(760, table.columns.length * 110) }}>
            <thead className="sticky top-0 z-10">
              <tr>
                {table.columns.map((c, i) => (
                  <th key={i} scope="col" className={th}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr
                  key={i}
                  className={`hover:bg-white/5 ${data?.rows[i]?.stock_item_id ? "cursor-pointer" : ""}`}
                  title={data?.rows[i]?.stock_item_id ? "اضغط لتفصيل دفعات الصنف" : undefined}
                  onClick={() => {
                    // تفصيل الصنف: دفعاته (الفاتورة، المورّد، التاريخ، الوارد، المتبقي، السعر، القيمة).
                    const row = data?.rows[i];
                    if (row?.stock_item_id) navigate(`/inventory/layers?item=${row.stock_item_id}${row.warehouse_id ? `&warehouse=${row.warehouse_id}` : ""}`);
                  }}
                >
                  {r.map((v, j) => (
                    <td key={j} className={table.columns[j]?.num ? `${num} text-slate-200` : `${td} ${j <= 2 ? "text-white" : "text-slate-300"}`}>
                      {v ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {table.foot && (
              <tfoot className="sticky bottom-0">
                <tr>
                  {table.foot.map((v, j) => (
                    <td key={j} className={`${table.columns[j]?.num ? num : td} bg-slate-800 font-black text-white`}>
                      {v ?? ""}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {data && (
        <div className="sticky bottom-0 -mx-4 md:-mx-6 -mb-4 md:-mb-6 px-4 md:px-6 py-2.5 bg-slate-950/95 backdrop-blur border-t border-white/5 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm font-bold text-slate-400">
          <span>
            {REPORT_LABELS[data.report]} — حتى <bdi className="text-white tabular-nums">{data.to}</bdi>
          </span>
          <span>
            عدد الأسطر: <span className="text-white tabular-nums">{data.totals.rows}</span>
          </span>
          {data.totals.value !== null && (
            <span>
              إجمالي القيمة: <span className="text-white tabular-nums">{fmtNum(data.totals.value, 2)} ₪</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
};
