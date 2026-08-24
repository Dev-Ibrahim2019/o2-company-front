import { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../../store";
import { useOrders } from "../../hooks/useOrders";
import { orderService } from "../../services/orderService";
import type {
  OrderFromApi,
  OrderStatus as ApiOrderStatus,
  OrderType as ApiOrderType,
} from "../../services/orderService";
import {
  Banknote,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Edit3,
  FileText,
  Hash,
  Landmark,
  Loader2,
  PackageOpen,
  RefreshCw,
  Search,
  Table2,
  Wallet,
  X,
} from "lucide-react";

type OrdersTab = "ACTIVE" | "CLOSED";
type TypeFilter = ApiOrderType | "ALL";
type StatusFilter = ApiOrderStatus | "ALL";

const CLOSED_STATUSES: ApiOrderStatus[] = ["paid", "cancelled"];
const ACTIVE_STATUSES: ApiOrderStatus[] = [
  "pending",
  "confirmed",
  "in_progress",
  "ready",
  "served",
];

const getBranchFilter = (currentUser: unknown) => {
  const user = currentUser as { branch_id?: number | string; branchId?: number | string } | null;
  const rawBranchId = user?.branch_id ?? user?.branchId;
  const branchId =
    typeof rawBranchId === "number" ? rawBranchId : Number(rawBranchId);

  return Number.isFinite(branchId) ? { branch_id: branchId } : undefined;
};

const isClosedOrder = (status: ApiOrderStatus) =>
  CLOSED_STATUSES.includes(status);

const getStatusColor = (status: ApiOrderStatus) => {
  switch (status) {
    case "pending":
      return "bg-yellow-500/15 text-yellow-400 border-yellow-500/25";
    case "pending_confirmation":
      return "bg-purple-500/15 text-purple-400 border-purple-500/25";
    case "confirmed":
      return "bg-blue-500/15 text-blue-400 border-blue-500/25";
    case "in_progress":
      return "bg-orange-500/15 text-orange-400 border-orange-500/25";
    case "ready":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/25";
    case "served":
      return "bg-cyan-500/15 text-cyan-400 border-cyan-500/25";
    case "paid":
      return "bg-slate-500/15 text-slate-300 border-slate-500/25";
    case "cancelled":
      return "bg-red-500/15 text-red-400 border-red-500/25";
    default:
      return "bg-slate-500/15 text-slate-400 border-slate-500/25";
  }
};

const getStatusDotColor = (status: ApiOrderStatus) => {
  switch (status) {
    case "pending":
      return "bg-yellow-400";
    case "pending_confirmation":
      return "bg-purple-400";
    case "confirmed":
      return "bg-blue-400";
    case "in_progress":
      return "bg-orange-400";
    case "ready":
      return "bg-emerald-400";
    case "served":
      return "bg-cyan-400";
    case "paid":
      return "bg-slate-300";
    case "cancelled":
      return "bg-red-400";
    default:
      return "bg-slate-400";
  }
};

const getStatusLabel = (status: ApiOrderStatus) => {
  switch (status) {
    case "pending":
      return "محفوظ";
    case "pending_confirmation":
      return "بانتظار التأكيد";
    case "confirmed":
      return "مرسل";
    case "in_progress":
      return "تحضير";
    case "ready":
      return "جاهز";
    case "served":
      return "تم التسليم";
    case "paid":
      return "مغلق";
    case "cancelled":
      return "ملغي";
    default:
      return "غير معروف";
  }
};

const getOrderTypeLabel = (type: ApiOrderType) =>
  type === "dine_in" ? "محلي" : "سفري";

const getPaymentLabel = (method?: string | null) => {
  switch (method) {
    case "cash":
      return "كاش";
    case "credit_card":
    case "card":
      return "بطاقة";
    case "wallet":
      return "محفظة";
    case "bank_transfer":
    case "bank":
      return "بنكي";
    default:
      return "---";
  }
};

const formatMoney = (value: number) => `${Number(value || 0).toFixed(2)} ₪`;

const getTimeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `${mins} د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} س`;
  return `${Math.floor(hrs / 24)} ي`;
};

