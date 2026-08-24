import { ChevronDown } from "lucide-react";
import { Fragment, useState } from "react";
import { CrmState } from "../components";
import { CrmOrderExpandedPanel, CrmStatusBadge } from "../customers-ui";
import { date, money, SectionFrame, text, unwrapRows, useCrmSection, type Row } from "./shared";

export default function OrdersTab() {
  const state = useCrmSection("orders");
  const [openOrderId, setOpenOrderId] = useState<string | number | null>(null);

  const toggle = (id: string | number) => setOpenOrderId((cur) => (cur === id ? null : id));

  return (
    <div className="crmx-root">
      <SectionFrame state={state} empty="لا توجد طلبات مسجلة">
        {(data) => {
          const rows = unwrapRows(data, ["orders"]);
          if (!rows.length) return <CrmState kind="empty" title="لا توجد طلبات مسجلة" />;
          return (
            <div className="crmx-scrollbar overflow-x-auto rounded-2xl border border-[var(--crmx-border)]">
              <table className="w-full min-w-[640px] border-collapse text-right">
                <thead>
                  <tr className="border-b border-[var(--crmx-border)] bg-[#FAFBFC]">
                    <th className="w-8"></th>
                    <th className="px-4 py-3 text-[12px] font-bold text-[var(--crmx-text-secondary)]">رقم الطلب</th>
                    <th className="px-4 py-3 text-[12px] font-bold text-[var(--crmx-text-secondary)]">التاريخ</th>
                    <th className="px-4 py-3 text-[12px] font-bold text-[var(--crmx-text-secondary)]">الفرع</th>
                    <th className="px-4 py-3 text-[12px] font-bold text-[var(--crmx-text-secondary)]">الحالة</th>
                    <th className="px-4 py-3 text-[12px] font-bold text-[var(--crmx-text-secondary)]">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r: Row, i: number) => {
                    const id = r.id as string | number | undefined;
                    const isOpen = id != null && openOrderId === id;
                    return (
                      <Fragment key={String(r.id ?? i)}>
                        <tr
                          onClick={() => id != null && toggle(id)}
                          className="crmx-table-row cursor-pointer border-b border-[var(--crmx-border)] last:border-0"
                        >
                          <td className="px-2 text-center">
                            <ChevronDown className={`mx-auto h-4 w-4 text-[var(--crmx-text-muted)] transition-transform ${isOpen ? "rotate-180" : ""}`} />
                          </td>
                          <td className="px-4 py-3 text-[13px] font-semibold text-[var(--crmx-text)]">{text(r.number ?? r.order_number ?? r.code)}</td>
                          <td className="px-4 py-3 text-[13px] text-[var(--crmx-text-secondary)]">{date(r.created_at)}</td>
                          <td className="px-4 py-3 text-[13px] text-[var(--crmx-text-secondary)]">{text(r.branch_name ?? (r.branch as { name?: unknown })?.name)}</td>
                          <td className="px-4 py-3"><CrmStatusBadge value={String(r.status ?? "")} /></td>
                          <td className="px-4 py-3 text-[13px] font-bold text-[var(--crmx-text)]">{money(r.total)}</td>
                        </tr>
                        {isOpen && id != null && (
                          <tr className="border-b border-[var(--crmx-border)] bg-[var(--crmx-bg)] last:border-0">
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
          );
        }}
      </SectionFrame>
    </div>
  );
}
