import React, { useState } from "react";
import { useApp } from "../../../../store";
import {
  Clock,
  X,
  Map,
  Monitor,
  Shield,
  Info,
  Smartphone,
  DollarSign,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const AddEditBranchModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { employees, branches, addBranch, updateBranch } = useApp();
  const [editingItem, setEditingItem] = useState<any>(null);
  const [modalType, setModalType] = useState<
    "BRANCH" | "DEPARTMENT" | "MENU_ITEM" | "EMPLOYEE" | "CUSTOMER" | null
  >(null);
  const closeModal = () => {
    setModalType(null);
    setEditingItem(null);
    onClose();
  };
  const [activeBranchTab, setActiveBranchTab] = useState<
    | "BASIC"
    | "LOCATION"
    | "CONTACT"
    | "OPERATIONS"
    | "FINANCIAL"
    | "CASHIER"
    | "ADVANCED"
  >("BASIC");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    const branchData = {
      ...data,
      isMainBranch: data.isMainBranch === "on",
      is24Hours: data.is24Hours === "on",
      allowDiscount: data.allowDiscount === "on",
      requireShiftOpening: data.requireShiftOpening === "on",
      hasDelivery: data.hasDelivery === "on",
      cashierCount: parseInt(data.cashierCount as string) || 1,
      defaultTax: parseFloat(data.defaultTax as string) || 0,
      maxDiscountLimit: parseFloat(data.maxDiscountLimit as string) || 0,
      firstInvoiceNumber: parseInt(data.firstInvoiceNumber as string) || 1,
      createdAt: editingItem?.createdAt || new Date(),
    };
    if (editingItem) {
      updateBranch(editingItem.id, branchData as any);
    } else {
      addBranch(branchData as any);
    }

    closeModal();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-800/50">
          <h3 className="text-xl font-bold text-white">
            {editingItem ? "تعديل" : "إضافة فرع جديد"}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl text-slate-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {(
            <div className="space-y-6">
              {/* Tabs Navigation */}
              <div className="flex items-center gap-1 bg-slate-900/50 p-1 rounded-xl border border-white/5 overflow-x-auto custom-scrollbar no-scrollbar">
                {[
                  { id: "BASIC", label: "الأساسية", icon: Info },
                  { id: "LOCATION", label: "الموقع", icon: Map },
                  { id: "CONTACT", label: "التواصل", icon: Smartphone },
                  { id: "OPERATIONS", label: "التشغيل", icon: Clock },
                  { id: "FINANCIAL", label: "المالية", icon: DollarSign },
                  { id: "CASHIER", label: "الكاشير", icon: Monitor },
                  { id: "ADVANCED", label: "متقدم", icon: Shield },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveBranchTab(tab.id as any)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ${
                      activeBranchTab === tab.id
                        ? "bg-red-600 text-white shadow-lg shadow-red-900/20"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <tab.icon size={14} />
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeBranchTab}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {activeBranchTab === "BASIC" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">
                              اسم الفرع
                            </label>
                            <input
                              name="name"
                              defaultValue={editingItem?.name}
                              required
                              className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">
                              كود الفرع (Branch Code)
                            </label>
                            <input
                              name="code"
                              defaultValue={editingItem?.code}
                              required
                              className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">
                              الحالة
                            </label>
                            <select
                              name="status"
                              defaultValue={editingItem?.status || "ACTIVE"}
                              className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                            >
                              <option value="ACTIVE">نشط</option>
                              <option value="INACTIVE">متوقف</option>
                              <option value="MAINTENANCE">صيانة</option>
                              <option value="BUSY">مزدحم</option>
                            </select>
                          </div>
                          <div className="flex items-end pb-2">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                name="isMainBranch"
                                type="checkbox"
                                defaultChecked={editingItem?.isMainBranch}
                                className="w-4 h-4 accent-red-600 rounded"
                              />
                              <span className="text-sm text-white font-bold">
                                الفرع الرئيسي
                              </span>
                            </label>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">
                            الفرع الأب (اختياري)
                          </label>
                          <select
                            name="parentId"
                            defaultValue={editingItem?.parentId}
                            className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                          >
                            <option value="">لا يوجد</option>
                            {branches
                              .filter((b) => b.id !== editingItem?.id)
                              .map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.name}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                    )}
                    {activeBranchTab === "LOCATION" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">
                              المدينة
                            </label>
                            <input
                              name="city"
                              defaultValue={editingItem?.city}
                              required
                              className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">
                              العنوان
                            </label>
                            <input
                              name="address"
                              defaultValue={editingItem?.address}
                              required
                              className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">
                            رابط Google Map
                          </label>
                          <input
                            name="googleMapUrl"
                            defaultValue={editingItem?.googleMapUrl}
                            className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50"
                          />
                        </div>
                      </div>
                    )}
                    {activeBranchTab === "CONTACT" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">
                              رقم الهاتف
                            </label>
                            <input
                              name="phone"
                              defaultValue={editingItem?.phone}
                              required
                              className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">
                              رقم الواتساب
                            </label>
                            <input
                              name="whatsapp"
                              defaultValue={editingItem?.whatsapp}
                              className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">
                            البريد الإلكتروني
                          </label>
                          <input
                            name="email"
                            type="email"
                            defaultValue={editingItem?.email}
                            className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50"
                          />
                        </div>
                      </div>
                    )}

                    {activeBranchTab === "OPERATIONS" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">
                              وقت الفتح
                            </label>
                            <input
                              name="openingTime"
                              type="time"
                              defaultValue={editingItem?.openingTime || "08:00"}
                              className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">
                              وقت الإغلاق
                            </label>
                            <input
                              name="closingTime"
                              type="time"
                              defaultValue={editingItem?.closingTime || "23:00"}
                              className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center gap-3 cursor-pointer">
                            <input
                              name="is24Hours"
                              type="checkbox"
                              defaultChecked={editingItem?.is24Hours}
                              className="w-4 h-4 accent-red-600 rounded"
                            />
                            <span className="text-sm text-white font-bold">
                              العمل 24 ساعة
                            </span>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">
                              المنطقة الزمنية
                            </label>
                            <input
                              name="timezone"
                              defaultValue={
                                editingItem?.timezone || "Asia/Jerusalem"
                              }
                              className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    {activeBranchTab === "FINANCIAL" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">
                              العملة
                            </label>
                            <input
                              name="currency"
                              defaultValue={editingItem?.currency || "ILS"}
                              className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">
                              الضريبة الافتراضية (%)
                            </label>
                            <input
                              name="defaultTax"
                              type="number"
                              step="0.01"
                              defaultValue={editingItem?.defaultTax || 16}
                              className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center gap-3 cursor-pointer">
                            <input
                              name="allowDiscount"
                              type="checkbox"
                              defaultChecked={
                                editingItem?.allowDiscount ?? true
                              }
                              className="w-4 h-4 accent-red-600 rounded"
                            />
                            <span className="text-sm text-white font-bold">
                              السماح بالخصم
                            </span>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">
                              حد الخصم الأقصى (%)
                            </label>
                            <input
                              name="maxDiscountLimit"
                              type="number"
                              step="0.01"
                              defaultValue={
                                editingItem?.maxDiscountLimit || 100
                              }
                              className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    {activeBranchTab === "CASHIER" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center gap-3 cursor-pointer">
                            <input
                              name="requireShiftOpening"
                              type="checkbox"
                              defaultChecked={
                                editingItem?.requireShiftOpening ?? true
                              }
                              className="w-4 h-4 accent-red-600 rounded"
                            />
                            <span className="text-sm text-white font-bold">
                              يتطلب فتح شفت
                            </span>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">
                              عدد الكاشيرات
                            </label>
                            <input
                              name="cashierCount"
                              type="number"
                              defaultValue={editingItem?.cashierCount || 1}
                              className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">
                              رقم أول فاتورة
                            </label>
                            <input
                              name="firstInvoiceNumber"
                              type="number"
                              defaultValue={
                                editingItem?.firstInvoiceNumber || 1
                              }
                              className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">
                              طابعة الفواتير الافتراضية
                            </label>
                            <input
                              name="defaultPrinter"
                              defaultValue={editingItem?.defaultPrinter}
                              className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    {activeBranchTab === "ADVANCED" && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">
                            مدير الفرع
                          </label>
                          <select
                            name="managerId"
                            defaultValue={editingItem?.managerId}
                            className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                          >
                            <option value="">غير محدد</option>
                            {employees
                              .filter(
                                (e) =>
                                  e.role === "BRANCH_MANAGER" ||
                                  e.role === "ADMIN",
                              )
                              .map((e) => (
                                <option key={e.id} value={e.id}>
                                  {e.name}
                                </option>
                              ))}
                          </select>
                        </div>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            name="hasDelivery"
                            type="checkbox"
                            defaultChecked={editingItem?.hasDelivery ?? true}
                            className="w-4 h-4 accent-red-600 rounded"
                          />
                          <span className="text-sm text-white font-bold">
                            تفعيل خدمة التوصيل
                          </span>
                        </label>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          )}

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold text-sm transition-all"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-red-900/20"
            >
              {editingItem ? "حفظ التعديلات" : "إضافة"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditBranchModal;
