import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CrmState } from "../components";
import { CrmDataView, CrmFavoriteProductsChart, CrmOrderDetailsModal, CrmPurchaseHistoryChart, CrmViewToggle, useCrmViewMode } from "../customers-ui";
import type { CrmOrderRow } from "../types";
import { customerOrderColumns } from "./orderColumns";
import { SectionFrame, unwrapRows, useCrmSection } from "./shared";

const RECENT_ORDER_COLUMNS = customerOrderColumns.filter((c) => c.key !== "rating" && c.key !== "has_complaint");

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
  const [mode, setMode] = useCrmViewMode("customer-recent-orders");

  return (
    <div className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--crmx-border)] px-5 py-4">
        <h3 className="text-[15px] font-bold text-[var(--crmx-text)]">آخر 5 طلبات</h3>
        <CrmViewToggle mode={mode} onChange={setMode} />
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
              <CrmDataView
                rows={rows}
                columns={RECENT_ORDER_COLUMNS}
                rowKey={(r, i) => String(r.id ?? i)}
                mode={mode}
                bordered={false}
                minTableWidth={640}
                onRowClick={(r) => { if (r.id != null) setModalOrder(r as unknown as CrmOrderRow); }}
              />
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
