import { ChevronLeft, Star } from "lucide-react";
import { useState } from "react";
import { CrmState } from "../components";
import { CrmOrderDetailsModal, CrmStatusBadge, CrmYesNoBadge } from "../customers-ui";
import { CRM_ORDER_SOURCE_LABELS } from "../customers-ui/sourceOptions";
import type { CrmOrderRow } from "../types";
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

  // Clicking a row opens the exact same order-details pop-up the CRM-wide
  // "الطلبات" screens use (CrmOrderDetailsModal) — this tab used to show its
  // own, differently-shaped quick view + inline row expansion instead, which
  // meant the same order looked like two different things depending on
  // which screen you opened it from. CrmController::orders() now returns
  // the same row shape ordersIndex()/ordersDelayed() do (see that method's
  // own doc comment), so a row from here is a real CrmOrderRow — no adapter
  // needed, just a type assertion over data verified to match.
  const [modalOrder, setModalOrder] = useState<CrmOrderRow | null>(null);

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
                    const branchName = text(r.branch_name ?? (r.branch as { name?: unknown })?.name);
                    const source = r.source ? CRM_ORDER_SOURCE_LABELS[String(r.source)] || String(r.source) : null;
                    return (
                      <tr
                        key={String(r.id ?? i)}
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest("button, select, a, input, textarea, label")) return;
                          if (id != null) setModalOrder(r as unknown as CrmOrderRow);
                        }}
                        tabIndex={id != null ? 0 : undefined}
                        role={id != null ? "button" : undefined}
                        aria-haspopup={id != null ? "dialog" : undefined}
                        onKeyDown={(e) => {
                          if ((e.target as HTMLElement).closest("button, select, a, input, textarea, label")) return;
                          if ((e.key === "Enter" || e.key === " ") && id != null) { e.preventDefault(); setModalOrder(r as unknown as CrmOrderRow); }
                        }}
                        className="crmx-table-row cursor-pointer border-b border-[var(--crmx-border)] transition-colors focus:outline-none last:border-0"
                      >
                        <td className="px-2 text-center">
                          <ChevronLeft className="mx-auto h-4 w-4 text-[var(--crmx-text-muted)]" aria-hidden />
                        </td>
                        <td className="px-4 py-3 text-[13px] font-semibold text-[var(--crmx-text)]" dir="ltr">{text(r.number ?? r.order_number ?? r.code)}</td>
                        <td className="px-4 py-3 text-[13px] text-[var(--crmx-text-secondary)]">{date(r.created_at)}</td>
                        <td className="px-4 py-3"><CrmStatusBadge value={String(r.status ?? "")} /></td>
                        <td className="px-4 py-3 text-[13px] text-[var(--crmx-text-secondary)]">
                          {branchName}
                          {source && <span className="text-[var(--crmx-text-muted)]"> · {source}</span>}
                          {Boolean(r.is_other_branch_read_only) && (
                            <span
                              className="ms-1.5 inline-flex items-center rounded-full bg-[var(--crmx-warning-soft)] px-2 py-0.5 text-[10.5px] font-bold text-[var(--crmx-warning-text)]"
                              title="طلب من فرع آخر — عرض فقط، لا يمكن تعديله"
                            >
                              فرع آخر · قراءة فقط
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[13px] font-bold text-[var(--crmx-text)]">{money(r.total)}</td>
                        <td className="px-4 py-3"><Rating value={r.rating as number | null | undefined} /></td>
                        <td className="px-4 py-3"><CrmYesNoBadge value={Boolean(r.has_complaint)} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        }}
      </SectionFrame>

      <CrmOrderDetailsModal order={modalOrder} onClose={() => setModalOrder(null)} />
    </div>
  );
}
