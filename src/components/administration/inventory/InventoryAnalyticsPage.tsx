/**
 * InventoryAnalyticsPage.tsx — تحليلات المخزون (/inventory/analytics).
 *
 * كل الأرقام تأتي مجمّعة من الخادم (/api/inventory/analytics/*)؛ الصفحة تعرض فقط.
 * الكميات بالوحدة الأساسية مع تبديل لوحدة العرض (كغ مثلاً)، والمبالغ بالشيكل، والفترة بالأيام المحاسبية.
 * الفعلي يعتمد على الجرد المرحّل: صنف بلا جرد في الفترة يُعلَّم بأن فعليه من الحركات المسجّلة فقط.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, BarChart3, Download, Loader2, Printer, X } from "lucide-react";
import { toast } from "../../shared/Toast";
import {
  fmtNum,
  inventoryErrorMessage,
  inventoryService,
  type AnalyticsFilters,
  type DisplayUnit,
  type IngredientResult,
  type InventoryLookups,
  type ItemSeriesResult,
  type OverviewResult,
  type ProductResult,
  type SaleItem,
  type StockItem,
  type VarianceResult,
  type VarianceRow,
  type Warehouse,
} from "../../../services/inventoryService";
import { flattenTree } from "./CategoriesPage";
import { StockItemPicker } from "./StockItemPicker";
import { EmptyBlock, inputClass, PageHeader } from "./ui";

/* ── ألوان ثابتة لكل معنى (متّسقة في كل المخططات) ── */
const C = {
  actual: "#f87171",
  theoretical: "#38bdf8",
  inflow: "#22c55e",
  outflow: "#f97316",
  transferIn: "#60a5fa",
  transferOut: "#a78bfa",
  waste: "#ef4444",
  adjustment: "#eab308",
  value: "#34d399",
};
const PALETTE = ["#38bdf8", "#34d399", "#f97316", "#a78bfa", "#f472b6", "#eab308", "#60a5fa", "#fb7185", "#2dd4bf", "#c084fc"];
const tooltipStyle = { backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, direction: "rtl" as const };
const axisTick = { fill: "#64748b", fontSize: 11 };

const PERIODS: { value: AnalyticsFilters["period"]; label: string }[] = [
  { value: "today", label: "اليوم" },
  { value: "week", label: "الأسبوع" },
  { value: "month", label: "الشهر" },
  { value: "custom", label: "مخصّص" },
];

type UnitMode = "base" | "display";

/** كمية بالوحدة الأساسية ← وحدة العرض المختارة (القسمة على معامل الوحدة). */
function qty(value: string | number | null | undefined, base: string | null, display: DisplayUnit | null, mode: UnitMode) {
  if (value === null || value === undefined) return "—";
  if (mode === "display" && display && display.factor > 1) return `${fmtNum(Number(value) / display.factor)} ${display.name}`;
  return `${fmtNum(value)} ${base ?? ""}`;
}

const money = (v: string | number | null | undefined) => (v === null || v === undefined ? "—" : `${fmtNum(v, 2)} ₪`);
const num = (v: unknown) => (typeof v === "number" ? v : Number(v));

/* ── أدوات عرض ── */

const Card: React.FC<{ title: string; action?: React.ReactNode; children: React.ReactNode }> = ({ title, action, children }) => (
  <section className="bg-slate-900 rounded-2xl border border-white/5 p-4 sm:p-5 space-y-3 break-inside-avoid">
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <h3 className="text-sm font-black text-white">{title}</h3>
      {action}
    </div>
    {children}
  </section>
);

const Kpi: React.FC<{ label: string; value: string; sub?: React.ReactNode; tone?: string }> = ({ label, value, sub, tone = "text-white" }) => (
  <div className="bg-slate-900 rounded-2xl border border-white/5 p-4">
    <p className="text-[11px] text-slate-500 font-black">{label}</p>
    <p className={`text-xl font-black tabular-nums mt-1 ${tone}`}>{value}</p>
    {sub && <div className="text-[11px] text-slate-500 font-semibold mt-0.5">{sub}</div>}
  </div>
);

const Empty: React.FC<{ text?: string }> = ({ text = "لا توجد بيانات في هذه الفترة" }) => (
  <p className="py-10 text-center text-sm text-slate-500 font-bold">{text}</p>
);

const Spinner: React.FC = () => (
  <div className="py-10 flex justify-center">
    <Loader2 size={22} className="animate-spin text-red-500" />
  </div>
);

const ExportButton: React.FC<{ onClick: () => Promise<void> }> = ({ onClick }) => {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      data-print-hide
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await onClick();
        } catch (e) {
          toast.error("تعذّر التصدير", inventoryErrorMessage(e));
        } finally {
          setBusy(false);
        }
      }}
      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white/5 text-slate-300 hover:bg-white/10 disabled:opacity-50"
    >
      {busy ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} Excel
    </button>
  );
};

