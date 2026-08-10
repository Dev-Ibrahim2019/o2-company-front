import { useMemo, useState } from "react";
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
  LayoutGrid,
  Loader2,
  Landmark,
  PackageOpen,
  Phone,
  RotateCcw,
  Search,
  Table2,
  User,
  Wallet,
} from "lucide-react";

type OrdersTab = "ACTIVE" | "CLOSED";
type TypeFilter = ApiOrderType | "ALL";
type StatusFilter = ApiOrderStatus | "ALL";
type ViewMode = "cards" | "table";

const CLOSED_STATUSES: ApiOrderStatus[] = ["paid", "cancelled"];
const ACTIVE_STATUSES: ApiOrderStatus[] = [
  "pending",
  "confirmed",
  "in_progress",
  "ready",
  "served",
  "pending_payment",
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
      return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
    case "pending_confirmation":
      return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    case "confirmed":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "in_progress":
      return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    case "ready":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "served":
      return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
    case "pending_payment":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "paid":
      return "bg-slate-500/10 text-slate-300 border-slate-500/20";
    case "cancelled":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    default:
      return "bg-slate-500/10 text-slate-400 border-slate-500/20";
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
    case "pending_payment":
      return "bg-amber-400";
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
      return "مرسل للأقسام";
    case "in_progress":
      return "قيد التحضير";
    case "ready":
      return "جاهز";
    case "served":
      return "تم التسليم";
    case "paid":
      return "مغلق ماليا";
    case "pending_payment":
      return "بانتظار الدفع";
    case "cancelled":
      return "ملغي";
    default:
      return "غير معروف";
  }
};

const getOrderTypeLabel = (type: ApiOrderType) =>
  type === "dine_in" ? "محلي" : "سفري";

const getPaymentIcon = (method?: string | null) => {
  switch (method) {
    case "credit_card":
    case "card":
      return <CreditCard size={14} />;
    case "wallet":
      return <Wallet size={14} />;
    case "bank_transfer":
    case "bank":
      return <Landmark size={14} />;
    case "cash":
    default:
      return <Banknote size={14} />;
  }
};

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
      return "لم يحدد";
  }
};

const formatMoney = (value: number) => `${Number(value || 0).toFixed(2)} ₪`;

