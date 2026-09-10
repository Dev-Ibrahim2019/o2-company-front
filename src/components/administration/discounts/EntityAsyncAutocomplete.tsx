import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, Search, X } from "lucide-react";
import { discountService, type EntityRecord } from "../../../services/discountService";

interface EntityAsyncAutocompleteProps {
  type: string;
  value?: EntityRecord | null;
  valueId?: number | "";
  onChange: (entity: EntityRecord | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

const labelFor = (entity: EntityRecord) =>
  entity.employee_number ||
  entity.business_code ||
  entity.customer_code ||
  entity.supplier_code ||
  String(entity.id);

export const EntityAsyncAutocomplete: React.FC<EntityAsyncAutocompleteProps> = ({
  type,
  value,
  valueId,
  onChange,
  placeholder = "ابحث بالكود أو الاسم",
  disabled = false,
}) => {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<EntityRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const requestId = useRef(0);

  const selectedLabel = useMemo(() => {
    if (!value) return "";
    return `${labelFor(value)} - ${value.name_ar || value.name}`;
  }, [value]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setItems([]);
      setError(null);
      setHighlightedIndex(0);
      return;
    }

    const current = ++requestId.current;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await discountService.getEntities({
          type,
          search: query.trim(),
          page: 1,
          per_page: 12,
        });

        if (requestId.current === current) {
          setItems(response.data ?? []);
          setHighlightedIndex(0);
        }
      } catch (err: any) {
        if (requestId.current === current) {
          setItems([]);
          setError(err?.response?.data?.message || "تعذر تحميل النتائج");
        }
      } finally {
        if (requestId.current === current) {
          setLoading(false);
        }
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query, type]);

  return (
    <div className="relative">
      {value ? (
        <div className="flex items-center justify-between gap-2 bg-slate-800 border border-emerald-500/30 rounded-xl px-3 py-2 text-sm">
          <div className="min-w-0">
            <div className="font-bold text-white truncate">{selectedLabel}</div>
            <div className="text-xs text-white/45 truncate">
              ID {value.id}
              {value.department || value.department_name ? ` • ${value.department || value.department_name}` : ""}
              {value.status ? ` • ${String(value.status)}` : ""}
              {value.branch ? ` • ${value.branch}` : ""}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setQuery("");
              setOpen(false);
            }}
            className="p-1 text-white/45 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35" />
          <input
            value={query}
            disabled={disabled}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(event) => {
              if (!open || items.length === 0) return;
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setHighlightedIndex((current) => Math.min(current + 1, items.length - 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setHighlightedIndex((current) => Math.max(current - 1, 0));
              } else if (event.key === "Enter") {
                event.preventDefault();
                const selected = items[highlightedIndex];
                if (selected) {
                  onChange(selected);
                  setQuery("");
                  setOpen(false);
                }
              } else if (event.key === "Escape") {
                setOpen(false);
              }
            }}
            placeholder={valueId ? `ID ${valueId}` : placeholder}
            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2 pr-9 text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 disabled:opacity-50"
          />
          {loading && <Loader2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400 animate-spin" />}
        </div>
      )}

      {open && !value && query.trim().length >= 2 && (
        <div className="absolute z-50 mt-2 w-full max-h-72 overflow-auto rounded-xl border border-white/10 bg-slate-900 shadow-2xl">
          {error && <div className="px-3 py-3 text-sm text-red-300">{error}</div>}
          {!error && !loading && items.length === 0 && (
            <div className="px-3 py-3 text-sm text-white/45">لا توجد نتائج مطابقة</div>
          )}
          {items.map((entity, index) => (
            <button
              key={`${type}-${entity.id}`}
              type="button"
              onClick={() => {
                onChange(entity);
                setQuery("");
                setOpen(false);
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`w-full text-right px-3 py-2 border-b border-white/5 last:border-b-0 ${
                highlightedIndex === index ? "bg-white/10" : "hover:bg-white/5"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-bold text-white truncate">
                    {labelFor(entity)} - {entity.name_ar || entity.name}
                  </div>
                  <div className="text-xs text-white/45 truncate">
                    {entity.department || entity.department_name || "بدون قسم"}
                    {entity.status ? ` • ${String(entity.status)}` : ""}
                    {entity.branch ? ` • ${entity.branch}` : ""}
                  </div>
                </div>
                <Check size={14} className="text-emerald-400 shrink-0" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
