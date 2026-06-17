import { useMemo, useState } from "react";
import { useApp } from "../../../store";
import { useOrders } from "../../hooks/useOrders";
import { orderService } from "../../services/orderService";
import { OrderEditModal } from "../orders/OrderEditModal";
import type {
  OrderFromApi,
  OrderStatus as ApiOrderStatus,
  OrderType as ApiOrderType,
} from "../../services/orderService";
import {
  Activity,
  Archive,
  CheckCircle2,
  Clock,
  Download,
  Edit3,
  Eye,
  FileText,
  Filter,
  Flame,
  LayoutGrid,
  Loader2,
  LockKeyhole,
  Printer,
  Search,
  ShoppingCart,
  Table2,
  Wallet,
  X,
  XCircle,
} from "lucide-react";

type OrderTab = "ACTIVE" | "PREPARING" | "READY" | "CLOSED" | "CANCELED";
type ViewMode = "cards" | "table";
type OrderFilters = {
  type: ApiOrderType | "all";
  dateRange: "today" | "yesterday" | "week" | "month" | "all";
};

const getBranchFilter = (currentUser: unknown) => {
  const user = currentUser as { branch_id?: number | string; branchId?: number | string } | null;
  const rawBranchId = user?.branch_id ?? user?.branchId;
  const branchId =
    typeof rawBranchId === "number" ? rawBranchId : Number(rawBranchId);

  return Number.isFinite(branchId) ? { branch_id: branchId } : undefined;
};

const isClosedOrder = (status: ApiOrderStatus) =>
  status === "paid" || status === "cancelled";

const getStatusLabel = (status: ApiOrderStatus) => {
  switch (status) {
    case "pending":
      return "محفوظ";
    case "confirmed":
      return "مؤكد";
    case "in_progress":
      return "قيد التحضير";
    case "ready":
      return "جاهز";
    case "served":
      return "تم التسليم";
    case "paid":
      return "مغلق ماليا";
    case "cancelled":
      return "ملغي";
    default:
      return "غير معروف";
  }
};

const getStatusClasses = (status: ApiOrderStatus) => {
  switch (status) {
    case "pending":
      return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
    case "confirmed":
      return "text-blue-400 bg-blue-500/10 border-blue-500/20";
    case "in_progress":
      return "text-orange-400 bg-orange-500/10 border-orange-500/20";
    case "ready":
      return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    case "served":
      return "text-cyan-400 bg-cyan-500/10 border-cyan-500/20";
    case "paid":
      return "text-slate-300 bg-slate-500/10 border-slate-500/20";
    case "cancelled":
      return "text-red-400 bg-red-500/10 border-red-500/20";
    default:
      return "text-slate-400 bg-slate-500/10 border-slate-500/20";
  }
};

const getStatusIcon = (status: ApiOrderStatus) => {
  if (status === "paid" || status === "ready") return <CheckCircle2 size={12} />;
  if (status === "cancelled") return <XCircle size={12} />;
  if (status === "in_progress") return <Flame size={12} />;
  return <Clock size={12} />;
};

const getOrderTypeLabel = (type: ApiOrderType) =>
  type === "dine_in" ? "محلي" : "سفري";

const formatMoney = (value: number) => `${Number(value || 0).toFixed(2)} ₪`;

const getDateBoundary = (dateRange: OrderFilters["dateRange"]) => {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (dateRange === "today") return { start, end: now };
  if (dateRange === "yesterday") {
    const yesterdayStart = new Date(start);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(start);
    return { start: yesterdayStart, end: yesterdayEnd };
  }
  if (dateRange === "week") {
    const weekStart = new Date(start);
    weekStart.setDate(weekStart.getDate() - 7);
    return { start: weekStart, end: now };
  }
  if (dateRange === "month") {
    const monthStart = new Date(start);
    monthStart.setMonth(monthStart.getMonth() - 1);
    return { start: monthStart, end: now };
  }

  return null;
};

