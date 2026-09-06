import { ArrowLeft, ChevronDown } from "lucide-react";
import { Fragment, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CrmFavoriteProductsChart, CrmOrderExpandedPanel, CrmPurchaseHistoryChart, CrmStatusBadge } from "../customers-ui";
import { CRM_ORDER_SOURCE_LABELS } from "../customers-ui/sourceOptions";
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
  const [openOrderId, setOpenOrderId] = useState<string | number | null>(null);
  const toggle = (id: string | number) => setOpenOrderId((cur) => (cur === id ? null : id));

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
            return <div className="py-10 text-center text-[13px] text-[var(--crmx-text-secondary)]">لا توجد طلبات مسجلة لهذا العميل</div>;
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
                      const isOpen = id != null && openOrderId === id;
                      const branchName = text(r.branch_name ?? (r.branch as { name?: unknown })?.name);
                      const source = r.source ? CRM_ORDER_SOURCE_LABELS[String(r.source)] || String(r.source) : null;
                      return (
                        <Fragment key={String(r.id ?? i)}>
                          <tr
                            onClick={() => id != null && toggle(id)}
                            className="crmx-table-row cursor-pointer border-b border-[var(--crmx-border)] last:border-0"
                          >
                            <td className="px-2 text-center">
                              <ChevronDown className={`mx-auto h-4 w-4 text-[var(--crmx-text-muted)] transition-transform ${isOpen ? "rotate-180" : ""}`} />
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
                          {isOpen && id != null && (
                            // bg-[var(--crmx-bg)] here used to match the (neutral) panel
                            // background; the panel itself now paints --crmx-success-soft
                            // as its "this is open" signal (see OrdersPage.tsx), which
                            // fully occludes whatever this <tr> sets — kept in sync so the
                            // declaration here isn't a dead, misleading leftover.
                            <tr className="border-b border-[var(--crmx-border)] bg-[var(--crmx-success-soft)] last:border-0">
                              <td colSpan={6} className="p-0">
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
