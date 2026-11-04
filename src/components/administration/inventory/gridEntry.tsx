/**
 * gridEntry.tsx — أدوات الإدخال السريع بجدول، مشتركة بين نموذج الصرف/التحويل وفاتورة المشتريات:
 *   - ItemSearch: خانة بحث الصنف (رقمه أو اسمه أو الباركود) بأسهم واختيار بـ Enter.
 *   - useGridNavigation: Enter للخانة التالية (وفي آخر خانة لخانة البحث في السطر الفارغ)، ↑/↓ بين الصفوف في
 *     خانات الكتابة (القوائم المنسدلة تحتفظ بأسهمها)، Ctrl+Delete يحذف السطر.
 * كل خانة في الجدول تحمل data-key (مفتاح السطر) و data-col (اسم العمود).
 */

import React, { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { inventoryService, type StockItem } from "../../../services/inventoryService";

export const cellInput =
  "w-full px-2 py-1.5 bg-slate-800 border border-white/10 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-red-600 placeholder:text-slate-600 disabled:opacity-50";

export const ItemSearch: React.FC<{
  disabled: boolean;
  disabledPlaceholder?: string;
  excludeIds: number[];
  onPick: (item: StockItem) => void;
  inputRef?: React.Ref<HTMLInputElement>;
}> = ({ disabled, disabledPlaceholder = "اختر المخزن أولاً", excludeIds, onPick, inputRef }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const q = query.trim();
    if (!open || q === "") {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      inventoryService
        .items({ search: q, is_active: 1, per_page: 15 })
        .then((r) => {
          if (cancelled) return;
          const rows = r.data.filter((i) => i.is_stored && !excludeIds.includes(i.id));
          // تطابق الكود أو الباركود تماماً يأتي أولاً (إدخال بالماسح أو برقم الصنف).
          rows.sort((a, b) => Number(b.code === q || b.barcode === q) - Number(a.code === q || a.barcode === q));
          setResults(rows);
          setActive(0);
        })
        .catch(() => !cancelled && setResults([]))
        .finally(() => !cancelled && setLoading(false));
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // excludeIds يتغير مرجعه كل رسم؛ البحث يتبع النص فقط.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open]);

  const pick = (item: StockItem | undefined) => {
    if (!item) return;
    onPick(item);
    setQuery("");
    setResults([]);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        className={cellInput}
        value={query}
        disabled={disabled}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        data-col="search"
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && results.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            setActive((a) => Math.min(a + 1, results.length - 1));
          } else if (e.key === "ArrowUp" && results.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            pick(results[active]);
          } else if (e.key === "Escape" && query) {
            e.stopPropagation();
            setQuery("");
          }
        }}
        placeholder={disabled ? disabledPlaceholder : "رقم الصنف أو اسمه أو الباركود..."}
        aria-label="بحث عن صنف"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-autocomplete="list"
      />
      {open && query.trim() !== "" && (
        <div role="listbox" className="absolute z-30 mt-1 w-[min(420px,80vw)] max-h-64 overflow-y-auto custom-scrollbar bg-slate-900 border border-white/10 rounded-xl shadow-2xl divide-y divide-white/5">
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

export type FocusTarget = { key: number; col: string } | "search";

/**
 * تنقّل لوحة المفاتيح في جدول الأسطر. rows بترتيب العرض؛ filled = سطر له صنف (السطر الفارغ الأخير للبحث).
 * cols ترتيب خانات السطر لـ Enter؛ upCol الخانة التي يعود إليها ↑ من خانة البحث.
 */
export function useGridNavigation({
  rows,
  cols,
  upCol,
  onRemove,
}: {
  rows: { key: number; filled: boolean }[];
  cols: readonly string[];
  upCol: string;
  onRemove: (key: number) => void;
}) {
  const tableRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [focusReq, setFocusReq] = useState<FocusTarget | null>(null);

  // التركيز بعد الرسم (السطر الجديد أو التالي للمحذوف لا يوجد قبل إعادة الرسم).
  useEffect(() => {
    if (!focusReq) return;
    if (focusReq === "search") searchRef.current?.focus();
    else {
      const el = tableRef.current?.querySelector<HTMLInputElement>(`[data-key="${focusReq.key}"][data-col="${focusReq.col}"]`);
      el?.focus();
      if (el?.tagName === "INPUT") el.select();
    }
    setFocusReq(null);
  }, [focusReq, rows]);

  /** يعيد true إن وُجدت الخانة وكانت مفعّلة. */
  const focusCell = (key: number, col: string) => {
    const el = tableRef.current?.querySelector<HTMLInputElement>(`[data-key="${key}"][data-col="${col}"]`);
    if (!el || el.disabled) return false;
    el.focus();
    if (el.tagName === "INPUT") el.select();
    return true;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const t = e.target as HTMLElement;
    const col = t.dataset.col;
    if (!col) return;
    if (col === "search") {
      // من خانة البحث (بلا نتائج مفتوحة) ↑ يعود لآخر سطر.
      const last = [...rows].reverse().find((r) => r.filled);
      if (e.key === "ArrowUp" && last) {
        e.preventDefault();
        focusCell(last.key, upCol);
      }
      return;
    }
    const key = Number(t.dataset.key);
    const idx = rows.findIndex((r) => r.key === key);
    if (e.key === "Enter") {
      e.preventDefault();
      const from = cols.indexOf(col);
      for (let j = from + 1; j < cols.length; j++) if (focusCell(key, cols[j])) return;
      setFocusReq("search");
    } else if ((e.key === "ArrowDown" || e.key === "ArrowUp") && t.tagName === "INPUT" && (t as HTMLInputElement).type !== "date") {
      e.preventDefault();
      const next = rows[idx + (e.key === "ArrowDown" ? 1 : -1)];
      if (!next) return;
      if (next.filled) focusCell(next.key, col);
      else setFocusReq("search");
    } else if (e.key === "Delete" && e.ctrlKey) {
      e.preventDefault();
      const next = rows.slice(idx + 1).find((r) => r.filled) ?? rows.slice(0, idx).reverse().find((r) => r.filled);
      onRemove(key);
      setFocusReq(next ? { key: next.key, col } : "search");
    }
  };

  return { tableRef, searchRef, onKeyDown, requestFocus: setFocusReq };
}
