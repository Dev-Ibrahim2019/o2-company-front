import { ArrowLeft, ChevronDown } from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { crmApi } from "../api";
import { CrmActivityFeed, CrmOrderExpandedPanel, CrmStatusBadge } from "../customers-ui";
import type { CrmActivityEvent } from "../types";
import { date, money, SectionFrame, text, unwrapRows, useCrmSection } from "./shared";

function RecentOrders() {
  const { customerId = "" } = useParams();
  const state = useCrmSection("orders");
  const [openOrderId, setOpenOrderId] = useState<string | number | null>(null);
  const toggle = (id: string | number) => setOpenOrderId((cur) => (cur === id ? null : id));

  return (
    <div className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)]">
      <div className="flex items-center justify-between border-b border-[var(--crmx-border)] px-5 py-4">
        <h3 className="text-[15px] font-bold text-[var(--crmx-text)]">أحدث الطلبات</h3>
        <Link to={`/admin/crm/customers/${customerId}/orders`} className="flex items-center gap-1.5 text-[13px] font-bold text-[var(--crmx-navy)] hover:text-[var(--crmx-primary)]">
          عرض الكل <ArrowLeft className="h-3.5 w-3.5" />
        </Link>
      </div>
      <SectionFrame state={state} empty="لا توجد طلبات مسجلة لهذا العميل">
        {(data) => {
          const rows = unwrapRows(data, ["orders"]).slice(0, 5);
          if (!rows.length) return <div className="py-10 text-center text-[13px] text-[var(--crmx-text-secondary)]">لا توجد طلبات مسجلة لهذا العميل</div>;
          return (
            <div className="crmx-scrollbar overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-right">
                <thead>
                  <tr className="border-b border-[var(--crmx-border)] bg-[#FAFBFC]">
                    <th className="w-8"></th>
                    <th className="px-4 py-3 text-[12px] font-bold text-[var(--crmx-text-secondary)]">رقم الطلب</th>
                    <th className="px-4 py-3 text-[12px] font-bold text-[var(--crmx-text-secondary)]">التاريخ والوقت</th>
                    <th className="px-4 py-3 text-[12px] font-bold text-[var(--crmx-text-secondary)]">الفرع</th>
                    <th className="px-4 py-3 text-[12px] font-bold text-[var(--crmx-text-secondary)]">الحالة</th>
                    <th className="px-4 py-3 text-[12px] font-bold text-[var(--crmx-text-secondary)]">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
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
                          <td className="px-4 py-3 text-[13px] font-semibold text-[var(--crmx-text)]" dir="ltr">{text(r.number ?? r.order_number ?? r.code)}</td>
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

function ActivityPreview() {
  const { customerId = "" } = useParams();
  const [events, setEvents] = useState<CrmActivityEvent[]>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    crmApi.activity(customerId)
      .then((d) => !cancelled && setEvents(Array.isArray(d) ? d : []))
      .catch(() => !cancelled && setEvents([]))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [customerId]);

  return (
    <div className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[15px] font-bold text-[var(--crmx-text)]">سجل النشاطات والتفاعلات</h3>
        <Link to={`/admin/crm/customers/${customerId}/activity`} className="flex items-center gap-1.5 text-[13px] font-bold text-[var(--crmx-navy)] hover:text-[var(--crmx-primary)]">
          عرض الكل <ArrowLeft className="h-3.5 w-3.5" />
        </Link>
      </div>
      {loading ? (
        <div className="crmx-skeleton h-20 w-full rounded-xl" />
      ) : (
        <CrmActivityFeed events={(events ?? []).slice(0, 5)} />
      )}
    </div>
  );
}

export default function OverviewTab() {
  return (
    <div className="crmx-root space-y-5">
      <RecentOrders />
      <ActivityPreview />
    </div>
  );
}
