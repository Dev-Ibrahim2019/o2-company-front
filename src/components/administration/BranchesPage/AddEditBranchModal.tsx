import React from "react";
import { X } from "lucide-react";
import { useBranch } from "../../../hooks/useBranch";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editingItem?: any;
  refetch: () => Promise<void>; // ✅ أُضيف هنا
}

const AddEditBranchModal: React.FC<Props> = ({
  isOpen,
  onClose,
  editingItem,
  refetch,
}) => {
  const { addBranch, updateBranch } = useBranch();

  const closeModal = () => {
    onClose();
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    const branchData = {
      ...data,
      isMainBranch: data.isMainBranch === "on",
      is_active: data.is_active === "1" || data.is_active === 1,
      cashierCount: parseInt(data.cashierCount as string) || 1,
      defaultTax: parseFloat(data.defaultTax as string) || 0,
      maxDiscountLimit: parseFloat(data.maxDiscountLimit as string) || 0,
      firstInvoiceNumber: parseInt(data.firstInvoiceNumber as string) || 1,
      createdAt: editingItem?.createdAt || new Date(),
    };

    if (editingItem) {
      await updateBranch(editingItem.id, branchData as any);
    } else {
      await addBranch(branchData as any);
    }
    await refetch();
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
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase">
                الحالة
              </label>
              <select
                name="is_active"
                defaultValue={editingItem?.is_active ? "1" : "0"}
                className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
              >
                <option value="1">نشط</option>
                <option value="0">غير نشط</option>
              </select>
            </div>
          </div>
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