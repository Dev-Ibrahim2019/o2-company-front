import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { crmApi } from "../api";
import { CrmState, getCrmError, StatusChip } from "../components";
import { date as fmtDate, money as fmtMoney, num as fmtNum } from "../format";
import type { CrmSection } from "../types";
import { CrmDataView, CrmViewToggle, useCrmViewMode, type CrmCardRole, type CrmColumn, type CrmViewMode } from "../customers-ui";

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
export type DomainColumn = {
  key: string;
  label: string;
  render?: (v: unknown, row: Row) => React.ReactNode;
  /** Card placement (see CrmCardRole). Defaults: first column = title, rest = fields. */
  card?: CrmCardRole;
};

export function DomainTable({ columns, rows, empty, onRowClick, viewKey = "profile-tab", fixedMode, minTableWidth = 560 }: {
  columns: DomainColumn[];
  rows: Row[];
  empty: string;
  /**
   * Opt-in row activation. Omitted by every tab that has nothing to open, so
   * those tables keep their plain, non-interactive rows.
   */
  onRowClick?: (row: Row) => void;
  /** Remembers this list's table/cards choice separately from other lists. */
  viewKey?: string;
  /** Pin one presentation and hide the switch (e.g. a 2-column summary that fits any width). */
  fixedMode?: CrmViewMode;
  minTableWidth?: number;
}) {
  const [chosen, setMode] = useCrmViewMode(viewKey);
  const mode = fixedMode ?? chosen;
  if (!rows.length) return <CrmState kind="empty" title={empty} />;

  const dataColumns: CrmColumn<Row>[] = columns.map((c, i) => ({
    key: c.key,
    label: c.label,
    card: c.card ?? (i === 0 ? "title" : "field"),
    cellClassName: "text-[13px]",
    render: (row) => (c.render ? c.render(row[c.key], row) : text(row[c.key])),
  }));

  return (
    <div className="space-y-2">
      {!fixedMode && (
        <div className="flex justify-end">
          <CrmViewToggle mode={mode} onChange={setMode} />
        </div>
      )}
      <CrmDataView
        rows={rows}
        columns={dataColumns}
        rowKey={(row, i) => String(row.id ?? i)}
        mode={mode}
        onRowClick={onRowClick}
        minTableWidth={minTableWidth}
      />
    </div>
  );
}
export { StatusChip };
