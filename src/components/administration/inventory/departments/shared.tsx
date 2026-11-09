/**
 * عناصر مشتركة لصفحات الأقسام: فلتر الفترة (في الرابط حتى تنتقل بين القائمة والتفصيل وتبقى عند التحديث)،
 * وبطاقات المؤشرات، وتنسيق المبالغ والنسب والكميات، وترتيب الجداول.
 */

import React, { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, Download, Loader2 } from "lucide-react";
import { toast } from "../../../shared/Toast";
import { fmtNum, inventoryErrorMessage } from "../../../../services/inventoryService";
import { presetRange, type DeptQuery, type RangePreset } from "../../../../services/departmentsService";
import { inputClass } from "../ui";

export const money = (v: string | number | null | undefined) => (v === null || v === undefined ? "—" : `${fmtNum(v, 2)} ₪`);
export const pct = (v: string | number | null | undefined) => (v === null || v === undefined ? "—" : `${fmtNum(v, 2)}%`);
/** الكمية بالوحدة الأساسية مع الوحدة بجانبها. */
export const qtyUnit = (v: string | number | null | undefined, unit?: string | null) =>
  v === null || v === undefined ? "—" : `${fmtNum(v)}${unit ? ` ${unit}` : ""}`;

/** لون نسبة التكلفة: حتى 35% جيد، حتى 45% انتباه، وأكثر مرتفع. */
export function foodCostTone(v: string | null | undefined): string {
  if (v === null || v === undefined) return "text-slate-500";
  const n = Number(v);
  // صفر = لا استهلاك مسجّل (بلا وصفة أو قبل تفعيل الخصم)، لا "تكلفة ممتازة".
  if (n === 0) return "text-slate-400";
  if (n <= 35) return "text-green-400";
  if (n <= 45) return "text-amber-400";
  return "text-red-400";
}

/* ── الفترة والفرع في الرابط ── */

export function usePeriodParams() {
  const [params, setParams] = useSearchParams();
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const branch = Number(params.get("branch")) || null;

  const update = useCallback(
    (patch: Record<string, string | number | null>) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (v === null || v === "") next.delete(k);
            else next.set(k, String(v));
          }
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );

  const query: DeptQuery = useMemo(() => ({ from: from || undefined, to: to || undefined }), [from, to]);
  return { from, to, branch, query, update, params };
}

const PRESETS: { value: RangePreset; label: string }[] = [
  { value: "today", label: "اليوم" },
  { value: "week", label: "آخر 7 أيام" },
  { value: "month", label: "الشهر الحالي" },
  { value: "last_month", label: "الشهر الماضي" },
];