/** بحث واختيار منتج من المنيو (لتفصيل مكوّناته). */
const SaleItemPicker: React.FC<{ value: SaleItem | null; onChange: (v: SaleItem | null) => void }> = ({ value, onChange }) => {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SaleItem[]>([]);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      inventoryService.saleItems({ search: q.trim() || undefined }).then(setResults).catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q, open]);

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 px-4 py-3 bg-slate-800 border border-white/10 rounded-xl">
        <span className="text-sm font-bold text-white truncate">{value.name_ar || value.name}</span>
        <button type="button" aria-label="تغيير المنتج" onClick={() => onChange(null)} className="text-slate-500 hover:text-white">
          <X size={16} />
        </button>
      </div>
    );
  }
  return (
    <div className="relative">
      <input
        className={inputClass}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="ابحث عن منتج في المنيو..."
        aria-label="المنتج"
      />
      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto custom-scrollbar bg-slate-900 border border-white/10 rounded-xl shadow-2xl divide-y divide-white/5">
          {results.slice(0, 20).map((s) => (
            <button
              key={s.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(s);
                setQ("");
                setOpen(false);
              }}
              className="w-full text-right p-2.5 text-sm text-slate-300 hover:bg-white/5"
            >
              {s.name_ar || s.name} <bdi className="text-xs text-slate-500 font-mono">{s.code}</bdi>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── الصفحة ── */

export const InventoryAnalyticsPage: React.FC = () => {
  const [filters, setFilters] = useState<AnalyticsFilters>({ period: "month", warehouse_id: "", category_id: "", stock_item_id: "", stagnant_days: 30 });
  const [pickedItem, setPickedItem] = useState<Pick<StockItem, "id" | "name" | "code"> | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [lookups, setLookups] = useState<InventoryLookups | null>(null);
  const [unitMode, setUnitMode] = useState<UnitMode>("display");

  const [overview, setOverview] = useState<OverviewResult | null>(null);
  const [variance, setVariance] = useState<VarianceResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [series, setSeries] = useState<ItemSeriesResult | null>(null);
  const [ingredient, setIngredient] = useState<IngredientResult | null>(null);
  const [product, setProduct] = useState<SaleItem | null>(null);
  const [productData, setProductData] = useState<ProductResult | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    inventoryService.warehouses().then((w) => setWarehouses(w.filter((x) => x.type === "standard"))).catch(() => undefined);
    inventoryService.lookups().then(setLookups).catch(() => undefined);
  }, []);

  const setFilter = (patch: Partial<AnalyticsFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const ready = filters.period !== "custom" || Boolean(filters.from && filters.to);

  const load = useCallback(async () => {
    if (!ready) return;
    const s = ++seq.current;
    setLoading(true);
    try {
      const [o, v] = await Promise.all([inventoryService.analyticsOverview(filters), inventoryService.analyticsVariance(filters)]);
      if (s !== seq.current) return;
      setOverview(o);
      setVariance(v);
      // الصنف المختار للتفصيل: صنف الفلتر، أو المختار سابقاً إن بقي، وإلا صاحب أعلى فرق.
      setSelectedId((prev) => {
        const wanted = filters.stock_item_id || prev;
        return v.rows.some((r) => r.stock_item_id === wanted) ? (wanted as number) : (v.rows[0]?.stock_item_id ?? null);
      });
    } catch (e) {
      if (s === seq.current) toast.error("تعذّر تحميل التحليلات", inventoryErrorMessage(e));
    } finally {
      if (s === seq.current) setLoading(false);
    }
  }, [filters, ready]);

  useEffect(() => {
    load();
  }, [load]);

  const selected: VarianceRow | null = variance?.rows.find((r) => r.stock_item_id === selectedId) ?? null;

  // تفصيل الصنف المختار: السلسلة اليومية وتوزيعه على المنتجات.
  useEffect(() => {
    if (selectedId === null || !ready) {
      setSeries(null);
      setIngredient(null);
      return;
    }
    let cancelled = false;
    setDrillLoading(true);
    Promise.all([inventoryService.analyticsItemSeries(filters, selectedId), inventoryService.analyticsIngredient(filters, selectedId)])
      .then(([sr, ing]) => {
        if (cancelled) return;
        setSeries(sr);
        setIngredient(ing);
      })
      .catch((e) => !cancelled && toast.error("تعذّر تحميل تفصيل الصنف", inventoryErrorMessage(e)))
      .finally(() => !cancelled && setDrillLoading(false));
    return () => {
      cancelled = true;
    };
  }, [selectedId, filters, ready]);

  useEffect(() => {
    if (!product || !ready) {
      setProductData(null);
      return;
    }
    let cancelled = false;
    setProductData(null);
    inventoryService
      .analyticsProduct(filters, product.id)
      .then((d) => !cancelled && setProductData(d))
      .catch((e) => !cancelled && toast.error("تعذّر تحميل مكوّنات المنتج", inventoryErrorMessage(e)));
    return () => {
      cancelled = true;
    };
  }, [product, filters, ready]);

  const categoryTree = useMemo(() => flattenTree(lookups?.categories ?? []), [lookups]);
  const costs = overview?.costs_visible ?? true;
  const k = overview?.kpis;
  const exportTable = (table: string, extra: Record<string, number> = {}) => inventoryService.analyticsExport(filters, table, extra);

  // أعلى 10 أصناف بالفرق: فعلي مقابل نظري (بالقيمة إن كانت مرئية، وإلا بالكمية بوحدة العرض).
  const top10 = useMemo(
    () =>
      (variance?.rows ?? []).slice(0, 10).map((r) => {
        const f = unitMode === "display" && r.display_unit ? r.display_unit.factor : 1;
        return {
          name: r.name,
          actual: costs ? Number(r.actual_value) : Number(r.actual_qty) / f,
          theoretical: costs ? Number(r.theoretical_value) : Number(r.theoretical_qty) / f,
        };
      }),
    [variance, costs, unitMode],
  );

  const seriesFactor = unitMode === "display" && series?.item?.display_unit ? series.item.display_unit.factor : 1;
  const seriesUnit = unitMode === "display" && series?.item?.display_unit ? series.item.display_unit.name : (series?.item?.base_unit ?? "");

  // متوسط التكلفة: صف لكل يوم وعمود لكل مخزن (لكل وحدة عرض).
  const avgCostChart = useMemo(() => {
    const byDay = new Map<string, Record<string, number | string>>();
    const names = new Set<string>();
    for (const p of series?.avg_cost ?? []) {
      if (p.avg_cost === null) continue;
      names.add(p.warehouse);
      const row = byDay.get(p.day) ?? { day: p.day };
      row[p.warehouse] = p.avg_cost * seriesFactor;
      byDay.set(p.day, row);
    }
    return { rows: [...byDay.values()], names: [...names] };
  }, [series, seriesFactor]);

  return (
    <div className="space-y-6 analytics-print" dir="rtl">
      {/* الطباعة: إخفاء القائمة الجانبية وعناصر التحكم، وعرض الصفحة كاملة (حفظ PDF من نافذة الطباعة). */}
      <style>{`@media print {
        aside, nav, header, [data-print-hide] { display: none !important; }
        body, main, .analytics-print { background: #fff !important; }
        .analytics-print * { color: #0f172a !important; border-color: #cbd5e1 !important; }
        .analytics-print section, .analytics-print .bg-slate-900 { background: #fff !important; }
        .analytics-print .overflow-x-auto, .analytics-print .overflow-y-auto { overflow: visible !important; max-height: none !important; }
      }`}</style>

      <PageHeader
        title="تحليلات المخزون"
        subtitle="الاستهلاك الفعلي مقابل النظري حسب الوصفات، وقيمة المخزون وحركته عبر المخازن والتصنيفات. الفترة بالأيام المحاسبية (02:00 → 02:00)."
        action={
          <button
            type="button"
            data-print-hide
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 text-slate-200 font-bold text-sm hover:bg-white/10"
          >
            <Printer size={16} /> طباعة / PDF
          </button>
        }
      />

      {/* ── الفلاتر ── */}
      <div className="bg-slate-900 rounded-2xl border border-white/5 p-4 space-y-3" data-print-hide>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 p-1 rounded-xl bg-slate-800 border border-white/5" role="tablist" aria-label="الفترة">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                type="button"
                role="tab"
                aria-selected={filters.period === p.value}
                onClick={() => setFilter({ period: p.value })}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold ${filters.period === p.value ? "bg-red-600 text-white" : "text-slate-400 hover:text-white"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {filters.period === "custom" && (
            <>
              <input type="date" className={`${inputClass} !w-auto`} value={filters.from ?? ""} max={filters.to} onChange={(e) => setFilter({ from: e.target.value })} aria-label="من يوم" dir="ltr" />
              <input type="date" className={`${inputClass} !w-auto`} value={filters.to ?? ""} min={filters.from} onChange={(e) => setFilter({ to: e.target.value })} aria-label="إلى يوم" dir="ltr" />
            </>
          )}
          <div className="flex gap-1 p-1 rounded-xl bg-slate-800 border border-white/5 sm:mr-auto" role="group" aria-label="وحدة العرض">
            {(["display", "base"] as UnitMode[]).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={unitMode === m}
                onClick={() => setUnitMode(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${unitMode === m ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"}`}
              >
                {m === "display" ? "وحدة العرض (كغ...)" : "الوحدة الأساسية (غ...)"}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select className={inputClass} value={filters.warehouse_id} onChange={(e) => setFilter({ warehouse_id: e.target.value ? Number(e.target.value) : "" })} aria-label="المخزن">
            <option value="">كل المخازن والأقسام</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <select className={inputClass} value={filters.category_id} onChange={(e) => setFilter({ category_id: e.target.value ? Number(e.target.value) : "" })} aria-label="التصنيف">
            <option value="">كل التصنيفات</option>
            {categoryTree.map(({ category, depth }) => (
              <option key={category.id} value={category.id}>
                {"  ".repeat(depth * 2)}
                {category.name}
              </option>
            ))}
          </select>
          <StockItemPicker
            value={pickedItem}
            onChange={(it) => {
              setPickedItem(it);
              setFilter({ stock_item_id: it?.id ?? "" });
            }}
            placeholder="كل الأصناف — ابحث عن صنف..."
            ariaLabel="الصنف"
          />
        </div>
        {overview && (
          <p className="text-[11px] text-slate-500 font-semibold">
            الفترة: <bdi className="tabular-nums">{overview.period.from}</bdi> ← <bdi className="tabular-nums">{overview.period.to}</bdi> ({overview.period.days} يوم)
          </p>
        )}
      </div>

      {!ready ? (
        <EmptyBlock icon={BarChart3} text="اختر بداية ونهاية الفترة المخصّصة" />
      ) : loading && !overview ? (
        <Spinner />
      ) : !overview || !variance || !k ? (
        <EmptyBlock icon={BarChart3} text="تعذّر تحميل البيانات" />
      ) : (
        <div className={`space-y-6 transition-opacity ${loading ? "opacity-60" : ""}`}>
          {/* ── 1) KPIs ── */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <Kpi label="قيمة المخزون الحالية" value={money(k.stock_value)} />
            <Kpi
              label="الاستهلاك الفعلي"
              value={k.single_item ? qty(k.single_item.actual_qty, k.single_item.base_unit, k.single_item.display_unit, unitMode) : money(k.actual_value)}
              sub={k.single_item ? money(k.actual_value) : "من الجرد والحركات المسجّلة"}
            />
            <Kpi
              label="الاستهلاك النظري"
              value={k.single_item ? qty(k.single_item.theoretical_qty, k.single_item.base_unit, k.single_item.display_unit, unitMode) : money(k.theoretical_value)}
              sub={k.single_item ? money(k.theoretical_value) : "المبيعات × الوصفات"}
            />
            <Kpi
              label="الفرق (فعلي − نظري)"
              value={money(k.variance_value)}
              tone={k.variance_alert ? "text-red-400" : "text-white"}
              sub={
                <span className={k.variance_alert ? "text-red-400 font-black" : ""}>
                  {k.variance_percent !== null ? `${fmtNum(k.variance_percent, 2)}%` : "—"} · الحد {fmtNum(k.threshold, 1)}%
                </span>
              }
            />
            <Kpi label="تحت مخزون الأمان" value={String(k.below_safety)} tone={k.below_safety > 0 ? "text-amber-300" : "text-white"} sub="صنف" />
            <Kpi
              label="دوران المخزون"
              value={k.turnover !== null ? `${fmtNum(k.turnover, 2)}×` : "—"}
              sub={k.coverage_days !== null ? `تغطية ${fmtNum(k.coverage_days, 1)} يوم` : "لا استهلاك في الفترة"}
            />
          </div>

          {(k.products_without_recipe > 0 || Number(variance.unattributed_qty) > 0) && (
            <div className="flex flex-wrap gap-2 text-xs font-bold">
              {k.products_without_recipe > 0 && (
                <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-300">
                  <AlertTriangle size={13} /> {k.products_without_recipe} منتج مُباع بلا وصفة لا يدخل في النظري:{" "}
                  {variance.unrecipe
                    .slice(0, 5)
                    .map((u) => u.name)
                    .join("، ")}
                  {variance.unrecipe.length > 5 ? "..." : ""}
                </span>
              )}
              {Number(variance.unattributed_qty) > 0 && (
                <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-300">
                  <AlertTriangle size={13} /> {fmtNum(variance.unattributed_qty)} وحدة مباعة في فروع بلا مخزن بيع — غير منسوبة لمخزن
                </span>
              )}
            </div>
          )}

          {/* ── 2) الفعلي مقابل النظري ── */}
          <Card title="الاستهلاك الفعلي مقابل النظري" action={variance.rows.length ? <ExportButton onClick={() => exportTable("variance")} /> : undefined}>
            <p className="text-[11px] text-slate-500 font-semibold">
              النظري = المبيعات المدفوعة × كمية المكوّن في الوصفة السارية يوم البيع. الفعلي = أول المدة + الوارد + التحويل الوارد − التحويل الصادر − آخر
              المدة. الصنف بلا جرد في الفترة فعليه من الحركات المسجّلة فقط (الهالك والتسويات). اضغط صفاً لتفصيله.
            </p>
            {variance.rows.length === 0 ? (
              <Empty />
            ) : (
              <div className="overflow-x-auto max-h-[480px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-xs min-w-[1100px]">
                  <thead className="sticky top-0 bg-slate-900">
                    <tr className="text-slate-500 font-black border-b border-white/5">
                      <th className="text-right p-2">الصنف</th>
                      <th className="text-right p-2">أول المدة</th>
                      <th className="text-right p-2">الوارد</th>
                      <th className="text-right p-2">تحويل وارد</th>
                      <th className="text-right p-2">تحويل صادر</th>
                      <th className="text-right p-2">آخر المدة</th>
                      <th className="text-right p-2">منه هالك</th>
                      <th className="text-right p-2 text-red-300">الفعلي</th>
                      <th className="text-right p-2 text-sky-300">النظري</th>
                      <th className="text-right p-2">الفرق</th>
                      <th className="text-right p-2">الفرق ₪</th>
                      <th className="text-right p-2">الفرق %</th>
                      <th className="text-right p-2">آخر جرد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variance.rows.map((r) => {
                      const q = (v: string) => qty(v, r.base_unit, r.display_unit, unitMode);
                      const isSel = selectedId === r.stock_item_id;
                      return (
                        <tr
                          key={r.stock_item_id}
                          onClick={() => setSelectedId(r.stock_item_id)}
                          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelectedId(r.stock_item_id)}
                          tabIndex={0}
                          role="button"
                          aria-pressed={isSel}
                          className={`border-b border-white/5 last:border-0 cursor-pointer tabular-nums whitespace-nowrap ${isSel ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"}`}
                        >
                          <td className="p-2 font-bold text-white">
                            {r.alert && <AlertTriangle size={12} className="inline text-red-400 ml-1" aria-label="فرق مرتفع" />}
                            {r.name}
                          </td>
                          <td className="p-2 text-slate-400">{q(r.opening)}</td>
                          <td className="p-2 text-slate-400">{q(r.inflow)}</td>
                          <td className="p-2 text-slate-400">{q(r.transfers_in)}</td>
                          <td className="p-2 text-slate-400">{q(r.transfers_out)}</td>
                          <td className="p-2 text-slate-400">{q(r.closing)}</td>
                          <td className="p-2 text-slate-400">{q(r.waste)}</td>
                          <td className="p-2 font-bold text-red-300">{q(r.actual_qty)}</td>
                          <td className="p-2 font-bold text-sky-300">{q(r.theoretical_qty)}</td>
                          <td className={`p-2 font-bold ${Number(r.variance_qty) > 0 ? "text-red-400" : "text-green-400"}`}>{q(r.variance_qty)}</td>
                          <td className={`p-2 ${Number(r.variance_value) > 0 ? "text-red-400" : "text-slate-300"}`}>{money(r.variance_value)}</td>
                          <td className={`p-2 font-black ${r.alert ? "text-red-400" : "text-slate-300"}`}>
                            {r.variance_percent !== null ? `${fmtNum(r.variance_percent, 2)}%` : r.alert ? "بلا مبيعات" : "—"}
                          </td>
                          <td className="p-2">
                            {r.last_count_date ? (
                              <span className="text-slate-400">{r.last_count_date}</span>
                            ) : (
                              <span className="text-amber-300 font-bold" title="الفعلي من الحركات المسجّلة فقط">
                                لا جرد
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card title={`أعلى 10 أصناف بالفرق — فعلي مقابل نظري ${costs ? "(₪)" : "(كمية)"}`}>
              {top10.length === 0 ? (
                <Empty />
              ) : (
                <div dir="ltr" className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={top10} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" tick={axisTick} interval={0} angle={-30} textAnchor="end" height={60} />
                      <YAxis tick={axisTick} width={60} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtNum(num(v), 2)} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="actual" name="الفعلي" fill={C.actual} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="theoretical" name="النظري" fill={C.theoretical} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <Card title={selected ? `يومياً: ${selected.name} (${seriesUnit})` : "يومياً للصنف المختار"}>
              {!selected ? (
                <Empty text="اختر صنفاً من الجدول" />
              ) : drillLoading && !series ? (
                <Spinner />
              ) : !series || series.days.every((d) => d.actual === 0 && d.theoretical === 0) ? (
                <Empty />
              ) : (
                <div dir="ltr" className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={series.days.map((d) => ({ ...d, actual: d.actual / seriesFactor, theoretical: d.theoretical / seriesFactor }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="day" tick={axisTick} tickFormatter={(d: string) => d.slice(5)} />
                      <YAxis tick={axisTick} width={60} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtNum(num(v))} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="actual" name="الفعلي" stroke={C.actual} strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="theoretical" name="النظري" stroke={C.theoretical} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>

          {/* ── 3) التفصيل حسب الوصفات ── */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card
              title={selected ? `من استهلك ${selected.name}؟` : "استهلاك المكوّن حسب المنتجات"}
              action={
                selected && ingredient?.rows.length ? (
                  <ExportButton onClick={() => exportTable("ingredient", { stock_item_id: selected.stock_item_id })} />
                ) : undefined
              }
            >
              {!selected ? (
                <Empty text="اختر مكوّناً من جدول الفعلي مقابل النظري" />
              ) : drillLoading && !ingredient ? (
                <Spinner />
              ) : !ingredient || ingredient.rows.length === 0 ? (
                <Empty text="لا مبيعات تستهلك هذا المكوّن في الفترة" />
              ) : (
                <>
                  <div dir="ltr" className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={ingredient.rows.slice(0, 10).map((r) => ({ name: r.name, share: Number(r.share_percent) }))}
                        layout="vertical"
                        margin={{ left: 10, right: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                        <XAxis type="number" tick={axisTick} unit="%" />
                        <YAxis type="category" dataKey="name" tick={axisTick} width={110} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${fmtNum(num(v), 2)}%`} />
                        <Bar dataKey="share" name="النسبة" fill={C.theoretical} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs min-w-[560px]">
                      <thead>
                        <tr className="text-slate-500 font-black border-b border-white/5">
                          <th className="text-right p-2">المنتج</th>
                          <th className="text-right p-2">المباع</th>
                          <th className="text-right p-2">لكل وحدة</th>
                          <th className="text-right p-2">المستهلك</th>
                          <th className="text-right p-2">التكلفة</th>
                          <th className="text-right p-2">النسبة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ingredient.rows.map((r) => (
                          <tr key={r.item_id} className="border-b border-white/5 last:border-0 tabular-nums">
                            <td className="p-2 font-bold text-white">{r.name}</td>
                            <td className="p-2 text-slate-300">{fmtNum(r.sold, 2)}</td>
                            <td className="p-2 text-slate-400">{qty(r.per_unit, ingredient.item?.base_unit ?? null, ingredient.item?.display_unit ?? null, "base")}</td>
                            <td className="p-2 text-slate-200">{qty(r.consumed, ingredient.item?.base_unit ?? null, ingredient.item?.display_unit ?? null, unitMode)}</td>
                            <td className="p-2 text-slate-300">{money(r.cost)}</td>
                            <td className="p-2 font-bold text-sky-300">{fmtNum(r.share_percent, 2)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </Card>

            <Card title="مكوّنات منتج" action={product && productData?.rows.length ? <ExportButton onClick={() => exportTable("product", { item_id: product.id })} /> : undefined}>
              <div data-print-hide>
                <SaleItemPicker value={product} onChange={setProduct} />
              </div>
              {!product ? (
                <Empty text="اختر منتجاً من المنيو لعرض ما استهلكه من كل مكوّن" />
              ) : !productData ? (
                <Spinner />
              ) : !productData.has_recipe ? (
                <Empty text="هذا المنتج بلا وصفة سارية — لا يُحسب له استهلاك نظري" />
              ) : productData.rows.length === 0 ? (
                <Empty text="لم يُبع هذا المنتج في الفترة" />
              ) : (
                <>
                  <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-400">
                    <span>
                      المباع: <span className="text-white tabular-nums">{fmtNum(productData.sold, 2)}</span>
                    </span>
                    <span>
                      تكلفة الوصفة الفعلية للوحدة: <span className="text-white tabular-nums">{money(productData.unit_cost)}</span>
                    </span>
                    {productData.price && (
                      <span>
                        سعر البيع: <span className="text-white tabular-nums">{money(productData.price)}</span>
                      </span>
                    )}
                    {productData.food_cost_percent && (
                      <span>
                        نسبة التكلفة: <span className="text-white tabular-nums">{fmtNum(productData.food_cost_percent, 1)}%</span>
                      </span>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs min-w-[560px]">
                      <thead>
                        <tr className="text-slate-500 font-black border-b border-white/5">
                          <th className="text-right p-2">المكوّن</th>
                          <th className="text-right p-2">لكل وحدة</th>
                          <th className="text-right p-2">المستهلك</th>
                          <th className="text-right p-2">التكلفة</th>
                          <th className="text-right p-2">للوحدة المباعة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productData.rows.map((r) => (
                          <tr key={r.stock_item_id} className="border-b border-white/5 last:border-0 tabular-nums">
                            <td className="p-2 font-bold text-white">{r.name}</td>
                            <td className="p-2 text-slate-400">{qty(r.per_unit, r.base_unit, r.display_unit, "base")}</td>
                            <td className="p-2 text-slate-200">{qty(r.consumed, r.base_unit, r.display_unit, unitMode)}</td>
                            <td className="p-2 text-slate-300">{money(r.cost)}</td>
                            <td className="p-2 text-slate-300">{r.cost_per_product !== null ? `${fmtNum(r.cost_per_product, 4)} ₪` : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </Card>
          </div>

          {/* ── 4) قيمة المخزون وحركته ── */}
          {costs ? (
            <>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <Card title="قيمة المخزون حسب المخزن / القسم (₪)">
                  {overview.value_by_warehouse.length === 0 ? (
                    <Empty text="لا أرصدة" />
                  ) : (
                    <div dir="ltr" className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={overview.value_by_warehouse}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="name" tick={axisTick} />
                          <YAxis tick={axisTick} width={70} />
                          <Tooltip contentStyle={tooltipStyle} formatter={(v) => money(num(v))} />
                          <Bar dataKey="value" name="القيمة" fill={C.value} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </Card>
                <Card title="قيمة المخزون حسب التصنيف">
                  {overview.value_by_category.length === 0 ? (
                    <Empty text="لا أرصدة" />
                  ) : (
                    <div dir="ltr" className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={overview.value_by_category} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2}>
                            {overview.value_by_category.map((c, i) => (
                              <Cell key={c.name} fill={PALETTE[i % PALETTE.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} formatter={(v) => money(num(v))} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </Card>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <Card title="حركة المخزون عبر الزمن (₪)">
                  {overview.movement_series.every((d) => !d.inflow && !d.outflow && !d.transfers_in && !d.transfers_out && !d.waste && !d.adjustment) ? (
                    <Empty />
                  ) : (
                    <div dir="ltr" className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={overview.movement_series}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="day" tick={axisTick} tickFormatter={(d: string) => d.slice(5)} />
                          <YAxis tick={axisTick} width={70} />
                          <Tooltip contentStyle={tooltipStyle} formatter={(v) => money(num(v))} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Bar dataKey="inflow" name="وارد" stackId="m" fill={C.inflow} />
                          <Bar dataKey="transfers_in" name="تحويل وارد" stackId="m" fill={C.transferIn} />
                          <Bar dataKey="outflow" name="صادر (بيع/إنتاج)" stackId="m" fill={C.outflow} />
                          <Bar dataKey="transfers_out" name="تحويل صادر" stackId="m" fill={C.transferOut} />
                          <Bar dataKey="waste" name="هدر" stackId="m" fill={C.waste} />
                          <Bar dataKey="adjustment" name="تسوية جرد" stackId="m" fill={C.adjustment} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </Card>
                <Card title="اتجاه قيمة المخزون الإجمالية يومياً (₪)">
                  {overview.value_trend.length === 0 ? (
                    <Empty />
                  ) : (
                    <div dir="ltr" className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={overview.value_trend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="day" tick={axisTick} tickFormatter={(d: string) => d.slice(5)} />
                          <YAxis tick={axisTick} width={70} />
                          <Tooltip contentStyle={tooltipStyle} formatter={(v) => money(num(v))} />
                          <Line type="monotone" dataKey="value" name="القيمة" stroke={C.value} strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </Card>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <Card
                  title="أعلى 10 أصناف استهلاكاً بالقيمة"
                  action={overview.top_consumption.length ? <ExportButton onClick={() => exportTable("top_consumption")} /> : undefined}
                >
                  {overview.top_consumption.length === 0 ? (
                    <Empty />
                  ) : (
                    <div dir="ltr" className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={overview.top_consumption} layout="vertical" margin={{ left: 10, right: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                          <XAxis type="number" tick={axisTick} />
                          <YAxis type="category" dataKey="name" tick={axisTick} width={110} />
                          <Tooltip contentStyle={tooltipStyle} formatter={(v) => money(num(v))} />
                          <Bar dataKey="value" name="القيمة" fill={C.actual} radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </Card>
                <Card title={selected ? `تغيّر متوسط تكلفة ${selected.name} (₪ لكل ${seriesUnit})` : "تغيّر متوسط التكلفة"}>
                  {!selected ? (
                    <Empty text="اختر صنفاً من الجدول" />
                  ) : avgCostChart.rows.length === 0 ? (
                    <Empty text="لا حركات للصنف في الفترة" />
                  ) : (
                    <div dir="ltr" className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={avgCostChart.rows}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="day" tick={axisTick} tickFormatter={(d: string) => d.slice(5)} />
                          <YAxis tick={axisTick} width={70} />
                          <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${fmtNum(num(v), 4)} ₪`} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          {avgCostChart.names.map((n, i) => (
                            <Line key={n} type="stepAfter" dataKey={n} stroke={PALETTE[i % PALETTE.length]} strokeWidth={2} connectNulls dot />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </Card>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500 font-bold">مخططات القيمة تظهر لمن يملك صلاحية "رؤية التكاليف والقيم".</p>
          )}

          {/* ── تنبيهات ── */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card title="تحت مخزون الأمان أو قريبة منه" action={overview.low_stock.length ? <ExportButton onClick={() => exportTable("low_stock")} /> : undefined}>
              {overview.low_stock.length === 0 ? (
                <Empty text="كل الأصناف فوق مخزون الأمان" />
              ) : (
                <div className="overflow-x-auto max-h-80 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-xs min-w-[560px]">
                    <thead className="sticky top-0 bg-slate-900">
                      <tr className="text-slate-500 font-black border-b border-white/5">
                        <th className="text-right p-2">الصنف</th>
                        <th className="text-right p-2">المخزن</th>
                        <th className="text-right p-2">الرصيد</th>
                        <th className="text-right p-2">الأمان</th>
                        <th className="text-right p-2">المقترح طلبه</th>
                        <th className="text-right p-2">المورّد المفضّل</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.low_stock.map((r) => (
                        <tr key={`${r.warehouse_id}-${r.stock_item_id}`} className="border-b border-white/5 last:border-0 tabular-nums">
                          <td className="p-2 font-bold text-white">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-black ml-1 ${r.status === "below" ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-300"}`}
                            >
                              {r.status === "below" ? "تحت الحد" : "قريب"}
                            </span>
                            {r.name}
                          </td>
                          <td className="p-2 text-slate-400">{r.warehouse}</td>
                          <td className="p-2 text-slate-200">
                            {fmtNum(r.quantity)} {r.base_unit}
                          </td>
                          <td className="p-2 text-slate-400">{fmtNum(r.safety_stock)}</td>
                          <td className="p-2 text-sky-300 font-bold">{fmtNum(r.suggested)}</td>
                          <td className="p-2 text-slate-400">{r.supplier ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card
              title="الأصناف الراكدة"
              action={
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-xs text-slate-400 font-bold" data-print-hide>
                    بلا حركة منذ
                    <input
                      type="number"
                      min={1}
                      max={365}
                      className="w-16 bg-slate-800 border border-white/10 rounded-lg px-2 py-1 text-white text-xs"
                      value={filters.stagnant_days}
                      onChange={(e) => setFilter({ stagnant_days: Math.max(1, Number(e.target.value) || 30) })}
                      dir="ltr"
                    />
                    يوم
                  </label>
                  {overview.stagnant.length > 0 && <ExportButton onClick={() => exportTable("stagnant")} />}
                </div>
              }
            >
              {overview.stagnant.length === 0 ? (
                <Empty text={`لا أصناف راكدة منذ ${filters.stagnant_days} يوم`} />
              ) : (
                <div className="overflow-x-auto max-h-80 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-xs min-w-[520px]">
                    <thead className="sticky top-0 bg-slate-900">
                      <tr className="text-slate-500 font-black border-b border-white/5">
                        <th className="text-right p-2">الصنف</th>
                        <th className="text-right p-2">المخزن</th>
                        <th className="text-right p-2">الرصيد</th>
                        <th className="text-right p-2">القيمة</th>
                        <th className="text-right p-2">آخر حركة</th>
                        <th className="text-right p-2">أيام</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.stagnant.map((r) => (
                        <tr key={`${r.warehouse}-${r.stock_item_id}`} className="border-b border-white/5 last:border-0 tabular-nums">
                          <td className="p-2 font-bold text-white">{r.name}</td>
                          <td className="p-2 text-slate-400">{r.warehouse}</td>
                          <td className="p-2 text-slate-200">
                            {fmtNum(r.quantity)} {r.base_unit}
                          </td>
                          <td className="p-2 text-slate-300">{money(r.value)}</td>
                          <td className="p-2 text-slate-400">{r.last_movement_day}</td>
                          <td className="p-2 font-bold text-amber-300">{r.idle_days}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
