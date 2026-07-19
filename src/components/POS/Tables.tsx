import React, { useState, useEffect, useRef, useMemo } from "react";
import { useAppContext } from "../../../store";
import { TableStatus, OrderType } from "../../../types";
import type { Table } from "../../../types";
import { HALLS as DEFAULT_HALLS } from "../../../constants";
import {
  Users,
  Clock,
  DollarSign,
  Move,
  Merge,
  Trash2,
  ExternalLink,
  X,
  Info,
  Map as MapIcon,
  Grid,
  ZoomIn,
  ZoomOut,
  Layout,
  Plus,
  Loader2,
  ReceiptText,
  ClipboardList,
  CreditCard,
  Banknote,
  Wallet,
  Landmark,
  User,
  Phone,
  Hash,
  CheckCircle,
  Send,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  orderService,
  type OrderFromApi,
  type PaymentMethod as ApiPaymentMethod,
} from "../../services/orderService";

const formatMoney = (value: number | string | null | undefined) =>
  `${Number(value || 0).toFixed(2)} ₪`;

const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString("ar-SA") : "---";

const getBranchFilter = (currentUser: unknown) => {
  const user = currentUser as
    | { branch_id?: number | string; branchId?: number | string }
    | null;
  const rawBranchId = user?.branch_id ?? user?.branchId;
  const branchId =
    typeof rawBranchId === "number" ? rawBranchId : Number(rawBranchId);

  return Number.isFinite(branchId) ? { branch_id: branchId } : undefined;
};

const getApiOrderStatusLabel = (status: OrderFromApi["status"]) => {
  switch (status) {
    case "pending":
      return "محفوظ";
    case "pending_confirmation":
      return "بانتظار التأكيد";
    case "confirmed":
      return "مؤكد";
    case "in_progress":
      return "قيد التحضير";
    case "ready":
      return "جاهز";
    case "served":
      return "تم التقديم";
    case "paid":
      return "مدفوع";
    case "cancelled":
      return "ملغي";
    default:
      return "غير معروف";
  }
};

const getApiPaymentLabel = (method?: string | null) => {
  switch (method) {
    case "cash":
      return "كاش";
    case "credit_card":
      return "بطاقة/فيزا";
    case "wallet":
      return "محفظة";
    case "bank_transfer":
      return "تحويل بنكي";
    default:
      return "غير مدفوع";
  }
};

const getApiPaymentIcon = (method?: string | null) => {
  switch (method) {
    case "credit_card":
      return <CreditCard size={16} />;
    case "wallet":
      return <Wallet size={16} />;
    case "bank_transfer":
      return <Landmark size={16} />;
    case "cash":
    default:
      return <Banknote size={16} />;
  }
};

const getPrimaryPaymentMethod = (
  order: OrderFromApi,
): ApiPaymentMethod | string | null =>
  order.payments?.[0]?.payment_method ?? order.payment_method;

