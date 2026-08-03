import React, { useCallback, useEffect, useRef, useState } from "react";
import { X, User, ShoppingCart, Star, MapPin, MessageSquare, AlertTriangle, CreditCard, Phone, Mail, Calendar, Clock, Store, Package, ChevronLeft, Loader2, FileText, Percent, Ban, Plus, Heart, Flag, Bell, ExternalLink, Trash2, Edit3, Check, Copy, RefreshCw, Award, TrendingUp, AlertCircle, Building2, Headphones, UtensilsCrossed, Users, Activity, ChevronDown, ChevronUp, Timer, Truck } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CustomerProfile, CustomerComplaint, FavoriteItem, OrderDetail, ComplaintFollowup, CustomerAddress, CustomerOccasion, CustomerNote, CustomerSearchResult } from "./services/callCenterService";
import { callCenterService, CUSTOMER_CATEGORY_LABELS, type CustomerCategory } from "./services/callCenterService";
import { feedbackDraftFrom, feedbackPayload, feedbackValidationMessage } from "./feedbackFlow";
import { useTheme } from "../../theme";

interface Props {
  isOpen?: boolean;
  customerId: number;
  onClose: () => void;
  onSelectCustomer?: (customer: CustomerSearchResult) => void;
  onSelectAddress?: (address: CustomerAddress) => void;
  onRepeatOrder?: (order: OrderDetail) => void;
  onApplyLoyaltyDiscount?: (amount: number) => void;
}

type Tab = "overview" | "orders" | "addresses" | "occasions" | "complaints" | "loyalty" | "notes" | "finance";

const useDialogFocus = (open: boolean, onClose: () => void) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.querySelector<HTMLElement>("button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])")?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !dialog) return;
      const items = [...dialog.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])")];
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.removeEventListener("keydown", keydown); previous?.focus(); };
  }, [open, onClose]);
  return ref;
};

