/**
 * ExcelGrid.tsx — جدول إدخال كثيف (بنية جداول الأمين بهوية النظام): حدود خلايا، ترويسة ثابتة،
 * وتمرير أفقي داخل الجدول نفسه على الشاشات الضيقة.
 *
 * التنقل (useExcelGridNav) — كل خانة قابلة للتركيز تحمل data-row (رقم السطر) وdata-col (رقم العمود):
 *   Enter / Tab           الخانة التالية (Enter يتبع enterCols إن حُدّد: مسار سريع مثل رقم الصنف ← الكمية ← سطر جديد)
 *   Shift+Enter / Shift+Tab   الخانة السابقة
 *   ↑ / ↓                 نفس العمود في السطر السابق/التالي (القائمة المنسدلة تحتفظ بأسهمها)
 *   ← / →                 العمود المجاور بصرياً (RTL: ← التالي، → السابق) — داخل نص فيه مؤشر يتحرك المؤشر أولاً
 *   Ctrl+Delete           حذف السطر
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { inventoryService, type StockItem } from "../../../services/inventoryService";

export interface GridColumn {
  key: string;
  label: string;
  /** عرض ثابت (مثل "6rem")؛ بدونه يأخذ العمود الباقي. */
  width?: string;
  align?: "start" | "center" | "end";
  hidden?: boolean;
}

/** خانة كتابة تملأ الخلية. */
export const gridInput =
  "w-full h-8 px-2 bg-transparent text-white text-sm outline-none focus:bg-red-500/10 focus:ring-2 focus:ring-inset focus:ring-red-600 placeholder:text-slate-600 disabled:cursor-not-allowed disabled:text-slate-400";
/** خلية الجدول. */
export const gridTd = "border border-white/10 p-0 align-middle";
/** نص للقراءة داخل خلية. */
export const gridText = "px-2 h-8 flex items-center text-sm whitespace-nowrap";

const ALIGN = { start: "text-right", center: "text-center", end: "text-left" } as const;

export const ExcelGrid = React.forwardRef<
  HTMLDivElement,
  {
    columns: GridColumn[];
    children: React.ReactNode;
    ariaLabel: string;
    /** أقل عرض للجدول قبل التمرير الأفقي. */
    minWidth?: number;
    /** أقصى ارتفاع قبل التمرير العمودي (الترويسة تبقى ظاهرة). */
    maxHeight?: string;
    onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
    onFocus?: React.FocusEventHandler<HTMLDivElement>;
    footer?: React.ReactNode;
  }