const matchesTab = (order: OrderFromApi, orderTab: OrderTab) => {
  if (orderTab === "ACTIVE") return !isClosedOrder(order.status);
  if (orderTab === "PREPARING") return order.status === "in_progress";
  if (orderTab === "READY") return order.status === "ready";
  if (orderTab === "CLOSED") return order.status === "paid";
  return order.status === "cancelled";
};

const tabStyles: Record<OrderTab, { active: string; icon: typeof Activity }> = {
  ACTIVE: {
    active: "bg-blue-500/10 border-blue-500/50 text-blue-400 shadow-lg shadow-blue-500/10",
    icon: Activity,
  },
  PREPARING: {
    active: "bg-orange-500/10 border-orange-500/50 text-orange-400 shadow-lg shadow-orange-500/10",
    icon: Flame,
  },
  READY: {
    active: "bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-lg shadow-emerald-500/10",
    icon: CheckCircle2,
  },
  CLOSED: {
    active: "bg-slate-500/10 border-slate-500/50 text-slate-200 shadow-lg shadow-slate-500/10",
    icon: Archive,
  },
  CANCELED: {
    active: "bg-red-500/10 border-red-500/50 text-red-400 shadow-lg shadow-red-500/10",
    icon: XCircle,
  },
};

const tabLabels: Record<OrderTab, string> = {
  ACTIVE: "الطلبات النشطة",
  PREPARING: "قيد التحضير",
  READY: "جاهزة للاستلام",
  CLOSED: "طلبات مغلقة",
  CANCELED: "طلبات ملغاة",
};

