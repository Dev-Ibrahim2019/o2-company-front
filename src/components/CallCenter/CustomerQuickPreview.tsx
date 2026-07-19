import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarHeart,
  Check,
  ExternalLink,
  Gift,
  Headphones,
  History,
  Loader2,
  MapPin,
  MessageSquareWarning,
  Phone,
  PhoneCall,
  ShoppingCart,
  Sparkles,
  UserRoundCheck,
  X,
} from "lucide-react";
import type {
  CustomerAlert,
  CustomerFullProfile,
  CustomerOccasion,
  CustomerSearchResult,
  FavoriteItem,
  OrderDetail,
} from "../../services/callCenterService";
import {
  callCenterService,
  CUSTOMER_CATEGORY_LABELS,
  resolveCustomerCategory,
} from "../../services/callCenterService";
import {
  formatOccasionReminder,
  getUpcomingOccasions,
} from "../../utils/callCenterUtils";

interface Props {
  customer: CustomerSearchResult;
  alerts?: CustomerAlert[];
  onSelect: (customer: CustomerSearchResult) => void;
  onClose: () => void;
  onOpenFullProfile: (customer: CustomerSearchResult) => void;
  onRepeatOrder?: (order: OrderDetail) => void;
  onQuickComplaint?: (customer: CustomerSearchResult, orderId?: number) => void;
}

