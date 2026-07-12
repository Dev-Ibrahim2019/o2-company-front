import React, { useCallback, useEffect, useState } from "react";
import { X, User, ShoppingCart, Star, MapPin, MessageSquare, AlertTriangle, CreditCard, Phone, Mail, Calendar, Clock, Store, Package, ChevronLeft, Loader2, FileText, Percent, Ban, Plus, Heart, Flag, Bell, ExternalLink, Trash2, Edit3, Check, Copy, RefreshCw, Award, TrendingUp, AlertCircle } from "lucide-react";
import type { CustomerProfile, CustomerOrder, CustomerComplaint, FavoriteItem, OrderDetail, ComplaintFollowup, CustomerAddress, CustomerOccasion, CustomerNote, CustomerSearchResult } from "../../services/callCenterService";
import { callCenterService } from "../../services/callCenterService";

interface Props {
  isOpen?: boolean;
  customerId: number;
  onClose: () => void;
  onSelectCustomer?: (customer: CustomerSearchResult) => void;
  onSelectAddress?: (address: CustomerAddress) => void;
  onRepeatOrder?: (order: OrderDetail) => void;
  onApplyLoyaltyDiscount?: (amount: number) => void;
}

type Tab = "overview" | "orders" | "addresses" | "occasions" | "loyalty";

