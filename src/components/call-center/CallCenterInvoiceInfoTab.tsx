import React, { useCallback, useEffect, useState } from "react";
import {
  Building2,
  Clock,
  CreditCard,
  FileText,
  Hash,
  Headphones,
  Lock,
  Monitor,
  ReceiptText,
  Send,
  Unlock,
  User,
  Coffee,
  RefreshCw,
} from "lucide-react";
import type { CallTicket } from "../../services/callTicketService";
import type { OrderFromApi } from "../../services/orderService";
import type { PaymentEntry } from "../../hooks/useCallCenterCart";
import type { Branch } from "../../services/branchService";
import { callCenterService, type AgentBreaksToday } from "./services/callCenterService";

interface CallCenterInvoiceInfoTabProps {
  currentUser: { name?: string | null } | null;
  branch: Branch | null;
  ticket: CallTicket | null;
  order: OrderFromApi | null;
  payments: PaymentEntry[];
  openedAt: string;
  isSubmitting?: boolean;
  closedSuccessfully?: boolean;
}

interface InfoItem {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  ltr?: boolean;
}

const unavailable = "غير متوفر";
const workstationCode =
  String(import.meta.env.VITE_CALL_CENTER_WORKSTATION_CODE || "").trim() ||
  unavailable;
const workstationName =
  String(import.meta.env.VITE_CALL_CENTER_WORKSTATION_NAME || "").trim() ||
  "محطة الكول سنتر";

const paymentLabels: Record<string, string> = {
  cash: "نقدي",
  card: "بطاقة",
  wallet: "محفظة",
  bank: "تحويل بنكي",
  account: "على الحساب",
};