export const CustomerProfileDrawer: React.FC<Props> = ({ isOpen = true, customerId, onClose, onSelectCustomer, onSelectAddress, onRepeatOrder, onApplyLoyaltyDiscount }) => {
  const { theme } = useTheme();
  const dialogRef = useDialogFocus(isOpen, onClose);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [complaints, setComplaints] = useState<CustomerComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedComplaintId, setSelectedComplaintId] = useState<number | null>(null);
  const [upcomingOccasion, setUpcomingOccasion] = useState<CustomerOccasion | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    let attempts = 0;
    const maxAttempts = 3;
    while (attempts < maxAttempts) {
      attempts += 1;
      try {
        const fullProfileRes = await callCenterService.getCustomerFullProfile(customerId);
        const [favoritesRes, complaintsRes, occasionsRes] = await Promise.allSettled([
          callCenterService.getCustomerFavorites(customerId),
          callCenterService.getCustomerComplaints(customerId),
          callCenterService.getCustomerOccasions(customerId),
        ]);
        setProfile(fullProfileRes.data.profile);
        setOrders(fullProfileRes.data.orders.slice(0, 5));
        setFavorites(favoritesRes.status === "fulfilled" ? favoritesRes.value.data ?? [] : []);
        setComplaints(complaintsRes.status === "fulfilled" ? complaintsRes.value.data?.data ?? [] : []);
        const now = new Date();
        const occasions = occasionsRes.status === "fulfilled" ? occasionsRes.value.data ?? [] : [];
        const withinSevenDays = occasions.find((occasion) => {
          const date = new Date(occasion.date);
          date.setFullYear(now.getFullYear());
          if (date < now) date.setFullYear(now.getFullYear() + 1);
          const days = (date.getTime() - now.getTime()) / 86400000;
          return days >= 0 && days <= 7;
        });
        setUpcomingOccasion(withinSevenDays ?? null);
        setLoading(false);
        return;
      } catch {
        if (attempts < maxAttempts) {
          await new Promise(resolve => window.setTimeout(resolve, attempts * 500));
        }
      }
    }
    setLoadError("تعذر تحميل ملف العميل بعد 3 محاولات. تحقق من الاتصال ثم أعد المحاولة.");
    setLoading(false);
  }, [customerId]);

  useEffect(() => { if (isOpen && customerId) load(); }, [customerId, isOpen, load]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    load();
  };

  const handleFeedbackSaved = (orderId: number, feedback: OrderDetail["feedback"]) => {
    setOrders(current => current.map(order => order.id === orderId ? { ...order, feedback } : order));
  };

  const openComplaintCount = complaints.filter((complaint) => !["resolved", "closed", "cancelled"].includes(complaint.status)).length;
  const badges = {
    orders: orders.length || undefined,
    complaints: openComplaintCount || undefined,
  };

  const tabs: { key: Tab; label: string; icon: React.ElementType; badge?: string | number }[] = [
    { key: "overview", label: "نظرة عامة", icon: User },
    { key: "orders", label: "الطلبات", icon: ShoppingCart, badge: badges.orders },
    { key: "addresses", label: "العناوين", icon: MapPin },
    { key: "occasions", label: "المناسبات", icon: Calendar },
    { key: "complaints", label: "الشكاوى", icon: AlertTriangle, badge: badges.complaints },
    { key: "loyalty", label: "الولاء", icon: Star },
    { key: "notes", label: "ملاحظات", icon: MessageSquare },
    { key: "finance", label: "المالي", icon: CreditCard },
  ];

  const handleSelect = () => {
    if (onSelectCustomer && profile) {
      onSelectCustomer({
        id: profile.customer.id,
        name: profile.customer.name,
        phone: profile.customer.phone,
        mobile: profile.customer.mobile,
        code: profile.customer.code,
        status: profile.customer.status,
        category: profile.customer.category,
        city: profile.customer.city,
        address: profile.customer.address,
        branch_id: profile.customer.branch_id,
      });
      onClose();
    }
  };

  const handleSelectAddress = (address: CustomerAddress) => {
    if (profile && onSelectCustomer) {
      onSelectCustomer({
        id: profile.customer.id,
        name: profile.customer.name,
        phone: profile.customer.phone,
        mobile: profile.customer.mobile,
        code: profile.customer.code,
        status: profile.customer.status,
        category: profile.customer.category,
        city: profile.customer.city,
        address: profile.customer.address,
        branch_id: profile.customer.branch_id,
        selectedAddress: address,
      } as CustomerSearchResult & { selectedAddress: CustomerAddress });
    } else {
      onSelectAddress?.(address);
    }
    onClose();
  };

  if (selectedOrderId) {
    return <OrderDetailsDrawer orderId={selectedOrderId} onBack={() => setSelectedOrderId(null)} onClose={onClose} onReOrder={(onRepeatOrder || onSelectCustomer) ? (order: OrderDetail) => { if (onRepeatOrder) onRepeatOrder(order); else onSelectCustomer?.({ ...profile!.customer, lastOrder: order } as any); onClose(); } : undefined} />;
  }

  if (selectedComplaintId) {
    return <ComplaintDetailDrawer complaintId={selectedComplaintId} onBack={() => setSelectedComplaintId(null)} onClose={onClose} />;
  }

  return (
    <div className={`fixed inset-0 z-[300] transition-[visibility] ${isOpen ? "visible" : "invisible pointer-events-none"}`} dir="rtl" aria-hidden={!isOpen} role="dialog" aria-modal="true" aria-label="ملف العميل الكامل">
      <div className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`} onClick={onClose} aria-hidden="true" />
      <div ref={dialogRef} style={{ "--cp-page": theme === "dark" ? "#0B0F12" : "#F5F7F9", "--cp-card": theme === "dark" ? "#161B22" : "#FFFFFF", "--cp-soft": theme === "dark" ? "#11161C" : "#F8FAFC", "--cp-text": theme === "dark" ? "#F0F6FC" : "#18212F", "--cp-muted": theme === "dark" ? "#8B949E" : "#667085", "--cp-border": theme === "dark" ? "#30363D" : "#E4E7EC", "--cp-accent": "#A30000" } as React.CSSProperties} className={`absolute top-0 bottom-0 right-0 flex w-full transform flex-col overflow-hidden border-l border-[var(--cp-border)] bg-[var(--cp-page)] text-[var(--cp-text)] shadow-2xl shadow-slate-950/20 transition-transform duration-300 ease-out sm:w-[78vw] sm:min-w-[820px] sm:max-w-[1320px] ${isOpen ? "translate-x-0" : "translate-x-full"}`}>
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--cp-border)] bg-[var(--cp-card)] px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E4E7EC] bg-[#F8FAFC]">
              <User size={16} className="text-[#2563EB]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[var(--cp-text)]">ملف العميل</h3>
              {profile && <p className="text-[10px] text-slate-400 font-medium">{profile.customer.name}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} aria-label="إغلاق ملف العميل" className="rounded-lg p-2 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
              <X size={16} className="text-slate-500" />
            </button>
          </div>
        </div>

        {/* Upcoming Occasion Banner */}
        {/* Modern Tab Bar */}
        <div ref={tabsRef} className="sticky top-0 z-20 shrink-0 overflow-x-auto border-b border-[var(--cp-border)] bg-[var(--cp-card)] scrollbar-thin scrollbar-track-transparent">
          <div className="flex gap-0.5 px-2 py-2 min-w-max">
            {tabs.map(({ key, label, icon: Icon, badge }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`
                  relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all duration-150
                  ${activeTab === key
                    ? "border border-[#A30000]/25 bg-[#A30000]/10 text-[#A30000]"
                    : "border border-transparent text-[var(--cp-muted)] hover:bg-[var(--cp-soft)] hover:text-[var(--cp-text)]"
                  }
                `}
              >
                <Icon size={13} className={activeTab === key ? "text-[#A30000]" : "text-[var(--cp-muted)]"} />
                <span>{label}</span>
                {badge !== undefined && badge !== null && (
                  <span className={`
                    text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none
                    ${badge === "!"
                      ? "bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30"
                      : key === "complaints" && typeof badge === "number" && badge > 0
                        ? "bg-red-500/20 text-red-300 border border-red-500/30"
                        : "bg-slate-700 text-slate-300 border border-slate-600/50"
                    }
                  `}>
                    {badge === "!" ? <><span className="animate-pulse">●</span> {badge}</> : badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
          {loading ? (
            <div className="space-y-4 py-3" aria-label="جاري تحميل ملف العميل">
              <div className="flex items-center gap-3 p-3">
                <div className="w-14 h-14 rounded-full bg-slate-800/70 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-2/3 rounded-lg bg-slate-800/70 animate-pulse" />
                  <div className="h-3 w-1/3 rounded-lg bg-slate-800/50 animate-pulse" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-24 rounded-xl bg-slate-800/70 animate-pulse" />
                ))}
              </div>
              <div className="space-y-2">
                {[1, 2].map(i => (
                  <div key={i} className="h-16 rounded-xl bg-slate-800/50 animate-pulse" />
                ))}
              </div>
            </div>
          ) : loadError ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
              <AlertTriangle size={32} className="text-red-400" />
              <p className="text-sm text-slate-300">{loadError}</p>
              <button onClick={handleRetry} className="flex items-center gap-2 rounded-lg bg-gradient-to-br from-red-600 to-red-700 px-5 py-2.5 text-xs font-bold text-white hover:from-red-500 hover:to-red-600 transition-all active:scale-95 shadow-md shadow-red-700/20">
                <RefreshCw size={14} />
                إعادة المحاولة
              </button>
            </div>
          ) : activeTab === "overview" && profile ? (
            <OverviewTab profile={profile} favorites={favorites} orders={orders} upcomingOccasion={upcomingOccasion} openComplaintCount={openComplaintCount} onSelectOrder={setSelectedOrderId} onRepeatOrder={onRepeatOrder ? (order) => { onRepeatOrder(order); onClose(); } : undefined} onFeedbackSaved={handleFeedbackSaved} />
          ) : activeTab === "orders" ? (
            <OrdersTab orders={orders} onSelectOrder={setSelectedOrderId} onRepeatOrder={onRepeatOrder ? (order) => { onRepeatOrder(order); onClose(); } : undefined} onFeedbackSaved={handleFeedbackSaved} />
          ) : activeTab === "addresses" ? (
            <AddressesTab customerId={customerId} onAddressSelect={onSelectCustomer || onSelectAddress ? handleSelectAddress : undefined} />
          ) : activeTab === "occasions" ? (
            <OccasionsTab customerId={customerId} />
          ) : activeTab === "complaints" ? (
            <ComplaintsTab complaints={complaints} onSelectComplaint={setSelectedComplaintId} customerId={customerId} />
          ) : activeTab === "loyalty" && profile ? (
            <LoyaltyTab points={profile.loyalty_points ?? profile.customer.loyalty_points ?? 0} />
          ) : activeTab === "notes" ? (
            <NotesTab customerId={customerId} />
          ) : activeTab === "finance" && profile ? (
            <FinanceTab profile={profile} />
          ) : null}
        </div>
      </div>
    </div>
  );
};

const FinanceTab: React.FC<{ profile: CustomerProfile }> = ({ profile }) => {
  const hasFinancialProfile = Number(profile.customer.credit_limit || 0) > 0 || Number(profile.balance || 0) !== 0;
  return <div className="space-y-4">
    <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-3 text-xs leading-6 text-sky-100">
      هذه البيانات للعرض فقط. ملف CRM منفصل عن الذمم والمحاسبة، ولا يمكن إنشاء دفعة أو قيد من هنا.
    </div>
    {hasFinancialProfile ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <StatCard label="رصيد الذمة" value={`${Number(profile.balance).toFixed(2)} ₪`} icon={<Wallet size={14} />} highlight={Number(profile.balance) > 0} />
      <StatCard label="الحد الائتماني" value={`${Number(profile.customer.credit_limit).toFixed(2)} ₪`} icon={<CreditCard size={14} />} />
      <StatCard label="المتاح" value={`${Number(profile.available_credit).toFixed(2)} ₪`} icon={<TrendingUp size={14} />} highlight={profile.is_over_limit} />
      <StatCard label="حالة الحد" value={profile.is_over_limit ? "متجاوز" : "ضمن الحد"} icon={<Check size={14} />} highlight={profile.is_over_limit} />
    </div> : <EmptyState icon={CreditCard} text="لا يوجد ملف مالي مفعل لهذا العميل" />}
  </div>;
};

const orderSourceStyle: Record<string, { label: string; dot: string; badge: string }> = {
  dine_in: { label: "صالة عائلات", dot: "bg-[#0F766E]", badge: "border-[#99F6E4] bg-[#F0FDFA] text-[#115E59]" },
  call_center: { label: "فوري", dot: "bg-[#2563EB]", badge: "border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]" },
  delivery: { label: "ديلفري", dot: "bg-[#7C3AED]", badge: "border-[#DDD6FE] bg-[#F5F3FF] text-[#6D28D9]" },
  takeaway: { label: "سفري", dot: "bg-[#B45309]", badge: "border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]" },
};
const branchDots = ["bg-[#0891B2]", "bg-[#4F46E5]", "bg-[#15803D]", "bg-[#BE123C]", "bg-[#9333EA]", "bg-[#C2410C]"];
type SavedFeedback = NonNullable<OrderDetail["feedback"]>;
const HONORIFIC_OPTIONS = ["", "الدكتور", "المهندس", "الأستاذ", "المحامي", "الشيخ", "الحاج", "السيد", "السيدة", "other"] as const;
const CHART_COLORS = ["#A30000", "#0F766E", "#2563EB", "#7C3AED", "#B45309", "#15803D", "#BE123C"];
export const getPreviousOrders = <T,>(orders: T[], limit = 5): T[] => orders.slice(1, limit + 1);
export const toggleExclusiveId = (currentId: number | null, clickedId: number): number | null => currentId === clickedId ? null : clickedId;
export const getChartDomainMax = (max: number): number => Math.max(2, Math.ceil(max * 1.2));

const InlineOrderCard: React.FC<{
  order: OrderDetail; expanded: boolean; ratingOpen: boolean; featured?: boolean;
  onToggle?: () => void; onRatingOpen: () => void; onRatingClose: () => void;
  onDetails: (id: number) => void; onRepeat?: (order: OrderDetail) => void;
  onFeedbackSaved: (id: number, feedback: SavedFeedback) => void;
}> = ({ order, expanded, ratingOpen, featured, onToggle, onRatingOpen, onRatingClose, onDetails, onRepeat, onFeedbackSaved }) => {
  const [draft, setDraft] = useState(() => feedbackDraftFrom(order.feedback));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const source = orderSourceStyle[order.order_type || order.source || ""] || { label: "غير محدد", dot: "bg-[#667085]", badge: "border-[#D0D5DD] bg-[#F8FAFC] text-[#475467]" };
  const date = new Date(order.created_at);
  useEffect(() => { if (ratingOpen) { setDraft(feedbackDraftFrom(order.feedback)); setMessage(""); } }, [ratingOpen, order.feedback]);
  const save = async () => {
    const validation = feedbackValidationMessage(draft, order.order_type);
    if (validation) return setMessage(validation);
    if (!order.customer_id) return setMessage("الطلب غير مرتبط بعميل.");
    setSaving(true); setMessage("");
    try { const response = await callCenterService.saveOrderFeedback(order.customer_id, order.id, feedbackPayload(draft, order.order_type)); onFeedbackSaved(order.id, response.data); setMessage("تم حفظ التقييم"); window.setTimeout(onRatingClose, 600); }
    catch { setMessage("تعذر حفظ التقييم."); }
    finally { setSaving(false); }
  };
  const Rating = ({ label, value }: { label: string; value?: number | null }) => <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--cp-text)]"><span className="text-[var(--cp-muted)]">{label}</span><Star size={13} className="fill-[#F59E0B] text-[#F59E0B]" />{value || 0}/5</span>;
  return <article className={`overflow-hidden rounded-lg border bg-[var(--cp-card)] ${featured ? "border-[#A30000]/35" : "border-[var(--cp-border)]"}`}>
    <button type="button" disabled={!onToggle} onClick={onToggle} aria-expanded={expanded} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-right disabled:cursor-default">
      <div><div className="flex flex-wrap items-center gap-2">{featured && <span className="text-[11px] font-black text-[#667085]">آخر طلب</span>}<strong>{order.order_number}</strong><span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-black ${source.badge}`}><span className={`h-2 w-2 rounded-full ${source.dot}`} />{source.label}</span></div><div className="mt-2 flex flex-wrap gap-3 text-[11px] font-bold text-[#667085]"><span className="inline-flex items-center gap-1"><span className={`h-2.5 w-2.5 rounded-full ${branchDots[Math.abs(order.branch?.id || 0) % branchDots.length]}`} />{order.branch?.name || "فرع غير محدد"}</span><span>{date.toLocaleDateString("ar-SA")}</span><span>{date.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}</span></div></div>
      <div className="flex items-center gap-2"><strong><bdi>{Number(order.total).toFixed(2)} ₪</bdi></strong>{onToggle && (expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}</div>
    </button>
    {expanded && <div className="border-t border-[var(--cp-border)] px-4 pb-4"><div className="divide-y divide-[var(--cp-border)] py-2">{order.items?.map(item => <div key={item.id} className="flex justify-between gap-3 py-2 text-xs"><div><strong>{item.item_name_ar || item.item_name}</strong>{item.notes && <p className="text-[11px] text-[var(--cp-muted)]">{item.notes}</p>}</div><span><bdi>{item.quantity} × {Number(item.total).toFixed(2)} ₪</bdi></span></div>)}</div>
      {!ratingOpen ? <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--cp-border)] pt-3">{order.feedback ? <div className="flex flex-wrap gap-3"><Rating label="جودة الأصناف" value={order.feedback.food_quality} /><Rating label="الخدمة" value={order.feedback.service_quality} /></div> : <span className="text-xs text-[var(--cp-muted)]">لم يُسجل تقييم.</span>}<button type="button" onClick={onRatingOpen} className="rounded-md border border-[var(--cp-border)] px-3 py-2 text-xs font-black">{order.feedback ? "تعديل التقييم" : "إضافة تقييم"}</button></div> : <div className="border-t border-[var(--cp-border)] bg-[var(--cp-soft)] p-3">{([["food_quality","جودة الأصناف"],["service_quality","جودة الخدمة"],...(order.order_type === "delivery" ? [["delivery_speed","سرعة التوصيل"]] : [])] as Array<["food_quality"|"service_quality"|"delivery_speed",string]>).map(([key,label]) => <div key={key} className="mb-2 flex items-center justify-between gap-2"><span className="text-xs font-bold">{label}</span><div className="flex gap-1">{[1,2,3,4,5].map(value => <button key={value} type="button" aria-label={`${label} ${value} من 5`} onClick={() => setDraft(current => ({ ...current, [key]: value }))} className={`flex h-8 w-8 items-center justify-center rounded-md border ${Number(draft[key]) >= value ? "border-[#F59E0B] bg-[#F59E0B]/10 text-[#B45309]" : "border-[var(--cp-border)] bg-[var(--cp-card)] text-[var(--cp-muted)]"}`}><Star size={14} className={Number(draft[key]) >= value ? "fill-current" : ""} /></button>)}</div></div>)}<textarea value={draft.notes} onChange={event => setDraft(current => ({ ...current, notes: event.target.value }))} placeholder="ملاحظة اختيارية" className="mt-1 w-full rounded-md border border-[var(--cp-border)] bg-[var(--cp-card)] p-2 text-xs text-[var(--cp-text)]" />{message && <p className="mt-2 text-xs font-bold">{message}</p>}<div className="mt-2 flex justify-end gap-2"><button type="button" onClick={onRatingClose} className="rounded-md border border-[var(--cp-border)] px-3 py-2 text-xs">إلغاء</button><button type="button" disabled={saving} onClick={() => void save()} className="rounded-md bg-[#A30000] px-4 py-2 text-xs font-black text-white">{saving ? "جارٍ الحفظ..." : "حفظ"}</button></div></div>}
      <div className="mt-3 flex justify-end gap-2 border-t border-[#E4E7EC] pt-3"><button type="button" onClick={() => onDetails(order.id)} className="rounded-md border border-[#D0D5DD] px-3 py-2 text-xs font-black">التفاصيل الكاملة</button>{onRepeat && <button type="button" onClick={() => onRepeat(order)} className="rounded-md bg-[#2563EB] px-3 py-2 text-xs font-black text-white">اعتماد الطلب</button>}</div>
    </div>}
  </article>;
};

