import { useState } from "react";
import { CrmState } from "../components";
import { CrmDataView, CrmOrderDetailsModal, CrmViewToggle, useCrmViewMode } from "../customers-ui";
import type { CrmOrderRow } from "../types";
import { customerOrderColumns } from "./orderColumns";
import { SectionFrame, unwrapRows, useCrmSection } from "./shared";

export default function OrdersTab() {
  const state = useCrmSection("orders");
  const [mode, setMode] = useCrmViewMode("customer-orders");

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
            <div className="space-y-2">
              <div className="flex justify-end">
                <CrmViewToggle mode={mode} onChange={setMode} />
              </div>
              <CrmDataView
                rows={rows}
                columns={customerOrderColumns}
                rowKey={(r, i) => String(r.id ?? i)}
                mode={mode}
                minTableWidth={820}
                onRowClick={(r) => { if (r.id != null) setModalOrder(r as unknown as CrmOrderRow); }}
              />
            </div>
          );
        }}
      </SectionFrame>

      <CrmOrderDetailsModal order={modalOrder} onClose={() => setModalOrder(null)} />
    </div>
  );
}
