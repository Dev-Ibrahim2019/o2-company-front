import { useCallback, useEffect, useRef, useState } from "react";
import { Search, X, Loader2, Package, ChevronLeft } from "lucide-react";
import api from "../../api/axios";

export interface PickedItem {
  id: number;
  name: string;
  name_ar?: string;
  code: string;
  price: number;
  stock?: number;
}

interface Props {
  open: boolean;
  initialQuery: string;
  onSelect: (item: PickedItem) => void;
  onClose: () => void;
}

export const ItemPickerModal = ({ open, initialQuery, onSelect, onClose }: Props) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<PickedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery(initialQuery);
      setResults([]);
      setHighlightedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open, initialQuery]);

  const search = useCallback(async (q: string) => {
    if (!q || q.length < 1) { setResults([]); return; }
    setLoading(true);
    try {
      const { data } = await api.get("/items", { params: { search: q } });
      const raw = data?.data?.data ?? data?.data ?? [];
      setResults(
        raw.map((it: any) => ({
          id: it.id,
          name: it.name || it.name_ar || "",
          name_ar: it.name_ar,
          code: it.code || "",
          price: Number(it.price) || 0,
          stock: it.stock_balance ?? it.quantity ?? undefined,
        }))
      );
      setHighlightedIdx(0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => search(query), 200);
    return () => clearTimeout(t);
  }, [query, open, search]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setHighlightedIdx((prev) => Math.min(prev + 1, results.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setHighlightedIdx((prev) => Math.max(prev - 1, 0)); return; }
      if (e.key === "Enter" && results[highlightedIdx]) {
        e.preventDefault();
        onSelect(results[highlightedIdx]);
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, results, highlightedIdx, onSelect]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!listRef.current || results.length === 0) return;
    const el = listRef.current.querySelector(`[data-idx="${highlightedIdx}"]`) as HTMLElement;
    el?.scrollIntoView?.({ block: "nearest" });
  }, [highlightedIdx, results.length]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--o2-surface)] border border-[var(--o2-border)] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col mx-4 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--o2-border)]">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[var(--o2-brand-text)]" />
            <h2 className="text-base font-bold text-[var(--o2-text)]">اختيار صنف</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--o2-border)] transition-colors">
            <X className="w-5 h-5 text-[var(--o2-muted)]" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-[var(--o2-border)]">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[var(--o2-muted)]" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بحث بالاسم أو الكود..."
              className="w-full pr-10 pl-4 py-2.5 bg-[var(--o2-surface-raised)] border border-[var(--o2-border)] rounded-xl text-sm text-[var(--o2-text)] placeholder:text-[var(--o2-muted)] focus:ring-2 focus:ring-[var(--o2-brand)] focus:border-[var(--o2-brand)] outline-none transition"
            />
          </div>
        </div>

        {/* Results */}
        <div ref={listRef} className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--o2-brand-text)]" />
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-16 text-[var(--o2-muted)] text-sm">
              {query.length < 1 ? "اكتب للبحث..." : "لا توجد نتائج"}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[var(--o2-surface-raised)] z-10 border-b border-[var(--o2-border)]">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--o2-muted)]">رقم الصنف</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--o2-muted)]">الاسم</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--o2-muted)]">السعر</th>
                  {results[0]?.stock !== undefined && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--o2-muted)]">الرصيد</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--o2-border)]">
                {results.map((item, idx) => (
                  <tr
                    key={item.id}
                    data-idx={idx}
                    onClick={() => { onSelect(item); onClose(); }}
                    className={`cursor-pointer transition-colors ${
                      highlightedIdx === idx
                        ? "bg-[var(--o2-brand-soft)] border-r-2 border-r-[var(--o2-brand)]"
                        : "hover:bg-[var(--o2-border)]"
                    }`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-[var(--o2-muted)]">{item.code}</td>
                    <td className="px-4 py-3 font-medium text-[var(--o2-text)]">{item.name}</td>
                    <td className="px-4 py-3 text-left font-bold text-[var(--o2-brand-text)] ltr" dir="ltr">
                      {Number(item.price || 0).toFixed(2)}
                    </td>
                    {item.stock !== undefined && (
                      <td className={`px-4 py-3 text-left text-xs ltr ${
                        item.stock > 0 ? "text-green-500" : item.stock === 0 ? "text-red-500" : "text-[var(--o2-muted)]"
                      }`} dir="ltr">
                        {item.stock}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-2.5 border-t border-[var(--o2-border)] text-xs text-[var(--o2-muted)]">
          <span>{results.length > 0 ? `${results.length} نتيجة` : ""}</span>
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1"><ChevronLeft className="w-3 h-3" /> <ChevronLeft className="w-3 h-3 -mr-2" /> للتنقل</span>
            <span>Enter للاختيار</span>
            <span>ESC للإغلاق</span>
          </span>
        </div>
      </div>
    </div>
  );
};