export const CustomerProfileDrawer: React.FC<Props> = ({ isOpen = true, customerId, onClose, onSelectCustomer, onSelectAddress, onRepeatOrder, onApplyLoyaltyDiscount }) => {
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
  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isOpen, onClose]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    load();
  };

  const tabs: { key: Tab; label: string; icon: React.ElementType; badge?: string | number }[] = [
    { key: "overview", label: "نظرة عامة", icon: User },
    { key: "orders", label: "الطلبات السابقة", icon: ShoppingCart, badge: orders.length || undefined },
    { key: "addresses", label: "العناوين", icon: MapPin },
    { key: "occasions", label: "المناسبات", icon: Calendar, badge: upcomingOccasion ? "!" : undefined },
    { key: "loyalty", label: "الولاء والملاحظات", icon: Star },
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

  if (selectedOrderId) {
    return <OrderDetailsDrawer orderId={selectedOrderId} onBack={() => setSelectedOrderId(null)} onClose={onClose} onReOrder={(onRepeatOrder || onSelectCustomer) ? (order: OrderDetail) => { if (onRepeatOrder) onRepeatOrder(order); else onSelectCustomer?.({ ...profile!.customer, lastOrder: order } as any); onClose(); } : undefined} />;
  }

  if (selectedComplaintId) {
    return <ComplaintDetailDrawer complaintId={selectedComplaintId} onBack={() => setSelectedComplaintId(null)} onClose={onClose} />;
  }

  return (
    <div className={`fixed inset-0 z-[300] transition-[visibility] ${isOpen ? "visible" : "invisible pointer-events-none"}`} dir="rtl" aria-hidden={!isOpen} role="dialog" aria-modal="true" aria-label="ملف العميل الكامل">
      <div className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`} onClick={onClose} />
      <div className={`absolute top-0 bottom-0 right-0 w-full sm:w-[35vw] sm:min-w-[420px] sm:max-w-[640px] bg-slate-900 border-l border-white/10 shadow-2xl shadow-black/50 overflow-hidden flex flex-col transform transition-transform duration-300 ease-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between p-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-red-600/20 flex items-center justify-center">
              <User size={16} className="text-red-500" />
            </div>
            <div>
              <h3 className="text-white font-black text-sm">ملف العميل</h3>
              {profile && <p className="text-[10px] text-slate-400">{profile.customer.name}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onSelectCustomer && profile && (
              <button onClick={handleSelect} className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors" title="اختيار العميل للطلب">
                <Check size={14} />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors">
              <X size={16} className="text-slate-400" />
            </button>
          </div>
        </div>

        {upcomingOccasion && (
          <div className="mx-4 mt-3 rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-2 text-xs font-black text-fuchsia-200 motion-safe:animate-pulse">
            اقتربت مناسبة العميل! اقترح عليه العرض العائلي الفاخر
          </div>
        )}

        <div className="flex border-b border-white/5 overflow-x-auto shrink-0">
          {tabs.map(({ key, label, icon: Icon, badge }) => (
            <button key={key} onClick={() => setActiveTab(key)} className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap relative ${activeTab === key ? "border-red-500 text-white" : "border-transparent text-slate-400 hover:text-slate-200"}`}>
              <Icon size={13} /> {label}
              {badge && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-300">{badge}</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="space-y-3 py-3" aria-label="جاري تحميل ملف العميل">
              {/* Skeleton Loader - أنيق ومتحرك */}
              <div className="flex items-center gap-3 p-3">
                <div className="w-12 h-12 rounded-full bg-slate-800/70 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/3 rounded-lg bg-slate-800/70 animate-pulse" />
                  <div className="h-3 w-1/3 rounded-lg bg-slate-800/50 animate-pulse" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[1,2,3,4].map(i => (
                  <div key={i} className="h-20 rounded-xl bg-slate-800/70 animate-pulse" />
                ))}
              </div>
              <div className="space-y-2">
                {[1,2,3].map(i => (
                  <div key={i} className="h-12 rounded-xl bg-slate-800/50 animate-pulse" />
                ))}
              </div>
            </div>
          ) : loadError ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
              <AlertTriangle size={32} className="text-red-400" />
              <p className="text-sm text-slate-300">{loadError}</p>
              <button onClick={handleRetry} className="flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-red-700 transition-all active:scale-95">
                <RefreshCw size={14} />
                إعادة المحاولة
              </button>
            </div>
          ) : activeTab === "overview" && profile ? (
            <OverviewTab profile={profile} />
          ) : activeTab === "orders" ? (
            <OrdersTab orders={orders} onSelectOrder={setSelectedOrderId} onRepeatOrder={onRepeatOrder ? (order) => { onRepeatOrder(order); onClose(); } : undefined} />
          ) : activeTab === "addresses" ? (
            <AddressesTab customerId={customerId} onAddressSelect={onSelectAddress ? (addr) => { onSelectAddress(addr); onClose(); } : undefined} />
          ) : activeTab === "occasions" ? (
            <OccasionsTab customerId={customerId} />
          ) : activeTab === "loyalty" && profile ? (
            <LoyaltyAndNotesTab customerId={customerId} points={profile.loyalty_points ?? profile.customer.loyalty_points ?? 0} onApply={onApplyLoyaltyDiscount} />
          ) : null}
        </div>
      </div>
    </div>
  );
};

/* ─── Overview Tab ─── */
const OverviewTab: React.FC<{ profile: CustomerProfile }> = ({ profile }) => {
  const c = profile.customer;

  // تحديد فئة العميل التسويقية
  const getMarketingCategory = () => {
    const totalSpent = profile.total_spent || 0;
    const totalOrders = profile.total_orders || 0;
    if (totalSpent > 5000 && totalOrders > 20) {
      return { label: "عميل وفي VIP", color: "text-amber-400 bg-amber-500/10 border-amber-400/30", icon: Award };
    }
    if (totalSpent > 2000 && totalOrders > 10) {
      return { label: "عميل مميز", color: "text-emerald-400 bg-emerald-500/10 border-emerald-400/30", icon: Star };
    }
    if (totalOrders > 5 && totalSpent > 500) {
      return { label: "صائد عروض", color: "text-blue-400 bg-blue-500/10 border-blue-400/30", icon: TrendingUp };
    }
    return { label: "عميل جديد", color: "text-slate-400 bg-slate-500/10 border-slate-400/30", icon: User };
  };

  const marketingCat = getMarketingCategory();
  const MarketingIcon = marketingCat.icon;

  return (
    <div className="space-y-4">
      {/* رأس العميل */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center">
            <User size={18} className="text-red-500" />
          </div>
          <div>
            <h2 className="text-base font-black text-white">{c.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              {statusBadge(c.status)}
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${marketingCat.color}`}>
                <MarketingIcon size={10} className="inline ml-1" />
                {marketingCat.label}
              </span>
            </div>
          </div>
        </div>
        <span className="text-[10px] text-slate-500 bg-slate-800/50 px-2 py-1 rounded-lg">{c.code}</span>
      </div>

      {/* معلومات الاتصال */}
      <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-400 bg-slate-800/30 rounded-xl p-3">
        <div className="flex items-center gap-1.5"><Phone size={11} /> {c.phone || c.mobile || "—"}</div>
        {(c as any).email && <div className="flex items-center gap-1.5"><Mail size={11} /> {(c as any).email}</div>}
        {c.city && <div className="flex items-center gap-1.5"><MapPin size={11} /> {c.city}</div>}
        {c.category && <div className="flex items-center gap-1.5"><Star size={11} /> {c.category}</div>}
        <div className="flex items-center gap-1.5"><Calendar size={11} /> {new Date(c.created_at).toLocaleDateString("ar-SA")}</div>
      </div>

      {/* بطاقات الأداء السريعة */}
      <div>
        <h4 className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">إجمالي المشتريات والأداء</h4>
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="إجمالي المشتريات" value={`${(profile.total_spent || 0).toFixed(2)} ₪`} icon={<TrendingUp size={14} />} />
          <StatCard label="إجمالي الطلبات" value={String(profile.total_orders || 0)} icon={<ShoppingCart size={14} />} />
          <StatCard label="متوسط الطلب" value={`${(profile.avg_order_value || 0).toFixed(2)} ₪`} icon={<Percent size={14} />} />
          <StatCard label="شكاوى مفتوحة" value={String(profile.open_complaints_count || 0)} icon={<AlertTriangle size={14} />} highlight={(profile.open_complaints_count || 0) > 0} />
          <StatCard label="طلبات ملغاة" value={String(profile.cancelled_orders_count || 0)} icon={<Ban size={14} />} highlight={(profile.cancelled_orders_count || 0) > 0} />
          <StatCard label="نقاط الولاء" value={String(profile.loyalty_points ?? c.loyalty_points ?? 0)} icon={<Star size={14} />} />
        </div>
      </div>

      {/* تواريخ مهمة */}
      <div className="space-y-1.5 text-[11px] text-slate-400 bg-slate-800/30 rounded-xl p-3">
        {profile.first_order_at && (
          <div className="flex items-center gap-1.5">
            <Calendar size={11} className="text-slate-500" />
            <span>أول طلب: <span className="text-white font-bold">{new Date(profile.first_order_at).toLocaleDateString("ar-SA")}</span></span>
          </div>
        )}
        {profile.last_order_at && (
          <div className="flex items-center gap-1.5">
            <Clock size={11} className="text-slate-500" />
            <span>آخر طلب: <span className="text-white font-bold">{new Date(profile.last_order_at).toLocaleDateString("ar-SA")}</span></span>
          </div>
        )}
      </div>

      {/* الملاحظات التحذيرية الثابتة */}
      {(c.notes || profile.latest_note || (profile.open_complaints_count || 0) > 0) && (
        <div>
          <h4 className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">ملاحظات تحذيرية</h4>
          <div className="space-y-2">
            {c.notes && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-400">
                <MessageSquare size={12} className="inline ml-1" />
                {c.notes}
              </div>
            )}
            {profile.latest_note && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-400">
                <MessageSquare size={12} className="inline ml-1" />
                آخر ملاحظة: {profile.latest_note}
              </div>
            )}
            {(profile.open_complaints_count || 0) > 0 && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-400 flex items-start gap-2">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                يحتاج اهتمام — هذا العميل لديه {profile.open_complaints_count} شكوى مفتوحة
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Orders Tab ─── */
const OrdersTab: React.FC<{ orders: CustomerOrder[]; onSelectOrder: (id: number) => void; onRepeatOrder?: (order: OrderDetail) => void }> = ({ orders, onSelectOrder, onRepeatOrder }) => {
  if (orders.length === 0) return <EmptyState icon={ShoppingCart} text="لا توجد طلبات سابقة" />;
  return (
    <div className="space-y-2">
      {orders.slice(0, 5).map((o) => (
        <div key={o.id} className="w-full bg-slate-800/50 rounded-xl p-3 text-right hover:bg-slate-800 transition-all">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-bold text-white">{o.order_number}</span>
            <OrderStatusBadge status={o.status} />
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span>{new Date(o.created_at).toLocaleDateString("ar-SA")}</span>
            <span className="text-white font-bold">{o.total.toFixed(2)} ₪</span>
            {o.branch && <span>{o.branch.name}</span>}
          </div>
          <div className="mt-3 flex gap-2 border-t border-white/5 pt-2">
            <button onClick={() => onSelectOrder(o.id)} className="flex-1 rounded-lg bg-slate-700 px-2 py-1.5 text-[11px] font-bold text-slate-200 hover:bg-slate-600">عرض التفاصيل</button>
            {onRepeatOrder && (
              <button
                onClick={() => onRepeatOrder(o as OrderDetail)}
                className="flex-1 rounded-lg bg-emerald-600 px-2 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-900/30"
              >
                <Copy size={12} className="ml-1 inline" />
                اعتماد وتكرار الطلب
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
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
        <button key={c.id} onClick={() => onSelectComplaint(c.id)} className="w-full bg-slate-800/50 rounded-xl p-3 text-right hover:bg-slate-800 transition-all">
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
  useEffect(() => {
    callCenterService.getCustomerAddresses(customerId).then(r => setAddresses(r.data ?? [])).catch(() => { }).finally(() => setLoading(false));
  }, [customerId]);
  if (loading) return <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-red-500" /></div>;
  return (
    <div className="space-y-2">
      {addresses.length === 0 && <EmptyState icon={MapPin} text="لا توجد عناوين مسجلة" />}
      {addresses.map((a) => (
        <div key={a.id} className="bg-slate-800/50 rounded-xl p-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">{a.label}</span>
              {a.is_default && <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">افتراضي</span>}
            </div>
            {onAddressSelect && (
              <button onClick={() => onAddressSelect(a)} className="p-1 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors" title="اختيار هذا العنوان">
                <Check size={12} />
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
      occasion_type: formData.occasion_type,
      title: formData.title,
      date: formData.date,
      notes: formData.notes || undefined,
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
        <div key={o.id} className="bg-slate-800/50 rounded-xl p-3">
          <div className="flex items-center justify-between mb-1">
            <div>
              <span className="text-sm font-bold text-white">{o.title}</span>
              <span className="text-[10px] font-bold text-slate-500 mr-2">{typeLabel(o.occasion_type)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400">{new Date(o.date).toLocaleDateString("ar-SA")}</span>
              <button onClick={() => handleDelete(o.id)} className="p-1 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-400 transition-colors">
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
            <button onClick={handleCreate} className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 text-xs font-bold transition-colors">حفظ</button>
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

/* ─── Notes Tab ─── */
const LoyaltyAndNotesTab: React.FC<{
  customerId: number;
  points: number;
  onApply?: (amount: number) => void;
}> = ({ customerId, points, onApply }) => {
  const discountValue = Math.max(0, points) / 10;
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black text-amber-300">رصيد الولاء</p>
            <p className="mt-1 text-2xl font-black text-white">{points} نقطة</p>
            <p className="mt-1 text-xs font-bold text-amber-100/70">تعادل {discountValue.toFixed(2)} ₪</p>
          </div>
          <Star size={30} className="text-amber-300" />
        </div>
        <button
          type="button"
          disabled={!onApply || discountValue <= 0}
          onClick={() => onApply?.(discountValue)}
          className="mt-4 w-full rounded-xl bg-amber-400 py-2.5 text-xs font-black text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          تطبيق الخصم من النقاط
        </button>
      </section>
      <section>
        <h4 className="mb-2 text-xs font-black text-slate-300">الملاحظات الثابتة والتحذيرية</h4>
        <NotesTab customerId={customerId} />
      </section>
    </div>
  );
};

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
        <div key={n.id} className="bg-slate-800/50 rounded-xl p-3">
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
          <div className="flex gap-2">
            <select value={formData.type} onChange={e => setFormData(p => ({ ...p, type: e.target.value }))} className="flex-1 bg-slate-700 border border-white/10 rounded-lg px-2 py-2 text-xs text-white">
              <option value="general">عامة</option>
              <option value="delivery">توصيل</option>
              <option value="warning">تحذير</option>
              <option value="preference">تفضيل</option>
              <option value="service">خدمة عملاء</option>
              <option value="sensitive">حساسة</option>
            </select>
            <select value={formData.importance} onChange={e => setFormData(p => ({ ...p, importance: e.target.value }))} className="flex-1 bg-slate-700 border border-white/10 rounded-lg px-2 py-2 text-xs text-white">
              <option value="low">منخفضة</option>
              <option value="normal">عادية</option>
              <option value="high">مهمة</option>
              <option value="urgent">عاجلة</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input type="checkbox" checked={formData.show_during_order} onChange={e => setFormData(p => ({ ...p, show_during_order: e.target.checked }))} className="rounded bg-slate-700 border-white/10" />
            إظهار أثناء إنشاء الطلب
          </label>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 text-xs font-bold transition-colors">حفظ</button>
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
    try {
      onReOrder(order);
    } finally {
      setAdopting(false);
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
              <button onClick={handleAdoptOrder} disabled={adopting} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 text-white rounded-lg text-[10px] font-bold transition-all active:scale-95 shadow-lg shadow-emerald-900/30">
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
    } catch { } finally {
      setAddingFollowup(false);
    }
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
                    <button onClick={handleAddFollowup} disabled={addingFollowup || !followupText.trim()} className="px-4 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors">
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

/* ─── Shared Components ─── */

const StatCard: React.FC<{ label: string; value: string; icon: React.ReactNode; highlight?: boolean }> = ({ label, value, icon, highlight }) => (
  <div className={`bg-slate-800/30 rounded-xl p-3 ${highlight ? "border border-red-500/20" : ""}`}>
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