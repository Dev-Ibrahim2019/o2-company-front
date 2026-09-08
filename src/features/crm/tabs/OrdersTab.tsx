import { ChevronDown, Star } from "lucide-react";
import { Fragment, useCallback, useState } from "react";
import { CrmState } from "../components";
import { CrmOrderExpandedPanel, CrmStatusBadge, CrmYesNoBadge } from "../customers-ui";
import { CRM_ORDER_SOURCE_LABELS } from "../customers-ui/sourceOptions";
import { CustomerOrderQuickView } from "./CustomerOrderQuickView";
import { date, money, SectionFrame, text, unwrapRows, useCrmSection, type Row } from "./shared";

/**
 * Five-star rating, matching the mockup's "التقييم" column.
 *
 * The value is the mean of order_feedback's three 1–5 scores, so it is
 * fractional (4.3, not 4) — rendered by filling round(value) stars rather
 * than inventing half-star glyphs the design doesn't use. The exact number
 * stays available in the title attribute.
 */
function Rating({ value }: { value?: number | null }) {
  if (value == null) return <span className="text-[13px] text-[var(--crmx-text-muted)]">—</span>;
  const filled = Math.round(value);
  return (
    <span className="flex items-center gap-0.5" title={`${value} / 5`} dir="ltr">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i <= filled ? "fill-[var(--crmx-gold)] text-[var(--crmx-gold)]" : "text-[var(--crmx-border)]"
          }`}
        />
      ))}
    </span>
  );
}

const TH = "px-4 py-3 text-[12px] font-bold text-[var(--crmx-text-secondary)] whitespace-nowrap";

export default function OrdersTab() {
  const state = useCrmSection("orders");
  const [openOrderId, setOpenOrderId] = useState<string | number | null>(null);

  const toggle = (id: string | number) => setOpenOrderId((cur) => (cur === id ? null : id));

  // Order Quick View — a row click opens this instead of jumping straight to
  // the full expansion below; "عرض الطلب" inside it is what calls toggle()
  // now. Scoped to this tab only, per the brief ("لا تقم بتغيير الـ global
  // Orders experience في بقية النظام") — the CRM-wide Orders screens keep
  // their own separate quick view untouched.
  const [quickView, setQuickView] = useState<{ row: Row; anchorEl: HTMLElement } | null>(null);
  const closeQuickView = useCallback(() => setQuickView(null), []);
  const openQuickView = (row: Row, anchorEl: HTMLElement) => setQuickView({ row, anchorEl });

  return (
    <div className="crmx-root">
      <SectionFrame state={state} empty="لا توجد طلبات مسجلة">
        {(data) => {
          const rows = unwrapRows(data, ["orders"]);
          if (!rows.length) return <CrmState kind="empty" title="لا توجد طلبات مسجلة" />;
          return (
            <div className="crmx-scrollbar overflow-x-auto rounded-2xl border border-[var(--crmx-border)]">
              <table className="w-full min-w-[820px] border-collapse text-right">
                <thead>
                  <tr className="border-b border-[var(--crmx-border)] bg-[#FAFBFC]">
                    <th className="w-8"></th>
                    <th className={TH}>رقم الطلب</th>
                    <th className={TH}>تاريخ الطلب</th>
                    <th className={TH}>الحالة</th>
                    <th className={TH}>الفرع / المصدر</th>
                    <th className={TH}>الإجمالي</th>
                    <th className={TH}>التقييم</th>
                    <th className={TH}>وجود مشكلة</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r: Row, i: number) => {
                    const id = r.id as string | number | undefined;
                    const isOpen = id != null && openOrderId === id;
                    const isSelected = id != null && quickView?.row.id === id;
                    const branchName = text(r.branch_name ?? (r.branch as { name?: unknown })?.name);
                    const source = r.source ? CRM_ORDER_SOURCE_LABELS[String(r.source)] || String(r.source) : null;
                    return (
                      <Fragment key={String(r.id ?? i)}>
                        {/* Opens the quick view, not the full expansion directly — "عرض
                            الطلب" inside it calls toggle() now. closest(...) guards
                            against nothing today (no interactive control lives inside
                            this row's cells) but costs nothing and matches the same
                            fix already applied to the other order tables this session.
                            isSelected uses --o2-brand-soft, not a --crmx-* colour, per
                            this task's explicit instruction — that token is one of the
                            few not redefined between the light/dark --o2-* blocks, so
                            it reads the same regardless of the app's current theme. */}
                        <tr
                          onClick={(e) => {
                            if ((e.target as HTMLElement).closest("button, select, a, input, textarea, label")) return;
                            if (id != null) openQuickView(r, e.currentTarget);
                          }}
                          tabIndex={id != null ? 0 : undefined}
                          role={id != null ? "button" : undefined}
                          onKeyDown={(e) => {
                            if ((e.target as HTMLElement).closest("button, select, a, input, textarea, label")) return;
                            if ((e.key === "Enter" || e.key === " ") && id != null) { e.preventDefault(); openQuickView(r, e.currentTarget); }
                          }}
                          className={`crmx-table-row cursor-pointer border-b border-[var(--crmx-border)] transition-colors focus:outline-none last:border-0 ${
                            isSelected ? "bg-[var(--o2-brand-soft)]" : ""
                          }`}
                        >
                          <td className="px-2 text-center">
                            <ChevronDown className={`mx-auto h-4 w-4 text-[var(--crmx-text-muted)] transition-transform ${isOpen ? "rotate-180" : ""}`} />
                          </td>
                          <td className="px-4 py-3 text-[13px] font-semibold text-[var(--crmx-text)]">{text(r.number ?? r.order_number ?? r.code)}</td>
                          <td className="px-4 py-3 text-[13px] text-[var(--crmx-text-secondary)]">{date(r.created_at)}</td>
                          <td className="px-4 py-3"><CrmStatusBadge value={String(r.status ?? "")} /></td>
                          <td className="px-4 py-3 text-[13px] text-[var(--crmx-text-secondary)]">
                            {branchName}
                            {source && <span className="text-[var(--crmx-text-muted)]"> · {source}</span>}
                          </td>
                          <td className="px-4 py-3 text-[13px] font-bold text-[var(--crmx-text)]">{money(r.total)}</td>
                          <td className="px-4 py-3"><Rating value={r.rating as number | null | undefined} /></td>
                          <td className="px-4 py-3"><CrmYesNoBadge value={Boolean(r.has_complaint)} /></td>
                        </tr>
                        {isOpen && id != null && (
                          // Neutral wrapper: the panel itself now owns the real, payment-
                          // conditional colour (green only when order.is_paid, see
                          // CrmOrderExpandedPanel.tsx) — hardcoding a colour here regardless
                          // of that would just be a second, unsynced copy of the same rule.
                          <tr className="border-b border-[var(--crmx-border)] bg-[var(--crmx-bg)] last:border-0">
                            <td colSpan={8} className="p-0">
                              <CrmOrderExpandedPanel orderId={id} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        }}
      </SectionFrame>

      <CustomerOrderQuickView
        row={quickView?.row ?? null}
        anchorEl={quickView?.anchorEl ?? null}
        onClose={closeQuickView}
        onViewOrder={(row) => {
          closeQuickView();
          const id = row.id as string | number | undefined;
          if (id != null && openOrderId !== id) toggle(id);
        }}
      />
    </div>
  );
}