export const HospitalityOrders = () => {
  const navigate = useNavigate();
  const { currentShift, currentUser } = useApp();
  const branchFilter = useMemo(() => getBranchFilter(currentUser), [currentUser]);
  const { orders, loading, error, refetch } = useOrders(branchFilter);

  const [activeTab, setActiveTab] = useState<OrdersTab>("ACTIVE");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  // إغلاق الفاتورة يطلب اسم/هاتف الزبون أولاً — orderService.pay()/settle
  // لا يستقبل بيانات العميل، فيتم تحديث نفس الطلب أولاً (customer_name/
  // customer_phone) قبل استدعاء pay() على نفس order.id.
  const [closeTarget, setCloseTarget] = useState<OrderFromApi | null>(null);
  const [closeName, setCloseName] = useState("");
  const [closePhone, setClosePhone] = useState("");

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // فلترة حسب الـ shift_id (الأولوية) أو التاريخ كـ fallback
      const isInShift = currentShift
        ? (order.shift_id && String(order.shift_id) === String(currentShift.id)) ||
          (new Date(order.created_at) >= new Date(currentShift.startTime))
        : true;

      if (!isInShift) return false;

      const matchesTab =
        activeTab === "ACTIVE"
          ? !isClosedOrder(order.status)
          : isClosedOrder(order.status);

      const matchesStatus =
        statusFilter === "ALL" || order.status === statusFilter;
      const matchesType =
        typeFilter === "ALL" || order.order_type === typeFilter;

      const normalizedSearch = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !normalizedSearch ||
        order.order_number.toLowerCase().includes(normalizedSearch) ||
        (order.customer_name ?? "").toLowerCase().includes(normalizedSearch) ||
        (order.customer_phone ?? "").includes(normalizedSearch) ||
        (order.table_number ?? "").includes(normalizedSearch);

      return matchesTab && matchesStatus && matchesType && matchesSearch;
    });
  }, [activeTab, currentShift, orders, searchTerm, statusFilter, typeFilter]);

  const activeCount = orders.filter((o) => !isClosedOrder(o.status)).length;
  const closedCount = orders.filter((o) => isClosedOrder(o.status)).length;

  const refreshOrders = useCallback(() => refetch(branchFilter), [branchFilter, refetch]);

  const openCloseDialog = (order: OrderFromApi) => {
    if (isClosedOrder(order.status)) return;
    setActionError(null);
    setCloseName(order.customer_name ?? "");
    setClosePhone(order.customer_phone ?? "");
    setCloseTarget(order);
  };

  const confirmCloseOrder = async () => {
    const order = closeTarget;
    if (!order) return;

    const name = closeName.trim();
    if (!name) {
      setActionError("يرجى إدخال اسم الزبون");
      return;
    }
    const phone = closePhone.trim();

    setActionError(null);
    setBusyOrderId(order.id);
    try {
      // نحدّث بيانات العميل على نفس الطلب أولاً — orderService.pay()/settle
      // لا يستقبل customer_name/customer_phone، ويعتمد SettlementEngine على
      // القيم المخزّنة بالفعل على الـ Order لربط/إنشاء العميل.
      if (name !== (order.customer_name ?? "") || phone !== (order.customer_phone ?? "")) {
        await orderService.update(order.id, {
          customer_name: name,
          customer_phone: phone || undefined,
        });
      }
      await orderService.pay(order.id, {
        payment_method: order.payment_method ?? "cash",
        amount: order.total,
        note: order.note ?? undefined,
      });
      setCloseTarget(null);
      await refreshOrders();
      setActiveTab("CLOSED");
    } catch (e: unknown) {
      const message =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "فشل إغلاق الطلب";
      setActionError(message);
    } finally {
      setBusyOrderId(null);
    }
  };

  const toggleExpand = (orderId: number) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 overflow-hidden rounded-[1.5rem] sm:rounded-[2rem]">
      {/* ── Header ── */}
      <header className="shrink-0 px-3 pt-3 pb-2 sm:px-5 sm:pt-5 sm:pb-3 space-y-3">
        {/* Title Row */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">
              الطلبات
            </h2>
            <p className="text-slate-500 font-bold text-[10px] sm:text-[11px]">
              {currentShift
                ? `منذ ${new Date(currentShift.startTime).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}`
                : "جميع الطلبات"}
            </p>
          </div>
          <button
            onClick={refreshOrders}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900 border border-white/5 text-slate-400 hover:text-white active:scale-95 transition-all disabled:opacity-40"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Search */}
        {showSearch ? (
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input
              autoFocus
              type="text"
              placeholder="بحث برقم الطلب، اسم الزبون، الجوال، أو رقم الطاولة..."
              className="w-full pr-9 pl-9 py-2.5 bg-slate-900 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-red-600/50 text-xs font-bold text-white placeholder:text-slate-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button
              onClick={() => { setShowSearch(false); setSearchTerm(""); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowSearch(true)}
            className="w-full flex items-center gap-2 px-3 py-2.5 bg-slate-900 border border-white/5 rounded-xl text-slate-500 text-xs font-bold"
          >
            <Search size={14} />
           بحث...
          </button>
        )}

        {/* Error */}
        {(actionError || error) && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl px-3 py-2 text-[10px] sm:text-xs font-bold">
            {actionError || error}
          </div>
        )}
      </header>

      {/* ── Tabs + Filters (sticky) ── */}
      <div className="shrink-0 px-3 pb-2 sm:px-5 space-y-2">
        {/* Tabs */}
        <div className="flex bg-slate-900 p-1 rounded-xl border border-white/5">
          <button
            onClick={() => { setActiveTab("ACTIVE"); setStatusFilter("ALL"); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-black text-[10px] sm:text-xs transition-all ${
              activeTab === "ACTIVE"
                ? "bg-red-600 text-white shadow-lg shadow-red-900/20"
                : "text-slate-500"
            }`}
          >
            <ClipboardList size={12} />
            نشطة
            <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-[9px]">
              {activeCount}
            </span>
          </button>
          <button
            onClick={() => { setActiveTab("CLOSED"); setStatusFilter("ALL"); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-black text-[10px] sm:text-xs transition-all ${
              activeTab === "CLOSED"
                ? "bg-slate-800 text-white shadow-lg"
                : "text-slate-500"
            }`}
          >
            <CheckCircle2 size={12} />
            مغلقة
            <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-[9px]">
              {closedCount}
            </span>
          </button>
        </div>

        {/* Filters Row */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
          {/* Type Filter */}
          <button
            onClick={() => setTypeFilter("ALL")}
            className={`shrink-0 px-3 py-1.5 rounded-lg border text-[9px] sm:text-[10px] font-black ${
              typeFilter === "ALL"
                ? "bg-white/10 border-white/20 text-white"
                : "bg-slate-900 border-white/5 text-slate-500"
            }`}
          >
            الكل
          </button>
          <button
            onClick={() => setTypeFilter("dine_in")}
            className={`shrink-0 px-3 py-1.5 rounded-lg border text-[9px] sm:text-[10px] font-black ${
              typeFilter === "dine_in"
                ? "bg-white/10 border-white/20 text-white"
                : "bg-slate-900 border-white/5 text-slate-500"
            }`}
          >
            محلي
          </button>
          <button
            onClick={() => setTypeFilter("takeaway")}
            className={`shrink-0 px-3 py-1.5 rounded-lg border text-[9px] sm:text-[10px] font-black ${
              typeFilter === "takeaway"
                ? "bg-white/10 border-white/20 text-white"
                : "bg-slate-900 border-white/5 text-slate-500"
            }`}
          >
            سفري
          </button>

          <div className="w-px bg-white/5 shrink-0" />

          {/* Status Filter */}
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`shrink-0 px-3 py-1.5 rounded-lg border text-[9px] sm:text-[10px] font-black ${
              statusFilter === "ALL"
                ? "bg-white/10 border-white/20 text-white"
                : "bg-slate-900 border-white/5 text-slate-500"
            }`}
          >
            كل الحالات
          </button>
          {(activeTab === "ACTIVE" ? ACTIVE_STATUSES : CLOSED_STATUSES).map(
            (status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`shrink-0 px-3 py-1.5 rounded-lg border text-[9px] sm:text-[10px] font-black ${
                  statusFilter === status
                    ? getStatusColor(status)
                    : "bg-slate-900 border-white/5 text-slate-500"
                }`}
              >
                {getStatusLabel(status)}
              </button>
            ),
          )}
        </div>
      </div>

      {/* ── Orders List ── */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-5 pb-4 custom-scrollbar">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="animate-spin text-red-500" size={28} />
            <p className="text-xs font-black">جاري تحميل الطلبات...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-red-600 blur-[40px] opacity-15 rounded-full" />
              <div className="relative w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center border border-white/5">
                <PackageOpen size={40} className="text-slate-700" strokeWidth={1} />
              </div>
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-white">لا توجد طلبات</h3>
              <p className="text-slate-500 font-bold text-[11px]">
                {searchTerm ? "لم نجد نتائج تطابق البحث" : "ستظهر الطلبات النشطة هنا"}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredOrders.map((order) => {
              const busy = busyOrderId === order.id;
              const isExpanded = expandedOrderId === order.id;

              return (
                <div
                  key={order.id}
                  className="bg-slate-900 rounded-2xl border border-white/5 overflow-hidden transition-all"
                >
                  {/* Card Header — always visible */}
                  <div
                    className="p-3 sm:p-4 flex items-center gap-3 cursor-pointer active:bg-slate-800/50 transition-colors"
                    onClick={() => toggleExpand(order.id)}
                  >
                    {/* Status Dot */}
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${getStatusDotColor(order.status)}`} />

                    {/* Main Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white">
                          #{order.order_number}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded-md border text-[8px] font-black ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-500 font-bold">
                          {getOrderTypeLabel(order.order_type)}
                        </span>
                        {order.table_number && (
                          <span className="text-[10px] text-red-400 font-bold">
                            طاولة {order.table_number}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-600">
                          {getTimeAgo(order.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-left shrink-0">
                      <p className="text-sm font-black text-red-500">
                        {formatMoney(order.total)}
                      </p>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-3 pb-3 sm:px-4 sm:pb-4 space-y-3 border-t border-white/5 pt-3">
                      {/* Items */}
                      {order.items.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <ClipboardList size={10} />
                            <span className="text-[8px] font-black uppercase tracking-widest">
                              الأصناف ({order.items.length})
                            </span>
                          </div>
                          <div className="space-y-1 max-h-28 overflow-y-auto custom-scrollbar">
                            {order.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex justify-between items-center bg-slate-800/40 p-2 rounded-lg border border-white/5"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-[10px] font-bold text-slate-200 truncate">
                                    {item.item_name_ar || item.item_name}
                                  </span>
                                  <span className="text-[8px] font-black bg-red-600/20 text-red-500 px-1 py-0.5 rounded shrink-0">
                                    x{item.quantity}
                                  </span>
                                </div>
                                <span className="text-[10px] font-black text-white shrink-0">
                                  {formatMoney(item.total_price)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Customer Info */}
                      {(order.customer_name || order.customer_phone) && (
                        <div className="flex gap-4 text-[10px]">
                          {order.customer_name && (
                            <div>
                              <span className="text-slate-500 font-bold">الزبون: </span>
                              <span className="text-slate-300 font-black">{order.customer_name}</span>
                            </div>
                          )}
                          {order.customer_phone && (
                            <div>
                              <span className="text-slate-500 font-bold">الجوال: </span>
                              <span className="text-slate-300 font-black">{order.customer_phone}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Note */}
                      {order.note && (
                        <div className="flex items-start gap-1.5 bg-slate-800/30 p-2 rounded-lg border border-white/5">
                          <FileText size={10} className="text-slate-500 mt-0.5 shrink-0" />
                          <p className="text-[10px] font-bold text-slate-400">{order.note}</p>
                        </div>
                      )}

                      {/* Payment Info */}
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="text-slate-500 font-bold">الدفع:</span>
                        <span className="text-slate-300 font-black">{getPaymentLabel(order.payment_method)}</span>
                        <span className="text-slate-600">|</span>
                        <span className="text-slate-500 font-bold">الوقت:</span>
                        <span className="text-slate-300 font-black">
                          {new Date(order.created_at).toLocaleTimeString("ar-EG", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-1">
                        {activeTab === "ACTIVE" ? (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/Hospitality?editOrderId=${order.id}`);
                              }}
                              disabled={busy}
                              className="flex-1 py-2.5 rounded-xl bg-slate-800 border border-white/5 text-slate-300 font-black text-[10px] flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-40 transition-all"
                            >
                              <Edit3 size={13} />
                              تعديل
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openCloseDialog(order);
                              }}
                              disabled={busy}
                              className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-black text-[10px] flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-40 transition-all shadow-lg shadow-red-900/20"
                            >
                              {busy ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <CheckCircle2 size={13} />
                              )}
                              إغلاق
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // transferClosedOrder(order);
                            }}
                            disabled={busy || order.status !== "paid"}
                            className="flex-1 py-2.5 rounded-xl bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 font-black text-[10px] flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-40 transition-all"
                          >
                            مغلق مالياً
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* بيانات الزبون قبل إغلاق الفاتورة — يُحدَّث نفس الطلب (order.id) قبل التسوية */}
      {closeTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-xs overflow-hidden p-6 space-y-5">
            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-black text-white">إغلاق الفاتورة</h3>
              <p className="text-slate-500 font-bold text-xs">
                طلب #{closeTarget.order_number} — {formatMoney(closeTarget.total)}
              </p>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mr-2">اسم الزبون</label>
                <input
                  type="text"
                  autoFocus
                  value={closeName}
                  onChange={(e) => setCloseName(e.target.value)}
                  placeholder="أدخل اسم الزبون..."
                  className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-red-600 font-black text-xs text-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mr-2">رقم الهاتف (اختياري)</label>
                <input
                  type="tel"
                  value={closePhone}
                  onChange={(e) => setClosePhone(e.target.value)}
                  placeholder="05xxxxxxxx"
                  dir="ltr"
                  className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-red-600 font-black text-xs text-white text-center"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={confirmCloseOrder}
                disabled={busyOrderId === closeTarget.id}
                className="w-full bg-red-600 text-white py-3 rounded-2xl font-black text-xs shadow-lg shadow-red-900/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {busyOrderId === closeTarget.id ? "جارٍ الإغلاق..." : "تأكيد وإغلاق الفاتورة"}
              </button>
              <button
                onClick={() => setCloseTarget(null)}
                disabled={busyOrderId === closeTarget.id}
                className="w-full bg-slate-800 text-slate-400 py-3 rounded-2xl font-black text-xs active:scale-95 transition-all disabled:opacity-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
