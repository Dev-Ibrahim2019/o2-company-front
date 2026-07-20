import React, { useCallback, useEffect, useRef, useState } from "react";
import { X, User, ShoppingCart, Star, MapPin, MessageSquare, AlertTriangle, CreditCard, Phone, Mail, Calendar, Clock, Store, Package, ChevronLeft, Loader2, FileText, Percent, Ban, Plus, Heart, Flag, Bell, ExternalLink, Trash2, Edit3, Check, Copy, RefreshCw, Award, TrendingUp, AlertCircle, Building2, Headphones, UtensilsCrossed, Users, Activity, ChevronDown, ChevronUp, Timer, Truck } from "lucide-react";
import type { CustomerProfile, CustomerOrder, CustomerComplaint, FavoriteItem, OrderDetail, ComplaintFollowup, CustomerAddress, CustomerOccasion, CustomerNote, CustomerSearchResult } from "../../services/callCenterService";
import { callCenterService, CUSTOMER_CATEGORY_LABELS, type CustomerCategory } from "../../services/callCenterService";
import { orderService } from "../../services/orderService";

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
  const dialogRef = useDialogFocus(isOpen, onClose);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
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
        const [fullProfileRes, favoritesRes, complaintsRes, occasionsRes] = await Promise.all([
          callCenterService.getCustomerFullProfile(customerId),
          callCenterService.getCustomerFavorites(customerId),
          callCenterService.getCustomerComplaints(customerId),
          callCenterService.getCustomerOccasions(customerId),
        ]);
        setProfile(fullProfileRes.data.profile);
        setOrders(fullProfileRes.data.orders.slice(0, 5));
        setFavorites(favoritesRes.data ?? []);
        setComplaints(complaintsRes.data?.data ?? []);
        const now = new Date();
        const withinSevenDays = (occasionsRes.data ?? []).find((occasion) => {
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

  const badges = {
    orders: orders.length || undefined,
    occasions: upcomingOccasion ? ("!" as const) : undefined,
    complaints: complaints.length || undefined,
  };

  const tabs: { key: Tab; label: string; icon: React.ElementType; badge?: string | number }[] = [
    { key: "overview", label: "نظرة عامة", icon: User },
    { key: "orders", label: "الطلبات", icon: ShoppingCart, badge: badges.orders },
    { key: "addresses", label: "العناوين", icon: MapPin },
    { key: "occasions", label: "المناسبات", icon: Calendar, badge: badges.occasions },
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
      <div ref={dialogRef} className={`absolute top-0 bottom-0 right-0 w-full sm:w-[45vw] sm:min-w-[420px] sm:max-w-[740px] bg-slate-900 border-l border-white/10 shadow-2xl shadow-black/50 overflow-hidden flex flex-col transform transition-transform duration-300 ease-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 shrink-0 bg-gradient-to-l from-slate-900 to-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg shadow-red-600/20">
              <User size={16} className="text-white" />
            </div>
            <div>
              <h3 className="text-white font-black text-sm tracking-wide">ملف العميل</h3>
              {profile && <p className="text-[10px] text-slate-400 font-medium">{profile.customer.name}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onSelectCustomer && profile && (
              <button onClick={handleSelect} aria-label="اختيار العميل للطلب" className="p-2 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 shadow-md shadow-red-700/20 active:scale-95">
                <Check size={14} />
              </button>
            )}
            <button onClick={onClose} aria-label="إغلاق ملف العميل" className="p-2 hover:bg-white/5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
              <X size={16} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* Upcoming Occasion Banner */}
        {upcomingOccasion && (
          <div className="mx-4 mt-3 rounded-xl border border-fuchsia-400/30 bg-gradient-to-l from-fuchsia-500/10 to-fuchsia-500/5 px-4 py-2.5 flex items-center gap-2 motion-safe:animate-pulse shadow-sm shadow-fuchsia-900/20">
            <Calendar size={14} className="text-fuchsia-300 shrink-0" />
            <p className="text-xs font-bold text-fuchsia-200">
              اقتربت مناسبة العميل! اقترح عليه العرض العائلي الفاخر
            </p>
          </div>
        )}

        {/* Modern Tab Bar */}
        <div ref={tabsRef} className="shrink-0 border-b border-white/5 bg-gradient-to-b from-slate-800/50 to-transparent overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          <div className="flex gap-0.5 px-2 py-2 min-w-max">
            {tabs.map(({ key, label, icon: Icon, badge }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`
                  relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all duration-150
                  ${activeTab === key
                    ? "bg-gradient-to-b from-red-600/20 to-red-600/5 text-white shadow-sm shadow-red-700/10 border border-red-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
                  }
                `}
              >
                <Icon size={13} className={activeTab === key ? "text-red-400" : "text-slate-500"} />
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
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
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
            <OverviewTab profile={profile} favorite={favorites[0]} orders={orders} onSelectOrder={setSelectedOrderId} onRepeatOrder={onRepeatOrder ? (order) => { onRepeatOrder(order); onClose(); } : undefined} />
          ) : activeTab === "orders" ? (
            <OrdersTab orders={orders} onSelectOrder={setSelectedOrderId} onRepeatOrder={onRepeatOrder ? (order) => { onRepeatOrder(order); onClose(); } : undefined} />
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

/* ─── Restructured Overview Tab v2 ─── */
const OverviewTab: React.FC<{ profile: CustomerProfile; favorite?: FavoriteItem; orders: CustomerOrder[]; onSelectOrder: (id: number) => void; onRepeatOrder?: (order: OrderDetail) => void }> = ({ profile, favorite, orders, onSelectOrder, onRepeatOrder }) => {
  const c = profile.customer;
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const categoryLabel = c.category || "غير مصنف";

  const getCategoryBadge = () => {
    const cat = (c.category || "").toLowerCase();
    switch (cat) {
      case "vip": return { bg: "from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-300", icon: <Award size={12} />, label: "VIP" };
      case "important": return { bg: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-300", icon: <Star size={12} />, label: "مهم" };
      case "regular": return { bg: "from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-300", icon: <User size={12} />, label: "عادي" };
      case "new": return { bg: "from-sky-500/20 to-sky-500/5 border-sky-500/30 text-sky-300", icon: <Activity size={12} />, label: "جديد" };
      case "follow_up": return { bg: "from-violet-500/20 to-violet-500/5 border-violet-500/30 text-violet-300", icon: <Bell size={12} />, label: "متابعة" };
      case "complaints": return { bg: "from-red-500/20 to-red-500/5 border-red-500/30 text-red-300", icon: <AlertTriangle size={12} />, label: "شكاوى" };
      case "inactive": return { bg: "from-slate-500/20 to-slate-500/5 border-slate-500/30 text-slate-300", icon: <Ban size={12} />, label: "غير نشط" };
      default: return { bg: "from-slate-500/20 to-slate-500/5 border-slate-500/30 text-slate-300", icon: <User size={12} />, label: categoryLabel };
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

  const getOrderSourceBadge = (order?: CustomerOrder) => {
    if (!order) return null;
    const type = order.order_type;
    switch (type) {
      case "call_center": return { label: "كول سنتر", icon: <Headphones size={12} />, color: "from-violet-500/20 to-violet-500/5 border-violet-500/30 text-violet-300" };
      case "dine_in": return { label: "فوري", icon: <UtensilsCrossed size={12} />, color: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-300" };
      case "delivery": return { label: "توصيل", icon: <Package size={12} />, color: "from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-300" };
      case "takeaway": return { label: "استلام", icon: <Store size={12} />, color: "from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-300" };
      default: return { label: type || "غير محدد", icon: <ShoppingCart size={12} />, color: "from-slate-500/20 to-slate-500/5 border-slate-500/30 text-slate-300" };
    }
  };

  const lastOrder = orders[0];
  const sourceBadge = getOrderSourceBadge(lastOrder);

  // حساب أيام منذ آخر طلب
  const daysSinceLastOrder = profile.last_order_at
    ? Math.floor((Date.now() - new Date(profile.last_order_at).getTime()) / 86400000)
    : null;

  return (
    <div className="space-y-4">
      {/* ─── Customer Header with Editable Classification ─── */}
      <div className="bg-gradient-to-br from-slate-800/60 to-slate-800/30 rounded-2xl p-4 border border-slate-700/30">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500/30 to-red-600/10 flex items-center justify-center border border-red-500/20">
              <User size={20} className="text-red-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white">{c.name}</h2>
                {statusBadge(c.status)}
              </div>
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
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
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

      {/* ─── Customer Analytics Card (Merged Metrics + Dates + Favorite) ─── */}
      <div className="bg-gradient-to-br from-slate-800/50 to-slate-800/20 rounded-2xl p-4 border border-slate-700/30">
        <div className="flex items-center gap-2 mb-3">
          <Activity size={14} className="text-red-400" />
          <h4 className="text-xs font-black text-slate-300">تحليلات العميل</h4>
        </div>

        {/* Main metrics grid */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {/* Avg Order Value */}
          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-700/30">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold mb-1">
              <TrendingUp size={12} />
              متوسط قيمة الطلب
            </div>
            <div className="text-lg font-black text-white">
              {profile.avg_order_value ? profile.avg_order_value.toFixed(2) : "0.00"}
              <span className="text-xs text-slate-500 mr-1 font-bold">₪</span>
            </div>
          </div>
          {/* Monthly Orders */}
          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-700/30">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold mb-1">
              <ShoppingCart size={12} />
              معدل الطلبات الشهري
            </div>
            <div className="text-lg font-black text-white">
              {profile.monthly_orders_count ?? 0}
              <span className="text-xs text-slate-500 mr-1 font-bold">/ شهر</span>
            </div>
          </div>
        </div>

        {/* Dates Row */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-slate-900/40 rounded-lg px-3 py-2 border border-slate-700/20">
            <div className="flex items-center gap-1 text-[10px] text-slate-500">
              <Calendar size={10} />
              أول طلب
            </div>
            <p className="text-xs font-bold text-white mt-0.5">
              {profile.first_order_at ? new Date(profile.first_order_at).toLocaleDateString("ar-SA") : "—"}
            </p>
          </div>
          <div className="bg-slate-900/40 rounded-lg px-3 py-2 border border-slate-700/20">
            <div className="flex items-center gap-1 text-[10px] text-slate-500">
              <Clock size={10} />
              آخر طلب
            </div>
            <p className="text-xs font-bold text-white mt-0.5">
              {profile.last_order_at ? new Date(profile.last_order_at).toLocaleDateString("ar-SA") : "—"}
            </p>
          </div>
        </div>

        {/* Favorite Item */}
        {favorite && (
          <div className="bg-gradient-to-l from-emerald-500/10 to-emerald-500/5 rounded-xl p-3 border border-emerald-500/20">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-300 mb-1">
              <Heart size={12} />
              الصنف المفضل
            </div>
            <p className="text-sm font-black text-white">{favorite.item_name_ar || favorite.item_name}</p>
            <p className="text-[10px] text-emerald-200/60 mt-0.5">طُلب {favorite.order_count} مرات · {favorite.total_quantity} قطعة</p>
          </div>
        )}
      </div>

      {/* ─── Last Order Details Card ─── */}
      {lastOrder && (
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-800/20 rounded-2xl p-4 border border-slate-700/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Package size={14} className="text-cyan-400" />
              <h4 className="text-xs font-black text-slate-300">آخر طلب</h4>
            </div>
            <OrderStatusBadge status={lastOrder.status} />
          </div>

          {/* Order Header */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-black text-white">{lastOrder.order_number}</span>
            <span className="text-lg font-black text-emerald-400">{lastOrder.total.toFixed(2)} ₪</span>
          </div>

          {/* Order Details Grid */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-slate-900/40 rounded-lg px-3 py-2 border border-slate-700/20">
              <div className="text-[10px] text-slate-500">مصدر الطلب</div>
              <div className="mt-0.5">
                {sourceBadge && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border bg-gradient-to-l ${sourceBadge.color} inline-flex items-center gap-1`}>
                    {sourceBadge.icon}
                    {sourceBadge.label}
                  </span>
                )}
              </div>
            </div>
            <div className="bg-slate-900/40 rounded-lg px-3 py-2 border border-slate-700/20">
              <div className="text-[10px] text-slate-500">الفرع</div>
              <div className="mt-0.5 text-xs font-bold text-white flex items-center gap-1">
                <Building2 size={11} className="text-cyan-400" />
                {lastOrder.branch?.name || "—"}
              </div>
            </div>
            <div className="bg-slate-900/40 rounded-lg px-3 py-2 border border-slate-700/20">
              <div className="text-[10px] text-slate-500">التاريخ</div>
              <div className="mt-0.5 text-xs font-bold text-white">
                {new Date(lastOrder.created_at).toLocaleDateString("ar-SA")}
              </div>
            </div>
            <div className="bg-slate-900/40 rounded-lg px-3 py-2 border border-slate-700/20">
              <div className="text-[10px] text-slate-500">وقت الطلب</div>
              <div className="mt-0.5 text-xs font-bold text-white">
                {new Date(lastOrder.created_at).toLocaleTimeString("ar-SA", { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          {/* Experience Status - يظهر إذا تم تقييم التجربة أو لا */}
          <div className="bg-slate-900/60 rounded-lg px-3 py-2 border border-slate-700/30 mb-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-bold">تقييم تجربة العميل</span>
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 inline-flex items-center gap-1">
                <Flag size={10} />
                لم يتم التقييم
              </span>
            </div>
          </div>

          {/* Order Items Preview */}
          <OrderItemsPreview orderId={lastOrder.id} />

          {lastOrder.note && (
            <div className="mt-2 bg-gradient-to-l from-amber-500/10 to-amber-500/5 rounded-lg px-3 py-2 border border-amber-500/20">
              <p className="text-[11px] text-amber-400"><MessageSquare size={11} className="inline ml-1" />{lastOrder.note}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-3 flex gap-2">
            <button onClick={() => onSelectOrder(lastOrder.id)} className="flex-1 rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-2 text-[11px] font-bold text-slate-200 transition-colors">
              عرض التفاصيل كاملة
            </button>
            {onRepeatOrder && (
              <RepeatOrderButton orderId={lastOrder.id} onRepeatOrder={onRepeatOrder} />
            )}
          </div>
        </div>
      )}

      {/* ─── Performance & Alerts ─── */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle size={14} className="text-red-400" />
          <h4 className="text-xs font-black text-slate-300">مؤشرات الأداء والتنبيهات</h4>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-2">
          <StatCard label="شكاوى مفتوحة" value={String(profile.open_complaints_count || 0)} icon={<AlertTriangle size={14} />} highlight={(profile.open_complaints_count || 0) > 0} />
          <StatCard label="طلبات ملغاة" value={String(profile.cancelled_orders_count || 0)} icon={<Ban size={14} />} highlight={(profile.cancelled_orders_count || 0) > 0} />
          <StatCard label="نقاط الولاء" value={String(profile.loyalty_points ?? c.loyalty_points ?? 0)} icon={<Star size={14} />} />
        </div>

        {/* Delivery Delay Alert - مثال */}
        {daysSinceLastOrder !== null && daysSinceLastOrder > 14 && (
          <div className="bg-gradient-to-l from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-400 flex items-start gap-2 mb-2">
            <Timer size={14} className="mt-0.5 shrink-0" />
            <span>لم يطلب العميل منذ <strong>{daysSinceLastOrder} يوماً</strong> — قد يكون بحاجة إلى عرض إعادة تنشيط أو متابعة</span>
          </div>
        )}

        {/* Warning Notes */}
        {(c.notes || profile.latest_note) && (
          <div className="space-y-2 mb-2">
            {c.notes && (
              <div className="bg-gradient-to-l from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-400 flex items-start gap-2">
                <MessageSquare size={12} className="mt-0.5 shrink-0" />
                {c.notes}
              </div>
            )}
            {profile.latest_note && (
              <div className="bg-gradient-to-l from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-400 flex items-start gap-2">
                <MessageSquare size={12} className="mt-0.5 shrink-0" />
                آخر ملاحظة: {profile.latest_note}
              </div>
            )}
          </div>
        )}

        {(profile.open_complaints_count || 0) > 0 && (
          <div className="bg-gradient-to-l from-red-500/10 to-red-500/5 border border-red-500/20 rounded-xl p-3 text-xs text-red-400 flex items-start gap-2">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            يحتاج اهتمام — هذا العميل لديه {profile.open_complaints_count} شكوى مفتوحة
          </div>
        )}
      </div>

      {/* ─── Enhanced Recent Orders List ─── */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart size={14} className="text-slate-400" />
            <h4 className="text-xs font-black text-slate-300">آخر الطلبات</h4>
          </div>
          <span className="text-[10px] text-slate-500">آخر 5 طلبات</span>
        </div>
        <OrdersTab orders={orders.slice(0, 5)} onSelectOrder={onSelectOrder} onRepeatOrder={onRepeatOrder} />
      </section>
    </div>
  );
};

/* ─── Order Items Preview Component ─── */
const OrderItemsPreview: React.FC<{ orderId: number }> = ({ orderId }) => {
  const [items, setItems] = useState<{ name: string; qty: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    callCenterService.getOrderDetails(orderId)
      .then(r => {
        if (!cancelled) {
          setItems(r.data.items.map(item => ({
            name: item.item_name_ar || item.item_name || "صنف",
            qty: item.quantity,
          })));
        }
      })
      .catch(() => { })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [orderId]);

  if (loading) return <div className="h-8 bg-slate-900/40 rounded-lg animate-pulse" />;
  if (items.length === 0) return null;

  return (
    <div className="bg-slate-900/60 rounded-lg border border-slate-700/30 divide-y divide-slate-800/50">
      {items.slice(0, 3).map((item, i) => (
        <div key={i} className="flex items-center justify-between px-3 py-1.5">
          <span className="text-[11px] text-slate-300">{item.name}</span>
          <span className="text-[10px] text-slate-500 font-bold">× {item.qty}</span>
        </div>
      ))}
      {items.length > 3 && (
        <div className="px-3 py-1 text-[10px] text-slate-600 text-center">
          +{items.length - 3} أصناف أخرى
        </div>
      )}
    </div>
  );
};

/* ─── Repeat Order Button ─── */
const RepeatOrderButton: React.FC<{ orderId: number; onRepeatOrder: (order: OrderDetail) => void }> = ({ orderId, onRepeatOrder }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleRepeat = async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await callCenterService.getOrderDetails(orderId);
      onRepeatOrder(response.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleRepeat}
      disabled={loading}
      className="flex-1 rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 px-3 py-2 text-[11px] font-bold text-white transition-all active:scale-95 disabled:opacity-50 shadow-md shadow-emerald-900/30"
    >
      {loading ? <Loader2 size={12} className="inline animate-spin ml-1" /> : <Copy size={12} className="inline ml-1" />}
      {loading ? "جاري التحميل..." : "تكرار الطلب"}
    </button>
  );
};

/* ─── Orders Tab ─── */
const OrdersTab: React.FC<{ orders: CustomerOrder[]; onSelectOrder: (id: number) => void; onRepeatOrder?: (order: OrderDetail) => void }> = ({ orders, onSelectOrder, onRepeatOrder }) => {
  const [orderDetails, setOrderDetails] = useState<Record<number, OrderDetail>>({});
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [experienceOrder, setExperienceOrder] = useState<CustomerOrder | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all(orders.slice(0, 5).map(order => callCenterService.getOrderDetails(order.id).then(result => result.data).catch(() => null)))
      .then(details => { if (active) setOrderDetails(Object.fromEntries(details.filter((detail): detail is OrderDetail => Boolean(detail)).map(detail => [detail.id, detail]))); });
    return () => { active = false; };
  }, [orders]);

  if (orders.length === 0) return <EmptyState icon={ShoppingCart} text="لا توجد طلبات سابقة" />;
  return (
    <div className="space-y-2">
      {orders.slice(0, 5).map((o) => {
        const detail = orderDetails[o.id];
        return (
          <div key={o.id} className="bg-gradient-to-br from-slate-800/50 to-slate-800/20 rounded-xl border border-slate-700/30 overflow-hidden transition-all hover:border-slate-700/50">
            {/* Order Header - Always Visible */}
            <button
              onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
              className="w-full text-right p-3 flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                  <Package size={13} className="text-slate-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{o.order_number}</p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                    <span>{new Date(o.created_at).toLocaleDateString("ar-SA")}</span>
                    <span>{o.branch?.name}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-black text-white">{o.total.toFixed(2)}</span>
                <OrderStatusBadge status={o.status} />
                {expandedId === o.id ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
              </div>
            </button>

            {/* Expanded Content */}
            {expandedId === o.id && (
              <div className="px-3 pb-3 space-y-2">
                <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
                  <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(o.created_at).toLocaleDateString("ar-SA")}</span>
                  <span className="flex items-center gap-1">{orderTypeLabel(o.order_type)}</span>
                  {o.branch && <span className="flex items-center gap-1"><Building2 size={10} /> {o.branch.name}</span>}
                </div>

                {detail?.items && detail.items.length > 0 && (
                  <div className="bg-slate-900/50 rounded-lg border border-slate-700/30 divide-y divide-slate-800/50">
                    {detail.items.map(item => (
                      <div key={item.id} className="flex items-center justify-between px-3 py-1.5">
                        <span className="text-[11px] text-slate-200">{item.item_name_ar || item.item_name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500">× {item.quantity}</span>
                          <span className="text-[11px] font-bold text-slate-300">{item.total.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {o.note && (
                  <p className="text-[11px] text-amber-200/80 bg-amber-500/5 rounded-lg px-3 py-2">
                    <MessageSquare size={11} className="inline ml-1" />
                    {o.note}
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <button onClick={() => onSelectOrder(o.id)} className="flex-1 rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-2 text-[11px] font-bold text-slate-200 transition-colors">
                    عرض التفاصيل كاملة
                  </button>
                  {onRepeatOrder && <RepeatOrderButton orderId={o.id} onRepeatOrder={onRepeatOrder} />}
                  <button onClick={() => setExperienceOrder(o)} className="rounded-lg border border-slate-600 hover:bg-slate-700 px-3 py-2 text-[11px] font-bold text-slate-200 transition-colors">
                    تجربة العميل
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
      {experienceOrder && <ExperienceModal order={experienceOrder} onClose={() => setExperienceOrder(null)} />}
    </div>
  );
};

const orderTypeLabel = (type?: string | null) => ({ delivery: "توصيل", dine_in: "داخل المطعم", takeaway: "استلام", call_center: "مركز الاتصال" }[type || ""] || type || "المصدر غير محدد");

const ExperienceModal = ({ order, onClose }: { order: CustomerOrder; onClose: () => void }) => {
  const [ratings, setRatings] = useState({ food_rating: 5, delivery_rating: 5, speed_rating: 5 });
  const [notes, setNotes] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "success" | "error">("idle");
  useEffect(() => { const key = (e: KeyboardEvent) => e.key === "Escape" && onClose(); document.addEventListener("keydown", key); return () => document.removeEventListener("keydown", key); }, [onClose]);
  const submit = async () => { setState("saving"); try { await orderService.submitCustomerExperience(order.id, { ...ratings, notes: notes.trim() || undefined, contacted: true }); setState("success"); } catch { setState("error"); } };
  return <div className="fixed inset-0 z-[500] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="تسجيل تجربة العميل">
    <button className="absolute inset-0 bg-black/70" onClick={onClose} aria-label="إغلاق" />
    <div className="relative w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
      <div className="mb-4 flex items-center justify-between"><h3 className="font-black text-white">تجربة العميل · {order.order_number}</h3><button onClick={onClose} aria-label="إغلاق"><X className="text-slate-400" size={18} /></button></div>
      {(["food_rating", "delivery_rating", "speed_rating"] as const).map((key, index) => <label key={key} className="mb-3 block text-xs font-bold text-slate-300">{["جودة الطعام", "خدمة التوصيل", "سرعة الخدمة"][index]}<select value={ratings[key]} onChange={e => setRatings(v => ({ ...v, [key]: Number(e.target.value) }))} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-white focus:border-red-500 focus:outline-none">{[5, 4, 3, 2, 1].map(v => <option key={v} value={v}>{v} / 5</option>)}</select></label>)}
      <label className="block text-xs font-bold text-slate-300">ملاحظات المكالمة<textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="mt-1 w-full resize-none rounded-lg border border-slate-700 bg-slate-950 p-2 text-white focus:border-red-500 focus:outline-none" /></label>
      {state === "success" && <p role="status" className="mt-3 text-sm font-bold text-emerald-400">تم حفظ تجربة العميل بنجاح.</p>}{state === "error" && <p role="alert" className="mt-3 text-sm font-bold text-red-400">تعذر الحفظ. تحقق من الاتصال وحاول مجدداً.</p>}
      <button onClick={submit} disabled={state === "saving" || state === "success"} className="mt-4 w-full rounded-xl bg-gradient-to-br from-red-600 to-red-700 py-2.5 text-sm font-black text-white hover:from-red-500 hover:to-red-600 disabled:from-slate-700 disabled:to-slate-700">{state === "saving" ? "جارٍ الحفظ…" : state === "success" ? "تم الحفظ" : "حفظ التجربة"}</button>
    </div>
  </div>;
};

/* ─── Favorites Tab ─── */
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

/* ─── Complaints Tab ─── */
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

/* ─── Addresses Tab ─── */
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

/* ─── Occasions Tab ─── */
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

/* ─── Loyalty Tab ─── */
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

/* ─── Notes Tab ─── */
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

/* ─── Sub Drawers ─── */

const OrderDetailsDrawer: React.FC<{ orderId: number; onBack: () => void; onClose: () => void; onReOrder?: (order: OrderDetail) => void }> = ({ orderId, onBack, onClose, onReOrder }) => {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [adopting, setAdopting] = useState(false);
  useEffect(() => { callCenterService.getOrderDetails(orderId).then(r => setOrder(r.data)).catch(() => { }).finally(() => setLoading(false)); }, [orderId]);

  const handleAdoptOrder = async () => {
    if (!order || !onReOrder) return;
    setAdopting(true);
    try { onReOrder(order); } finally { setAdopting(false); }
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
                          <span className="text-xs text-slate-500 mr-2">×{item.quantity}</span>
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

/* ─── Wallet Icon ─── */
const Wallet = ({ size }: { size?: number }) => (
  <svg width={size || 14} height={size || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M16 12h2" />
  </svg>
);

/* ─── Shared Components ─── */

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