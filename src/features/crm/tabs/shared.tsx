import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { crmApi } from "../api";
import { CrmState, getCrmError, StatusChip } from "../components";
import { date as fmtDate, money as fmtMoney, num as fmtNum } from "../format";
import type { CrmSection } from "../types";

export type Row = Record<string, unknown>;
export const unwrapRows = (value: unknown, keys: string[] = []): Row[] => {
  if (Array.isArray(value)) return value.filter(v => v && typeof v === "object") as Row[];
  if (!value || typeof value !== "object") return [];
  const record = value as Row;
  for (const key of [...keys, "items", "data"]) if (Array.isArray(record[key])) return record[key] as Row[];
  return [record];
};
export const text = (value: unknown) => value === null || value === undefined || value === "" ? "—" : String(value);
// Delegates to the single CRM formatter module so a date rendered in a
// 360 tab matches the same date rendered in the directory table.
export const date = (value: unknown) => fmtDate(value == null ? null : String(value));
export const money = (value: unknown) => fmtMoney(Number(value || 0));
export const num = (value: unknown) => fmtNum(value == null ? null : Number(value));

export function useCrmSection(section: CrmSection) {
  const { customerId = "" } = useParams();
  const [data, setData] = useState<unknown>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status?: number; message: string }>();
  const load = useCallback(async () => { setLoading(true); setError(undefined); try { setData(await crmApi.section(customerId, section)); } catch (e) { setError(getCrmError(e)); } finally { setLoading(false); } }, [customerId, section]);
  useEffect(() => { void load(); }, [load]);
  return { data, loading, error, load };
}
export function SectionFrame({
  state,
  children,
  empty = "لا توجد بيانات في هذا القسم",
  hideOnForbidden = false,
}: {
  state: ReturnType<typeof useCrmSection>;
  children: (data: unknown) => React.ReactNode;
  empty?: string;
  /**
   * Render nothing at all on a 403 instead of the "you lack permission"
   * state. For sections whose very existence is sensitive: telling an
   * unauthorised viewer that financial data exists is itself a disclosure.
   * Sections where a 403 is merely inconvenient keep the explanatory state.
   */
  hideOnForbidden?: boolean;
}) {
  if (state.loading) return <CrmState kind="loading" title="جارٍ تحميل القسم" />;
  if (state.error) {
    if (state.error.status === 403 && hideOnForbidden) return null;
    return <CrmState kind={state.error.status === 403 ? "forbidden" : "error"} title={state.error.message} retry={state.load} />;
  }
  if (state.data == null) return <CrmState kind="empty" title={empty} />;
  return <>{children(state.data)}</>;
}
export function DomainTable({ columns, rows, empty, onRowClick }: {
  columns: { key: string; label: string; render?: (v: unknown, row: Row) => React.ReactNode }[];
  rows: Row[];
  empty: string;
  /**
   * Opt-in row activation. Omitted by every tab that has nothing to open, so
   * those tables keep their plain, non-interactive rows.
   */
  onRowClick?: (row: Row) => void;
}) {
  if (!rows.length) return <CrmState kind="empty" title={empty} />;
  return (
    <div className="crmx-root crmx-scrollbar overflow-x-auto rounded-2xl border border-[var(--crmx-border)]">
      <table className="w-full min-w-[560px] border-collapse text-right">
        <thead>
          <tr className="border-b border-[var(--crmx-border)] bg-[#FAFBFC]">
            {columns.map((c) => (
              <th key={c.key} className="whitespace-nowrap px-4 py-3 text-[12px] font-bold text-[var(--crmx-text-secondary)]">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={String(row.id ?? i)}
              onClick={onRowClick ? (e) => {
                // Rows carry their own controls (status selects, toggle
                // buttons). A click that started on one of those is that
                // control's business, not a request to open the row.
                if ((e.target as HTMLElement).closest("button, select, a, input, label")) return;
                onRowClick(row);
              } : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              role={onRowClick ? "button" : undefined}
              onKeyDown={onRowClick ? (e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onRowClick(row); }
              } : undefined}
              className={`crmx-table-row border-b border-[var(--crmx-border)] last:border-0 ${
                onRowClick ? "cursor-pointer transition-colors hover:bg-[var(--crmx-neutral-soft)]/70 focus:bg-[var(--crmx-neutral-soft)]/70 focus:outline-none" : ""
              }`}
            >
              {columns.map((c) => (
                <td key={c.key} className="whitespace-nowrap px-4 py-3 text-[13px] text-[var(--crmx-text)]">
                  {c.render ? c.render(row[c.key], row) : text(row[c.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export { StatusChip };