/* Restructured overview */
const OverviewTab: React.FC<{ profile: CustomerProfile; favorites: FavoriteItem[]; orders: OrderDetail[]; upcomingOccasion: CustomerOccasion | null; openComplaintCount: number; onSelectOrder: (id: number) => void; onRepeatOrder?: (order: OrderDetail) => void; onFeedbackSaved: (id: number, feedback: SavedFeedback) => void }> = ({ profile, favorites, orders, upcomingOccasion, openComplaintCount, onSelectOrder, onRepeatOrder, onFeedbackSaved }) => {
  const c = profile.customer;
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(c.title || "");
  const [titleChoice, setTitleChoice] = useState<string>(() => HONORIFIC_OPTIONS.includes((c.title || "") as typeof HONORIFIC_OPTIONS[number]) ? (c.title || "") : c.title ? "other" : "");
  const [savingTitle, setSavingTitle] = useState(false);
  const [titleMessage, setTitleMessage] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [ratingOrderId, setRatingOrderId] = useState<number | null>(null);
  const categoryLabel = c.category || "غير مصنف";

  const getCategoryBadge = () => {
    const cat = (c.category || "").toLowerCase();
    switch (cat) {
      case "vip": return { bg: "from-amber-50 to-amber-50 border-amber-200 text-amber-900", icon: <Award size={12} />, label: "VIP" };
      case "important": return { bg: "from-emerald-50 to-emerald-50 border-emerald-200 text-emerald-900", icon: <Star size={12} />, label: "مهم" };
      case "regular": return { bg: "from-blue-50 to-blue-50 border-blue-200 text-blue-900", icon: <User size={12} />, label: "عادي" };
      case "new": return { bg: "from-sky-50 to-sky-50 border-sky-200 text-sky-900", icon: <Activity size={12} />, label: "جديد" };
      case "follow_up": return { bg: "from-violet-50 to-violet-50 border-violet-200 text-violet-900", icon: <Bell size={12} />, label: "متابعة" };
      case "complaints": return { bg: "from-red-50 to-red-50 border-red-200 text-red-900", icon: <AlertTriangle size={12} />, label: "شكاوى" };
      case "inactive": return { bg: "from-slate-50 to-slate-50 border-slate-200 text-slate-700", icon: <Ban size={12} />, label: "غير نشط" };
      default: return { bg: "from-slate-50 to-slate-50 border-slate-200 text-slate-700", icon: <User size={12} />, label: categoryLabel };
    }
  };

  const catBadge = getCategoryBadge();

  const updateCategory = async (newCategory: CustomerCategory) => {
    setSavingCategory(true);
    try {
      await callCenterService.updateCustomerClassification(c.id, newCategory);
      c.category = newCategory;
      setShowCategoryDropdown(false);
    } catch { }
    finally { setSavingCategory(false); }
  };

  const saveTitle = async () => {
    setSavingTitle(true); setTitleMessage("");
    try {
      const nextTitle = (titleChoice === "other" ? titleDraft : titleChoice).trim() || null;
      const response = await callCenterService.updateCustomerTitle(c.id, nextTitle);
      c.title = response.data.title;
      setTitleDraft(response.data.title || "");
      setTitleChoice(HONORIFIC_OPTIONS.includes((response.data.title || "") as typeof HONORIFIC_OPTIONS[number]) ? (response.data.title || "") : response.data.title ? "other" : "");
      setEditingTitle(false); setTitleMessage("تم حفظ اللقب");
    } catch { setTitleMessage("تعذر حفظ اللقب"); }
    finally { setSavingTitle(false); }
  };

  const lastOrder = orders[0];
  const topItems = favorites
    .map((item) => ({
      name: item.item_name_ar || item.item_name,
      shortName: (item.item_name_ar || item.item_name).length > 14 ? `${(item.item_name_ar || item.item_name).slice(0, 13)}…` : (item.item_name_ar || item.item_name),
      orders: Number(item.order_count || item.orders_count || 0),
    }))
    .filter((item) => item.orders > 0)
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 7);

  // حساب أيام منذ آخر طلب
  const daysSinceLastOrder = profile.last_order_at
    ? Math.floor((Date.now() - new Date(profile.last_order_at).getTime()) / 86400000)
    : null;

  return (
    <div className="space-y-4">
      {/* â”€â”€â”€ Customer Header with Editable Classification â”€â”€â”€ */}
      <div className="rounded-lg border border-[var(--cp-border)] bg-[var(--cp-card)] p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-red-100 bg-red-50">
              <User size={20} className="text-red-600" />
            </div>
            <div>
              {editingTitle ? <div className="flex flex-wrap items-center gap-2"><label className="sr-only" htmlFor="customer-honorific">اللقب</label><select id="customer-honorific" autoFocus value={titleChoice} onChange={event => { setTitleChoice(event.target.value); if (event.target.value !== "other") setTitleDraft(event.target.value); }} className="h-9 rounded-md border border-[var(--cp-border)] bg-[var(--cp-card)] px-2 text-sm text-[var(--cp-text)] outline-none focus:border-[#A30000]"><option value="">بدون لقب</option><option value="الدكتور">الدكتور</option><option value="المهندس">المهندس</option><option value="الأستاذ">الأستاذ</option><option value="المحامي">المحامي</option><option value="الشيخ">الشيخ</option><option value="الحاج">الحاج</option><option value="السيد">السيد</option><option value="السيدة">السيدة</option><option value="other">أخرى</option></select>{titleChoice === "other" && <input value={titleDraft} onChange={event => setTitleDraft(event.target.value)} maxLength={32} placeholder="اكتب اللقب" className="h-9 w-32 rounded-md border border-[var(--cp-border)] bg-[var(--cp-card)] px-2 text-sm text-[var(--cp-text)] outline-none focus:border-[#A30000]" />}<h2 className="text-lg font-black text-[var(--cp-text)]">{c.name}</h2><button type="button" onClick={() => void saveTitle()} disabled={savingTitle} aria-label="حفظ اللقب" className="flex h-9 w-9 items-center justify-center rounded-md bg-[#A30000] text-white disabled:opacity-60">{savingTitle ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}</button><button type="button" onClick={() => { setTitleDraft(c.title || ""); setTitleChoice(HONORIFIC_OPTIONS.includes((c.title || "") as typeof HONORIFIC_OPTIONS[number]) ? (c.title || "") : c.title ? "other" : ""); setEditingTitle(false); setTitleMessage(""); }} aria-label="إلغاء تعديل اللقب" className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--cp-border)]"><X size={14} /></button></div> : <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-black text-[var(--cp-text)]">{c.title ? `${c.title} ` : ""}{c.name}</h2><button type="button" onClick={() => setEditingTitle(true)} className="inline-flex min-h-8 items-center gap-1 rounded-md border border-[var(--cp-border)] px-2 text-[11px] font-bold text-[var(--cp-muted)]"><Edit3 size={13} />{c.title ? "تعديل اللقب" : "إضافة لقب"}</button></div>}
              {titleMessage && <p className={`mt-1 text-[11px] font-bold ${titleMessage.startsWith("تم ") ? "text-[#15803D]" : "text-[#C2414C]"}`}>{titleMessage}</p>}
              <div className="flex items-center gap-2 mt-1.5">
                {/* Phone next to name */}
                {c.phone && (
                  <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">
                    <Phone size={10} />
                    {c.phone}
                  </a>
                )}
                {c.mobile && c.mobile !== c.phone && (
                  <a href={`tel:${c.mobile}`} className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 hover:bg-blue-500/20 transition-colors">
                    <Phone size={10} />
                    {c.mobile}
                  </a>
                )}
                <span className="text-[10px] text-slate-500 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700/50 font-mono tracking-wider">{c.code}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Editable Classification - replaces old "نشط" badge */}
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <div className="relative">
            <button
              onClick={() => setShowCategoryDropdown(v => !v)}
              disabled={savingCategory}
              className={`text-[11px] font-bold px-3 py-1.5 rounded-full border bg-gradient-to-l ${catBadge.bg} inline-flex items-center gap-1.5 hover:opacity-80 transition-all active:scale-95`}
            >
              {savingCategory ? <Loader2 size={12} className="animate-spin" /> : catBadge.icon}
              {catBadge.label}
              {showCategoryDropdown ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
            {showCategoryDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowCategoryDropdown(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 w-44 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl shadow-black/40 overflow-hidden">
                  {(Object.entries(CUSTOMER_CATEGORY_LABELS) as [CustomerCategory, string][]).map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => updateCategory(value)}
                      className={`w-full text-right px-3 py-2 text-xs font-bold hover:bg-white/5 transition-colors flex items-center gap-2 ${value === (c.category || "").toLowerCase() ? "text-red-400 bg-red-500/10" : "text-slate-300"}`}
                    >
                      {value === "vip" && <Award size={12} />}
                      {value === "important" && <Star size={12} />}
                      {value === "regular" && <User size={12} />}
                      {value === "new" && <Activity size={12} />}
                      {value === "follow_up" && <Bell size={12} />}
                      {value === "complaints" && <AlertTriangle size={12} />}
                      {value === "inactive" && <Ban size={12} />}
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          {(c as any).email && (
            <span className="inline-flex items-center gap-1.5 bg-slate-800/80 text-slate-400 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-slate-700/50">
              <Mail size={11} />
              {(c as any).email}
            </span>
          )}
        </div>
      </div>

      {(openComplaintCount > 0 || upcomingOccasion) && (
        <section className="rounded-lg border border-amber-500/35 bg-amber-500/10 p-4" aria-label="تنبيهات العميل">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-700" />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-black text-[var(--cp-text)]">تنبيهات تحتاج الانتباه</h3>
              <div className="mt-2 grid gap-2 text-xs font-bold text-[var(--cp-text)] sm:grid-cols-2">
                {openComplaintCount > 0 && <p>لدى العميل {openComplaintCount} شكوى مفتوحة تحتاج إلى متابعة.</p>}
                {upcomingOccasion && <p>مناسبة قريبة: {upcomingOccasion.title} في {new Date(upcomingOccasion.date).toLocaleDateString("ar-SA")}.</p>}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* â”€â”€â”€ Customer Analytics Card (Merged Metrics + Dates + Favorite) â”€â”€â”€ */}
      <div className="rounded-lg border border-[var(--cp-border)] bg-[var(--cp-card)] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity size={14} className="text-red-400" />
          <h4 className="text-sm font-black text-[var(--cp-text)]">تحليلات العميل</h4>
        </div>

        {/* Main metrics grid */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {/* Avg Order Value */}
          <div className="rounded-lg border border-[var(--cp-border)] bg-[var(--cp-soft)] p-3">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold mb-1">
              <TrendingUp size={12} />
              متوسط قيمة الطلب
            </div>
            <div className="text-lg font-black text-[var(--cp-text)]">
              {profile.avg_order_value ? profile.avg_order_value.toFixed(2) : "0.00"}
              <span className="text-xs text-slate-500 mr-1 font-bold">₪</span>
            </div>
          </div>
          {/* Monthly Orders */}
          <div className="rounded-lg border border-[var(--cp-border)] bg-[var(--cp-soft)] p-3">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold mb-1">
              <ShoppingCart size={12} />
              معدل الطلبات الشهري
            </div>
            <div className="text-lg font-black text-[var(--cp-text)]">
              {profile.monthly_orders_count ?? 0}
              <span className="text-xs text-slate-500 mr-1 font-bold">/ شهر</span>
            </div>
          </div>
        </div>

      </div>

      <div className="rounded-lg border border-[var(--cp-border)] bg-[var(--cp-card)] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h5 className="text-sm font-black text-[var(--cp-text)]">الأصناف الأكثر طلبًا</h5>
              <p className="mt-0.5 text-[11px] text-slate-500">مرتبة حسب عدد مرات الطلب</p>
            </div>
            <Heart size={16} className="text-rose-500" />
          </div>
          {topItems.length > 0 ? (
            <div className="h-64 w-full" role="img" aria-label="رسم عمودي للأصناف الأكثر طلبًا">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topItems} margin={{ top: 24, right: 4, left: 4, bottom: 28 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--cp-border)" />
                  <XAxis dataKey="shortName" tick={{ fill: "#667085", fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-18} textAnchor="end" height={52} />
                  <YAxis allowDecimals={false} domain={[0, getChartDomainMax]} tick={{ fill: "#667085", fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip cursor={{ fill: "#F8FAFC" }} formatter={(value) => [`${value} مرة`, "عدد الطلبات"]} labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ""} contentStyle={{ direction: "rtl", borderRadius: 8, borderColor: "#D0D5DD", fontSize: 12 }} />
                  <Bar dataKey="orders" radius={[4, 4, 0, 0]} maxBarSize={54}>{topItems.map((item, index) => <Cell key={item.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}<LabelList dataKey="orders" position="top" fill="var(--cp-text)" fontSize={11} fontWeight={800} /></Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-44 flex-col items-center justify-center border-y border-dashed border-slate-200 text-center">
              <Package size={24} className="mb-2 text-slate-300" />
              <p className="text-sm font-black text-slate-600">لا توجد بيانات كافية للأصناف</p>
              <p className="mt-1 text-xs text-slate-400">سيظهر الرسم بعد توفر سجل طلبات كافٍ.</p>
            </div>
          )}
      </div>

      {lastOrder ? (
        <InlineOrderCard order={lastOrder} featured expanded ratingOpen={ratingOrderId === lastOrder.id} onRatingOpen={() => setRatingOrderId(lastOrder.id)} onRatingClose={() => setRatingOrderId(null)} onDetails={onSelectOrder} onRepeat={onRepeatOrder} onFeedbackSaved={onFeedbackSaved} />
      ) : (
          <div className="rounded-lg border border-dashed border-[var(--cp-border)] bg-[var(--cp-card)] py-10 text-center">
          <ShoppingCart size={28} className="mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-black text-slate-600">لا توجد طلبات سابقة</p>
        </div>
      )}


      {/* â”€â”€â”€ Enhanced Recent Orders List â”€â”€â”€ */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart size={14} className="text-slate-400" />
            <h4 className="text-xs font-black text-slate-700">آخر الطلبات</h4>
          </div>
          <span className="text-[10px] text-[var(--cp-muted)]">الطلبات السابقة</span>
        </div>
        {orders.length > 1 ? <div className="space-y-2">{getPreviousOrders(orders).map(order => <InlineOrderCard key={order.id} order={order} expanded={expandedOrderId === order.id} ratingOpen={ratingOrderId === order.id} onToggle={() => setExpandedOrderId(current => toggleExclusiveId(current, order.id))} onRatingOpen={() => setRatingOrderId(order.id)} onRatingClose={() => setRatingOrderId(null)} onDetails={onSelectOrder} onRepeat={onRepeatOrder} onFeedbackSaved={onFeedbackSaved} />)}</div> : <p className="rounded-lg border border-dashed border-[var(--cp-border)] py-6 text-center text-xs text-[var(--cp-muted)]">لا توجد طلبات سابقة إضافية.</p>}
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-[#E4E7EC] bg-white p-3"><p className="text-[11px] text-[#667085]">طلبات ملغاة</p><strong>{profile.cancelled_orders_count || 0}</strong></div>
        <div className="rounded-lg border border-[#E4E7EC] bg-white p-3"><p className="text-[11px] text-[#667085]">نقاط الولاء</p><strong>{profile.loyalty_points ?? c.loyalty_points ?? 0}</strong></div>
        <div className="rounded-lg border border-[#E4E7EC] bg-white p-3"><p className="text-[11px] text-[#667085]">آخر نشاط</p><strong className="text-xs">{profile.last_order_at ? new Date(profile.last_order_at).toLocaleDateString("ar-SA") : "لا يوجد"}</strong></div>
      </section>
    </div>
  );
};

/* â”€â”€â”€ Orders Tab â”€â”€â”€ */
const OrdersTab: React.FC<{ orders: OrderDetail[]; onSelectOrder: (id: number) => void; onRepeatOrder?: (order: OrderDetail) => void; onFeedbackSaved: (id: number, feedback: SavedFeedback) => void }> = ({ orders, onSelectOrder, onRepeatOrder, onFeedbackSaved }) => {
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [ratingOrderId, setRatingOrderId] = useState<number | null>(null);
  if (orders.length === 0) return <EmptyState icon={ShoppingCart} text="لا توجد طلبات سابقة" />;
  return (
    <div className="space-y-3">
      {orders.slice(0, 5).map((order) => (
        <InlineOrderCard key={order.id} order={order} expanded={expandedOrderId === order.id} ratingOpen={ratingOrderId === order.id} onToggle={() => setExpandedOrderId(current => current === order.id ? null : order.id)} onRatingOpen={() => setRatingOrderId(order.id)} onRatingClose={() => setRatingOrderId(null)} onDetails={onSelectOrder} onRepeat={onRepeatOrder} onFeedbackSaved={onFeedbackSaved} />
      ))}
    </div>
  );
};

const FavoritesTab: React.FC<{ items: FavoriteItem[] }> = ({ items }) => {
  if (items.length === 0) return <EmptyState icon={Heart} text="لا توجد أصناف مفضلة بعد" />;
  return (
    <div className="space-y-1">
      {items.map((item, idx) => (
        <div key={item.item_id} className="flex items-center gap-3 bg-slate-800/30 rounded-xl p-3">
          <span className="text-xs font-black text-slate-600 w-5">{idx + 1}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{item.item_name_ar || item.item_name}</p>
            <p className="text-[10px] text-slate-500">
              طلب {item.order_count} مرة • إجمالي {item.total_quantity} قطعة
            </p>
            {item.last_ordered_at && (
              <p className="text-[10px] text-slate-600">آخر طلب: {new Date(item.last_ordered_at).toLocaleDateString("ar-SA")}</p>
            )}
          </div>
          <span className="text-xs font-bold text-slate-400 ml-1">{item.order_count}x</span>
        </div>
      ))}
    </div>
  );
};

/* â”€â”€â”€ Complaints Tab â”€â”€â”€ */
const ComplaintsTab: React.FC<{ complaints: CustomerComplaint[]; onSelectComplaint: (id: number) => void; customerId: number }> = ({ complaints, onSelectComplaint, customerId }) => {
  if (complaints.length === 0) return <EmptyState icon={AlertTriangle} text="لا توجد شكاوى" />;
  return (
    <div className="space-y-2">
      {complaints.map((c) => (
        <button key={c.id} onClick={() => onSelectComplaint(c.id)} className="w-full bg-gradient-to-br from-slate-800/50 to-slate-800/20 rounded-xl p-3 text-right hover:from-slate-800/70 hover:to-slate-800/30 transition-all border border-slate-700/30">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-bold text-white">{c.title}</span>
            <ComplaintStatusBadge status={c.status} />
          </div>
          {c.description && <p className="text-[11px] text-slate-400 mb-1 line-clamp-2">{c.description}</p>}
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <span>{new Date(c.created_at).toLocaleDateString("ar-SA")}</span>
            {c.order && <span>• الطلب {c.order.order_number}</span>}
          </div>
        </button>
      ))}
    </div>
  );
};

/* â”€â”€â”€ Addresses Tab â”€â”€â”€ */
const AddressesTab: React.FC<{ customerId: number; onAddressSelect?: (addr: CustomerAddress) => void }> = ({ customerId, onAddressSelect }) => {
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectingId, setSelectingId] = useState<number | null>(null);
  const [form, setForm] = useState({ label: "المنزل", city: "", area: "", street: "", building_no: "", floor: "", apartment: "", landmark: "", delivery_notes: "" });
  useEffect(() => {
    callCenterService.getCustomerAddresses(customerId).then(r => setAddresses(r.data ?? [])).catch(() => { }).finally(() => setLoading(false));
  }, [customerId]);
  const createAddress = async () => {
    if (!form.city.trim() && !form.area.trim() && !form.street.trim()) { setError("أدخل المدينة أو المنطقة أو الشارع على الأقل"); return; }
    setSaving(true); setError("");
    try { const response = await callCenterService.createCustomerAddress(customerId, form); setAddresses(current => [...current, response.data]); setShowForm(false); onAddressSelect?.(response.data); }
    catch (requestError: any) { setError(requestError?.response?.data?.message || "تعذر حفظ العنوان"); }
    finally { setSaving(false); }
  };
  const selectAddress = async (address: CustomerAddress) => {
    setSelectingId(address.id);
    setError("");
    try { await callCenterService.markAddressUsed(address.id); }
    catch (requestError: any) {
      const message = String(requestError?.response?.data?.message || "");
      if (!message.includes("CustomerAddress") && !message.includes("does not exist")) {
        setError(message || "تعذر تسجيل استخدام العنوان، وتم اعتماده للطلب الحالي");
      }
    } finally { onAddressSelect?.(address); setSelectingId(null); }
  };
  if (loading) return <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-red-500" /></div>;
  return (
    <div className="space-y-2">
      {addresses.length === 0 && <EmptyState icon={MapPin} text="لا توجد عناوين مسجلة" />}
      {addresses.map((a) => (
        <div key={a.id} className="bg-gradient-to-br from-slate-800/50 to-slate-800/20 rounded-xl p-3 border border-slate-700/30">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">{a.label}</span>
              {a.is_default && <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">افتراضي</span>}
            </div>
            {onAddressSelect && (
              <button disabled={selectingId !== null} onClick={() => selectAddress(a)} aria-label={`اختيار عنوان ${a.label}`} className="flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-red-600 to-red-700 px-2.5 py-2 text-white transition-all hover:from-red-500 hover:to-red-600 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 active:scale-95 shadow-md shadow-red-700/10">
                {selectingId === a.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                <span className="text-[10px] font-black">اعتماد</span>
              </button>
            )}
          </div>
          <div className="text-[11px] text-slate-400 space-y-0.5">
            {a.city && <p>المدينة: {a.city}</p>}
            {a.area && <p>المنطقة: {a.area}</p>}
            {a.street && <p>الشارع: {a.street}</p>}
            {(a.building_no || a.floor || a.apartment) && <p>مبنى {a.building_no || "—"} طابق {a.floor || "—"} شقة {a.apartment || "—"}</p>}
            {a.landmark && <p>أقرب معلم: {a.landmark}</p>}
            {a.delivery_notes && <p className="text-amber-400">ملاحظات: {a.delivery_notes}</p>}
            {a.phone && <p className="flex items-center gap-1"><Phone size={10} />{a.phone}</p>}
            {a.last_used_at && <p className="text-slate-600">آخر استخدام: {new Date(a.last_used_at).toLocaleDateString("ar-SA")}</p>}
          </div>
        </div>
      ))}
      {error && !showForm && <p role="alert" className="text-xs font-bold text-red-400">{error}</p>}
      {showForm ? <div className="space-y-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3">
        <div className="flex gap-2">{["المنزل", "العمل"].map(label => <button key={label} onClick={() => setForm(value => ({ ...value, label }))} className={`flex-1 rounded-lg py-2 text-xs font-bold ${form.label === label ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-300"}`}>{label}</button>)}</div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{([['city', 'المدينة'], ['area', 'المنطقة'], ['street', 'الشارع'], ['building_no', 'المبنى'], ['floor', 'الطابق'], ['apartment', 'الشقة'], ['landmark', 'أقرب معلم']] as const).map(([key, label]) => <label key={key} className="text-[11px] font-bold text-slate-400">{label}<input value={form[key]} onChange={e => setForm(value => ({ ...value, [key]: e.target.value }))} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-800 px-2.5 py-2 text-xs text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500" /></label>)}</div>
        <label className="block text-[11px] font-bold text-slate-400">ملاحظات التوصيل<textarea value={form.delivery_notes} onChange={e => setForm(value => ({ ...value, delivery_notes: e.target.value }))} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-800 px-2.5 py-2 text-xs text-white" /></label>
        {error && <p role="alert" className="text-xs font-bold text-red-400">{error}</p>}
        <div className="flex gap-2"><button onClick={createAddress} disabled={saving} className="flex-1 rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-700 py-2.5 text-xs font-black text-white disabled:opacity-50 shadow-md shadow-emerald-900/20">{saving ? "جاري الحفظ..." : "حفظ واختيار العنوان"}</button><button onClick={() => setShowForm(false)} disabled={saving} className="rounded-lg bg-slate-700 px-4 text-xs font-bold text-slate-300">إلغاء</button></div>
      </div> : <button onClick={() => setShowForm(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-600 py-3 text-xs font-black text-slate-300 hover:border-emerald-500 hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"><Plus size={15} /> إضافة عنوان جديد</button>}
    </div>
  );
};

/* â”€â”€â”€ Occasions Tab â”€â”€â”€ */
const OccasionsTab: React.FC<{ customerId: number }> = ({ customerId }) => {
  const [occasions, setOccasions] = useState<CustomerOccasion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ occasion_type: "birthday", title: "", date: "", notes: "" });

  const load = () => {
    setLoading(true);
    callCenterService.getCustomerOccasions(customerId).then(r => setOccasions(r.data ?? [])).catch(() => { }).finally(() => setLoading(false));
  };
  useEffect(load, [customerId]);

  const handleCreate = async () => {
    if (!formData.title || !formData.date) return;
    await callCenterService.createCustomerOccasion(customerId, {
      occasion_type: formData.occasion_type, title: formData.title, date: formData.date, notes: formData.notes || undefined,
    });
    setShowForm(false);
    setFormData({ occasion_type: "birthday", title: "", date: "", notes: "" });
    load();
  };

  const handleDelete = async (id: number) => {
    await callCenterService.deleteCustomerOccasion(id);
    load();
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-red-500" /></div>;

  const typeLabel = (t: string) => ({ birthday: "عيد ميلاد", anniversary: "ذكرى زواج", company_founding: "تأسيس شركة", special: "مناسبة خاصة", reminder: "تذكير" }[t] || t);

  return (
    <div className="space-y-2">
      {occasions.length === 0 && !showForm && <EmptyState icon={Calendar} text="لا توجد مناسبات مسجلة" />}
      {occasions.map((o) => (
        <div key={o.id} className="bg-gradient-to-br from-slate-800/50 to-slate-800/20 rounded-xl p-3 border border-slate-700/30">
          <div className="flex items-center justify-between mb-1">
            <div>
              <span className="text-sm font-bold text-white">{o.title}</span>
              <span className="text-[10px] font-bold text-slate-500 mr-2">{typeLabel(o.occasion_type)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400">{new Date(o.date).toLocaleDateString("ar-SA")}</span>
              <button onClick={() => handleDelete(o.id)} aria-label={`حذف مناسبة ${o.title}`} className="p-2 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
          {o.notes && <p className="text-[11px] text-slate-400">{o.notes}</p>}
          <div className="flex items-center gap-2 mt-1">
            {o.repeats_annually && <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">متكرر سنوياً</span>}
            {o.preferred_contact_method && <span className="text-[9px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">{o.preferred_contact_method}</span>}
          </div>
        </div>
      ))}
      {showForm ? (
        <div className="bg-slate-800/50 rounded-xl p-3 space-y-2">
          <select value={formData.occasion_type} onChange={e => setFormData(p => ({ ...p, occasion_type: e.target.value }))} className="w-full bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-xs text-white">
            <option value="birthday">عيد ميلاد</option>
            <option value="anniversary">ذكرى زواج</option>
            <option value="company_founding">تأسيس شركة</option>
            <option value="special">مناسبة خاصة</option>
            <option value="reminder">تذكير</option>
          </select>
          <input value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} placeholder="العنوان" className="w-full bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500" />
          <input value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} type="date" className="w-full bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-xs text-white" />
          <input value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="ملاحظات" className="w-full bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500" />
          <div className="flex gap-2">
            <button onClick={handleCreate} className="flex-1 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-lg py-2 text-xs font-bold transition-all shadow-md shadow-red-700/10">حفظ</button>
            <button onClick={() => setShowForm(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg py-2 text-xs font-bold transition-colors">إلغاء</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} className="w-full flex items-center justify-center gap-1 py-2 bg-slate-800/50 hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-400 transition-all">
          <Plus size={14} /> إضافة مناسبة
        </button>
      )}
    </div>
  );
};

/* â”€â”€â”€ Loyalty Tab â”€â”€â”€ */
const LoyaltyTab: React.FC<{ points: number }> = ({ points }) => {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/10 to-amber-500/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black text-amber-300">رصيد الولاء المسجل</p>
            <p className="mt-1 text-2xl font-black text-white">{points} نقطة</p>
          </div>
          <Star size={30} className="text-amber-300" />
        </div>
        <button type="button" disabled className="mt-4 w-full cursor-not-allowed rounded-xl bg-slate-700 py-2.5 text-xs font-black text-slate-400">خصم النقاط غير متاح حتى ضبط سياسة التحويل</button>
        <div className="mt-3 rounded-lg border border-amber-400/30 bg-slate-950/40 p-2.5 text-[11px] font-bold leading-5 text-amber-100"><AlertTriangle size={13} className="ml-1 inline" /> لا توجد حالياً سياسة تحويل نقاط معتمدة من الخادم، لذلك لن يُنشأ خصم ولن تُخصم نقاط.</div>
      </section>
    </div>
  );
};

/* â”€â”€â”€ Notes Tab â”€â”€â”€ */
const NotesTab: React.FC<{ customerId: number }> = ({ customerId }) => {
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ content: "", type: "general", importance: "normal", show_during_order: false });

  const load = () => {
    setLoading(true);
    callCenterService.getCustomerNotes(customerId).then(r => setNotes(r.data ?? [])).catch(() => { }).finally(() => setLoading(false));
  };
  useEffect(load, [customerId]);

  const handleCreate = async () => {
    if (!formData.content) return;
    await callCenterService.createCustomerNote(customerId, formData);
    setShowForm(false);
    setFormData({ content: "", type: "general", importance: "normal", show_during_order: false });
    load();
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-red-500" /></div>;
  const typeLabel = (t: string) => ({ general: "عامة", delivery: "توصيل", warning: "تحذير", preference: "تفضيل", service: "خدمة عملاء", sensitive: "حساسة" }[t] || t);
  const importanceColor = (i: string) => i === "urgent" ? "text-red-400 bg-red-500/10" : i === "high" ? "text-amber-400 bg-amber-500/10" : "text-slate-400 bg-slate-500/10";

  return (
    <div className="space-y-2">
      {notes.length === 0 && !showForm && <EmptyState icon={MessageSquare} text="لا توجد ملاحظات" />}
      {notes.map((n) => (
        <div key={n.id} className="bg-gradient-to-br from-slate-800/50 to-slate-800/20 rounded-xl p-3 border border-slate-700/30">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${importanceColor(n.importance)}`}>{n.importance === "urgent" ? "عاجل" : n.importance === "high" ? "مهم" : n.importance === "normal" ? "عادي" : "منخفض"}</span>
              <span className="text-[10px] text-slate-500">{typeLabel(n.type)}</span>
              {n.show_during_order && <span className="text-[9px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">يظهر أثناء الطلب</span>}
            </div>
            <span className="text-[10px] text-slate-600">{new Date(n.created_at).toLocaleDateString("ar-SA")}</span>
          </div>
          <p className="text-xs text-white">{n.content}</p>
          {n.createdBy && <p className="text-[10px] text-slate-500 mt-1">{n.createdBy.name}</p>}
        </div>
      ))}
      {showForm ? (
        <div className="bg-slate-800/50 rounded-xl p-3 space-y-2">
          <textarea value={formData.content} onChange={e => setFormData(p => ({ ...p, content: e.target.value }))} placeholder="نص الملاحظة..." rows={3} className="w-full bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 resize-none" />
          <div className="flex gap-2">{["عامة", "توصيل", "تحذير", "تفضيل"].map((t, i) => <button key={i} onClick={() => setFormData(p => ({ ...p, type: ["general", "delivery", "warning", "preference"][i] }))} className={`flex-1 rounded-lg py-2 text-xs font-bold ${formData.type === ["general", "delivery", "warning", "preference"][i] ? "bg-red-600 text-white" : "bg-slate-700 text-slate-300"}`}>{t}</button>)}</div>
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input type="checkbox" checked={formData.show_during_order} onChange={e => setFormData(p => ({ ...p, show_during_order: e.target.checked }))} className="rounded bg-slate-700 border-white/10" />
            إظهار أثناء إنشاء الطلب
          </label>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="flex-1 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-lg py-2 text-xs font-bold transition-all shadow-md shadow-red-700/10">حفظ</button>
            <button onClick={() => setShowForm(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg py-2 text-xs font-bold transition-colors">إلغاء</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} className="w-full flex items-center justify-center gap-1 py-2 bg-slate-800/50 hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-400 transition-all">
          <Plus size={14} /> إضافة ملاحظة
        </button>
      )}
    </div>
  );
};

/* â”€â”€â”€ Sub Drawers â”€â”€â”€ */

const OrderDetailsDrawer: React.FC<{ orderId: number; onBack: () => void; onClose: () => void; onReOrder?: (order: OrderDetail) => void }> = ({ orderId, onBack, onClose, onReOrder }) => {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [adopting, setAdopting] = useState(false);
  const [feedback, setFeedback] = useState(feedbackDraftFrom());
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  useEffect(() => {
    callCenterService.getOrderDetails(orderId).then(r => {
      setOrder(r.data);
      if (r.data.feedback) setFeedback(feedbackDraftFrom(r.data.feedback));
    }).catch(() => { }).finally(() => setLoading(false));
  }, [orderId]);

  const handleAdoptOrder = async () => {
    if (!order || !onReOrder) return;
    setAdopting(true);
    try { onReOrder(order); } finally { setAdopting(false); }
  };

  const saveFeedback = async () => {
    if (!order?.customer_id) return setFeedbackMessage("لا يمكن حفظ التقييم دون عميل مرتبط بالطلب.");
    const validation = feedbackValidationMessage(feedback, order.order_type);
    if (validation) return setFeedbackMessage(validation);
    setFeedbackSaving(true);
    setFeedbackMessage("");
    try {
      const response = await callCenterService.saveOrderFeedback(order.customer_id, order.id, feedbackPayload(feedback, order.order_type));
      setOrder(current => current ? { ...current, feedback: response.data } : current);
      setFeedbackMessage("تم حفظ التقييم في سجل الطلب.");
    } catch (error: any) {
      setFeedbackMessage(error?.response?.data?.message || "تعذر حفظ التقييم.");
    } finally {
      setFeedbackSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[350]" dir="rtl">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute top-0 bottom-0 right-0 w-full sm:w-[35vw] sm:min-w-[420px] sm:max-w-[640px] bg-slate-900 border-l border-white/10 shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center gap-2 p-4 border-b border-white/5">
          <button onClick={onBack} className="p-1 hover:bg-white/5 rounded-lg"><ChevronLeft size={18} className="text-slate-400" /></button>
          <h3 className="text-white font-black text-sm">{order?.order_number || "تفاصيل الطلب"}</h3>
          <div className="mr-auto flex gap-2">
            {order && onReOrder && (
              <button onClick={handleAdoptOrder} disabled={adopting} className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:from-slate-700 disabled:to-slate-700 text-white rounded-lg text-[10px] font-bold transition-all active:scale-95 shadow-lg shadow-emerald-900/30">
                {adopting ? <Loader2 size={12} className="animate-spin" /> : <Copy size={12} />}
                {adopting ? "جاري الاعتماد..." : "اعتماد وتكرار الطلب"}
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-red-500" /></div>
            : order ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-black text-white">{order.order_number}</span>
                  <OrderStatusBadge status={order.status} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                  <p>التاريخ: {new Date(order.created_at).toLocaleDateString("ar-SA")}</p>
                  <p>الفرع: {order.branch?.name || "—"}</p>
                  <p>الكاشير: {order.cashier?.name || "—"}</p>
                  <p>العميل: {order.customer_name || "—"}</p>
                </div>
                <div className="border-t border-white/5 pt-3">
                  <h4 className="text-xs font-bold text-slate-400 mb-2">الأصناف</h4>
                  <div className="space-y-1">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between bg-slate-800/30 rounded-lg px-3 py-2">
                        <div>
                          <span className="text-sm font-bold text-white">{item.item_name_ar || item.item_name}</span>
                          <span className="text-xs text-slate-500 mr-2">أ—{item.quantity}</span>
                          {item.notes && <span className="text-[10px] text-slate-500 mr-2">({item.notes})</span>}
                        </div>
                        <span className="text-sm font-bold text-white">{item.total.toFixed(2)} ₪</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-t border-white/5 pt-3 space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-slate-400">المجموع الفرعي</span><span className="text-white">{order.subtotal.toFixed(2)} ₪</span></div>
                  {order.discount_amount > 0 && <div className="flex justify-between"><span className="text-slate-400">الخصم</span><span className="text-red-400">-{order.discount_amount.toFixed(2)} ₪</span></div>}
                  <div className="flex justify-between text-sm font-black"><span className="text-white">الإجمالي</span><span className="text-white">{order.total.toFixed(2)} ₪</span></div>
                </div>
                {order.note && <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-400"><MessageSquare size={12} className="inline ml-1" />{order.note}</div>}
                <section className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-3" aria-labelledby="order-feedback-title">
                  <div className="flex items-center justify-between">
                    <div><h4 id="order-feedback-title" className="text-sm font-black text-white">تقييم الطلب</h4><p className="mt-0.5 text-[11px] text-slate-400">محفوظ على الطلب نفسه، ويمكن تحديثه عند متابعة العميل.</p></div>
                    <Star size={18} className="text-amber-400" />
                  </div>
                  <div className="mt-3 space-y-3">
                    {([
                      ["food_quality", "جودة الطعام"],
                      ["service_quality", "جودة الخدمة"],
                      ...(order.order_type === "delivery" ? [["delivery_speed", "سرعة التوصيل"]] : []),
                    ] as Array<["food_quality" | "service_quality" | "delivery_speed", string]>).map(([key, label]) => (
                      <div key={key} className="flex items-center justify-between gap-3">
                        <span className="text-xs font-bold text-slate-300">{label}</span>
                        <div className="flex gap-1" role="group" aria-label={label}>
                          {[1, 2, 3, 4, 5].map(value => <button key={value} type="button" onClick={() => setFeedback(current => ({ ...current, [key]: value }))} aria-label={`${label} ${value} من 5`} aria-pressed={feedback[key] === value} className={`flex h-8 w-8 items-center justify-center rounded-md border text-xs font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${Number(feedback[key]) >= value ? "border-amber-400/50 bg-amber-400/15 text-amber-300" : "border-white/10 text-slate-500 hover:border-amber-400/30"}`}>{value}</button>)}
                        </div>
                      </div>
                    ))}
                    <label className="block text-xs font-bold text-slate-300">ملاحظات المتابعة
                      <textarea value={feedback.notes} onChange={event => setFeedback(current => ({ ...current, notes: event.target.value }))} maxLength={2000} rows={3} className="mt-1.5 w-full resize-y rounded-lg border border-white/10 bg-slate-950/60 p-2.5 text-xs text-white outline-none focus:border-amber-400" placeholder="ملاحظة اختيارية من حديث العميل…" />
                    </label>
                    {feedbackMessage && <p role="status" className={`text-xs ${feedbackMessage.startsWith("تم ") ? "text-emerald-300" : "text-rose-300"}`}>{feedbackMessage}</p>}
                    <button type="button" onClick={saveFeedback} disabled={feedbackSaving || !order.customer_id} className="min-h-10 w-full rounded-lg bg-amber-500 px-3 text-xs font-black text-slate-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">{feedbackSaving ? "جارٍ حفظ التقييم…" : order.feedback ? "تحديث التقييم" : "حفظ التقييم"}</button>
                  </div>
                </section>
              </div>
            ) : <EmptyState icon={ShoppingCart} text="تعذر تحميل الطلب" />}
        </div>
      </div>
    </div>
  );
};

const ComplaintDetailDrawer: React.FC<{ complaintId: number; onBack: () => void; onClose: () => void }> = ({ complaintId, onBack, onClose }) => {
  const [timeline, setTimeline] = useState<{ complaint: any; followups: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [followupText, setFollowupText] = useState("");
  const [addingFollowup, setAddingFollowup] = useState(false);
  useEffect(() => {
    callCenterService.getComplaintTimeline(complaintId).then(r => setTimeline(r.data)).catch(() => { }).finally(() => setLoading(false));
  }, [complaintId]);

  const handleAddFollowup = async () => {
    if (!followupText.trim()) return;
    setAddingFollowup(true);
    try {
      await callCenterService.addFollowup(complaintId, { notes: followupText });
      setFollowupText("");
      const res = await callCenterService.getComplaintTimeline(complaintId);
      setTimeline(res.data);
    } catch { } finally { setAddingFollowup(false); }
  };

  return (
    <div className="fixed inset-0 z-[350]" dir="rtl">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute top-0 bottom-0 right-0 w-full sm:w-[35vw] sm:min-w-[420px] sm:max-w-[640px] bg-slate-900 border-l border-white/10 shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center gap-2 p-4 border-b border-white/5">
          <button onClick={onBack} className="p-1 hover:bg-white/5 rounded-lg"><ChevronLeft size={18} className="text-slate-400" /></button>
          <h3 className="text-white font-black text-sm">تفاصيل الشكوى</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-red-500" /></div>
            : timeline ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-white font-black">{timeline.complaint.title}</h4>
                  <ComplaintStatusBadge status={timeline.complaint.status} />
                </div>
                <p className="text-xs text-slate-400">{timeline.complaint.description}</p>
                {timeline.complaint.order && <p className="text-xs text-slate-400">الطلب: {timeline.complaint.order.order_number}</p>}
                <div className="border-t border-white/5 pt-3">
                  <h4 className="text-xs font-bold text-slate-400 mb-3">الجدول الزمني</h4>
                  <div className="space-y-3">
                    {timeline.followups.map((f, idx) => (
                      <div key={f.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-2 h-2 rounded-full ${idx === 0 ? "bg-red-500" : "bg-slate-600"}`} />
                          {idx < timeline.followups.length - 1 && <div className="w-px flex-1 bg-slate-700 my-1" />}
                        </div>
                        <div className="flex-1 pb-3">
                          <p className="text-xs font-bold text-white">{f.notes}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                            <span>{f.user?.name || "النظام"}</span>
                            <span>{new Date(f.created_at).toLocaleString("ar-SA")}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-t border-white/5 pt-3">
                  <h4 className="text-xs font-bold text-slate-400 mb-2">إضافة متابعة</h4>
                  <div className="flex gap-2">
                    <input value={followupText} onChange={e => setFollowupText(e.target.value)} placeholder="نص المتابعة..." className="flex-1 bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500" />
                    <button onClick={handleAddFollowup} disabled={addingFollowup || !followupText.trim()} className="px-4 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:from-slate-700 disabled:to-slate-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-red-700/10">
                      {addingFollowup ? <Loader2 size={14} className="animate-spin" /> : "إضافة"}
                    </button>
                  </div>
                </div>
              </div>
            ) : <EmptyState icon={AlertTriangle} text="تعذر تحميل الشكوى" />}
        </div>
      </div>
    </div>
  );
};

/* â”€â”€â”€ Wallet Icon â”€â”€â”€ */
const Wallet = ({ size }: { size?: number }) => (
  <svg width={size || 14} height={size || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M16 12h2" />
  </svg>
);

/* â”€â”€â”€ Shared Components â”€â”€â”€ */

const StatCard: React.FC<{ label: string; value: string; icon: React.ReactNode; highlight?: boolean }> = ({ label, value, icon, highlight }) => (
  <div className={`bg-gradient-to-br from-slate-800/50 to-slate-800/20 rounded-xl p-3 border ${highlight ? "border-red-500/30" : "border-slate-700/30"}`}>
    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 mb-1">{icon} {label}</div>
    <div className={`text-sm font-black ${highlight ? "text-red-400" : "text-white"}`}>{value}</div>
  </div>
);

const OrderStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { color: string; label: string }> = {
    pending: { color: "text-amber-400 bg-amber-500/10", label: "معلق" },
    preparing: { color: "text-blue-400 bg-blue-500/10", label: "قيد التحضير" },
    ready: { color: "text-emerald-400 bg-emerald-500/10", label: "جاهز" },
    delivered: { color: "text-emerald-400 bg-emerald-500/10", label: "مكتمل" },
    cancelled: { color: "text-red-400 bg-red-500/10", label: "ملغي" },
    confirmed: { color: "text-blue-400 bg-blue-500/10", label: "مؤكد" },
  };
  const s = map[status.toLowerCase()] || { color: "text-slate-400 bg-slate-500/10", label: status };
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${s.color}`}>{s.label}</span>;
};

const ComplaintStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { color: string; label: string }> = {
    new: { color: "text-red-400 bg-red-500/10", label: "جديد" },
    open: { color: "text-amber-400 bg-amber-500/10", label: "مفتوح" },
    in_progress: { color: "text-blue-400 bg-blue-500/10", label: "قيد المعالجة" },
    waiting_customer: { color: "text-purple-400 bg-purple-500/10", label: "بانتظار العميل" },
    resolved: { color: "text-emerald-400 bg-emerald-500/10", label: "تم الحل" },
    closed: { color: "text-slate-400 bg-slate-500/10", label: "مغلق" },
    cancelled: { color: "text-red-400 bg-red-500/10", label: "ملغي" },
  };
  const s = map[status] || { color: "text-slate-400 bg-slate-500/10", label: status };
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${s.color}`}>{s.label}</span>;
};

function statusBadge(status?: string) {
  switch (status) {
    case "active": return <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">نشط</span>;
    case "inactive": return <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">غير نشط</span>;
    case "blocked": return <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">محظور</span>;
    default: return null;
  }
}

const EmptyState: React.FC<{ icon: React.ElementType; text: string }> = ({ icon: Icon, text }) => (
  <div className="flex flex-col items-center justify-center py-12 text-slate-500">
    <Icon size={32} className="mb-2" />
    <p className="text-sm">{text}</p>
  </div>
);
