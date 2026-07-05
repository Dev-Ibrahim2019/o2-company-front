import { Search, X, User, Building2, Phone, Hash, BadgePercent } from "lucide-react";
import type { Customer } from "../../services/customerService";

interface Props {
  query: string;
  setQuery: (v: string) => void;
  results: Customer[];
  open: boolean;
  setOpen: (v: boolean) => void;
  selected: Customer | null;
  onSelect: (c: Customer) => void;
  onClear: () => void;
  wrapRef: React.Ref<HTMLDivElement>;
  symbol?: string;
}

export const CustomerSelector = ({
  query,
  setQuery,
  results,
  open,
  setOpen,
  selected,
  onSelect,
  onClear,
  wrapRef,
  symbol = "₪",
}: Props) => {
  return (
    <div className="relative" ref={wrapRef}>
      <label className="block text-xs font-semibold mb-1.5 text-[var(--o2-muted)] uppercase tracking-wide">
        إلى (العميل)
      </label>

      {selected ? (
        <div className="flex items-center justify-between bg-[var(--o2-surface-raised)] border border-[var(--o2-border)] rounded-lg px-4 py-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[var(--o2-brand-soft)] flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-[var(--o2-brand-text)]" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[var(--o2-text)] truncate">{selected.name}</span>
                <span className="text-[10px] font-mono text-[var(--o2-muted)] bg-[var(--o2-border)] px-1.5 py-0.5 rounded shrink-0">
                  #{selected.code || selected.id}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                {(selected.phone || selected.mobile) && (
                  <span className="text-xs text-[var(--o2-muted)] flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {selected.phone || selected.mobile}
                  </span>
                )}
                {selected.tax_number && (
                  <span className="text-xs text-[var(--o2-muted)] flex items-center gap-1">
                    <BadgePercent className="w-3 h-3" />
                    {selected.tax_number}
                  </span>
                )}
                {selected.balance > 0 && (
                  <span className={`text-xs font-medium ${selected.is_over_limit ? "text-[var(--o2-brand-text)]" : "text-green-500"}`}>
                    {symbol}{Number(selected.balance || 0).toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClear}
            className="p-1.5 hover:bg-[var(--o2-border)] rounded-lg text-[var(--o2-muted)] hover:text-[var(--o2-brand-text)] transition-colors flex-shrink-0"
            title="إزالة العميل"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[var(--o2-muted)] pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => { if (results.length) setOpen(true); }}
            placeholder="ابحث باسم العميل، رقم الهاتف، أو الكود..."
            className="w-full bg-[var(--o2-surface-raised)] border border-[var(--o2-border)] rounded-lg pr-10 pl-4 py-2.5 text-sm text-[var(--o2-text)] placeholder:text-[var(--o2-muted)] focus:ring-2 focus:ring-[var(--o2-brand)] focus:border-[var(--o2-brand)] outline-none transition"
          />
          {open && results.length > 0 && (
            <div className="absolute z-30 w-full bg-[var(--o2-surface)] border border-[var(--o2-border)] rounded-xl mt-1 shadow-xl max-h-56 overflow-y-auto custom-scrollbar">
              {results.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onSelect(c)}
                  className="w-full text-right px-4 py-3 hover:bg-[var(--o2-border)] text-sm flex items-center justify-between transition-colors border-b border-[var(--o2-border)] last:border-0"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-[var(--o2-text)] truncate">{c.name}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-[var(--o2-muted)] flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {c.phone || c.mobile || "—"}
                      </span>
                      {c.city && (
                        <span className="text-xs text-[var(--o2-muted)]">{c.city}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {c.balance > 0 && (
                      <span className={`text-xs font-medium ${c.is_over_limit ? "text-[var(--o2-brand-text)]" : "text-green-500"}`}>
                        {symbol}{Number(c.balance || 0).toFixed(2)}
                      </span>
                    )}
                    <span className="text-xs text-[var(--o2-muted)] bg-[var(--o2-border)] px-2 py-0.5 rounded font-mono">
                      {c.code || `#${c.id}`}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
