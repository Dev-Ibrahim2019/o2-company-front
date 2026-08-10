import React from "react";
import {
  Building2,
  CalendarDays,
  Clock3,
  MessageSquare,
  Package,
  RefreshCw,
  Star,
} from "lucide-react";
import type { OrderDetail } from "./services/callCenterService";

const sourceStyles: Record<string, { label: string; dot: string; badge: string }> = {
  dine_in: { label: "صالة عائلات", dot: "bg-emerald-500", badge: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  call_center: { label: "فوري", dot: "bg-violet-500", badge: "border-violet-200 bg-violet-50 text-violet-800" },
  delivery: { label: "ديلفري", dot: "bg-sky-500", badge: "border-sky-200 bg-sky-50 text-sky-800" },
  takeaway: { label: "سفري", dot: "bg-amber-500", badge: "border-amber-200 bg-amber-50 text-amber-800" },
};

const branchDots = ["bg-cyan-600", "bg-fuchsia-600", "bg-lime-600", "bg-rose-600", "bg-indigo-600", "bg-orange-600"];

const statusStyles: Record<string, { label: string; className: string }> = {
  pending: { label: "معلّق", className: "border-amber-200 bg-amber-50 text-amber-800" },
  preparing: { label: "قيد التحضير", className: "border-sky-200 bg-sky-50 text-sky-800" },
  ready: { label: "جاهز", className: "border-teal-200 bg-teal-50 text-teal-800" },
  delivered: { label: "مكتمل", className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  confirmed: { label: "مؤكد", className: "border-blue-200 bg-blue-50 text-blue-800" },
  cancelled: { label: "ملغي", className: "border-rose-200 bg-rose-50 text-rose-800" },
};

const RatingValue: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700">
    <span className="text-slate-500">{label}</span>
    <Star size={13} className="fill-amber-400 text-amber-400" />
    <bdi>{value}/5</bdi>
  </span>
);

interface CustomerOrderCardProps {
  order: OrderDetail;
  label?: string;
  onOpenDetails: (orderId: number) => void;
  onRepeatOrder?: (order: OrderDetail) => void;
}

export const CustomerOrderCard: React.FC<CustomerOrderCardProps> = ({ order, label, onOpenDetails, onRepeatOrder }) => {
  const date = new Date(order.created_at);
  const sourceKey = order.order_type || order.source || "";
  const source = sourceStyles[sourceKey] || {
    label: sourceKey || "مصدر غير محدد",
    dot: "bg-slate-500",
    badge: "border-slate-200 bg-slate-50 text-slate-700",
  };
  const branchDot = branchDots[Math.abs(order.branch?.id || 0) % branchDots.length];
  const status = statusStyles[order.status.toLowerCase()] || {
    label: order.status,
    className: "border-slate-200 bg-slate-50 text-slate-700",
  };

  const openDetails = () => onOpenDetails(order.id);

  return (
    <article
      className="group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md"
      onClick={openDetails}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openDetails();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`عرض تفاصيل الطلب ${order.order_number}`}
    >
      <div className="h-1 bg-slate-100">
        <div className={`h-full w-20 ${source.dot}`} />
      </div>
      <div className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            {label && <p className="mb-1 text-[11px] font-black text-slate-500">{label}</p>}
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-base font-black text-slate-950">{order.order_number}</h4>
              <span className={`rounded-md border px-2 py-1 text-[10px] font-black ${status.className}`}>{status.label}</span>
            </div>
          </div>
          <div className="text-left">
            <p className="text-lg font-black text-slate-950"><bdi>{Number(order.total).toFixed(2)} ₪</bdi></p>
            <p className="text-[10px] font-bold text-slate-400">الإجمالي</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-b border-slate-100 py-3 lg:grid-cols-4">
          <div className="flex min-w-0 items-center gap-2 text-xs text-slate-700">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${branchDot}`} aria-hidden="true" />
            <Building2 size={14} className="shrink-0 text-slate-400" />
            <span className="truncate font-bold">{order.branch?.name || "فرع غير محدد"}</span>
          </div>
          <div>
            <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-black ${source.badge}`}>
              <span className={`h-2 w-2 rounded-full ${source.dot}`} aria-hidden="true" />
              {source.label}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <CalendarDays size={14} className="text-slate-400" />
            <span>{date.toLocaleDateString("ar-SA")}</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Clock3 size={14} className="text-slate-400" />
            <span>{date.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        </div>

        <div className="py-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-black text-slate-700">
            <Package size={14} className="text-slate-400" />
            الأصناف
            <span className="font-bold text-slate-400">({order.items?.length || 0})</span>
          </div>
          {order.items?.length ? (
            <div className="divide-y divide-slate-100 border-y border-slate-100">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-4 py-2 text-xs">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800">{item.item_name_ar || item.item_name || "صنف"}</p>
                    {item.notes && <p className="mt-0.5 text-[11px] text-slate-500">{item.notes}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-4 text-slate-600">
                    <span><bdi>{item.quantity}</bdi> ×</span>
                    <strong className="text-slate-800"><bdi>{Number(item.total).toFixed(2)} ₪</bdi></strong>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="border-y border-dashed border-slate-200 py-3 text-center text-xs text-slate-500">لا تتوفر تفاصيل الأصناف لهذا الطلب.</p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          {order.feedback ? (
            <div className="flex flex-wrap items-center gap-4">
              <RatingValue label="جودة الأصناف" value={order.feedback.food_quality} />
              <RatingValue label="الخدمة" value={order.feedback.service_quality} />
            </div>
          ) : (
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); openDetails(); }}
              className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-black text-amber-900 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              إضافة تقييم
            </button>
          )}

          <div className="flex items-center gap-2">
            {order.note && <span title={order.note} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-amber-700"><MessageSquare size={15} /></span>}
            {onRepeatOrder && (
              <button
                type="button"
                onClick={(event) => { event.stopPropagation(); onRepeatOrder(order); }}
                className="inline-flex min-h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                <RefreshCw size={14} />
                اعتماد الطلب
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};