export const TablesView: React.FC<{
  onSelect?: (table: Table) => void;
  mode?: "management" | "pos";
}> = ({ onSelect, mode = "management" }) => {
  const {
    tables,
    selectedTable,
    setSelectedTable,
    activeOrders,
    updateTableStatus,
    transferTable,
    mergeTables,
    loadOrderToPOS,
    currentUser,
    seatTable,
    setOrderType,
    diningZones,
    tablesLoading,
    fetchDiningZones,
    fetchTables,
  } = useAppContext();

  const HALLS = diningZones;

  const [selectedHallId, setSelectedHallId] = useState<string>(HALLS[0]?.id || "");
  const [viewMode, setViewMode] = useState<"MAP" | "GRID">("GRID");
  const [zoom, setZoom] = useState(1);
  const [showPopup, setShowPopup] = useState<string | null>(null);
  const [transferMode, setTransferMode] = useState<{ fromId: string } | null>(
    null,
  );
  const [mergeMode, setMergeMode] = useState<string[]>([]);
  const [seatingTableId, setSeatingTableId] = useState<string | null>(null);
  const [guestCount, setGuestCount] = useState<number>(2);
  const [activeApiOrder, setActiveApiOrder] = useState<OrderFromApi | null>(
    null,
  );
  const [activeOrderLoadingTableId, setActiveOrderLoadingTableId] = useState<
    string | null
  >(null);
  const [activeOrderError, setActiveOrderError] = useState<string | null>(null);

  // Live timer ticker
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(timer);
  }, []);

  const mapRef = useRef<HTMLDivElement>(null);

  // تحديث تلقائي للطاولات فقط كل 10 ثواني
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTables();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchTables]);

  useEffect(() => {
    fetchDiningZones();
  }, [fetchDiningZones]);

  const filteredTables = tables.filter((t) => t.hallId === selectedHallId);

  const hallCodeById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const hall of HALLS) {
      const code = (hall as any).code || hall.name;
      map[hall.id] = code;
    }
    return map;
  }, [HALLS]);

  const getTableDisplayLabel = (table: Table): string => {
    const hallCode = hallCodeById[table.hallId] || "";
    const num = table.table_number || table.label || String(table.number);
    if (num.toUpperCase().startsWith(hallCode.toUpperCase())) return num;
    return `${hallCode}${num}`;
  };

  const getStatusConfig = (status: TableStatus, isSelected: boolean = false) => {
    if (isSelected && status !== TableStatus.OCCUPIED && status !== TableStatus.PENDING_CONFIRMATION) {
      return {
        color: "bg-red-600 border-red-700/20 text-white",
        label: "نشطة",
        border: "border-red-700/20",
      };
    }
    switch (status) {
      case TableStatus.AVAILABLE:
        return {
          color: "bg-transparent border-slate-700/40 text-slate-300",
          label: "فارغة",
          border: "border-slate-700/40",
        };
      case TableStatus.OCCUPIED:
        return {
          color: "bg-emerald-600",
          label: "مشغولة",
          border: "border-emerald-700/20",
        };
      case TableStatus.PAYMENT_PENDING:
        return {
          color: "bg-yellow-500",
          label: "طلب الحساب",
          border: "border-yellow-600/20",
        };
      case TableStatus.PAID:
        return {
          color: "bg-transparent border-slate-700/40 text-slate-300",
          label: "مدفوعة",
          border: "border-slate-700/40",
        };
      case TableStatus.RESERVED:
        return {
          color: "bg-blue-600",
          label: "محجوزة",
          border: "border-blue-700/20",
        };
      case TableStatus.CLEANING:
        return {
          color: "bg-slate-500",
          label: "قيد التنظيف",
          border: "border-slate-600/20",
        };
      case TableStatus.HAS_ORDER:
        return {
          color: "bg-red-600 text-white font-medium animate-pulse-slow",
          label: "عليها طلب 🔥",
          border: "border-red-700/40",
        };
      case TableStatus.PENDING_CONFIRMATION:
        return {
          color: "bg-orange-500 text-white font-medium animate-pulse",
          label: "بانتظار التأكيد 🟡",
          border: "border-orange-600/40",
        };
      default:
        return {
          color: "bg-slate-800",
          label: "غير معروف",
          border: "border-white/5",
        };
    }
  };

  const getTableOrder = (tableId: string) => {
    const table = tables.find((t) => t.id === tableId);
    if (!table?.currentOrderId) return null;
    if (
      ![TableStatus.OCCUPIED, TableStatus.PAYMENT_PENDING].includes(
        table.status,
      )
    )
      return null;
    return activeOrders.find((o) => o.id === table.currentOrderId);
  };

  const calculateSittingTime = (seatedAt?: string | Date) => {
    if (!seatedAt) return "0 دقيقة";
    const diff = Math.floor(
      (new Date().getTime() - new Date(seatedAt).getTime()) / 60000,
    );
    return `${diff} دقيقة`;
  };

  const openOccupiedTableOrder = async (table: Table) => {
    setSelectedTable(table);
    setOrderType(OrderType.DINE_IN);
    setShowPopup(table.id);
    setActiveApiOrder(null);
    setActiveOrderError(null);
    setActiveOrderLoadingTableId(table.id);

    try {
      const order = await orderService.getActiveByTableNumber(
        table.table_number || table.number,
        getBranchFilter(currentUser),
      );
      setActiveApiOrder(order);

      if (
        order &&
        (table.currentOrderId !== String(order.id) ||
          table.status !== TableStatus.OCCUPIED)
      ) {
        updateTableStatus(table.id, TableStatus.OCCUPIED, {
          currentOrderId: String(order.id),
        });
      }
    } catch (error) {
      console.error("Failed to load active order for table:", error);
      setActiveOrderError("فشل تحميل الطلب النشط لهذه الطاولة");
    } finally {
      setActiveOrderLoadingTableId(null);
    }
  };

  const handleTableClick = (table: Table) => {
    if (mode === "pos") {
      setSelectedTable(table);
      setOrderType(OrderType.DINE_IN);
      onSelect?.(table);
      return;
    }

    if (transferMode) {
      if (table.status === TableStatus.AVAILABLE) {
        transferTable(transferMode.fromId, table.id);
        setTransferMode(null);
      } else {
        alert("يرجى اختيار طاولة فارغة للنقل إليها");
      }
      return;
    }

    if (mergeMode.length > 0) {
      if (mergeMode.includes(table.id)) {
        setMergeMode((prev) => prev.filter((id) => id !== table.id));
      } else {
        setMergeMode((prev) => [...prev, table.id]);
      }
      return;
    }

    if (
      table.status === TableStatus.OCCUPIED ||
      table.status === TableStatus.PAYMENT_PENDING
    ) {
      void openOccupiedTableOrder(table);
      return;
    }

    if (table.status === TableStatus.PENDING_CONFIRMATION) {
      void openOccupiedTableOrder(table);
      return;
    }

    if (table.status === TableStatus.AVAILABLE) {
      setSeatingTableId(table.id);
      setGuestCount(table.capacity);
    } else {
      setShowPopup(table.id);
    }
  };

  const resetTable = (tableId: string) => {
    updateTableStatus(tableId, TableStatus.AVAILABLE, {
      currentOrderId: undefined,
      seatedAt: undefined,
    });
    setShowPopup(null);
  };

  const activePopupTable = tables.find((t) => t.id === showPopup);
  const activePopupOrder = showPopup ? getTableOrder(showPopup) : null;
  const activePopupApiOrder =
    activePopupTable && activeOrderLoadingTableId !== activePopupTable.id
      ? activeApiOrder
      : null;
  const isLoadingActivePopupOrder =
    !!activePopupTable && activeOrderLoadingTableId === activePopupTable.id;

  return (
    <div className="h-full flex flex-col space-y-6 bg-slate-950 p-4 sm:p-6 lg:p-8 rounded-[3rem] overflow-hidden">
      {tablesLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400 font-bold text-sm">جاري تحميل الطاولات...</p>
          </div>
        </div>
      ) : (
      <>
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl font-black text-white tracking-tight">
            إدارة الطاولات
          </h2>
          <p className="text-slate-500 font-bold text-sm">
            خريطة المطعم وتوزيع الطاولات المباشر
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Hall Switcher */}
          <div className="flex bg-slate-900 p-1 rounded-2xl border border-white/5 overflow-x-auto scrollbar-hide">
            {HALLS.map((hall) => (
              <button
                key={hall.id}
                onClick={() => setSelectedHallId(hall.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] transition-all whitespace-nowrap ${selectedHallId === hall.id ? "bg-slate-800 text-white border border-white/10" : "text-slate-500 hover:text-slate-300"}`}
              >
                <Layout size={14} /> {hall.name}
              </button>
            ))}
          </div>


          {mergeMode.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  mergeTables(mergeMode);
                  setMergeMode([]);
                }}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-2xl font-black text-xs shadow-lg shadow-blue-900/20 flex items-center gap-2"
              >
                <Merge size={16} /> دمج ({mergeMode.length})
              </button>
              <button
                onClick={() => setMergeMode([])}
                className="bg-slate-800 text-white px-4 py-2.5 rounded-2xl font-black text-xs"
              >
                إلغاء
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main View Area - Grid Only */}
      <div className="flex-1 relative overflow-hidden bg-slate-900/50 rounded-[2.5rem] border border-white/5 custom-scrollbar">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 p-8 overflow-y-auto h-full custom-scrollbar">
          {filteredTables.map((table) => {
            const config = getStatusConfig(table.status, selectedTable?.id === table.id);
            const order = getTableOrder(table.id);
            return (
              <motion.button
                key={table.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleTableClick(table)}
                className={`relative aspect-square rounded-3xl border-2 p-4 flex flex-col items-center justify-center gap-2 transition-all ${
                  mergeMode.includes(table.id)
                    ? "ring-4 ring-blue-600 ring-offset-4 ring-offset-slate-950"
                    : ""
                } ${table.mergedWithId ? "opacity-60 border-dashed" : ""} ${config.color} ${config.border} text-white shadow-xl`}
              >
                <span className="text-2xl font-black">{getTableDisplayLabel(table)}</span>
                <div className="flex flex-col items-center gap-1">
                  {table.status === TableStatus.PAID && (
                    <span className="text-[8px] font-black bg-white text-emerald-600 px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                      تم الدفع
                    </span>
                  )}
                  <span className="text-[10px] font-black bg-black/20 px-2 py-0.5 rounded-full">
                    {table.mergedWithId
                      ? `مدمجة مع #${tables.find((t) => t.id === table.mergedWithId)?.number}`
                      : table.status === TableStatus.OCCUPIED || table.status === TableStatus.PAID
                        ? `${table.guestCount || 0} أشخاص`
                        : `${table.capacity} سعة`}
                  </span>
                  {order && !table.mergedWithId && (
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] font-black text-white/80">
                        {order.total.toFixed(2)} ₪
                      </span>
                      {order.shelfLocation && (
                        <span className="text-[8px] font-black bg-white text-red-600 px-1.5 py-0.5 rounded-full shadow-sm">
                          الرف: {order.shelfLocation}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {table.status === TableStatus.OCCUPIED && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 text-[8px] font-black bg-black/40 px-1.5 py-0.5 rounded-full">
                    <Clock size={8} /> {calculateSittingTime(table.seatedAt)}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Legend - Bottom of Page */}
      <div className="flex flex-wrap gap-6 py-4 border-t border-white/5">
        {Object.values(TableStatus).map((status) => {
          const config = getStatusConfig(status, false);
          return (
            <div key={status} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${status === TableStatus.AVAILABLE || status === TableStatus.PAID ? "border border-slate-600 bg-transparent" : config.color.split(' ')[0]}`} />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {config.label}
              </span>
            </div>
          );
        })}
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-600" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            نشطة (محددة حالياً)
          </span>
        </div>
      </div>

      {/* Seating Modal */}
      <AnimatePresence>
        {seatingTableId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 w-full max-w-sm rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden p-8 space-y-8"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users size={32} />
                </div>
                <h3 className="text-2xl font-black text-white">
                  تسكين الطاولة #
                  {tables.find((t) => t.id === seatingTableId)?.number}
                </h3>
                <p className="text-slate-500 font-bold text-sm">
                  يرجى تحديد عدد الأشخاص لبدء الوقت
                </p>
              </div>

              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                  className="w-12 h-12 bg-slate-800 text-white rounded-2xl flex items-center justify-center hover:bg-slate-700 transition-all font-black text-xl border border-white/5"
                >
                  -
                </button>
                <span className="text-4xl font-black text-white w-12 text-center">
                  {guestCount}
                </span>
                <button
                  onClick={() => setGuestCount(guestCount + 1)}
                  className="w-12 h-12 bg-slate-800 text-white rounded-2xl flex items-center justify-center hover:bg-slate-700 transition-all font-black text-xl border border-white/5"
                >
                  +
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    const table = tables.find((t) => t.id === seatingTableId);
                    if (!table) return;
                    setSelectedTable(table);
                    seatTable(seatingTableId, guestCount);
                    setOrderType(OrderType.DINE_IN);
                    setSeatingTableId(null);
                    onSelect?.(table);
                  }}
                  className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-sm shadow-lg shadow-emerald-900/20 active:scale-95 transition-all"
                >
                  تسكين الطاولة وبدء الوقت
                </button>
                <button
                  onClick={() => setSeatingTableId(null)}
                  className="w-full bg-slate-800 text-slate-400 py-4 rounded-2xl font-black text-sm active:scale-95 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showPopup && activePopupTable && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 w-full max-w-md rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden"
            >
              <div
                className={`p-8 ${getStatusConfig(activePopupTable.status, selectedTable?.id === activePopupTable.id).color} text-white flex justify-between items-start`}
              >
                <div className="space-y-1">
                  <h3 className="text-3xl font-black">
                    طاولة {getTableDisplayLabel(activePopupTable)}
                  </h3>
                  <div className="flex items-center gap-2 text-sm font-bold opacity-80">
                    <Info size={16} />{" "}
                    {getStatusConfig(activePopupTable.status, selectedTable?.id === activePopupTable.id).label}
                  </div>
                </div>
                <button
                  onClick={() => setShowPopup(null)}
                  className="p-2 hover:bg-black/20 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                {activePopupTable.status === TableStatus.OCCUPIED ||
                activePopupTable.status === TableStatus.PAYMENT_PENDING ||
                activePopupTable.status === TableStatus.PAID ||
                isLoadingActivePopupOrder ||
                activeOrderError ||
                activePopupApiOrder ||
                activePopupOrder ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-2 text-slate-500 mb-1">
                          <Users size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            عدد الأشخاص
                          </span>
                        </div>
                        <p className="text-lg font-black text-white">
                          {activePopupTable.guestCount ||
                            activePopupTable.capacity}{" "}
                          أشخاص
                        </p>
                      </div>
                      <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-2 text-slate-500 mb-1">
                          <Clock size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            وقت الجلوس
                          </span>
                        </div>
                        <p className="text-lg font-black text-white">
                          {calculateSittingTime(activePopupTable.seatedAt)}
                        </p>
                      </div>
                    </div>

                    {activePopupTable.mergedWithId && (
                      <div className="bg-blue-600/10 border border-blue-600/20 p-4 rounded-2xl text-center">
                        <p className="text-blue-500 font-black text-xs">
                          مدمجة مع طاولة #
                          {
                            tables.find(
                              (t) => t.id === activePopupTable.mergedWithId,
                            )?.number
                          }
                        </p>
                      </div>
                    )}

                    {isLoadingActivePopupOrder ? (
                      <div className="bg-slate-800/50 p-8 rounded-3xl border border-white/5 flex items-center justify-center gap-3 text-slate-300">
                        <Loader2 size={18} className="animate-spin text-red-500" />
                        <span className="text-xs font-black">
                          جاري تحميل طلب الطاولة...
                        </span>
                      </div>
                    ) : activeOrderError ? (
                      <div className="bg-red-500/10 p-5 rounded-3xl border border-red-500/20 text-red-300 text-center text-xs font-black">
                        {activeOrderError}
                      </div>
                    ) : activePopupApiOrder ? (
                      <div className="bg-slate-800/50 p-5 rounded-3xl border border-white/5 flex flex-col gap-4">
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-slate-500">
                              <ReceiptText size={14} />
                              <span className="text-[10px] font-black uppercase tracking-widest">
                                الفاتورة / الطلب
                              </span>
                            </div>
                            <p className="text-2xl font-black text-white">
                              #{activePopupApiOrder.order_number}
                            </p>
                            <p className="text-[10px] font-bold text-slate-500">
                              {getApiOrderStatusLabel(activePopupApiOrder.status)} ·{" "}
                              {formatDateTime(activePopupApiOrder.created_at)}
                            </p>
                          </div>
                          <div className="text-left">
                            <div className="flex items-center justify-end gap-1 text-slate-500">
                              <DollarSign size={14} />
                              <span className="text-[10px] font-black uppercase tracking-widest">
                                الإجمالي
                              </span>
                            </div>
                            <p className="text-3xl font-black text-red-600">
                              {formatMoney(activePopupApiOrder.total)}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-slate-900/60 rounded-2xl border border-white/5 p-3">
                            <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                              <ClipboardList size={12} />
                              <span className="text-[8px] font-black uppercase">
                                النوع
                              </span>
                            </div>
                            <p className="text-[10px] font-black text-white">
                              {activePopupApiOrder.order_type === "dine_in"
                                ? "محلي"
                                : "سفري"}
                            </p>
                          </div>
                          <div className="bg-slate-900/60 rounded-2xl border border-white/5 p-3">
                            <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                              <Hash size={12} />
                              <span className="text-[8px] font-black uppercase">
                                الطاولة
                              </span>
                            </div>
                            <p className="text-[10px] font-black text-white">
                              {activePopupApiOrder.table_number || activePopupTable.number}
                            </p>
                          </div>
                          <div className="bg-slate-900/60 rounded-2xl border border-white/5 p-3">
                            <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                              {getApiPaymentIcon(
                                getPrimaryPaymentMethod(activePopupApiOrder),
                              )}
                              <span className="text-[8px] font-black uppercase">
                                الدفع
                              </span>
                            </div>
                            <p className="text-[10px] font-black text-white">
                              {getApiPaymentLabel(
                                getPrimaryPaymentMethod(activePopupApiOrder),
                              )}
                            </p>
                          </div>
                        </div>

                        {(activePopupApiOrder.customer_name ||
                          activePopupApiOrder.customer_phone) && (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-slate-900/60 rounded-2xl border border-white/5 p-3">
                              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                                <User size={12} />
                                <span className="text-[8px] font-black uppercase">
                                  العميل
                                </span>
                              </div>
                              <p className="text-[10px] font-black text-white truncate">
                                {activePopupApiOrder.customer_name || "---"}
                              </p>
                            </div>
                            <div className="bg-slate-900/60 rounded-2xl border border-white/5 p-3">
                              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                                <Phone size={12} />
                                <span className="text-[8px] font-black uppercase">
                                  الهاتف
                                </span>
                              </div>
                              <p className="text-[10px] font-black text-white truncate">
                                {activePopupApiOrder.customer_phone || "---"}
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="rounded-2xl border border-white/5 overflow-hidden">
                          <div className="max-h-56 overflow-y-auto custom-scrollbar">
                            {activePopupApiOrder.items.map((item) => (
                              <div
                                key={item.id}
                                className="grid grid-cols-[1fr_auto_auto] gap-3 items-center px-3 py-2.5 border-b border-white/5 last:border-b-0 bg-slate-900/40"
                              >
                                <div className="min-w-0">
                                  <p className="text-xs font-black text-white truncate">
                                    {item.item_name_ar || item.item_name}
                                  </p>
                                  {item.notes && (
                                    <p className="text-[9px] font-bold text-slate-500 truncate">
                                      {item.notes}
                                    </p>
                                  )}
                                </div>
                                <span className="text-[10px] font-black text-slate-300">
                                  x{item.quantity}
                                </span>
                                <span className="text-[10px] font-black text-red-400">
                                  {formatMoney(item.total_price)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-1 text-[10px] font-black">
                          <div className="text-slate-500">
                            الفرعي{" "}
                            <span className="text-slate-300">
                              {formatMoney(activePopupApiOrder.subtotal)}
                            </span>
                          </div>
                          <div className="text-slate-500">
                            الخصم{" "}
                            <span className="text-slate-300">
                              {formatMoney(activePopupApiOrder.discount_amount)}
                            </span>
                          </div>
                          <div className="text-left text-red-500">
                            الصافي {formatMoney(activePopupApiOrder.total)}
                          </div>
                        </div>

                        {activePopupApiOrder.note && (
                          <p className="bg-slate-900/60 rounded-2xl border border-white/5 p-3 text-[10px] font-bold text-slate-400">
                            {activePopupApiOrder.note}
                          </p>
                        )}

                        {activePopupApiOrder.status === "pending_confirmation" && (
                          <button
                            onClick={async () => {
                              try {
                                const res = await fetch(
                                  `${import.meta.env.VITE_API_URL || "/api"}/orders/${activePopupApiOrder.id}/confirm-customer`,
                                  {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                      Authorization: `Bearer ${localStorage.getItem("token")}`,
                                    },
                                  }
                                );
                                const data = await res.json();
                                if (data.success) {
                                  setActiveApiOrder({
                                    ...activePopupApiOrder,
                                    status: "confirmed",
                                  });
                                  updateTableStatus(
                                    activePopupTable.id,
                                    TableStatus.HAS_ORDER,
                                    { currentOrderId: String(activePopupApiOrder.id) }
                                  );
                                } else {
                                  alert(data.message || "فشل تأكيد الطلب");
                                }
                              } catch {
                                alert("حدث خطأ أثناء تأكيد الطلب");
                              }
                            }}
                            className="w-full bg-emerald-600 text-white py-3 rounded-xl font-black text-xs shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
                          >
                            <CheckCircle size={16} /> تأكيد الطلب
                          </button>
                        )}

                        {/* زر ترحيل العناصر الجديدة — يظهر عندما الطلب مؤكد لكن فيه عناصر جديدة بانتظار الترحيل */}
                        {activePopupApiOrder.status !== "pending_confirmation" &&
                          activePopupApiOrder.status !== "paid" &&
                          activePopupApiOrder.status !== "cancelled" &&
                          activePopupApiOrder.status !== "served" &&
                          (activePopupApiOrder as any).has_unsent_items && (
                          <button
                            onClick={async () => {
                              try {
                                const res = await fetch(
                                  `${import.meta.env.VITE_API_URL || "/api"}/orders/${activePopupApiOrder.id}/confirm`,
                                  {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                      Authorization: `Bearer ${localStorage.getItem("token")}`,
                                    },
                                  }
                                );
                                const data = await res.json();
                                if (data.success) {
                                  setActiveApiOrder({
                                    ...activePopupApiOrder,
                                    status: "confirmed",
                                    has_unsent_items: false,
                                  });
                                  alert("تم ترحيل العناصر الجديدة للأقسام");
                                } else {
                                  alert(data.message || "فشل ترحيل العناصر");
                                }
                              } catch {
                                alert("حدث خطأ أثناء ترحيل العناصر");
                              }
                            }}
                            className="w-full bg-amber-500 text-white py-3 rounded-xl font-black text-xs shadow-lg shadow-amber-900/20 flex items-center justify-center gap-2 animate-pulse"
                          >
                            <Send size={16} /> ترحيل العناصر الجديدة
                          </button>
                        )}

                        {activePopupApiOrder.status !== "paid" && activePopupApiOrder.status !== "pending_confirmation" && (
                          <button
                            onClick={() =>
                              updateTableStatus(
                                activePopupTable.id,
                                TableStatus.PAYMENT_PENDING,
                                { currentOrderId: String(activePopupApiOrder.id) },
                              )
                            }
                            className="w-full bg-orange-500 text-white py-3 rounded-xl font-black text-xs shadow-lg shadow-orange-900/20 flex items-center justify-center gap-2"
                          >
                            <DollarSign size={16} /> طلب الحساب (بانتظار الدفع)
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setSelectedTable(activePopupTable);
                            setOrderType(OrderType.DINE_IN);
                            setShowPopup(null);
                            onSelect?.(activePopupTable);
                          }}
                          className="w-full bg-red-600 text-white py-3 rounded-xl font-black text-xs shadow-lg shadow-red-900/20 flex items-center justify-center gap-2"
                        >
                          <ExternalLink size={16} /> فتح الطاولة في شاشة البيع
                        </button>
                      </div>
                    ) : activePopupOrder ? (
                      <div className="bg-slate-800/50 p-6 rounded-3xl border border-white/5 flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-slate-500">
                              <DollarSign size={14} />
                              <span className="text-[10px] font-black uppercase tracking-widest">
                                إجمالي الفاتورة
                              </span>
                            </div>
                            <p className="text-3xl font-black text-red-600">
                              {activePopupOrder.total.toFixed(2)} ₪
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              loadOrderToPOS(activePopupOrder);
                              setOrderType(OrderType.DINE_IN);
                              setTimeout(() => {
                                onSelect?.(activePopupTable);
                              }, 100);
                            }}
                            className="bg-red-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg shadow-red-900/20 flex items-center gap-2"
                          >
                            <ExternalLink size={18} /> فتح الفاتورة
                          </button>
                        </div>

                        {activePopupTable.status === TableStatus.OCCUPIED && (
                          <button
                            onClick={() =>
                              updateTableStatus(
                                activePopupTable.id,
                                TableStatus.PAYMENT_PENDING,
                              )
                            }
                            className="w-full bg-orange-500 text-white py-3 rounded-xl font-black text-xs shadow-lg shadow-orange-900/20 flex items-center justify-center gap-2"
                          >
                            <DollarSign size={16} /> طلب الحساب (بانتظار الدفع)
                          </button>
                        )}

                        {activePopupTable.status === TableStatus.PAID && (
                          <div className="space-y-3">
                            <div className="bg-emerald-600/10 border border-emerald-600/20 p-3 rounded-xl text-center">
                              <p className="text-emerald-500 font-black text-xs">
                                تم دفع الحساب بنجاح
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedTable(activePopupTable);
                                setOrderType(OrderType.DINE_IN);
                                setTimeout(() => {
                                  onSelect?.(activePopupTable);
                                }, 100);
                              }}
                              className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-xs shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
                            >
                              <Plus size={16} /> فتح فاتورة جديدة
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-slate-800/50 p-6 rounded-3xl border border-white/5 flex flex-col gap-4">
                        <div className="text-center py-2">
                          <p className="text-slate-400 font-bold text-sm">
                            لا توجد طلبات مسجلة لهذه الطاولة بعد
                          </p>
                        </div>
                      <button
                        onClick={() => {
                          setSelectedTable(activePopupTable);
                          setOrderType(OrderType.DINE_IN);
                          setTimeout(() => {
                            onSelect?.(activePopupTable);
                          }, 100);
                          setShowPopup(null);
                        }}
                        className="w-full bg-red-600 text-white py-4 rounded-2xl font-black text-sm shadow-lg shadow-red-900/20 flex items-center justify-center gap-2"
                      >
                        <Plus size={18} /> إضافة طلب جديد
                      </button>
                      <p className="text-[10px] font-bold text-slate-500 text-center mt-2">
                        سيتم فتح المنيو تلقائياً لاختيار الأصناف
                      </p>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-3">
                      <button
                        onClick={() => {
                          // السماح بالتفريغ إذا كانت مدفوعة أو مشغولة بدون طلب
                          if (activePopupTable.status === TableStatus.PAID || 
                              (activePopupTable.status === TableStatus.OCCUPIED && !activePopupTable.currentOrderId)) {
                            updateTableStatus(
                              activePopupTable.id,
                              TableStatus.AVAILABLE,
                            );
                          } else if (activePopupTable.status !== TableStatus.PAID) {
                            alert("لا يمكن تفريغ الطاولة، يوجد طلب نشط عليها");
                            return;
                          } else {
                            updateTableStatus(
                              activePopupTable.id,
                              TableStatus.CLEANING,
                            );
                          }
                        }}
                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border border-white/5 transition-all ${
                          activePopupTable.status === TableStatus.PAID ||
                          (activePopupTable.status === TableStatus.OCCUPIED && !activePopupTable.currentOrderId)
                            ? "bg-slate-800 hover:bg-slate-700"
                            : "bg-slate-900 opacity-50 cursor-not-allowed"
                        }`}
                      >
                        <Trash2 size={20} className="text-red-500" />
                        <span className="text-[10px] font-black text-slate-300">
                          تفريغ
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          setTransferMode({ fromId: activePopupTable.id });
                          setShowPopup(null);
                        }}
                        className="flex flex-col items-center gap-2 p-4 bg-slate-800 rounded-2xl border border-white/5 hover:bg-slate-700 transition-all"
                      >
                        <Move size={20} className="text-blue-500" />
                        <span className="text-[10px] font-black text-slate-300">
                          نقل
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          setMergeMode([activePopupTable.id]);
                          setShowPopup(null);
                        }}
                        className="flex flex-col items-center gap-2 p-4 bg-slate-800 rounded-2xl border border-white/5 hover:bg-slate-700 transition-all"
                      >
                        <Merge size={20} className="text-purple-500" />
                        <span className="text-[10px] font-black text-slate-300">
                          دمج
                        </span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {activePopupTable.status === TableStatus.RESERVED && (
                      <div className="bg-blue-600/10 p-6 rounded-3xl border border-blue-600/20 space-y-4">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
                            اسم الحجز
                          </p>
                          <p className="text-xl font-black text-white">
                            {activePopupTable.reservationName || "غير محدد"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
                            وقت الحجز
                          </p>
                          <p className="text-xl font-black text-white">
                            {activePopupTable.reservationTime || "--:--"}
                          </p>
                        </div>
                      </div>
                    )}

                    {activePopupTable.status === TableStatus.CLEANING && (
                      <div className="text-center py-8 space-y-4">
                        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-500">
                          <Clock size={40} />
                        </div>
                        <p className="text-slate-400 font-bold">
                          الطاولة قيد التنظيف حالياً
                        </p>
                      </div>
                    )}

                    <div className="flex flex-col gap-3">
                      {activePopupTable.status === TableStatus.CLEANING && (
                        <button
                          onClick={() => resetTable(activePopupTable.id)}
                          className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-sm shadow-lg shadow-emerald-900/20"
                        >
                          تم التنظيف (تفعيل الطاولة)
                        </button>
                      )}
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            const name = prompt("اسم الحجز:");
                            const time = prompt("وقت الحجز (مثلاً 07:00 PM):");
                            if (name && time) {
                              updateTableStatus(
                                activePopupTable.id,
                                TableStatus.RESERVED,
                                {
                                  reservationName: name,
                                  reservationTime: time,
                                },
                              );
                              setShowPopup(null);
                            }
                          }}
                          className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black text-sm shadow-lg shadow-blue-900/20"
                        >
                          حجز الطاولة
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Transfer Mode Overlay */}
      {transferMode && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-8 py-4 rounded-full font-black shadow-2xl flex items-center gap-4 animate-bounce">
          <Move size={24} />
          <span>اختر الطاولة الجديدة لنقل الطلب إليها...</span>
          <button
            onClick={() => setTransferMode(null)}
            className="bg-black/20 p-1 rounded-full hover:bg-black/40"
          >
            <X size={16} />
          </button>
        </div>
      )}
      </>
      )}
    </div>
  );
};
