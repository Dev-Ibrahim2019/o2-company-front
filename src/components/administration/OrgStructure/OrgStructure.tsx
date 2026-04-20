import React, { useState, useEffect } from "react";
import { useApp } from "../../../../store";
import { CheckCircle2, Zap, Truck, Timer, AlertCircle } from "lucide-react";
import { OrderType, EmployeeStatus, OrderStatus } from "../../../../types";
import type { Order } from "../../../../types";

import { motion, AnimatePresence } from "framer-motion";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import HeaderOrg from "./HeaderOrg";
import BranchContainer from "./BranchContainer";
import DepartmentContainer from "./DepartmentContainer";
import JobTitleContainer from "./JobTitleContainer";
import EmployeeContainer from "./EmployeeContainer";
import ModalContainer from "./ModalContainer";

export type ModalType =
  | "BRANCH"
  | "DEPT"
  | "JOB_TITLE"
  | "JOB_TYPE"
  | "EMP"
  | null;

export const OrgStructure: React.FC = () => {
  const {
    departments,
    addBranch,
    addDepartment,
    addJobTitle,
    addJobType,
    addEmployee,
    updateBranch,
    updateDepartment,
    updateJobTitle,
    updateJobType,
    updateEmployee,
    addNotification,
  } = useApp();

  const openAdd = (type: ModalType) => {
    setEditingId(null);
    setFormData({});
    setModalType(type);
  };

  const openEdit = (type: ModalType, id: string, data: any) => {
    setEditingId(id);
    setFormData(data);
    setModalType(type);
  };

  const closeModal = () => {
      setModalType(null);
      setEditingId(null);
    };

  const [modalType, setModalType] = useState<
    "BRANCH" | "DEPT" | "JOB_TITLE" | "JOB_TYPE" | "EMP" | null
  >(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form States
  const [formData, setFormData] = useState<any>({});

  const onSave = () => {
    try {
      if (modalType === "BRANCH") {
        if (editingId) updateBranch(editingId, formData);
        else addBranch(formData);
      } else if (modalType === "DEPT") {
        if (editingId) updateDepartment(editingId, formData);
        else
          addDepartment({
            ...formData,
            hasKds: formData.hasKds || false,
            displayOrder: departments.length + 1,
            status: "ACTIVE",
            priority: 1,
            defaultPrepTime: 10,
            maxConcurrentOrders: 10,
            requiresAssembly: true,
            notifications: { sound: true, flash: true, push: true },
            orderTypeVisibility: [
              OrderType.DINE_IN,
              OrderType.TAKEAWAY,
              OrderType.DELIVERY,
            ],
          });
      } else if (modalType === "JOB_TITLE") {
        if (editingId) updateJobTitle(editingId, formData);
        else addJobTitle(formData);
      } else if (modalType === "JOB_TYPE") {
        if (editingId) updateJobType(editingId, formData);
        else addJobType(formData);
      } else if (modalType === "EMP") {
        if (editingId) updateEmployee(editingId, formData);
        else
          addEmployee({
            ...formData,
            hireDate: new Date(),
            status: EmployeeStatus.ACTIVE,
            permissions: ["ALL"],
          });
      }

      addNotification(`تم ${editingId ? "تحديث" : "إضافة"} البيانات بنجاح`);
      setModalType(null);
      setEditingId(null);
      setFormData({});
    } catch (error) {
      addNotification("حدث خطأ أثناء حفظ البيانات");
    }
  };

  const OrderCard: React.FC<{
    order: Order;
    onStatusChange: (status: OrderStatus) => void;
    isDraggable?: boolean;
  }> = ({ order, onStatusChange, isDraggable }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: order.id,
      data: {
        type: "Order",
        order,
      },
      disabled: isDraggable === false,
    });

    const style = {
      transform: CSS.Translate.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
      zIndex: isDragging ? 100 : 1,
    };

    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
      const interval = setInterval(() => {
        const diff = Math.floor(
          (Date.now() - new Date(order.createdAt).getTime()) / 1000,
        );
        setElapsed(diff);
      }, 1000);
      return () => clearInterval(interval);
    }, [order.createdAt]);

    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const isLate = elapsed > 600; // 10 mins
    const isWarning = elapsed > 300; // 5 mins

    const urgencyColor = isLate
      ? "text-red-500"
      : isWarning
        ? "text-yellow-500"
        : "text-emerald-500";

    const statusColors = {
      [OrderStatus.PENDING]: {
        border: "border-red-500",
        bg: "bg-red-500/10",
        accent: "bg-red-600",
        text: "text-red-500",
      },
      [OrderStatus.PREPARING]: {
        border: "border-yellow-500",
        bg: "bg-yellow-500/10",
        accent: "bg-yellow-600",
        text: "text-yellow-500",
      },
      [OrderStatus.READY]: {
        border: "border-emerald-500",
        bg: "bg-emerald-500/10",
        accent: "bg-emerald-600",
        text: "text-emerald-500",
      },
      [OrderStatus.DELIVERED]: {
        border: "border-blue-500",
        bg: "bg-blue-500/10",
        accent: "bg-blue-600",
        text: "text-blue-500",
      },
      [OrderStatus.CANCELED]: {
        border: "border-slate-500",
        bg: "bg-slate-500/10",
        accent: "bg-slate-600",
        text: "text-slate-500",
      },
      [OrderStatus.REFUNDED]: {
        border: "border-purple-500",
        bg: "bg-purple-500/10",
        accent: "bg-purple-600",
        text: "text-purple-500",
      },
      [OrderStatus.IN_PROGRESS]: {
        border: "border-blue-500",
        bg: "bg-blue-500/10",
        accent: "bg-blue-600",
        text: "text-blue-500",
      },
    };

    const colors = statusColors[order.status] || statusColors[OrderStatus.PENDING];

    return (
      <motion.div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`p-4 rounded-2xl border-2 ${colors.border} ${colors.bg} backdrop-blur-xl shadow-2xl flex flex-col gap-3 relative overflow-hidden group cursor-grab active:cursor-grabbing`}
      >
        {/* Urgency Pulse */}
        {isLate && (
          <div className="absolute inset-0 bg-red-600/20 animate-pulse pointer-events-none"></div>
        )}

        <div className="flex justify-between items-start relative z-10">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-lg ${colors.accent} text-white`}
            >
              #{order.orderNumber.split("-").pop()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-white tracking-tight">
                  {order.type === OrderType.DINE_IN
                    ? `طاولة ${order.tableId}`
                    : order.type === OrderType.TAKEAWAY
                      ? "سفري"
                      : "توصيل"}
                </h4>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${colors.border} ${colors.text} bg-black/20`}
                >
                  {order.status}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                {new Date(order.createdAt).toLocaleTimeString("ar-EG", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
          <div className={`flex flex-col items-end gap-1`}>
            <div
              className={`flex items-center gap-1.5 ${urgencyColor} font-black text-sm bg-black/40 px-2 py-1 rounded-lg border border-white/5`}
            >
              <Timer size={16} className={isLate ? "animate-spin-slow" : ""} />
              {formatTime(elapsed)}
            </div>
            {order.customerDetails?.name && (
              <p className="text-[10px] text-slate-400 font-bold mt-1">
                {order.customerDetails.name}
              </p>
            )}
          </div>
        </div>

        <div className="h-[1px] bg-white/10 relative z-10"></div>

        <div className="flex-1 space-y-3 max-h-64 overflow-y-auto custom-scrollbar relative z-10">
          {order.items.map((item) => (
            <div
              key={item.uniqueId}
              className="flex justify-between items-start group/item bg-black/20 p-2 rounded-xl border border-white/5 hover:border-white/10 transition-all"
            >
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-600/20 flex items-center justify-center border border-red-600/30">
                  <span className="text-red-500 font-black text-sm">
                    {item.quantity}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-black text-white leading-tight">
                    {item.nameAr || item.name}
                  </p>
                  {item.note && (
                    <div className="mt-1.5 p-1.5 bg-orange-500/10 border border-orange-500/20 rounded-lg flex items-start gap-1.5">
                      <AlertCircle
                        size={12}
                        className="text-orange-500 shrink-0 mt-0.5"
                      />
                      <p className="text-[10px] text-orange-400 font-bold leading-tight">
                        {item.note}
                      </p>
                    </div>
                  )}
                  {item.addons && item.addons.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {item.addons.map((addon: any) => (
                        <span
                          key={addon.id}
                          className="text-[10px] bg-slate-800/80 text-slate-300 px-2 py-0.5 rounded-full border border-white/5 font-bold"
                        >
                          + {addon.nameAr || addon.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-2 relative z-10">
          {order.status === OrderStatus.PENDING && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(OrderStatus.PREPARING);
              }}
              className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-yellow-600/20"
            >
              <Zap size={16} /> بدء التحضير
            </button>
          )}
          {order.status === OrderStatus.PREPARING && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(OrderStatus.READY);
              }}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
            >
              <CheckCircle2 size={16} /> جاهز للتسليم
            </button>
          )}
          {order.status === OrderStatus.READY && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(OrderStatus.DELIVERED);
              }}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20"
            >
              <Truck size={16} /> تم التسليم
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 text-slate-100">
      <HeaderOrg onAdd={openAdd} onEdit={openEdit} />

      {/* Modals */}
      <AnimatePresence>
        {modalType === "BRANCH" && (
          <ModalContainer
            title={editingId ? "تحديث بيانات الفرع" : "تأسيس فرع جديد"}
            onClose={closeModal}
          >
            <BranchContainer />
          </ModalContainer>
        )}

        {modalType === "DEPT" && (
          <ModalContainer
            title={editingId ? "تعديل بيانات القسم" : "إضافة قسم تشغيلي جديد"}
            onClose={closeModal}
          >
            <DepartmentContainer />
          </ModalContainer>
        )}

        {modalType === "JOB_TITLE" && (
          <ModalContainer
            title={editingId ? "تعديل مسمى وظيفي" : "إضافة مسمى وظيفي جديد"}
            onClose={closeModal}
          >
            <JobTitleContainer />
          </ModalContainer>
        )}

        {modalType === "EMP" && (
          <ModalContainer
            title={editingId ? "تحديث بيانات الموظف" : "تسجيل موظف جديد"}
            onClose={closeModal}
          >
            <EmployeeContainer />
          </ModalContainer>
        )}
      </AnimatePresence>
    </div>
  );
};
