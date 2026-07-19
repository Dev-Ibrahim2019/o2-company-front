import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Award, CalendarHeart, Check, ExternalLink, Gift, Loader2, MessageSquareWarning, Phone, PhoneCall, RotateCcw, ShoppingCart, Sparkles, X } from "lucide-react";
import type { CustomerAlert, CustomerFullProfile, CustomerOccasion, CustomerSearchResult, FavoriteItem, OrderDetail } from "../../services/callCenterService";
import { callCenterService, CUSTOMER_CATEGORY_LABELS, resolveCustomerCategory } from "../../services/callCenterService";
import { formatOccasionReminder, getUpcomingOccasions } from "../../utils/callCenterUtils";

interface Props {
  customer: CustomerSearchResult;
  alerts?: CustomerAlert[];
  onSelect: (customer: CustomerSearchResult) => void;
  onClose: () => void;
  onOpenFullProfile: (customer: CustomerSearchResult) => void;
  onRepeatOrder?: (order: OrderDetail) => void;
  onQuickComplaint?: (customer: CustomerSearchResult, orderId?: number) => void;
}

export const CustomerQuickPreview: React.FC<Props> = ({ customer, alerts = [], onSelect, onClose, onOpenFullProfile, onRepeatOrder, onQuickComplaint }) => {
  const [data, setData] = useState<CustomerFullProfile | null>(null);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [occasions, setOccasions] = useState<CustomerOccasion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [answered, setAnswered] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setLoading(true); setError(false); setAnswered(false);
    Promise.all([
      callCenterService.getCustomerFullProfile(customer.id),
      callCenterService.getCustomerFavorites(customer.id),
      callCenterService.getCustomerOccasions(customer.id),
    ])
      .then(([profile, favoriteItems, occasionItems]) => {
        setData(profile.data);
        setFavorites(favoriteItems.data ?? []);
        setOccasions(occasionItems.data ?? []);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [customer.id]);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>("button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex='-1'])")?.focus();
    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab" && dialog) {
        const focusable = [...dialog.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])")];
        if (!focusable.length) return;
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", listener); return () => { document.removeEventListener("keydown", listener); previousFocus?.focus(); };
  }, [onClose]);

  const address = data?.addresses.find((item) => item.is_default) ?? data?.addresses[0];
  const classification = useMemo(() => resolveCustomerCategory(data?.profile.customer ?? customer, data?.profile.monthly_orders_count ?? 0), [customer, data]);
  const favorite = favorites[0]?.item_name_ar || favorites[0]?.item_name;
  const permanentNote = data?.permanent_notes[0]?.content;
  const loyaltyPoints = data?.profile.loyalty_points ?? customer.loyalty_points ?? 0;
  const lastOrder = data?.orders[0];
  const blocked = customer.status === "blocked";
  const upcomingOccasion = useMemo(() => getUpcomingOccasions(occasions, 30)[0] ?? null, [occasions]);
  const adopt = () => {
    if (!address && !customer.address) {
      window.alert("لا يوجد عنوان محفوظ لهذا العميل. أضف أو اختر عنواناً قبل إنشاء الطلب.");
      return;
    }
    onSelect({ ...customer, selectedAddress: address } as CustomerSearchResult);
  };

  return <div className="fixed inset-0 z-[200] flex items-center justify-center p-3" dir="rtl" role="dialog" aria-modal="true" aria-labelledby="caller-title">
    <div className="absolute inset-0 bg-black/70" onClick={onClose} aria-hidden="true" />
    <section ref={dialogRef} className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl">
      <div className={`absolute right-0 top-0 h-full w-1 ${answered ? "bg-emerald-500" : "bg-red-500 animate-pulse"}`} />
      <header className="flex shrink-0 items-start justify-between border-b border-slate-800 p-5 pr-6">
        <div>
          <div className={`mb-2 flex items-center gap-2 text-xs font-bold ${answered ? "text-emerald-400" : "text-red-400"}`}><PhoneCall size={14}/>{answered ? "جاهز لخدمة المكالمة — تأكيد واجهة فقط" : "مكالمة واردة — الربط الهاتفي غير مفعّل"}</div>
          <h2 id="caller-title" className="text-xl font-black text-white">{customer.name}</h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-300"><Phone size={14}/>{customer.phone || customer.mobile || "رقم غير متاح"}</p>
        </div>
        <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-500" aria-label="إغلاق بطاقة المتصل"><X size={18}/></button>
      </header>

      {loading ? <div className="flex h-52 items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="animate-spin text-red-500"/> جارٍ تجهيز ملخص العميل…</div>
      : error ? <div className="m-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">تعذر تحميل تفاصيل العميل. أغلق البطاقة وحاول مرة أخرى.</div>
      : <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 pr-6">
        {(blocked || (data?.profile.open_complaints_count ?? 0) > 0 || alerts.length > 0) && <div className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm font-bold text-amber-300"><AlertTriangle className="shrink-0" size={17}/>{blocked ? "العميل محظور ولا يمكن اعتماد طلب له." : `يوجد ${data?.profile.open_complaints_count || alerts.length} تنبيه أو شكوى مفتوحة — راجعها قبل إتمام الطلب.`}</div>}
        {upcomingOccasion && (
          <div className="flex gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 p-3 text-sm text-violet-100">
            <CalendarHeart className="shrink-0 text-violet-300" size={17} />
            <span>{formatOccasionReminder(upcomingOccasion)}</span>
          </div>
        )}
        <div className="grid grid-cols-1 gap-x-5 gap-y-3 text-sm sm:grid-cols-2">
          <Info label="التصنيف" value={`${CUSTOMER_CATEGORY_LABELS[classification.category]} · ${classification.source === "manual" ? "يدوي" : "تلقائي"}`} accent={classification.category === "vip"}/>
          <Info label="نقاط الولاء" value={`${loyaltyPoints.toLocaleString("ar-PS")} نقطة`} accent={loyaltyPoints > 0}/>
          <Info label="المدينة / المنطقة" value={[address?.city || customer.city, address?.area].filter(Boolean).join("، ") || "غير محدد"}/>
          <Info label="العنوان المعتمد" value={address ? [address.label, address.street, address.landmark].filter(Boolean).join("، ") : customer.address || "لا يوجد عنوان محفوظ"} wrap/>
          <Info label="آخر طلب" value={lastOrder ? `${lastOrder.order_number} · ${new Date(lastOrder.created_at).toLocaleDateString("ar-PS")}` : "لا توجد طلبات سابقة"}/>
          <Info label="إجمالي الإنفاق" value={data?.profile.total_spent ? `${Number(data.profile.total_spent).toFixed(2)} ₪` : "—"}/>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
          <div className="mb-1 flex items-center gap-2 text-xs font-bold text-emerald-400"><Sparkles size={14}/> لمسة شخصية للمكالمة</div>
          <p className="text-sm leading-6 text-slate-200">{favorite ? `غالباً يطلب ${favorite}` : "لا يوجد صنف متكرر بعد"}{permanentNote ? ` — تذكّر: ${permanentNote}` : ""}.</p>
        </div>
        {loyaltyPoints > 0 && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-100">
            <div className="mb-1 flex items-center gap-2 font-bold"><Award size={14}/> نقاط الولاء</div>
            <p>رصيد العميل: <span className="font-black">{loyaltyPoints.toLocaleString("ar-PS")}</span> نقطة.</p>
            <p className="mt-1 text-amber-200/70">استخدام النقاط كخصم يتطلب تفعيل منطق الاستبدال في النظام — غير متاح حالياً.</p>
          </div>
        )}
        {favorites.length > 0 && (
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold text-sky-300"><Gift size={14}/> الأصناف المتكررة</div>
            <ul className="space-y-1 text-xs text-slate-300">
              {favorites.slice(0, 3).map((item) => (
                <li key={item.item_id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{item.item_name_ar || item.item_name}</span>
                  <span className="shrink-0 text-slate-500">{item.order_count}×</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>}

      <footer className="shrink-0 space-y-2 border-t border-slate-800 bg-slate-950 p-4">
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => lastOrder && onRepeatOrder?.(lastOrder)} disabled={!lastOrder || !onRepeatOrder} title={!lastOrder ? "لا يوجد طلب سابق" : undefined} className="flex items-center justify-center gap-2 rounded-lg border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-xs font-bold text-sky-200 hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900 disabled:text-slate-600"><RotateCcw size={14}/>إعادة آخر طلب</button>
          <button onClick={() => onQuickComplaint?.(customer, lastOrder?.id)} disabled={!onQuickComplaint} className="flex items-center justify-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-200 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900 disabled:text-slate-600"><MessageSquareWarning size={14}/>شكوى سريعة</button>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
        <button onClick={() => setAnswered(true)} disabled={answered} title="هذا الإجراء يؤكد جاهزية الموظف داخل الواجهة فقط ولا يرد على خط الهاتف" className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-3 py-3 text-sm font-black text-white hover:bg-red-500 disabled:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-red-400"><Check size={16}/>{answered ? "تم تأكيد الجاهزية" : "تأكيد الرد داخل الواجهة"}</button>
        <button onClick={adopt} disabled={blocked || loading} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-3 text-sm font-black text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"><ShoppingCart size={16}/>اعتماد العميل</button>
        <button onClick={() => { onClose(); onOpenFullProfile(customer); }} className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm font-bold text-slate-200 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500"><ExternalLink size={16}/>رؤية التفاصيل</button>
        </div>
      </footer>
    </section>
  </div>;
};

const Info = ({ label, value, accent = false, wrap = false }: { label: string; value: string; accent?: boolean; wrap?: boolean }) => <div className="min-w-0 border-b border-slate-800 pb-2"><div className="mb-1 text-[11px] font-bold text-slate-500">{label}</div><div className={`${wrap ? "line-clamp-2 leading-5" : "truncate"} font-bold ${accent ? "text-amber-300" : "text-slate-100"}`} title={value}>{value}</div></div>;
