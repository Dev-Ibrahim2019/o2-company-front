import React from "react";
import { PURCHASE_STATUS_LABELS, type PurchaseStatus } from "../../../../services/purchaseInvoiceService";

const STYLES: Record<PurchaseStatus, string> = {
  draft: "bg-slate-500/15 text-slate-300",
  pending_approval: "bg-slate-500/15 text-slate-300",
  unpaid: "bg-sky-500/15 text-sky-300",
  partially_paid: "bg-violet-500/15 text-violet-300",
  paid: "bg-green-500/15 text-green-400",
  overdue: "bg-red-500/15 text-red-400",
  cancelled: "bg-slate-700 text-slate-400",
  reversed: "bg-amber-500/15 text-amber-300",
};

/** حالة فاتورة المشتريات كما تُعرض (المتأخرة محسوبة من الاستحقاق في الخادم: effective_status). */
export const PurchaseStatusBadge: React.FC<{ status: PurchaseStatus }> = ({ status }) => (
  <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-black whitespace-nowrap ${STYLES[status]}`}>{PURCHASE_STATUS_LABELS[status]}</span>
);