>(({ columns, children, ariaLabel, minWidth = 900, maxHeight = "60vh", onKeyDown, onFocus, footer }, ref) => {
  const cols = columns.filter((c) => !c.hidden);
  return (
    <div
      ref={ref}
      role="region"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      className="rounded-xl border border-white/10 overflow-auto custom-scrollbar bg-slate-900"
      style={{ maxHeight }}
    >
      <table className="w-full border-collapse text-sm" style={{ minWidth }}>
        <colgroup>
          {cols.map((c) => (
            <col key={c.key} style={c.width ? { width: c.width } : undefined} />
          ))}
        </colgroup>
        <thead className="sticky top-0 z-10">
          <tr>
            {cols.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={`bg-slate-800 text-slate-400 text-[11px] font-black px-2 py-2 border border-white/10 whitespace-nowrap ${ALIGN[c.align ?? "start"]}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
        {footer && <tfoot className="sticky bottom-0 z-10">{footer}</tfoot>}
      </table>
    </div>
  );
});
ExcelGrid.displayName = "ExcelGrid";

type FocusTarget = { row: number; col: number | "first" };

const enabledCell = (el: Element): el is HTMLElement =>
  el instanceof HTMLElement && !(el as HTMLInputElement).disabled && el.dataset.col !== undefined;

/** خانة نص: هل يتحرك المؤشر داخلها بالسهم بدل الانتقال؟ (فارغة أو محدّدة كلها = وضع تنقل) */
function caretWantsArrow(el: HTMLElement, key: "ArrowLeft" | "ArrowRight"): boolean {
  if (el.tagName !== "INPUT") return false;
  const input = el as HTMLInputElement;
  if (!["text", "search", ""].includes(input.type)) return false;
  const len = input.value.length;
  if (len === 0) return false;
  const { selectionStart: s, selectionEnd: e } = input;
  if (s === null || e === null) return false;
  if (s === 0 && e === len) return false; // كل النص محدّد (بعد الانتقال إليها)
  // نعطي المؤشر أولوية ما دام ليس عند طرف النص في اتجاه السهم.
  const rtl = getComputedStyle(input).direction === "rtl";
  const towardsStart = rtl ? key === "ArrowRight" : key === "ArrowLeft";
  return towardsStart ? s > 0 : e < len;
}

export function useExcelGridNav({
  enterCols,
  onDeleteRow,
  onRowEnd,
}: {
  /** مسار Enter السريع داخل السطر (أرقام الأعمدة بالترتيب). بدونه Enter = Tab. */
  enterCols?: number[];
  onDeleteRow?: (row: number) => void;
  /** Enter بعد آخر خانة في آخر سطر (مثلاً إضافة سطر). */
  onRowEnd?: (row: number) => void;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [focusReq, setFocusReq] = useState<FocusTarget | null>(null);
  const [activeRow, setActiveRow] = useState<number | null>(null);

  const rowCells = useCallback((row: number): HTMLElement[] => {
    const els = Array.from(gridRef.current?.querySelectorAll(`[data-row="${row}"][data-col]`) ?? []).filter(enabledCell);
    return els.sort((a, b) => Number(a.dataset.col) - Number(b.dataset.col));
  }, []);

  const rows = useCallback((): number[] => {
    const set = new Set<number>();
    gridRef.current?.querySelectorAll("[data-row][data-col]").forEach((el) => set.add(Number((el as HTMLElement).dataset.row)));
    return [...set].sort((a, b) => a - b);
  }, []);

  const focusEl = (el: HTMLElement | undefined) => {
    if (!el) return false;
    el.focus();
    if (el instanceof HTMLInputElement && el.type !== "checkbox") el.select();
    return true;
  };

  const focusAt = useCallback(
    (row: number, col: number | "first"): boolean => {
      const cells = rowCells(row);
      if (cells.length === 0) return false;
      if (col === "first") {
        const first = enterCols?.length ? cells.find((c) => Number(c.dataset.col) === enterCols[0]) : undefined;
        return focusEl(first ?? cells[0]);
      }
      // نفس العمود، وإلا أقرب عمود متاح
      const exact = cells.find((c) => Number(c.dataset.col) === col);
      if (exact) return focusEl(exact);
      const nearest = [...cells].sort((a, b) => Math.abs(Number(a.dataset.col) - col) - Math.abs(Number(b.dataset.col) - col))[0];
      return focusEl(nearest);
    },
    [rowCells, enterCols],
  );

  // التركيز بعد الرسم (السطر الجديد لا يوجد قبل إعادة الرسم).
  useEffect(() => {
    if (!focusReq) return;
    focusAt(focusReq.row, focusReq.col);
    setFocusReq(null);
  });

  const step = (row: number, col: number, dir: 1 | -1): boolean => {
    const cells = rowCells(row);
    const idx = cells.findIndex((c) => Number(c.dataset.col) === col);
    const next = cells[idx + dir];
    if (next) return focusEl(next);
    const all = rows();
    const r = all[all.indexOf(row) + dir];
    if (r === undefined) return false;
    const target = rowCells(r);
    return focusEl(dir === 1 ? target[0] : target[target.length - 1]);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const t = e.target as HTMLElement;
    if (t.dataset.row === undefined || t.dataset.col === undefined) return;
    const row = Number(t.dataset.row);
    const col = Number(t.dataset.col);

    if (e.key === "Delete" && (e.ctrlKey || e.metaKey)) {
      if (!onDeleteRow) return;
      e.preventDefault();
      onDeleteRow(row);
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === "Tab") {
      if (step(row, col, e.shiftKey ? -1 : 1)) e.preventDefault();
      return;
    }
    if (e.key === "Enter") {
      if (t.tagName === "TEXTAREA" || t.tagName === "BUTTON") return;
      e.preventDefault();
      if (e.shiftKey) {
        step(row, col, -1);
        return;
      }
      if (enterCols?.length) {
        const after = enterCols.find((c) => c > col && rowCells(row).some((el) => Number(el.dataset.col) === c));
        if (after !== undefined && focusAt(row, after)) return;
        const all = rows();
        const nextRow = all[all.indexOf(row) + 1];
        if (nextRow !== undefined) focusAt(nextRow, "first");
        else onRowEnd?.(row);
        return;
      }
      if (!step(row, col, 1)) onRowEnd?.(row);
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (t.tagName === "SELECT") return;
      const all = rows();
      const r = all[all.indexOf(row) + (e.key === "ArrowDown" ? 1 : -1)];
      if (r === undefined) return;
      e.preventDefault();
      focusAt(r, col);
      return;
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      if (caretWantsArrow(t, e.key)) return;
      e.preventDefault();
      // RTL: الأعمدة تتقدم نحو اليسار.
      step(row, col, e.key === "ArrowLeft" ? 1 : -1);
    }
  };

  const onFocus = (e: React.FocusEvent) => {
    const r = (e.target as HTMLElement).dataset.row;
    if (r !== undefined) setActiveRow(Number(r));
  };

  return {
    gridRef,
    onKeyDown,
    onFocus,
    activeRow,
    /** تركيز خانة بعد الرسم التالي. */
    requestFocus: (row: number, col: number | "first" = "first") => setFocusReq({ row, col }),
  };
}

/* ── خانات الصنف ── */

/** صنف واحد بالرقم أو الباركود تماماً (المسح بالماسح أو كتابة الرقم ثم Enter). */
export async function lookupItemByCode(code: string): Promise<StockItem | null> {
  const q = code.trim();
  if (!q) return null;
  const r = await inventoryService.items({ search: q, is_active: 1, per_page: 10 });
  const low = q.toLowerCase();
  return r.data.find((i) => i.is_stored && (i.code.toLowerCase() === low || (i.barcode ?? "").toLowerCase() === low)) ?? null;
}

/**
 * بحث الصنف بالاسم في خلية (قائمة منسدلة): الأسهم تتنقل في النتائج، Enter يختار المبرز، Esc يلغي.
 * عند فراغ النص يمرّ Enter وEsc للجدول/الصفحة. تطابق الرقم أو الباركود تماماً يأتي أولاً.
 */
export const ItemNameCell: React.FC<{
  row: number;
  col: number;
  selectedName: string;
  disabled?: boolean;
  placeholder?: string;
  onPick: (item: StockItem) => void;
}> = ({ row, col, selectedName, disabled, placeholder = "اسم الصنف...", onPick }) => {
  const [query, setQuery] = useState<string | null>(null);
  const [results, setResults] = useState<StockItem[]>([]);
  const [resultsFor, setResultsFor] = useState("");
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const open = query !== null && query.trim() !== "";

  useEffect(() => {
    const q = (query ?? "").trim();
    if (!q) {
      setResults([]);
      setResultsFor("");
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      inventoryService
        .items({ search: q, is_active: 1, per_page: 15 })
        .then((r) => {
          if (cancelled) return;
          const low = q.toLowerCase();
          const rows = r.data.filter((i) => i.is_stored);
          rows.sort((a, b) => Number(b.code.toLowerCase() === low || b.barcode === q) - Number(a.code.toLowerCase() === low || a.barcode === q));
          setResults(rows);
          setResultsFor(q);
          setActive(0);
        })
        .catch(() => !cancelled && setResults([]))
        .finally(() => !cancelled && setLoading(false));
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const pick = (item: StockItem | undefined) => {
    if (!item) return;
    setQuery(null);
    setResults([]);
    onPick(item);
  };

  return (
    <div className="relative">
      <input
        className={gridInput}
        value={query ?? selectedName}
        disabled={disabled}
        placeholder={placeholder}
        data-row={row}
        data-col={col}
        role="combobox"
        aria-label={`اسم الصنف — السطر ${row + 1}`}
        aria-expanded={open && results.length > 0}
        aria-autocomplete="list"
        onChange={(e) => setQuery(e.target.value)}
        onBlur={() => setTimeout(() => setQuery(null), 150)}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            e.stopPropagation();
            setActive((a) => (e.key === "ArrowDown" ? Math.min(a + 1, results.length - 1) : Math.max(a - 1, 0)));
          } else if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            const q = (query ?? "").trim();
            if (resultsFor === q && !loading) pick(results[active]);
            else lookupItemByCode(q).then((item) => item && pick(item));
          } else if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            setQuery(null);
          }
        }}
      />
      {open && (
        <div
          role="listbox"
          className="absolute z-30 top-full mt-1 right-0 w-[min(420px,80vw)] max-h-64 overflow-y-auto custom-scrollbar bg-slate-900 border border-white/10 rounded-xl shadow-2xl divide-y divide-white/5"
        >
          {loading && results.length === 0 ? (
            <div className="p-3 flex items-center gap-2 text-xs text-slate-500 font-bold">
              <Loader2 size={14} className="animate-spin" /> جارٍ البحث...
            </div>
          ) : results.length === 0 ? (
            <p className="p-3 text-xs text-slate-500 font-bold">لا توجد أصناف مطابقة</p>
          ) : (
            results.map((item, i) => (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={i === active}
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(item)}
                className={`w-full text-right p-2.5 text-sm flex items-center justify-between gap-2 ${i === active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5"}`}
              >
                <span className="font-bold truncate">{item.name}</span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-slate-500">{item.base_unit?.name}</span>
                  <bdi className="text-xs text-slate-500 font-mono">{item.code}</bdi>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

/**
 * رقم الصنف أو الباركود: Enter يبحث بالتطابق التام ويختار الصنف (ثم ينتقل الجدول للخانة التالية).
 * إن لم يوجد يبقى التركيز والنص مع رسالة داخل السطر.
 */
export const ItemCodeCell: React.FC<{
  row: number;
  col: number;
  code: string;
  disabled?: boolean;
  onPick: (item: StockItem) => void;
  onNotFound: (code: string) => void;
}> = ({ row, col, code, disabled, onPick, onNotFound }) => {
  const [value, setValue] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="relative">
      <input
        className={`${gridInput} font-mono`}
        dir="ltr"
        value={value ?? code}
        disabled={disabled}
        placeholder="رقم/باركود"
        data-row={row}
        data-col={col}
        aria-label={`رقم الصنف — السطر ${row + 1}`}
        aria-busy={busy}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => setValue(null)}
        onKeyDown={(e) => {
          const typed = (value ?? "").trim();
          if (e.key !== "Enter" || e.shiftKey || value === null || typed === "" || typed === code) return;
          // رقم جديد: نبحث قبل أن يتحرك الجدول.
          e.preventDefault();
          e.stopPropagation();
          setBusy(true);
          lookupItemByCode(typed)
            .then((item) => {
              if (item) {
                setValue(null);
                onPick(item);
              } else onNotFound(typed);
            })
            .catch(() => onNotFound(typed))
            .finally(() => setBusy(false));
        }}
      />
      {busy && <Loader2 size={12} className="absolute left-1.5 top-1/2 -translate-y-1/2 animate-spin text-slate-500" />}
    </div>
  );
};
