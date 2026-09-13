import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../../store";
import { orderService } from "../../services/orderService";
import type { OrderFromApi } from "../../services/orderService";
import { toast } from "../shared/Toast";
import {
  Clock,
  CreditCard,
  Loader2,
  PackageOpen,
  RotateCcw,
  Table2,
  Trash2,
  DollarSign,
} from "lucide-react";

const getStatusLabel = (status: string) => {
  switch (status) {
    case "pending_payment":
      return "بانتظار الدفع";
    case "pending":
      return "محفوظ";
    case "confirmed":
      return "مؤكد";
    case "in_progress":
      return "قيد التحضير";
    case "ready":
      return "جاهز";
    case "served":
      return "تم التقديم";
    default:
      return status;
  }
};

const getPaymentLabel = (method?: string | null) => {
  switch (method) {
    case "cash":
      return "نقدي";
    case "card":
      return "بطاقة";
    case "wallet":
      return "محفظة";
    case "bank":
      return "تحويل بنكي";
    case "account":
      return "حساب";
    default:
      return method || "—";
  }
};

export default function DeferredTables() {
  const { currentUser } = useApp();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderFromApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<number | null>(null);

  const branchId =
    currentUser?.branch_id != null
      ? Number(currentUser.branch_id)
      : undefined;

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await orderService.getDeferredOrders(branchId || undefined);
      setOrders(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "فشل تحميل الطلبات المؤجلة");
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handlePay = (order: OrderFromApi) => {
    // Navigate to POS with this order loaded for payment
    navigate(`/pos?editOrderId=${order.id}`);
  };

  const handleCancel = async (orderId: number) => {
    if (!confirm("هل أنت متأكد من إلغاء هذا الطلب المؤجل؟")) return;
    try {
      await orderService.cancel(orderId);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (err: any) {
      toast.error("فشل إلغاء الطلب", err?.response?.data?.message);
    }
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleTimeString("ar-SA", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("ar-SA");
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-600 rounded-xl flex items-center justify-center">
            <Clock size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">الطاولات المؤجلة</h1>
            <p className="text-xs text-slate-400">
              طلبات بانتظار الدفع — اضغط "دفع" لفتح الفاتورة
            </p>
          </div>
        </div>
        <button
          onClick={loadOrders}
          disabled={loading}
          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50"
        >
          <RotateCcw size={18} className={loading ? "animate-spin text-slate-400" : "text-slate-300"} />
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-amber-500" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={loadOrders} className="mt-2 text-xs text-red-300 underline">
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && orders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <PackageOpen size={48} className="mb-4 opacity-50" />
          <p className="font-bold text-lg">لا توجد طلبات مؤجلة</p>
          <p className="text-sm mt-1">الطلبات المؤجلة ستظهر هنا</p>
        </div>
      )}

      {/* Orders Grid */}
      {!loading && orders.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-slate-800/50 border border-amber-500/20 rounded-2xl p-5 space-y-4 hover:border-amber-500/40 transition-all hover:shadow-lg hover:shadow-amber-500/10 min-h-[200px] flex flex-col"
            >
              {/* Order header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-black text-slate-300">
                    #{order.order_number}
                  </span>
                  <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-bold">
                    {getStatusLabel(order.status)}
                  </span>
                </div>
                {order.table_number && (
                  <div className="flex items-center gap-1.5 bg-slate-700/50 px-2.5 py-1 rounded-lg text-slate-300">
                    <Table2 size={14} />
                    <span className="text-sm font-bold">{order.table_number}</span>
                  </div>
                )}
              </div>

              {/* Customer info */}
              {(order.customer_name || order.customer_phone) && (
                <div className="text-sm text-slate-400 space-y-0.5 bg-slate-700/30 px-3 py-2 rounded-lg">
                  {order.customer_name && <p className="font-semibold">{order.customer_name}</p>}
                  {order.customer_phone && <p className="text-xs">{order.customer_phone}</p>}
                </div>
              )}

              {/* Items summary */}
              {order.items && order.items.length > 0 && (
                <div className="space-y-1.5 flex-1">
                  {order.items.slice(0, 4).map((item: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-sm text-slate-300 bg-slate-700/20 px-3 py-1.5 rounded-lg">
                      <span className="truncate flex-1">
                        {item.item_name || item.item_name_ar || `صنف #${item.item_id}`}
                      </span>
                      {item.quantity > 1 && (
                        <span className="text-xs text-amber-400 font-bold mr-2">
                          ×{item.quantity}
                        </span>
                      )}
                    </div>
                  ))}
                  {order.items.length > 4 && (
                    <p className="text-xs text-slate-500 px-2">
                      +{order.items.length - 4} أصناف أخرى
                    </p>
                  )}
                </div>
              )}

              {/* Time & Total */}
              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <div className="text-xs text-slate-500">
                  <Clock size={12} className="inline ml-1" />
                  {formatTime(order.created_at)}
                  {order.created_at && (
                    <span className="mr-1">{formatDate(order.created_at)}</span>
                  )}
                </div>
                <span className="text-base font-black text-amber-400">
                  {Number(order.total).toFixed(3)} د.ك
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => handlePay(order)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-colors"
                >
                  <CreditCard size={16} />
                  دفع
                </button>
                <button
                  onClick={() => handleCancel(order.id)}
                  disabled={payingId === order.id}
                  className="px-4 py-2.5 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded-xl transition-colors disabled:opacity-50"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