const OrdersPage = () => {
  const { currentUser } = useApp();
  const branchFilter = useMemo(() => getBranchFilter(currentUser), [currentUser]);
  const { orders, loading, error, refetch } = useOrders(branchFilter);

  const [orderTab, setOrderTab] = useState<OrderTab>("ACTIVE");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [editingOrder, setEditingOrder] = useState<OrderFromApi | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [orderFilters, setOrderFilters] = useState<OrderFilters>({
    type: "all",
    dateRange: "today",
  });
  const [showOrderFilters, setShowOrderFilters] = useState(false);
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [transferredOrderIds, setTransferredOrderIds] = useState<number[]>([]);

  const selectedOrder = orders.find((order) => order.id === selectedOrderId);

  const filteredOrders = useMemo(() => {
    const dateBoundary = getDateBoundary(orderFilters.dateRange);
    const normalizedSearch = orderSearchQuery.trim().toLowerCase();

    return orders.filter((order) => {
      const orderDate = new Date(order.created_at);
      const matchesDate =
        !dateBoundary ||
        (orderDate >= dateBoundary.start && orderDate < dateBoundary.end);
      const matchesSearch =
        !normalizedSearch ||
        order.order_number.toLowerCase().includes(normalizedSearch) ||
        (order.customer_name ?? "").toLowerCase().includes(normalizedSearch) ||
        (order.customer_phone ?? "").includes(normalizedSearch);
      const matchesType =
        orderFilters.type === "all" || order.order_type === orderFilters.type;

      return matchesTab(order, orderTab) && matchesDate && matchesSearch && matchesType;
    });
  }, [orderFilters, orderSearchQuery, orderTab, orders]);

  const refreshOrders = () => refetch(branchFilter);

  const tabCount = (tab: OrderTab) =>
    orders.filter((order) => matchesTab(order, tab)).length;

  const closeOrder = async (order: OrderFromApi) => {
    if (isClosedOrder(order.status)) return;

    setBusyOrderId(order.id);
    setActionError(null);
    try {
      await orderService.pay(order.id, {
        payment_method: order.payment_method ?? "cash",
        amount: order.total,
        customer_name: order.customer_name ?? undefined,
        customer_phone: order.customer_phone ?? undefined,
        note: order.note ?? undefined,
      });
      await refreshOrders();
      setOrderTab("CLOSED");
      setSelectedOrderId(null);
    } catch (e: unknown) {
      const message =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "فشل إغلاق الطلب";
      setActionError(message);
    } finally {
      setBusyOrderId(null);
    }
  };

  const transferClosedOrder = async (order: OrderFromApi) => {
    if (order.status !== "paid" || transferredOrderIds.includes(order.id)) {
      return;
    }
    setBusyOrderId(order.id);
    setActionError(null);
    try {
      await orderService.transferClosedOrderToSales(order);
      setTransferredOrderIds((prev) => [...prev, order.id]);
      await refreshOrders();
      setSelectedOrderId(null);
    } catch (e: unknown) {
      const message =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "فشل ترحيل الطلب إلى المبيعات";
      setActionError(message);
    } finally {
      setBusyOrderId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {editingOrder && (
        <OrderEditModal
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSaved={() => {
            setEditingOrder(null);
            refreshOrders();
          }}
        />
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-[60] bg-slate-950 flex flex-col animate-in fade-in slide-in-from-right duration-300">
          <div className="bg-slate-900 border-b border-white/5 p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedOrderId(null)}
                className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all"
              >
                <X size={24} />
              </button>
              <div>
                <h2 className="text-xl font-bold text-white">
                  طلب #{selectedOrder.order_number}
                </h2>
                <p className="text-xs text-slate-500">
                  {new Date(selectedOrder.created_at).toLocaleString("ar-SA")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedOrder.status === "paid" && (
                <div className="px-3 py-2 rounded-xl bg-slate-800 border border-white/5 text-slate-300 text-xs font-black flex items-center gap-2">
                  <LockKeyhole size={16} />
                  فاتورة مقفلة
                </div>
              )}
              <button
                onClick={() => window.print()}
                className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm transition-all"
              >
                <Printer size={18} />
                طباعة
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl">
                    <p className="text-[10px] text-slate-500 uppercase mb-1">
                      النوع
                    </p>
                    <div className="flex items-center gap-2">
                      <LayoutGrid size={16} className="text-blue-400" />
                      <span className="font-bold text-white">
                        {getOrderTypeLabel(selectedOrder.order_type)}
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl">
                    <p className="text-[10px] text-slate-500 uppercase mb-1">
                      الطاولة
                    </p>
                    <span className="font-bold text-white">
                      {selectedOrder.table_number || "---"}
                    </span>
                  </div>
                  <div className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl">
                    <p className="text-[10px] text-slate-500 uppercase mb-1">
                      الحالة
                    </p>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-black ${getStatusClasses(selectedOrder.status)}`}
                    >
                      {getStatusIcon(selectedOrder.status)}
                      {getStatusLabel(selectedOrder.status)}
                    </span>
                  </div>
                  <div className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl">
                    <p className="text-[10px] text-slate-500 uppercase mb-1">
                      العميل
                    </p>
                    <span className="font-bold text-white truncate block">
                      {selectedOrder.customer_name || "عميل نقدي"}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden">
                  <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <h3 className="font-bold text-white flex items-center gap-2">
                      <ShoppingCart size={18} className="text-red-500" />
                      الأصناف المطلوبة
                    </h3>
                    <span className="text-xs text-slate-500">
                      {selectedOrder.items.length} أصناف
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-right">
                      <thead>
                        <tr className="text-slate-500 text-xs border-b border-white/5">
                          <th className="p-4 font-medium">الصنف</th>
                          <th className="p-4 font-medium text-center">الكمية</th>
                          <th className="p-4 font-medium">السعر</th>
                          <th className="p-4 font-medium">الإجمالي</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {selectedOrder.items.map((item) => (
                          <tr
                            key={item.id}
                            className="text-sm hover:bg-white/5 transition-colors"
                          >
                            <td className="p-4">
                              <p className="text-white font-medium">
                                {item.item_name_ar || item.item_name}
                              </p>
                              {item.notes && (
                                <p className="text-[10px] text-red-400 mt-1">
                                  {item.notes}
                                </p>
                              )}
                            </td>
                            <td className="p-4 text-center text-white font-bold">
                              {item.quantity}
                            </td>
                            <td className="p-4 text-slate-300">
                              {formatMoney(item.unit_price)}
                            </td>
                            <td className="p-4 text-white font-bold">
                              {formatMoney(item.total_price)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-900 border border-white/5 rounded-2xl p-6">
                  <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                    <FileText size={18} className="text-red-500" />
                    ملخص الفاتورة
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">المجموع الفرعي</span>
                      <span className="text-white font-medium">
                        {formatMoney(selectedOrder.subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">الخصم</span>
                      <span className="text-red-400 font-medium">
                        -{formatMoney(selectedOrder.discount_amount)}
                      </span>
                    </div>
                    <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                      <span className="text-lg font-bold text-white">
                        الإجمالي
                      </span>
                      <span className="text-2xl font-black text-emerald-400">
                        {formatMoney(selectedOrder.total)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-6 p-4 bg-slate-800/50 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-400">الدفع</span>
                      <span className="text-xs font-bold text-white">
                        {selectedOrder.payment_method || "غير مدفوع"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-emerald-500/10 rounded text-emerald-500">
                        <Wallet size={14} />
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {selectedOrder.paid_at
                          ? `أغلق في ${new Date(selectedOrder.paid_at).toLocaleString("ar-SA")}`
                          : "لم يتم إغلاق الطلب بعد"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-2">
                    {!isClosedOrder(selectedOrder.status) && (
                      <>
                        <button
                          onClick={() => {
                            setEditingOrder(selectedOrder);
                            setSelectedOrderId(null);
                          }}
                          disabled={busyOrderId === selectedOrder.id}
                          className="w-full bg-slate-800 hover:bg-slate-700 border border-white/5 text-slate-200 disabled:opacity-50 py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2"
                        >
                          <Edit3 size={16} />
                          تعديل الطلب
                        </button>
                        <button
                          onClick={() => closeOrder(selectedOrder)}
                          disabled={busyOrderId === selectedOrder.id}
                          className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2"
                        >
                          {busyOrderId === selectedOrder.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={16} />
                          )}
                          إغلاق الطلب
                        </button>
                      </>
                    )}
                    {selectedOrder.status === "paid" && (
                      <button
                        onClick={() => transferClosedOrder(selectedOrder)}
                        disabled={
                          busyOrderId === selectedOrder.id ||
                          transferredOrderIds.includes(selectedOrder.id)
                        }
                        className="w-full bg-orange-500/10 hover:bg-orange-600 border border-orange-500/20 text-orange-400 hover:text-white disabled:opacity-50 py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2"
                      >
                        <Archive size={16} />
                        {transferredOrderIds.includes(selectedOrder.id)
                          ? "تم الترحيل"
                          : "ترحيل للمبيعات"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {(actionError || error) && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-2xl px-4 py-3 text-xs font-bold">
          {actionError || error}
        </div>
      )}

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {(["ACTIVE", "PREPARING", "READY", "CLOSED", "CANCELED"] as OrderTab[]).map(
          (tab) => {
            const Icon = tabStyles[tab].icon;
            return (
              <button
                key={tab}
                onClick={() => setOrderTab(tab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap border ${
                  orderTab === tab
                    ? tabStyles[tab].active
                    : "bg-slate-900 border-white/5 text-slate-400 hover:bg-slate-800"
                }`}
              >
                <Icon size={16} />
                {tabLabels[tab]}
                <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] bg-white/10">
                  {tabCount(tab)}
                </span>
              </button>
            );
          },
        )}
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full max-w-md">
          <Search
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
            size={18}
          />
          <input
            type="text"
            value={orderSearchQuery}
            onChange={(event) => setOrderSearchQuery(event.target.value)}
            placeholder="البحث برقم الطلب، اسم العميل، أو رقم الهاتف..."
            className="w-full bg-slate-900 border border-white/5 rounded-xl py-2 pr-10 pl-4 text-sm text-white focus:outline-none focus:border-red-500/50 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex bg-slate-900 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setViewMode("cards")}
              className={`px-3 py-2 rounded-lg flex items-center gap-1.5 text-xs font-black ${
                viewMode === "cards"
                  ? "bg-red-600 text-white"
                  : "text-slate-500 hover:text-white"
              }`}
            >
              <LayoutGrid size={16} />
              كاردس
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-2 rounded-lg flex items-center gap-1.5 text-xs font-black ${
                viewMode === "table"
                  ? "bg-red-600 text-white"
                  : "text-slate-500 hover:text-white"
              }`}
            >
              <Table2 size={16} />
              جدول
            </button>
          </div>
          <button
            onClick={() => setShowOrderFilters(!showOrderFilters)}
            className={`flex-1 md:flex-none border px-4 py-2 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all ${
              showOrderFilters
                ? "bg-red-500 border-red-500 text-white"
                : "bg-slate-900 border-white/5 text-white hover:bg-slate-800"
            }`}
          >
            <Filter size={18} />
            تصفية
          </button>
          <button className="flex-1 md:flex-none bg-slate-900 border border-white/5 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2 font-bold text-sm hover:bg-slate-800 transition-all">
            <Download size={18} />
            تصدير
          </button>
        </div>
      </div>

      {showOrderFilters && (
        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] text-slate-500 uppercase mb-1 block">
              نوع الطلب
            </label>
            <select
              value={orderFilters.type}
              onChange={(event) =>
                setOrderFilters((prev) => ({
                  ...prev,
                  type: event.target.value as OrderFilters["type"],
                }))
              }
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
            >
              <option value="all">الكل</option>
              <option value="dine_in">محلي</option>
              <option value="takeaway">سفري</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase mb-1 block">
              التاريخ
            </label>
            <select
              value={orderFilters.dateRange}
              onChange={(event) =>
                setOrderFilters((prev) => ({
                  ...prev,
                  dateRange: event.target.value as OrderFilters["dateRange"],
                }))
              }
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
            >
              <option value="today">اليوم</option>
              <option value="yesterday">أمس</option>
              <option value="week">آخر 7 أيام</option>
              <option value="month">آخر شهر</option>
              <option value="all">كل الفترات</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setOrderSearchQuery("");
                setOrderFilters({ type: "all", dateRange: "today" });
              }}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-sm font-bold transition-all"
            >
              إعادة تعيين
            </button>
          </div>
        </div>
      )}

      {viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full p-16 text-center text-slate-500 font-black">
              <Loader2 className="inline-block animate-spin text-red-500 ml-2" size={20} />
              جاري تحميل الطلبات...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="col-span-full p-16 text-center text-slate-500 font-bold">
              لا توجد طلبات في هذا القسم
            </div>
          ) : (
            filteredOrders.map((order) => {
              const busy = busyOrderId === order.id;
              const transferred = transferredOrderIds.includes(order.id);
              return (
                <div
                  key={order.id}
                  className="bg-slate-900/60 border border-white/5 rounded-2xl overflow-hidden hover:border-red-500/30 transition-all"
                >
                  <button
                    onClick={() => setSelectedOrderId(order.id)}
                    className="w-full p-5 text-right space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] text-slate-500 font-black">رقم الطلب</p>
                        <p className="text-xl text-white font-black">
                          #{order.order_number}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold ${getStatusClasses(order.status)}`}
                      >
                        {getStatusIcon(order.status)}
                        {getStatusLabel(order.status)}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <p className="text-slate-500 font-black mb-1">العميل</p>
                        <p className="text-white font-bold truncate">
                          {order.customer_name || "عميل نقدي"}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 font-black mb-1">النوع</p>
                        <p className="text-white font-bold">
                          {getOrderTypeLabel(order.order_type)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 font-black mb-1">الإجمالي</p>
                        <p className="text-red-400 font-black">
                          {formatMoney(order.total)}
                        </p>
                      </div>
                    </div>
                  </button>

                  <div className="p-4 bg-slate-950/40 border-t border-white/5 flex gap-2">
                    {!isClosedOrder(order.status) ? (
                      <>
                        <button
                          onClick={() => setEditingOrder(order)}
                          disabled={busy}
                          className="flex-1 bg-slate-800 border border-white/5 text-slate-300 py-2.5 rounded-xl font-black text-[10px] hover:bg-slate-700 flex items-center justify-center gap-1.5 disabled:opacity-40"
                        >
                          <Edit3 size={14} />
                          تعديل
                        </button>
                        <button
                          onClick={() => closeOrder(order)}
                          disabled={busy}
                          className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-black text-[10px] hover:bg-red-700 flex items-center justify-center gap-1.5 disabled:opacity-40"
                        >
                          {busy ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={14} />
                          )}
                          إغلاق
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => transferClosedOrder(order)}
                        disabled={busy || order.status !== "paid" || transferred}
                        className="flex-1 bg-orange-500/10 border border-orange-500/20 text-orange-400 py-2.5 rounded-xl font-black text-[10px] hover:bg-orange-600 hover:text-white flex items-center justify-center gap-1.5 disabled:opacity-40"
                      >
                        {busy ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Archive size={14} />
                        )}
                        {transferred ? "تم الترحيل" : "ترحيل للمبيعات"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
      <div className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="text-slate-500 text-sm border-b border-white/5">
                <th className="p-4 font-medium">رقم الطلب</th>
                <th className="p-4 font-medium">العميل</th>
                <th className="p-4 font-medium">النوع</th>
                <th className="p-4 font-medium">الحالة</th>
                <th className="p-4 font-medium">الإجمالي</th>
                <th className="p-4 font-medium">التاريخ والوقت</th>
                <th className="p-4 font-medium">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-16 text-center">
                    <div className="flex items-center justify-center gap-3 text-slate-500 font-black">
                      <Loader2 className="animate-spin text-red-500" size={20} />
                      جاري تحميل الطلبات...
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-16 text-center text-slate-500 font-bold">
                    لا توجد طلبات في هذا القسم
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className="text-sm hover:bg-white/5 transition-colors group cursor-pointer"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            order.status === "in_progress"
                              ? "bg-orange-500 animate-pulse"
                              : order.status === "ready"
                                ? "bg-emerald-500"
                                : order.status === "paid"
                                  ? "bg-slate-400"
                                  : order.status === "cancelled"
                                    ? "bg-red-500"
                                    : "bg-blue-500"
                          }`}
                        />
                        <span className="font-bold text-white">
                          #{order.order_number}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-white font-medium">
                        {order.customer_name || "عميل نقدي"}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {order.customer_phone || "---"}
                      </p>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                          order.order_type === "dine_in"
                            ? "bg-blue-500/10 text-blue-400"
                            : "bg-orange-500/10 text-orange-400"
                        }`}
                      >
                        {getOrderTypeLabel(order.order_type)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold ${getStatusClasses(order.status)}`}
                      >
                        {getStatusIcon(order.status)}
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-white">
                      {formatMoney(order.total)}
                    </td>
                    <td className="p-4">
                      <p className="text-slate-300">
                        {new Date(order.created_at).toLocaleDateString("ar-SA")}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {new Date(order.created_at).toLocaleTimeString("ar-SA")}
                      </p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedOrderId(order.id);
                          }}
                          className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors"
                        >
                          <Eye size={16} />
                        </button>
                        {!isClosedOrder(order.status) ? (
                          <>
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                setEditingOrder(order);
                              }}
                              disabled={busyOrderId === order.id}
                              className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors disabled:opacity-40"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                closeOrder(order);
                              }}
                              disabled={busyOrderId === order.id}
                              className="px-3 py-2 bg-red-600 text-white rounded-lg text-[10px] font-black hover:bg-red-700 disabled:opacity-40"
                            >
                              إغلاق
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              transferClosedOrder(order);
                            }}
                            disabled={
                              busyOrderId === order.id ||
                              order.status !== "paid" ||
                              transferredOrderIds.includes(order.id)
                            }
                            className="px-3 py-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-lg text-[10px] font-black hover:bg-orange-600 hover:text-white disabled:opacity-40"
                          >
                            {transferredOrderIds.includes(order.id)
                              ? "تم الترحيل"
                              : "ترحيل"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
};

export default OrdersPage;
