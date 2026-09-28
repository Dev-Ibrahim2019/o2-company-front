import { Fragment, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import type { CrmViewMode } from "./useCrmViewMode";

/**
 * Where a column goes when the list is shown as cards:
 *  - "title":    the card heading (first one wins the top-start slot)
 *  - "subtitle": small line under the title
 *  - "badge":    pills beside the title (status, priority…)
 *  - "field":    a label/value pair in the card body (default)
 *  - "wide":     a label/value pair spanning the whole card body width
 *  - "actions":  buttons in the card footer
 *  - "none":     table only — already said elsewhere on the card
 */
export type CrmCardRole = "title" | "subtitle" | "badge" | "field" | "wide" | "actions" | "none";

export interface CrmColumn<T> {
  key: string;
  /** Table header, and the card field's label. Empty for an actions column. */
  label: string;
  render: (row: T) => ReactNode;
  card?: CrmCardRole;
  /** Extra classes for this column's <td> (e.g. dir="ltr" content, widths). */
  cellClassName?: string;
  /** Hide the column in table mode (card-only information). */
  tableHidden?: boolean;
  /**
   * Let this column's cells wrap in table mode. Off by default: cells stay on
   * one line and a wide table scrolls inside its own box, rather than
   * breaking codes like ORD-20260926-0001 or "منذ 40 س 47 د" over two lines.
   * Turn on for free text (notes, descriptions) — pair with a max width.
   */
  wrap?: boolean;
}

// A click or key press that started on a control inside the row/card
// (button, link, select…) is that control's business, not "open this row".
// Also guards keystrokes typed into portalled dialogs a row owns — React
// bubbles those through the React tree, so without this a Space typed in a
// dialog opened from a row would fire the row's own activation.
const fromControl = (e: MouseEvent | KeyboardEvent) =>
  (e.target as HTMLElement).closest("button, select, a, input, textarea, label") !== null;

function activationProps(onActivate?: () => void) {
  if (!onActivate) return {};
  return {
    role: "button" as const,
    tabIndex: 0,
    onClick: (e: MouseEvent) => {
      if (!fromControl(e)) onActivate();
    },
    onKeyDown: (e: KeyboardEvent) => {
      if (fromControl(e)) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onActivate();
      }
    },
  };
}

/**
 * One list, two presentations. Same rows, same column definitions, same
 * click behaviour — `mode` only decides whether they are laid out as a table
 * (scrolling sideways inside its own box, never the page) or as a grid of
 * cards (1 column on phones, 2 on tablets, 3 on wide screens).
 */
