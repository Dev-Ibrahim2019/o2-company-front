import { ChevronLeft, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { crmApi } from "./api";
import type { CrmCustomer } from "./types";

const inputCls =
  "h-11 w-full rounded-xl border border-[var(--crmx-border)] bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none focus:border-[var(--crmx-primary)] focus:ring-2 focus:ring-[var(--crmx-primary)]/10";
const labelCls = "mb-1 block text-[13px] font-semibold text-[var(--crmx-text-secondary)]";

/**
 * Search-and-pick one customer.
 *
 * Extracted from ComplaintFormDrawer, where it was a private component, so the
 * group member-picker consumes the same thing rather than a second copy.
 *
 * Reads GET /crm/customers — the same branch-scoped directory search the
 * customers screen runs — not the Call Center's phone-search endpoint, which
 * lives under a different permission and would drag call-centre context into
 * a CRM screen.
 */
export function CustomerPicker({
  label = "ابحث عن العميل",
  placeholder = "الاسم أو رقم الجوال...",
  autoFocus = true,
  excludeIds = [],
  onPick,
}: {
  label?: string;
  placeholder?: string;
  autoFocus?: boolean;
  /** Customers already chosen elsewhere — filtered out of the results. */
  excludeIds?: Array<string | number>;
  onPick: (customer: CrmCustomer) => void;
}) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<CrmCustomer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const query = term.trim();
    if (query.length < 2) { setResults([]); return; }
    // Debounced so typing a phone number is one request, not eleven.
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ search: query, per_page: "8" });
        setResults((await crmApi.customers(params)).items);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [term]);

  const excluded = new Set(excludeIds.map(String));
  const visible = results.filter((c) => !excluded.has(String(c.id)));

  return (
    <div className="space-y-3">
      <div>
        <label className={labelCls}>{label}</label>
        <div className="relative">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-[var(--crmx-text-muted)]" />
          <input
            className={`${inputCls} ps-9`}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={placeholder}
            autoFocus={autoFocus}
          />
        </div>
      </div>

      {loading && <p className="text-[13px] text-[var(--crmx-text-muted)]">جارٍ البحث…</p>}

      {!loading && term.trim().length >= 2 && visible.length === 0 && (
        <p className="text-[13px] text-[var(--crmx-text-muted)]">لا يوجد عميل مطابق.</p>
      )}

      <ul className="space-y-2">
        {visible.map((c) => (
          <li key={String(c.id)}>
            <button
              onClick={() => onPick(c)}
              className="flex w-full items-center justify-between rounded-xl border border-[var(--crmx-border)] px-3 py-2.5 text-start transition hover:bg-[var(--crmx-neutral-soft)]"
            >
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-bold text-[var(--crmx-text)]">{c.name}</span>
                <span className="block text-[12px] text-[var(--crmx-text-muted)]">
                  {c.primary_phone ?? c.phone ?? c.mobile ?? "—"}{c.code ? ` · ${c.code}` : ""}
                </span>
              </span>
              <ChevronLeft className="h-4 w-4 shrink-0 text-[var(--crmx-text-muted)]" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