/** فلتر الفترة من/إلى. القيم الفارغة = افتراضي الخادم (الشهر الحالي)، وتُعرض الفترة الفعلية الراجعة منه. */
export const PeriodBar: React.FC<{
  from: string;
  to: string;
  effective?: { from: string; to: string } | null;
  onChange: (range: { from: string; to: string }) => void;
  children?: React.ReactNode;
}> = ({ from, to, effective, onChange, children }) => {
  const shownFrom = from || effective?.from || "";
  const shownTo = to || effective?.to || "";
  const active = PRESETS.find((p) => {
    const r = presetRange(p.value);
    return r.from === shownFrom && r.to === shownTo;
  })?.value;

  return (
    <div className="bg-slate-900 rounded-2xl border border-white/5 p-3 flex flex-wrap items-center gap-2" data-print-hide>
      <div className="flex flex-wrap gap-1" role="group" aria-label="فترة جاهزة">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => onChange(presetRange(p.value))}
            aria-pressed={active === p.value}
            className={`px-3 py-2 rounded-lg text-xs font-black transition-colors ${
              active === p.value ? "bg-red-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs font-black text-slate-500" htmlFor="period-from">
          من
        </label>
        <input
          id="period-from"
          type="date"
          dir="ltr"
          className={`${inputClass} !w-auto !py-2`}
          value={shownFrom}
          max={shownTo || undefined}
          onChange={(e) => e.target.value && onChange({ from: e.target.value, to: shownTo || e.target.value })}
        />
        <label className="text-xs font-black text-slate-500" htmlFor="period-to">
          إلى
        </label>
        <input
          id="period-to"
          type="date"
          dir="ltr"
          className={`${inputClass} !w-auto !py-2`}
          value={shownTo}
          min={shownFrom || undefined}
          onChange={(e) => e.target.value && onChange({ from: shownFrom || e.target.value, to: e.target.value })}
        />
      </div>
      {children && <div className="flex flex-wrap items-center gap-2 ms-auto">{children}</div>}
    </div>
  );
};

/* ── بطاقات وتنبيهات ── */

export const Kpi: React.FC<{ label: string; value: string; sub?: React.ReactNode; tone?: string }> = ({ label, value, sub, tone = "text-white" }) => (
  <div className="bg-slate-900 rounded-2xl border border-white/5 p-4 min-w-0">
    <p className="text-[11px] text-slate-500 font-black">{label}</p>
    <p className={`text-xl font-black tabular-nums mt-1 truncate ${tone}`}>
      <bdi>{value}</bdi>
    </p>
    {sub && <div className="text-[11px] text-slate-500 font-semibold mt-0.5">{sub}</div>}
  </div>
);

export const Card: React.FC<{ title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }> = ({
  title,
  action,
  children,
  className = "",
}) => (
  <section className={`bg-slate-900 rounded-2xl border border-white/5 p-4 sm:p-5 space-y-3 min-w-0 ${className}`}>
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <h3 className="text-sm font-black text-white">{title}</h3>
      {action}
    </div>
    {children}
  </section>
);

/** طلبات مدفوعة في الفترة بلا خصم مخزون: استهلاكها النظري غير محسوب في الأرقام. */
export const UndeductedBanner: React.FC<{ count: number }> = ({ count }) =>
  count > 0 ? (
    <div role="status" className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold">
      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
      <span>
        {count} طلب مدفوع في هذه الفترة بدون خصم مخزون (قبل تفعيل الخصم عند البيع، أو فشل خصمه) — مبيعاته محسوبة، واستهلاكه
        النظري غير داخل في التكلفة.
      </span>
    </div>
  ) : null;

export const Spinner: React.FC = () => (
  <div className="py-12 flex justify-center" role="status" aria-label="جارٍ التحميل">
    <Loader2 size={24} className="animate-spin text-red-500" />
  </div>
);

export const EmptyRow: React.FC<{ colSpan: number; text?: string }> = ({ colSpan, text = "لا توجد بيانات في هذه الفترة" }) => (
  <tr>
    <td colSpan={colSpan} className="py-10 text-center text-sm text-slate-500 font-bold">
      {text}
    </td>
  </tr>
);

export const ToolButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: React.ElementType; busy?: boolean }> = ({
  icon: Icon,
  busy,
  children,
  className = "",
  disabled,
  ...rest
}) => (
  <button
    type="button"
    {...rest}
    disabled={disabled || busy}
    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
  >
    {busy ? <Loader2 size={14} className="animate-spin" /> : Icon ? <Icon size={14} /> : null}
    {children}
  </button>
);

/** زر تصدير Excel مع حالة انتظار ورسالة خطأ. */
export const ExportButton: React.FC<{ onExport: () => Promise<void>; label?: string }> = ({ onExport, label = "Excel" }) => {
  const [busy, setBusy] = useState(false);
  return (
    <ToolButton
      icon={Download}
      busy={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await onExport();
        } catch (e) {
          toast.error("تعذّر التصدير", inventoryErrorMessage(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      {label}
    </ToolButton>
  );
};

/* ── ترتيب الجداول ── */

export type SortDir = "asc" | "desc";
export interface SortState<K extends string> {
  key: K;
  dir: SortDir;
}

/** ترتيب بالعمود (رقمي إن أمكن، وإلا أبجدي بالعربية). القيم الفارغة في الآخر دائماً. */
export function sortRows<T, K extends string>(rows: T[], sort: SortState<K>, get: (row: T, key: K) => string | number | null | undefined): T[] {
  const mul = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = get(a, sort.key);
    const vb = get(b, sort.key);
    if (va === null || va === undefined || va === "") return vb === null || vb === undefined || vb === "" ? 0 : 1;
    if (vb === null || vb === undefined || vb === "") return -1;
    const na = Number(va);
    const nb = Number(vb);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return (na - nb) * mul;
    return String(va).localeCompare(String(vb), "ar") * mul;
  });
}

export function SortTh<K extends string>({
  label,
  k,
  sort,
  onSort,
}: {
  label: string;
  k: K;
  sort: SortState<K>;
  onSort: (s: SortState<K>) => void;
}) {
  const active = sort.key === k;
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th scope="col" aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} className="p-0">
      <button
        type="button"
        onClick={() => onSort({ key: k, dir: active && sort.dir === "desc" ? "asc" : "desc" })}
        className={`w-full flex items-center gap-1 px-3 py-2.5 text-[11px] font-black whitespace-nowrap hover:text-white ${active ? "text-white" : "text-slate-400"}`}
      >
        {label}
        <Icon size={12} className={active ? "text-red-400" : "text-slate-600"} aria-hidden />
      </button>
    </th>
  );
}

/* ── تحميل بيانات تبويب ── */

/**
 * يحمّل بيانات التبويب عند تغيّر الفترة/الفرع (القيم نفسها لا هوية الكائن)، ويتجاهل الردود المتأخرة،
 * ويبلّغ بالفترة الفعلية الراجعة من الخادم.
 */
export function useTabData<T extends { filters: { from: string; to: string } }>(
  fetcher: (q: DeptQuery) => Promise<T>,
  query: DeptQuery,
  onPeriod: (p: { from: string; to: string }) => void,
  errorTitle: string,
): { data: T | null; loading: boolean; reload: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const { from, to, branch_id } = query;
  const fetchRef = React.useRef(fetcher);
  fetchRef.current = fetcher;
  const periodRef = React.useRef(onPeriod);
  periodRef.current = onPeriod;

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchRef
      .current({ from, to, branch_id })
      .then((res) => {
        if (cancelled) return;
        setData(res);
        periodRef.current({ from: res.filters.from, to: res.filters.to });
      })
      .catch((e) => !cancelled && toast.error(errorTitle, inventoryErrorMessage(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [from, to, branch_id, tick, errorTitle]);

  return { data, loading, reload: useCallback(() => setTick((t) => t + 1), []) };
}

/** رابط كرت الصنف لمادة (في مخزن القسم إن وُجد) ضمن الفترة. */
export function kardexLink(stockItemId: number, warehouseId: number | null | undefined, from?: string, to?: string): string {
  const p = new URLSearchParams({ stock_item_id: String(stockItemId) });
  if (warehouseId) p.set("warehouse_id", String(warehouseId));
  if (from) p.set("from", from);
  if (to) p.set("to", to);
  return `/inventory/kardex?${p.toString()}`;
}

export const thClass ="px-3 py-2.5 text-[11px] font-black text-slate-400 whitespace-nowrap text-right";
export const tdNum = "px-3 py-2.5 tabular-nums whitespace-nowrap";
