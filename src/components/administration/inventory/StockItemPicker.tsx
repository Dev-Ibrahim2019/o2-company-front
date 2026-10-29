/**
 * StockItemPicker.tsx — بحث واختيار صنف مخزني (بالاسم أو الكود أو الباركود).
 * يعرض الأصناف الخاضعة للتخزين فقط، لأن غيرها لا تُسجَّل له حركات.
 */

import React, { useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { inventoryService, type StockItem } from "../../../services/inventoryService";
import { inputClass } from "./ui";

interface Props {
  value: Pick<StockItem, "id" | "name" | "code"> | null;
  onChange: (item: StockItem | null) => void;
  placeholder?: string;
  /** أصناف لا تُعرض (مثل المختارة في أسطر أخرى). */
  excludeIds?: number[];
  ariaLabel?: string;
}

export const StockItemPicker: React.FC<Props> = ({ value, onChange, placeholder = "ابحث عن صنف...", excludeIds = [], ariaLabel }) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      inventoryService
        .items({ search: query.trim() || undefined, is_active: 1, per_page: 20 })
        .then((r) => !cancelled && setResults(r.data.filter((i) => i.is_stored)))
        .catch(() => !cancelled && setResults([]))
        .finally(() => !cancelled && setLoading(false));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, open]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 px-4 py-3 bg-slate-800 border border-white/10 rounded-xl">
        <span className="text-sm font-bold text-white truncate">
          {value.name} <bdi className="text-xs text-slate-500 font-mono">{value.code}</bdi>
        </span>
        <button type="button" aria-label="تغيير الصنف" onClick={() => onChange(null)} className="text-slate-500 hover:text-white">
          <X size={16} />
        </button>
      </div>
    );
  }

  const visible = results.filter((r) => !excludeIds.includes(r.id));

  return (
    <div className="relative" ref={boxRef}>
      <input
        className={inputClass}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        role="combobox"
        aria-expanded={open}
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto custom-scrollbar bg-slate-900 border border-white/10 rounded-xl shadow-2xl divide-y divide-white/5">
          {loading ? (
            <div className="p-3 flex items-center gap-2 text-xs text-slate-500 font-bold">
              <Loader2 size={14} className="animate-spin" /> جارٍ البحث...
            </div>
          ) : visible.length === 0 ? (
            <p className="p-3 text-xs text-slate-500 font-bold">لا توجد أصناف مطابقة</p>
          ) : (
            visible.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onChange(item);
                  setOpen(false);
                  setQuery("");
                }}
                className="w-full text-right p-2.5 text-sm text-slate-300 hover:bg-white/5 flex items-center justify-between gap-2"
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