export const CustomerQuickPreview: React.FC<Props> = ({
  customer,
  alerts = [],
  onSelect,
  onClose,
  onOpenFullProfile,
  onQuickComplaint,
}) => {
  const [data, setData] = useState<CustomerFullProfile | null>(null);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [occasions, setOccasions] = useState<CustomerOccasion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [answered, setAnswered] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setLoading(true);
    setError(false);
    setAnswered(false);
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
    dialog
      ?.querySelector<HTMLElement>(
        "button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex='-1'])",
      )
      ?.focus();
    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab" && dialog) {
        const focusable = [
          ...dialog.querySelectorAll<HTMLElement>(
            "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
          ),
        ];
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", listener);
    return () => {
      document.removeEventListener("keydown", listener);
      previousFocus?.focus();
    };
  }, [onClose]);

  const address =
    data?.addresses.find((item) => item.is_default) ?? data?.addresses[0];
  const classification = useMemo(
    () =>
      resolveCustomerCategory(
        data?.profile.customer ?? customer,
        data?.profile.monthly_orders_count ?? 0,
      ),
    [customer, data],
  );
  const favorite = favorites[0]?.item_name_ar || favorites[0]?.item_name;
  const permanentNote = data?.permanent_notes[0]?.content;
  const lastOrder = data?.orders[0];
  const blocked = customer.status === "blocked";
  const openIssues = Math.max(
    data?.profile.open_complaints_count ?? 0,
    alerts.length,
  );
  const upcomingOccasion = useMemo(
    () => getUpcomingOccasions(occasions, 30)[0] ?? null,
    [occasions],
  );
  const cityAndArea = [
    address?.city || customer.city,
    address?.area || address?.district,
  ]
    .filter(Boolean)
    .join("، ");
  const savedAddress = address
    ? [address.label, address.street, address.building_no, address.landmark]
        .filter(Boolean)
        .join("، ")
    : customer.address;

  const validateAddress = () => {
    if (address || customer.address) return true;
    window.alert(
      "لا يوجد عنوان محفوظ لهذا العميل. أضف أو اختر عنواناً قبل إنشاء الطلب.",
    );
    return false;
  };

  const adoptCustomer = () => {
    if (!validateAddress()) return;
    onSelect({ ...customer, selectedAddress: address });
  };

  const adoptLastOrder = () => {
    if (!lastOrder || !validateAddress()) return;
    onSelect({ ...customer, selectedAddress: address, lastOrder });
  };

  const categoryLabel = CUSTOMER_CATEGORY_LABELS[classification.category];
  const isVip = classification.category === "vip";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-5"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="caller-title"
    >
      <div
        className="absolute inset-0 bg-slate-950/85 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <section
        ref={dialogRef}
        className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950 shadow-2xl shadow-black/60 sm:max-h-[calc(100dvh-2.5rem)]"
      >
        <div
          className={`absolute inset-y-0 right-0 w-1 ${answered ? "bg-emerald-500" : "bg-red-500"}`}
          aria-hidden="true"
        />

        <header className="shrink-0 border-b border-slate-800 bg-slate-950 px-5 py-4 pr-6 sm:px-6 sm:pr-7">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h2
                    id="caller-title"
                    className="truncate text-xl font-black tracking-tight text-white sm:text-2xl"
                  >
                    {customer.name}
                  </h2>
                  <p className="mt-1.5 flex items-center gap-2 text-sm font-bold text-slate-300" dir="ltr">
                    <Phone size={14} className="text-slate-500" />
                    <span>{customer.phone || customer.mobile || "رقم غير متاح"}</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:max-w-[55%] sm:justify-end">
                  <span
                    className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-black ${
                      answered
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : "border-red-500/30 bg-red-500/10 text-red-300"
                    }`}
                  >
                    {answered ? <Headphones size={13} /> : <PhoneCall size={13} />}
                    {answered
                      ? "تم تأكيد الرد داخل الواجهة"
                      : "مكالمة واردة — الربط الهاتفي غير مفعّل"}
                  </span>
                  <span
                    title={`التصنيف ${classification.source === "manual" ? "يدوي" : "تلقائي"}`}
                    className={`inline-flex min-h-8 items-center rounded-lg border px-2.5 py-1 text-[11px] font-black ${
                      isVip
                        ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                        : "border-slate-600 bg-slate-900 text-slate-200"
                    }`}
                  >
                    {categoryLabel}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-700 bg-slate-900 text-slate-400 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              aria-label="إغلاق بطاقة المتصل"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex min-h-64 flex-1 items-center justify-center gap-3 text-sm font-bold text-slate-400">
            <Loader2 className="animate-spin text-red-500" size={20} />
            جارٍ تجهيز ملخص العميل…
          </div>
        ) : error ? (
          <div className="m-5 flex min-h-40 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-center text-sm font-bold text-red-200">
            تعذر تحميل تفاصيل العميل. أغلق البطاقة وحاول مرة أخرى.
          </div>
        ) : (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 pr-6 sm:px-6 sm:pr-7">
            {(blocked || openIssues > 0 || upcomingOccasion) && (
              <div className="grid gap-2" aria-label="تنبيهات العميل">
                {(blocked || openIssues > 0) && (
                  <div
                    role="alert"
                    className="flex min-h-16 items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.08] px-3.5 py-3 text-right shadow-sm shadow-amber-950/20"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-500/15 text-amber-300">
                      <AlertTriangle size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block text-xs font-black text-amber-200">
                        {blocked ? "العميل محظور" : "تنبيه يحتاج مراجعة"}
                      </strong>
                      <span className="mt-0.5 block text-[11px] leading-5 text-amber-100/75">
                        {blocked
                          ? "لا يمكن اعتماد طلب لهذا العميل قبل رفع الحظر."
                          : `يوجد ${openIssues} تنبيه أو شكوى مفتوحة قبل إتمام الطلب.`}
                      </span>
                    </span>
                  </div>
                )}

                {upcomingOccasion && (
                  <div
                    role="status"
                    className="flex min-h-16 items-center gap-3 rounded-xl border border-violet-500/25 bg-violet-500/[0.08] px-3.5 py-3 text-right shadow-sm shadow-violet-950/20"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-violet-500/15 text-violet-300">
                      <CalendarHeart size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block text-xs font-black text-violet-200">
                        مناسبة قريبة
                      </strong>
                      <span className="mt-0.5 block text-[11px] leading-5 text-violet-100/75">
                        {formatOccasionReminder(upcomingOccasion)}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="grid overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 sm:grid-cols-2">
              <div className="flex min-w-0 gap-3 border-b border-slate-800 p-3.5 sm:border-b-0 sm:border-l">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sky-500/10 text-sky-300">
                  <MapPin size={17} />
                </span>
                <div className="min-w-0">
                  <span className="block text-[10px] font-black text-slate-500">
                    المدينة / المنطقة
                  </span>
                  <strong className="mt-1 block truncate text-sm text-slate-100" title={cityAndArea || "غير محدد"}>
                    {cityAndArea || "غير محدد"}
                  </strong>
                </div>
              </div>
              <div className="flex min-w-0 gap-3 p-3.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-300">
                  <UserRoundCheck size={17} />
                </span>
                <div className="min-w-0">
                  <span className="block text-[10px] font-black text-slate-500">
                    العنوان المعتمد
                  </span>
                  <strong className="mt-1 line-clamp-2 text-sm leading-5 text-slate-100" title={savedAddress || "لا يوجد عنوان محفوظ"}>
                    {savedAddress || "لا يوجد عنوان محفوظ"}
                  </strong>
                </div>
              </div>
            </div>

            {(favorite || permanentNote) && (
              <div className="flex gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-300">
                  <Sparkles size={17} />
                </span>
                <div>
                  <div className="text-xs font-black text-emerald-300">
                    لمسة شخصية للمكالمة
                  </div>
                  <p className="mt-1 text-xs leading-6 text-slate-300">
                    {favorite ? `غالباً يطلب ${favorite}` : ""}
                    {favorite && permanentNote ? " — " : ""}
                    {permanentNote ? `تذكّر: ${permanentNote}` : ""}
                  </p>
                </div>
              </div>
            )}

            {favorites.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-2 text-[11px] font-black text-slate-400">
                  <Gift size={14} className="text-sky-300" />
                  الأصناف المتكررة
                </div>
                <div className="flex flex-wrap gap-2">
                  {favorites.slice(0, 3).map((item) => (
                    <span
                      key={item.item_id}
                      className="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-slate-200"
                      title={item.item_name_ar || item.item_name}
                    >
                      <span className="min-w-0 truncate">
                        {item.item_name_ar || item.item_name}
                      </span>
                      <span className="text-slate-500">{item.order_count}×</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <footer className="shrink-0 border-t border-slate-800 bg-slate-950 px-4 py-4 sm:px-6">
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={adoptCustomer}
              disabled={blocked || loading || error}
              className="group flex min-h-14 items-center gap-3 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-right text-white transition hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-black/15 transition group-hover:bg-black/20">
                <ShoppingCart size={18} />
              </span>
              <span className="min-w-0">
                <strong className="block text-sm font-black">اعتماد العميل</strong>
                <span className="mt-0.5 block text-[10px] font-bold text-emerald-100/80">
                  الاسم والهاتف والعنوان
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={adoptLastOrder}
              disabled={!lastOrder || blocked || loading || error}
              title={!lastOrder ? "لا يوجد طلب سابق" : undefined}
              className="group flex min-h-14 items-center gap-3 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3.5 py-2.5 text-right text-sky-100 transition hover:border-sky-400/50 hover:bg-sky-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900 disabled:text-slate-600"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sky-500/15 transition group-hover:bg-sky-500/25">
                <History size={18} />
              </span>
              <span className="min-w-0">
                <strong className="block text-sm font-black">اعتماد آخر طلب</strong>
                <span className="mt-0.5 block text-[10px] font-bold text-sky-100/65">
                  العميل والعنوان وجميع الأصناف
                </span>
              </span>
            </button>
          </div>

          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setAnswered(true)}
              disabled={answered}
              title="يؤكد جاهزية الموظف داخل الواجهة فقط ولا يرد على خط الهاتف"
              className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-black text-red-200 transition hover:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:border-emerald-500/30 disabled:bg-emerald-500/10 disabled:text-emerald-300"
            >
              <Check size={15} />
              {answered ? "تم تأكيد الرد" : "تأكيد الرد داخل الواجهة"}
            </button>
            <button
              type="button"
              onClick={() => onQuickComplaint?.(customer, lastOrder?.id)}
              disabled={!onQuickComplaint}
              className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-black text-amber-200 transition hover:bg-amber-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900 disabled:text-slate-600"
            >
              <MessageSquareWarning size={15} />
              شكوى سريعة
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenFullProfile(customer);
              }}
              className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-black text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
            >
              <ExternalLink size={15} />
              رؤية التفاصيل
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
};