export function CrmDataView<T>({
  rows,
  columns,
  rowKey,
  mode,
  onRowClick,
  minTableWidth = 720,
  rowClassName,
  renderAfterRow,
  bordered = true,
  cardGridClassName = "grid gap-3 p-3 sm:grid-cols-2 2xl:grid-cols-3",
}: {
  rows: T[];
  columns: CrmColumn<T>[];
  rowKey: (row: T, index: number) => string | number;
  mode: CrmViewMode;
  onRowClick?: (row: T) => void;
  /** Width below which the table scrolls inside its box instead of squeezing. */
  minTableWidth?: number;
  rowClassName?: (row: T) => string;
  /** Extra content under a row (an expanded detail panel). Spans the table / sits in the card. */
  renderAfterRow?: (row: T) => ReactNode;
  /** Draw the outer border + rounded box (off when the parent already frames it). */
  bordered?: boolean;
  cardGridClassName?: string;
}) {
  const frame = bordered ? "rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)]" : "";

  if (mode === "cards") {
    return (
      <div className={`crmx-root ${frame}`}>
        <ul className={cardGridClassName}>
          {rows.map((row, i) => (
            <CrmDataCard
              key={rowKey(row, i)}
              row={row}
              columns={columns}
              onActivate={onRowClick ? () => onRowClick(row) : undefined}
              extraClassName={rowClassName?.(row) ?? ""}
              after={renderAfterRow?.(row)}
            />
          ))}
        </ul>
      </div>
    );
  }

  const tableColumns = columns.filter((c) => !c.tableHidden);

  return (
    <div className={`crmx-root crmx-scrollbar overflow-x-auto ${frame}`}>
      <table className="w-full border-collapse text-right" style={{ minWidth: minTableWidth }}>
        <thead>
          <tr className="border-b border-[var(--crmx-border)] bg-[#FAFBFC]">
            {tableColumns.map((c) => (
              <th key={c.key} scope="col" className="whitespace-nowrap px-4 py-3.5 text-[13px] font-bold text-[var(--crmx-text-secondary)]">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const after = renderAfterRow?.(row);
            return (
              <Fragment key={rowKey(row, i)}>
                <tr
                  {...activationProps(onRowClick ? () => onRowClick(row) : undefined)}
                  className={`crmx-table-row border-b border-[var(--crmx-border)] last:border-0 ${
                    onRowClick ? "cursor-pointer transition-colors focus:bg-[var(--crmx-neutral-soft)]/70 focus:outline-none" : ""
                  } ${rowClassName?.(row) ?? ""}`}
                >
                  {tableColumns.map((c) => (
                    <td key={c.key} className={`px-4 py-3.5 align-middle text-[14px] text-[var(--crmx-text)] ${c.wrap ? "" : "whitespace-nowrap"} ${c.cellClassName ?? ""}`}>
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
                {after && (
                  <tr className="border-b border-[var(--crmx-border)] last:border-0">
                    <td colSpan={tableColumns.length} className="p-0">{after}</td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CrmDataCard<T>({
  row,
  columns,
  onActivate,
  extraClassName,
  after,
}: {
  row: T;
  columns: CrmColumn<T>[];
  onActivate?: () => void;
  extraClassName: string;
  after?: ReactNode;
}) {
  const by = (role: CrmCardRole) => columns.filter((c) => (c.card ?? "field") === role);
  const title = by("title");
  const subtitle = by("subtitle");
  const badges = by("badge");
  const fields = columns.filter((c) => c.card === undefined || c.card === "field" || c.card === "wide");
  const actions = by("actions");

  return (
    <li
      {...activationProps(onActivate)}
      className={`flex min-w-0 flex-col gap-3 rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-4 ${
        onActivate ? "cursor-pointer transition hover:border-[var(--crmx-primary)]/40 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crmx-primary)]/30" : ""
      } ${extraClassName}`}
    >
      {(title.length > 0 || badges.length > 0) && (
        // Badges get their own row under the title rather than sharing its
        // line: beside the title they squeezed codes like ORD-20260926-0001
        // onto three lines on a phone.
        <div className="min-w-0 space-y-2">
          {(title.length > 0 || subtitle.length > 0) && (
            <div className="min-w-0 space-y-0.5">
              {title.map((c) => (
                <div key={c.key} className="min-w-0 break-words text-[15px] font-bold text-[var(--crmx-text)]">{c.render(row)}</div>
              ))}
              {subtitle.map((c) => (
                <div key={c.key} className="min-w-0 break-words text-[12.5px] text-[var(--crmx-text-muted)]">{c.render(row)}</div>
              ))}
            </div>
          )}
          {badges.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {badges.map((c) => <div key={c.key}>{c.render(row)}</div>)}
            </div>
          )}
        </div>
      )}

      {fields.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5">
          {fields.map((c) => (
            <div key={c.key} className={`min-w-0 ${c.card === "wide" ? "col-span-2" : ""}`}>
              <dt className="text-[11.5px] font-semibold text-[var(--crmx-text-muted)]">{c.label}</dt>
              <dd className="mt-0.5 min-w-0 break-words text-[13.5px] text-[var(--crmx-text)]">{c.render(row)}</dd>
            </div>
          ))}
        </dl>
      )}

      {after}

      {actions.length > 0 && (
        <div className="mt-auto flex flex-wrap items-center justify-end gap-2 border-t border-[var(--crmx-border)] pt-3">
          {actions.map((c) => <div key={c.key}>{c.render(row)}</div>)}
        </div>
      )}
    </li>
  );
}
