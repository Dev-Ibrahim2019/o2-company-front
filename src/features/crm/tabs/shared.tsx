import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { crmApi } from "../api";
import { CrmState, getCrmError, StatusChip } from "../components";
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
export const date = (value: unknown) => {
  if (!value) return "—"; const parsed = new Date(String(value));
  return Number.isNaN(parsed.valueOf()) ? text(value) : new Intl.DateTimeFormat("ar-PS", { dateStyle: "medium" }).format(parsed);
};
export const money = (value: unknown) => new Intl.NumberFormat("ar-PS", { style: "currency", currency: "ILS" }).format(Number(value || 0));

export function useCrmSection(section: CrmSection) {
  const { customerId = "" } = useParams();
  const [data, setData] = useState<unknown>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status?: number; message: string }>();
  const load = useCallback(async () => { setLoading(true); setError(undefined); try { setData(await crmApi.section(customerId, section)); } catch (e) { setError(getCrmError(e)); } finally { setLoading(false); } }, [customerId, section]);
  useEffect(() => { void load(); }, [load]);
  return { data, loading, error, load };
}
export function SectionFrame({ state, children, empty = "لا توجد بيانات في هذا القسم" }: { state: ReturnType<typeof useCrmSection>; children: (data: unknown) => React.ReactNode; empty?: string }) {
  if (state.loading) return <CrmState kind="loading" title="جارٍ تحميل القسم" />;
  if (state.error) return <CrmState kind={state.error.status === 403 ? "forbidden" : "error"} title={state.error.message} retry={state.load} />;
  if (state.data == null) return <CrmState kind="empty" title={empty} />;
  return <>{children(state.data)}</>;
}
export function DomainTable({ columns, rows, empty }: { columns: { key: string; label: string; render?: (v: unknown, row: Row) => React.ReactNode }[]; rows: Row[]; empty: string }) {
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
            <tr key={String(row.id ?? i)} className="crmx-table-row border-b border-[var(--crmx-border)] last:border-0">
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