const formatDateTime = (value?: string | null) => {
  if (!value) return { date: unavailable, time: unavailable };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: unavailable, time: unavailable };
  return {
    date: date.toLocaleDateString("ar-PS"),
    time: date.toLocaleTimeString("ar-PS", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
};

const statusLabel = (
  order: OrderFromApi | null,
  isSubmitting: boolean,
  closedSuccessfully: boolean,
) => {
  if (isSubmitting) return "جارٍ الحفظ";
  if (!order) return "مسودة";
  if (closedSuccessfully || order.status === "paid") return "مدفوعة";
  if (order.status === "cancelled") return "ملغاة";
  return "بانتظار الدفع";
};

const Section: React.FC<{
  title: string;
  icon: React.ElementType;
  iconClass: string;
  items: InfoItem[];
}> = ({ title, icon: SectionIcon, iconClass, items }) => (
  <section>
    <div className="mb-3 flex items-center gap-2">
      <SectionIcon size={16} className={iconClass} />
      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
        {title}
      </h3>
    </div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6">
      {items.map(({ icon: Icon, label, value, ltr }) => (
        <div key={label} className="space-y-1.5">
          <span className="mr-2 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-500">
            <Icon size={10} className="text-slate-600" />
            {label}
          </span>
          <div
            className="min-h-10 rounded-xl border border-white/5 bg-slate-800 p-2 text-[10px] font-black text-slate-300 sm:p-3 sm:text-xs"
            dir={ltr ? "ltr" : undefined}
          >
            {value}
          </div>
        </div>
      ))}
    </div>
  </section>
);

const EmployeeBreaksSection: React.FC = () => {
  const [summary,setSummary]=useState<AgentBreaksToday|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const load=useCallback(async()=>{setLoading(true);setError("");try{setSummary((await callCenterService.getAgentBreaksToday()).data);}catch{setError("تعذر تحميل سجل الاستراحات");}finally{setLoading(false);}},[]);
  useEffect(()=>{void load();const refresh=()=>void load();window.addEventListener("call-center:break-updated",refresh);return()=>window.removeEventListener("call-center:break-updated",refresh);},[load]);
  return <section className="rounded-2xl border border-white/5 bg-slate-950/40 p-3 sm:p-4" aria-labelledby="breaks-title">
    <div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2"><Coffee size={16} className="text-amber-400"/><div><h3 id="breaks-title" className="text-xs font-black text-slate-200">استراحات الموظف اليوم</h3><p className="text-[10px] text-slate-500">سجل محفوظ لمراقبة سير العمليات وتقييم الأداء</p></div></div><button type="button" onClick={()=>void load()} disabled={loading} aria-label="تحديث الاستراحات" className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-400"><RefreshCw size={14} className={loading?"animate-spin":""}/></button></div>
    {loading?<div className="h-20 animate-pulse rounded-xl bg-slate-800"/>:error?<p className="rounded-xl bg-rose-500/10 p-3 text-xs text-rose-300">{error}</p>:summary?<><div className="mb-3 grid grid-cols-2 gap-2"><div className="rounded-xl bg-slate-800 p-3"><p className="text-[10px] text-slate-500">عدد الاستراحات</p><strong className="text-lg text-white">{summary.breaks_count}</strong></div><div className="rounded-xl bg-slate-800 p-3"><p className="text-[10px] text-slate-500">إجمالي الوقت</p><strong className="text-lg text-white">{summary.total_duration_label}</strong></div></div>{summary.breaks.length?<div className="space-y-2">{summary.breaks.map(item=><div key={item.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-800/60 p-3 text-xs"><div><strong>{item.type_label}</strong><p className="mt-1 text-[10px] text-slate-500">{formatDateTime(item.started_at).time} — {item.ended_at?formatDateTime(item.ended_at).time:"مستمرة الآن"}</p></div><span className={item.status==="active"?"text-amber-300":"text-emerald-300"}>{item.duration_label}</span></div>)}</div>:<p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-slate-500">لا توجد استراحات مسجلة اليوم</p>}</>:null}
  </section>;
};

export const CallCenterInvoiceInfoTab: React.FC<
  CallCenterInvoiceInfoTabProps
> = ({
  currentUser,
  branch,
  ticket,
  order,
  payments,
  openedAt,
  isSubmitting = false,
  closedSuccessfully = false,
}) => {
  const opened = formatDateTime(order?.created_at || openedAt);
  const paid =
    closedSuccessfully || order?.status === "paid" || Boolean(order?.paid_at);
  const closed = paid ? formatDateTime(order?.paid_at) : null;
  const invoiceNumber =
    order?.invoice?.number ||
    order?.invoice?.invoice_number ||
    "تلقائي عند الحفظ";
  const agentName = currentUser?.name?.trim() || unavailable;
  const persistedPayments = order?.payments?.map((payment) => ({
    method: payment.payment_method || payment.method || "",
    amount: Number(payment.amount),
  }));
  const summaryPayments =
    persistedPayments?.length ? persistedPayments : closedSuccessfully ? payments : [];
  const paymentSummary = summaryPayments.length
    ? summaryPayments
        .filter((payment) => Number(payment.amount) > 0)
        .map(
          (payment) =>
            `${paymentLabels[payment.method] || payment.method}: ${Number(payment.amount).toFixed(2)} ₪`,
        )
        .join(" • ")
    : unavailable;
  const kitchenDispatchState =
    Boolean(order?.tickets?.length) || order?.has_unsent_items === false
      ? "sent"
      : order?.has_unsent_items === true
        ? "not_sent"
        : "unknown";
  const kitchenDispatchLabel =
    kitchenDispatchState === "sent"
      ? "تم الإرسال للمطبخ"
      : kitchenDispatchState === "not_sent"
        ? "لم يتم الإرسال للمطبخ"
        : "حالة الإرسال غير مؤكدة";

  return (
    <div className="h-full flex-1 overflow-y-auto rounded-[1.5rem] border border-white/5 bg-slate-900 p-3 text-right custom-scrollbar sm:rounded-[2rem] sm:p-8">
      <div className="mx-auto max-w-2xl space-y-5 sm:space-y-8">
        <Section
          title="تفاصيل محطة الكول سنتر"
          icon={Headphones}
          iconClass="text-red-500"
          items={[
            { icon: Hash, label: "رمز المحطة / الجهاز", value: workstationCode, ltr: workstationCode !== unavailable },
            { icon: Monitor, label: "اسم المحطة", value: workstationName },
            { icon: Building2, label: "الفرع", value: branch?.name || unavailable },
            { icon: User, label: "موظف الكول سنتر", value: agentName },
          ]}
        />

        <EmployeeBreaksSection />

        <Section
          title="تفاصيل الفاتورة"
          icon={FileText}
          iconClass="text-amber-500"
          items={[
            { icon: FileText, label: "رقم الفاتورة", value: invoiceNumber, ltr: Boolean(order?.invoice) },
            { icon: Clock, label: "التاريخ", value: opened.date },
            { icon: Clock, label: "الوقت", value: opened.time },
            { icon: ReceiptText, label: "عملة الفاتورة", value: "شيكل فلسطيني (₪)" },
            { icon: CreditCard, label: "رقم الحساب المالي", value: unavailable },
            { icon: FileText, label: "حالة الفاتورة", value: statusLabel(order, isSubmitting, closedSuccessfully) },
            { icon: Headphones, label: "مصدر الفاتورة", value: "كول سنتر" },
            { icon: Hash, label: "تذكرة المكالمة", value: ticket ? `#${ticket.id}` : "فاتورة يدوية", ltr: Boolean(ticket) },
            { icon: ReceiptText, label: "رقم الطلب المرتبط", value: order?.order_number || (order?.id ? `#${order.id}` : unavailable), ltr: Boolean(order) },
          ]}
        />

        <Section
          title="فتح الفاتورة"
          icon={Unlock}
          iconClass="text-emerald-500"
          items={[
            { icon: User, label: "موظف الفتح", value: agentName },
            { icon: Monitor, label: "المحطة", value: workstationName },
            { icon: Clock, label: "تاريخ الفتح", value: opened.date },
            { icon: Clock, label: "وقت الفتح", value: opened.time },
          ]}
        />

        {paid && closed ? (
          <Section
            title="إغلاق الفاتورة"
            icon={Lock}
            iconClass="text-blue-500"
            items={[
              { icon: User, label: "موظف الإغلاق", value: order?.cashier?.name || unavailable },
              { icon: Monitor, label: "المحطة / المصدر", value: `${workstationName} — كول سنتر` },
              { icon: Clock, label: "تاريخ الإغلاق", value: closed.date },
              { icon: Clock, label: "وقت الإغلاق", value: closed.time },
              { icon: FileText, label: "رقم الفاتورة", value: invoiceNumber, ltr: true },
              { icon: CreditCard, label: "ملخص الدفع", value: paymentSummary },
              { icon: Send, label: "حالة الإرسال للمطبخ", value: kitchenDispatchLabel },
            ]}
          />
        ) : (
          <div className="rounded-xl border border-dashed border-white/5 bg-slate-800/50 p-3 text-center">
            <p className="text-[9px] font-bold text-slate-500">
              لم يتم إغلاق الفاتورة بعد — ستظهر تفاصيل الإغلاق هنا بعد إتمام الدفع بنجاح
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
