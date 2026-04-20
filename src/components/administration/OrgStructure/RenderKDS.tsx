import React, { useState, useEffect } from "react";
import { useApp } from "../../../../store";
import {
  Search,
  ChevronDown,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Monitor,
  Bell,
  Zap,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Layout,
  Grid,
  Columns,
} from "lucide-react";
import { OrderStatus } from "../../../../types";
import type { Order } from "../../../../types";

import { AnimatePresence } from "framer-motion";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";

const RenderKDS: React.FC = () => {
  const { departments, activeOrders, updateOrderStatus } = useApp();
  const kdsDepts = departments.filter((d) => d.hasKds);
  const selectedDept =
    kdsDepts.find((d) => d.id === selectedKdsDeptId) || kdsDepts[0];
  const [selectedKdsDeptId, setSelectedKdsDeptId] = useState<string | null>(
    null,
  );
  const [kdsSearchQuery, setKdsSearchQuery] = useState("");
  const [kdsFilter, setKdsFilter] = useState<
    "ALL" | "DINE_IN" | "TAKEAWAY" | "DELIVERY"
  >("ALL");
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [kdsLayout, setKdsLayout] = useState<"GRID" | "COLUMNS">("COLUMNS");

  // Filter orders for the selected department
  const filteredOrders = activeOrders.filter((order) => {
    const hasItemInDept = order.items.some(
      (item) => item.departmentId === selectedDept?.id,
    );
    const matchesSearch =
      order.orderNumber.includes(kdsSearchQuery) ||
      (order.tableId && order.tableId.includes(kdsSearchQuery));
    const matchesFilter = kdsFilter === "ALL" || order.type === kdsFilter;
    return hasItemInDept && matchesSearch && matchesFilter;
  });

  const columns = [
    {
      id: OrderStatus.PENDING,
      title: "طلبات جديدة",
      color: "text-red-500",
      bg: "bg-red-500/10",
      icon: Bell,
    },
    {
      id: OrderStatus.PREPARING,
      title: "قيد التحضير",
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
      icon: Zap,
    },
    {
      id: OrderStatus.READY,
      title: "جاهز للتسليم",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      icon: CheckCircle2,
    },
  ];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const OrderCard: React.FC<{
    order: Order;
    onStatusChange: (status: OrderStatus) => void;
    isDraggable?: boolean;
  }> = ({ order, isDraggable }) => {
    const {} = useSortable({
      id: order.id,
      data: {
        type: "Order",
        order,
      },
      disabled: isDraggable === false,
    });

    const playNotificationSound = (type: "new" | "status" | "ready") => {
      if (!isSoundEnabled) return;
      const sounds = {
        new: "https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3",
        status:
          "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3",
        ready:
          "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3",
      };
      const audio = new Audio(sounds[type]);
      audio.play().catch(() => {});
    };

    const handleDragEnd = (event: any) => {
      const { active, over } = event;
      if (!over) return;

      const orderId = active.id;
      const overId = over.id;

      // If dropped over a column (status)
      if (Object.values(OrderStatus).includes(overId as OrderStatus)) {
        updateOrderStatus(orderId, overId as OrderStatus);
        playNotificationSound("status");
      } else {
        // If dropped over another order, find that order's status
        const overOrder = activeOrders.find((o) => o.id === overId);
        if (overOrder) {
          updateOrderStatus(orderId, overOrder.status);
          playNotificationSound("status");
        }
      }
    };

    // Sound effect for new orders
    useEffect(() => {
      if (filteredOrders.length > 0) {
        // Simple logic to detect new orders (could be refined)
        const hasNewOrder = filteredOrders.some(
          (o) =>
            o.status === OrderStatus.PENDING &&
            Date.now() - new Date(o.createdAt).getTime() < 5000,
        );
        if (hasNewOrder) {
          playNotificationSound("new");
        }
      }
    }, [filteredOrders.length]);

    return (
      <div
        className={`flex flex-col h-full ${isFullscreen ? "fixed inset-0 z-[1000] bg-slate-950 p-6" : "min-h-[700px]"} animate-in fade-in duration-500`}
      >
        {/* KDS Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 bg-slate-900/60 p-5 rounded-3xl border border-white/10 backdrop-blur-2xl shadow-2xl">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-600/20">
              <Monitor className="text-white" size={24} />
            </div>
            <div className="flex flex-col">
              <h2 className="text-2xl font-black text-white tracking-tighter">
                شاشة المطبخ الذكية <span className="text-red-600">KDS</span>
              </h2>
              <div className="flex items-center gap-3 mt-1.5">
                <div className="relative">
                  <select
                    value={selectedKdsDeptId || ""}
                    onChange={(e) => setSelectedKdsDeptId(e.target.value)}
                    className="bg-slate-800/80 border border-white/10 rounded-xl px-4 py-1.5 text-xs font-black text-white outline-none focus:ring-2 focus:ring-red-600 transition-all appearance-none pr-10"
                  >
                    {kdsDepts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nameAr || d.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                    size={14}
                  />
                </div>
                <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-xs text-emerald-500 font-black uppercase tracking-widest">
                    متصل الآن
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="relative flex-1 min-w-[200px]">
              <Search
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                size={16}
              />
              <input
                type="text"
                placeholder="بحث برقم الطلب أو الطاولة..."
                className="w-full bg-slate-800/50 border border-white/10 rounded-xl py-2.5 pr-11 pl-4 text-sm text-white focus:ring-2 focus:ring-red-600 outline-none transition-all placeholder:text-slate-600"
                value={kdsSearchQuery}
                onChange={(e) => setKdsSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex bg-slate-800/80 p-1.5 rounded-2xl border border-white/10 shadow-inner">
              <button
                onClick={() => setKdsLayout("GRID")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-black text-xs ${kdsLayout === "GRID" ? "bg-red-600 text-white shadow-lg" : "text-slate-500 hover:text-white"}`}
              >
                <Grid size={18} /> شبكة
              </button>
              <button
                onClick={() => setKdsLayout("COLUMNS")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-black text-xs ${kdsLayout === "COLUMNS" ? "bg-red-600 text-white shadow-lg" : "text-slate-500 hover:text-white"}`}
              >
                <Columns size={18} /> أعمدة
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2.5 bg-slate-800/80 text-slate-400 hover:text-white rounded-xl border border-white/10 transition-all hover:bg-slate-700"
                title={isFullscreen ? "تصغير" : "ملء الشاشة"}
              >
                {isFullscreen ? (
                  <Minimize2 size={20} />
                ) : (
                  <Maximize2 size={20} />
                )}
              </button>

              <button
                onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                className={`p-2.5 rounded-xl border border-white/10 transition-all ${isSoundEnabled ? "bg-emerald-600/20 text-emerald-500 border-emerald-500/30" : "bg-slate-800/80 text-slate-500"}`}
                title={isSoundEnabled ? "كتم الصوت" : "تفعيل الصوت"}
              >
                {isSoundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* KDS Content */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          {kdsLayout === "COLUMNS" ? (
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
              {columns.map((col) => {
                const colOrders = filteredOrders.filter(
                  (o) => o.status === col.id,
                );
                return (
                  <div
                    key={col.id}
                    className="flex flex-col h-full bg-slate-900/30 rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl"
                  >
                    <div
                      className={`p-5 border-b border-white/10 flex justify-between items-center ${col.bg} backdrop-blur-md`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-10 h-10 rounded-2xl ${col.bg} ${col.color} flex items-center justify-center shadow-lg border border-white/10`}
                        >
                          <col.icon size={20} />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-white tracking-tight">
                            {col.title}
                          </h3>
                          <p className="text-xs text-slate-500 font-black uppercase tracking-widest">
                            قائمة الانتظار النشطة
                          </p>
                        </div>
                      </div>
                      <div className="bg-black/40 px-5 py-2 rounded-full border border-white/10 shadow-inner">
                        <span className={`text-base font-black ${col.color}`}>
                          {colOrders.length}
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 p-5 overflow-y-auto custom-scrollbar space-y-5 bg-slate-950/20">
                      <SortableContext
                        items={colOrders.map((o) => o.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <AnimatePresence mode="popLayout">
                          {colOrders.map((order) => (
                            <OrderCard
                              key={order.id}
                              order={order}
                              onStatusChange={(status) => {
                                updateOrderStatus(order.id, status);
                                playNotificationSound("status");
                              }}
                            />
                          ))}
                        </AnimatePresence>
                      </SortableContext>
                      {colOrders.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center opacity-10 py-20">
                          <Layout size={80} className="text-slate-600 mb-6" />
                          <p className="text-sm font-black text-slate-500 uppercase tracking-[0.2em]">
                            لا توجد طلبات
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <AnimatePresence mode="popLayout">
                  {filteredOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onStatusChange={(status) => {
                        updateOrderStatus(order.id, status);
                        playNotificationSound("status");
                      }}
                    />
                  ))}
                </AnimatePresence>
              </div>
              {filteredOrders.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center opacity-10 py-40">
                  <Layout size={100} className="text-slate-600 mb-8" />
                  <p className="text-2xl font-black text-slate-500 uppercase tracking-[0.3em]">
                    لا توجد طلبات في هذا القسم
                  </p>
                </div>
              )}
            </div>
          )}
        </DndContext>

        {/* KDS Footer Stats */}
        {!isFullscreen && (
          <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                label: "متوسط وقت التحضير",
                value: "8:45 دقيقة",
                icon: Clock,
                color: "text-blue-500",
                bg: "bg-blue-500/10",
              },
              {
                label: "الطلبات المكتملة اليوم",
                value: "124",
                icon: CheckCircle2,
                color: "text-emerald-500",
                bg: "bg-emerald-500/10",
              },
              {
                label: "أداء القسم",
                value: "94%",
                icon: Zap,
                color: "text-orange-500",
                bg: "bg-orange-500/10",
              },
              {
                label: "تنبيهات التأخير",
                value: "2",
                icon: AlertTriangle,
                color: "text-red-500",
                bg: "bg-red-500/10",
              },
            ].map((stat, i) => (
              <div
                key={i}
                className="bg-slate-900/60 p-4 rounded-2xl border border-white/10 flex items-center gap-4 shadow-xl backdrop-blur-md hover:border-white/20 transition-all group"
              >
                <div
                  className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color} shadow-lg group-hover:scale-110 transition-transform`}
                >
                  <stat.icon size={24} />
                </div>
                <div>
                  <p className="text-xl font-black text-white leading-tight">
                    {stat.value}
                  </p>
                  <p className="text-xs text-slate-500 font-black uppercase tracking-widest mt-0.5">
                    {stat.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };
};

export default RenderKDS;