export const OrdersView = () => {
  const navigate = useNavigate();
  const { currentShift, currentUser } = useApp();
  const branchFilter = useMemo(() => getBranchFilter(currentUser), [currentUser]);
  const { orders, loading, error, refetch } = useOrders(branchFilter);

  const [activeTab, setActiveTab] = useState<OrdersTab>("ACTIVE");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [searchTerm, setSearchTerm] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);
  const [transferredOrderIds, setTransferredOrderIds] = useState<number[]>([]);

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
        (order.customer_phone ?? "").includes(normalizedSearch);

      return matchesTab && matchesStatus && matchesType && matchesSearch;
    });
  }, [activeTab, currentShift, orders, searchTerm, statusFilter, typeFilter]);

  const activeCount = orders.filter((order) => !isClosedOrder(order.status)).length;
  const closedCount = orders.filter((order) => isClosedOrder(order.status)).length;

  const refreshOrders = () => refetch(branchFilter);

  const closeOrder = async (order: OrderFromApi) => {
    if (isClosedOrder(order.status)) return;

    setActionError(null);
    setBusyOrderId(order.id);
    try {
      console.debug("POS.Orders.closeOrder", {
        received_entity_type: null,
        received_entity_id: null,
        received_subledger_type: null,
        received_subledger_id: null,
      });
      await orderService.pay(order.id, {
        payment_method: order.payment_method ?? "cash",
        amount: order.total,
        customer_name: order.customer_name ?? undefined,
        customer_phone: order.customer_phone ?? undefined,
        note: order.note ?? undefined,
      });
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

  const transferClosedOrder = async (order: OrderFromApi) => {
    if (order.status !== "paid" || transferredOrderIds.includes(order.id)) {
      return;
    }
    setActionError(null);
    setBusyOrderId(order.id);
    try {
      await orderService.transferClosedOrderToSales(order);
      setTransferredOrderIds((prev) => [...prev, order.id]);
      await refreshOrders();
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
    <div className="space-y-5 w-full p-3 sm:p-5 lg:p-6 bg-slate-950 h-full overflow-y-auto rounded-[2rem] custom-scrollbar">
      {/* تم إزالة مودال التعديل — الآن التعديل يفتح في واجهة POS */}

      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="space-y-0.5">
          <h2 className="text-2xl font-black text-white tracking-tight">
            إدارة الطلبات
          </h2>
          <p className="text-slate-500 font-bold text-[11px]">
            {currentShift
              ? `طلبات الشفت الحالي منذ ${new Date(currentShift.startTime).toLocaleTimeString("ar-EG")}`
              : "تابع الطلبات النشطة والمغلقة من قاعدة البيانات مباشرة"}
          </p>
        </div>
        <div className="relative w-full lg:w-80">
          <Search
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500"
            size={16}
          />
          <input
            type="text"
            placeholder="بحث برقم الطلب، اسم الزبون أو الجوال..."
            className="w-full pr-10 pl-4 py-3 bg-slate-900 border border-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-red-600 text-xs font-bold text-white shadow-xl placeholder:text-slate-600"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
      </header>

      {(actionError || error) && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-2xl px-4 py-3 text-xs font-bold">
          {actionError || error}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        <div className="flex bg-slate-900 p-1 rounded-2xl border border-white/5 w-fit shadow-xl">
          <button
            onClick={() => {
              setActiveTab("ACTIVE");
              setStatusFilter("ALL");
            }}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs transition-all ${
              activeTab === "ACTIVE"
                ? "bg-red-600 text-white shadow-lg shadow-red-900/20"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <ClipboardList size={14} />
            الطلبات النشطة
            <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-[10px]">
              {activeCount}
            </span>
          </button>
          <button
            onClick={() => {
              setActiveTab("CLOSED");
              setStatusFilter("ALL");
            }}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs transition-all ${
              activeTab === "CLOSED"
                ? "bg-slate-800 text-white shadow-lg"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <CheckCircle2 size={14} />
            الطلبات المغلقة
            <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-[10px]">
              {closedCount}
            </span>
          </button>
        </div>

        <div className="flex flex-wrap bg-slate-900 p-1 rounded-xl border border-white/5 w-fit shadow-2xl gap-1">
          <button
            onClick={() => setTypeFilter("ALL")}
            className={`h-9 px-3 rounded-lg font-black text-[10px] transition-all ${
              typeFilter === "ALL"
                ? "bg-red-600 text-white shadow-lg shadow-red-900/20"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            الكل
          </button>
          <button
            onClick={() => setTypeFilter("dine_in")}
            className={`h-9 px-3 rounded-lg font-black text-[10px] transition-all ${
              typeFilter === "dine_in"
                ? "bg-red-600 text-white shadow-lg shadow-red-900/20"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            محلي
          </button>
          <button
            onClick={() => setTypeFilter("takeaway")}
            className={`h-9 px-3 rounded-lg font-black text-[10px] transition-all ${
              typeFilter === "takeaway"
                ? "bg-red-600 text-white shadow-lg shadow-red-900/20"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            سفري
          </button>
        </div>

        <div className="flex bg-slate-900 p-1 rounded-xl border border-white/5 shadow-xl">
          <button
            onClick={() => setViewMode("cards")}
            className={`h-9 px-3 rounded-lg font-black text-[10px] flex items-center gap-1.5 transition-all ${
              viewMode === "cards"
                ? "bg-red-600 text-white"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <LayoutGrid size={14} />
            كاردس
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`h-9 px-3 rounded-lg font-black text-[10px] flex items-center gap-1.5 transition-all ${
              viewMode === "table"
                ? "bg-red-600 text-white"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Table2 size={14} />
            جدول
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => setStatusFilter("ALL")}
          className={`px-3 py-2 rounded-xl border text-[10px] font-black whitespace-nowrap ${
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
              className={`px-3 py-2 rounded-xl border text-[10px] font-black whitespace-nowrap ${
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

      {loading ? (
        <div className="py-32 flex flex-col items-center justify-center gap-4 text-slate-500">
          <Loader2 className="animate-spin text-red-500" size={32} />
          <p className="text-sm font-black">جاري تحميل الطلبات...</p>
        </div>
      ) : viewMode === "table" ? (
        <div className="bg-slate-900/60 border border-white/5 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right min-w-[820px]">
              <thead className="bg-slate-950/50 text-slate-500 text-[10px] font-black">
                <tr>
                  <th className="p-4">رقم الطلب</th>
                  <th className="p-4">العميل</th>
                  <th className="p-4">النوع</th>
                  <th className="p-4">الحالة</th>
                  <th className="p-4">الإجمالي</th>
                  <th className="p-4">الوقت</th>
                  <th className="p-4">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredOrders.map((order) => {
                  const busy = busyOrderId === order.id;
                  const transferred = transferredOrderIds.includes(order.id);
                  return (
                    <tr key={order.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 font-black text-white">
                        #{order.order_number}
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-bold text-white">
                          {order.customer_name || "عميل نقدي"}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {order.customer_phone || "---"}
                        </p>
                      </td>
                      <td className="p-4 text-xs font-bold text-slate-300">
                        {getOrderTypeLabel(order.order_type)}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black ${getStatusColor(order.status)}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${getStatusDotColor(order.status)}`}
                          />
                          {getStatusLabel(order.status)}
                        </span>
                      </td>
                      <td className="p-4 text-sm font-black text-red-500">
                        {formatMoney(order.total)}
                      </td>
                      <td className="p-4 text-xs text-slate-400">
                        {new Date(order.created_at).toLocaleTimeString("ar-EG", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="p-4">
                        {activeTab === "ACTIVE" ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => navigate(`/pos?editOrderId=${order.id}`)}
                              disabled={busy}
                              className="px-3 py-2 rounded-xl bg-slate-800 border border-white/5 text-slate-300 hover:bg-slate-700 text-[10px] font-black flex items-center gap-1.5 disabled:opacity-40"
                            >
                              <Edit3 size={14} />
                              تعديل
                            </button>
                            <button
                              onClick={() => closeOrder(order)}
                              disabled={busy}
                              className="px-3 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 text-[10px] font-black flex items-center gap-1.5 disabled:opacity-40"
                            >
                              {busy ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <CheckCircle2 size={14} />
                              )}
                              إغلاق
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => transferClosedOrder(order)}
                            disabled={busy || order.status !== "paid" || transferred}
                            className="px-3 py-2 rounded-xl bg-orange-600/10 border border-orange-500/20 text-orange-400 hover:bg-orange-600 hover:text-white text-[10px] font-black flex items-center gap-1.5 disabled:opacity-40"
                          >
                            {busy ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <RotateCcw size={14} />
                            )}
                            {transferred ? "تم الترحيل" : "ترحيل للمبيعات"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-16 text-center text-slate-500 font-bold">
                      لا توجد طلبات حاليا
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {filteredOrders.map((order) => {
            const busy = busyOrderId === order.id;
            const transferred = transferredOrderIds.includes(order.id);

            return (
              <div
                key={order.id}
                className="bg-slate-900 rounded-[1.5rem] border border-white/5 shadow-xl hover:border-red-600/30 transition-all group overflow-hidden flex flex-col"
              >
                <div className="p-5 flex-1 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Hash size={10} />
                        <span className="text-[8px] font-black uppercase tracking-widest">
                          رقم الطلب
                        </span>
                      </div>
                      <p className="text-xl font-black text-white">
                        #{order.order_number}
                      </p>
                    </div>
                    <div
                      className={`px-3 py-1.5 rounded-xl border text-[9px] font-black flex items-center gap-1.5 ${getStatusColor(order.status)}`}
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${getStatusDotColor(order.status)}`}
                      />
                      {getStatusLabel(order.status)}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                      <ClipboardList size={10} />
                      <span className="text-[8px] font-black uppercase tracking-widest">
                        الأصناف
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between items-center bg-slate-800/30 p-2 rounded-xl border border-white/5"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black text-slate-200">
                              {item.item_name_ar || item.item_name}
                            </span>
                            <span className="text-[9px] font-black bg-red-600/20 text-red-500 px-1 py-0.5 rounded">
                              x{item.quantity}
                            </span>
                          </div>
                          <span className="text-[11px] font-black text-white">
                            {formatMoney(item.total_price)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/5">
                    <div className="space-y-0.5">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                        النوع
                      </p>
                      <p className="text-[9px] font-black text-slate-300">
                        {getOrderTypeLabel(order.order_type)}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        {getPaymentIcon(order.payment_method)}
                        <span className="text-[8px] font-black uppercase tracking-widest">
                          الدفع
                        </span>
                      </div>
                      <p className="text-[9px] font-black text-slate-300">
                        {getPaymentLabel(order.payment_method)}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                        طاولة
                      </p>
                      <p className="text-[9px] font-black text-red-500">
                        {order.order_type === "dine_in"
                          ? order.table_number || "---"
                          : "سفري"}
                      </p>
                    </div>
                  </div>

                  {(activeTab === "CLOSED" || order.customer_name) && (
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <User size={12} />
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            الزبون
                          </span>
                        </div>
                        <p className="text-xs font-black text-slate-300 truncate">
                          {order.customer_name || "غير محدد"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Phone size={12} />
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            الجوال
                          </span>
                        </div>
                        <p className="text-xs font-black text-slate-300">
                          {order.customer_phone || "---"}
                        </p>
                      </div>
                    </div>
                  )}

                  {order.note && (
                    <div className="pt-4 border-t border-white/5">
                      <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                        <FileText size={12} />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          الملاحظة
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-slate-400 bg-slate-800/30 p-3 rounded-xl border border-white/5">
                        {order.note}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-4 border-t border-white/5">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      الإجمالي النهائي
                    </span>
                    <p className="text-xl font-black text-red-600">
                      {formatMoney(order.total)}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-800/30 border-t border-white/5 flex gap-2">
                  {activeTab === "ACTIVE" ? (
                    <>
                      <button
                        onClick={() => navigate(`/pos?editOrderId=${order.id}`)}
                        disabled={busy}
                        className="flex-1 bg-slate-800 border border-white/5 text-slate-300 py-2.5 rounded-xl font-black text-[10px] hover:bg-slate-700 flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-40"
                      >
                        <Edit3 size={14} />
                        تعديل
                      </button>
                      <button
                        onClick={() => closeOrder(order)}
                        disabled={busy}
                        className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-black text-[10px] hover:bg-red-700 flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-red-900/20 active:scale-95 disabled:opacity-40"
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
                      className="flex-1 bg-orange-600/10 border border-orange-500/20 text-orange-400 py-2.5 rounded-xl font-black text-[10px] hover:bg-orange-600 hover:text-white flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-40"
                    >
                      {busy ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <RotateCcw size={14} />
                      )}
                      {transferred ? "تم الترحيل" : "ترحيل للمبيعات"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {filteredOrders.length === 0 && (
            <div className="col-span-full py-32 flex flex-col items-center justify-center space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-red-600 blur-[60px] opacity-20 rounded-full" />
                <div className="relative w-32 h-32 bg-slate-900 rounded-full flex items-center justify-center border border-white/5 shadow-2xl">
                  <PackageOpen
                    size={64}
                    className="text-slate-700"
                    strokeWidth={1}
                  />
                </div>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-black text-white">
                  لا توجد طلبات حاليا
                </h3>
                <p className="text-slate-500 font-bold text-sm max-w-xs mx-auto">
                  {searchTerm
                    ? "لم نجد نتائج تطابق البحث الحالي"
                    : "هذه القائمة ستعرض الطلبات المحفوظة من قاعدة البيانات"}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
