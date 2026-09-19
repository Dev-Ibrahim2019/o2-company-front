import { ArrowLeft, ChevronLeft } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CrmState } from "../components";
import { CrmFavoriteProductsChart, CrmOrderDetailsModal, CrmPurchaseHistoryChart, CrmStatusBadge } from "../customers-ui";
import { CRM_ORDER_SOURCE_LABELS } from "../customers-ui/sourceOptions";
import type { CrmOrderRow } from "../types";
import { date, money, SectionFrame, text, unwrapRows, useCrmSection } from "./shared";

const TH = "px-4 py-3 text-[12px] font-bold text-[var(--crmx-text-secondary)] whitespace-nowrap";

/**
 * "آخر 5 طلبات" — the mockup's bottom panel. Same columns as the full Orders
 * tab minus the per-order rating/complaint flags, which the mockup only shows
 * on the dedicated orders screen.
 *
 * "طريقة الدفع" is intentionally absent, for the reason documented on
 * CrmController::orders(): an order's payment method lives in two
 * unreconciled places (POS settles via invoices→payments, Call Center writes
 * payment_confirmations), so labelling it from one source would mislabel
 * every order settled through the other.
 */
function RecentOrders() {
  const { customerId = "" } = useParams();
  const state = useCrmSection("orders");
  // Same order-details pop-up the CRM-wide "الطلبات" screens use — see
  // OrdersTab.tsx's own doc comment on why a row from this endpoint is a
  // real CrmOrderRow now, not the loose shape this used to read.
  const [modalOrder, setModalOrder] = useState<CrmOrderRow | null>(null);

  return (
    <div className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)]">
      <div className="flex items-center justify-between border-b border-[var(--crmx-border)] px-5 py-4">
        <h3 className="text-[15px] font-bold text-[var(--crmx-text)]">آخر 5 طلبات</h3>
      </div>
      <SectionFrame state={state} empty="لا توجد طلبات مسجلة لهذا العميل">
        {(data) => {
          const all = unwrapRows(data, ["orders"]);
          const rows = all.slice(0, 5);
          if (!rows.length) {
            // Was plain centred text — the only one of Overview's three empty
            // states without an icon, next to the two purchase charts' shared
            // ChartEmpty (icon + message) and SectionFrame's own default
            // (CrmState, also icon + message). Reusing CrmState here instead
            // of a fourth bespoke empty-state style unifies all three.
            return <CrmState kind="empty" title="لا توجد طلبات مسجلة لهذا العميل" />;
          }
          return (
            <>
              <div className="crmx-scrollbar overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-right">
                  <thead>
                    <tr className="border-b border-[var(--crmx-border)] bg-[#FAFBFC]">
                      <th className="w-8"></th>
                      <th className={TH}>رقم الطلب</th>
                      <th className={TH}>تاريخ الطلب</th>
                      <th className={TH}>الحالة</th>
                      <th className={TH}>الفرع / المصدر</th>
                      <th className={TH}>الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const id = r.id as string | number | undefined;
                      const branchName = text(r.branch_name ?? (r.branch as { name?: unknown })?.name);
                      const source = r.source ? CRM_ORDER_SOURCE_LABELS[String(r.source)] || String(r.source) : null;
                      return (
                        <tr
                          key={String(r.id ?? i)}
                          onClick={() => id != null && setModalOrder(r as unknown as CrmOrderRow)}
                          tabIndex={id != null ? 0 : undefined}
                          role={id != null ? "button" : undefined}
                          aria-haspopup={id != null ? "dialog" : undefined}
                          onKeyDown={(e) => {
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
                          </td>
                          <td className="px-4 py-3 text-[13px] font-bold text-[var(--crmx-text)]">{money(r.total)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-[var(--crmx-border)] px-5 py-3.5">
                <Link
                  to={`/admin/crm/customers/${customerId}/orders`}
                  className="flex w-max items-center gap-1.5 text-[13px] font-bold text-[var(--crmx-primary)] hover:text-[var(--crmx-primary-hover)]"
                >
                  عرض جميع الطلبات <ArrowLeft className="h-3.5 w-3.5" />
                </Link>
              </div>
            </>
          );
        }}
      </SectionFrame>

      <CrmOrderDetailsModal order={modalOrder} onClose={() => setModalOrder(null)} />
    </div>
  );
}

export default function OverviewTab() {
  return (
    <div className="crmx-root space-y-5">
      {/* Charts first, then the orders panel — the mockup's Overview order.
          The activity feed that used to sit here is not lost: it has had its
          own "النشاطات" tab all along, and the mockup keeps Overview focused
          on purchase analytics + recent orders. */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <CrmPurchaseHistoryChart />
        <CrmFavoriteProductsChart />
      </div>
      <RecentOrders />
    </div>
  );
}
