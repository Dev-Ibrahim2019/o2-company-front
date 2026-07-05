import { useState } from "react";
import {
  X,
  SlidersHorizontal,
  DollarSign,
  Calendar,
  CreditCard,
  Banknote,
  Wallet,
  Landmark,
  Search,
  RotateCcw,
} from "lucide-react";
import type { PaymentMethod } from "../../services/orderService";

export type InvoiceFilters = {
  search: string;
  from: string;
  to: string;
  paymentStatus: "all" | "closed" | "partial" | "unpaid" | "cancelled";
  paymentMethod: "all" | PaymentMethod;
  minTotal: string;
  maxTotal: string;
};

export const emptyFilters: InvoiceFilters = {
  search: "",
  from: "",
  to: "",
  paymentStatus: "all",
  paymentMethod: "all",
  minTotal: "",
  maxTotal: "",
};

const PAYMENT_STATUS_OPTIONS: { value: InvoiceFilters["paymentStatus"]; label: string }[] = [
  { value: "all", label: "الكل" },
  { value: "closed", label: "مدفوعة بالكامل" },
  { value: "partial", label: "مدفوعة جزئياً" },
  { value: "unpaid", label: "غير مدفوعة" },
  { value: "cancelled", label: "ملغاة" },
];

const PAYMENT_METHOD_OPTIONS: { value: InvoiceFilters["paymentMethod"]; label: string; icon: typeof Banknote }[] = [
  { value: "all", label: "الكل", icon: Search },
  { value: "cash", label: "نقدي", icon: Banknote },
  { value: "card", label: "بطاقة ائتمان", icon: CreditCard },
  { value: "wallet", label: "محفظة", icon: Wallet },
  { value: "bank", label: "تحويل بنكي", icon: Landmark },
];

interface Props {
  filters: InvoiceFilters;
  onApply: (filters: InvoiceFilters) => void;
  onClose: () => void;
}

export const InvoiceFilterModal = ({ filters, onApply, onClose }: Props) => {
  const [local, setLocal] = useState<InvoiceFilters>({ ...filters });

  const update = (key: keyof InvoiceFilters, value: string) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    onApply(local);
    onClose();
  };

  const handleClear = () => {
    setLocal({ ...emptyFilters, search: filters.search });
  };

  const activeCount = Object.entries(local).filter(([key, value]) => {
    if (key === "search") return false;
    return value !== "" && value !== "all";
  }).length;

  return (
    <div className="fixed inset-0 z-[90] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/10">
              <SlidersHorizontal size={18} className="text-red-500" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">فلترة الفواتير</h3>
              <p className="text-[11px] text-slate-500 font-bold">
                {activeCount > 0 ? `${activeCount} فلتر نشط` : "اختر معايير التصفية"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Amount Range */}
          <div>
            <label className="flex items-center gap-2 text-xs font-black text-slate-300 mb-3">
              <DollarSign size={14} className="text-emerald-400" />
              المبلغ
            </label>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-500 mb-1 block">من</label>
                <input
                  type="number"
                  value={local.minTotal}
                  onChange={(e) => update("minTotal", e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-emerald-500/50 placeholder:text-slate-600"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-500 mb-1 block">إلى</label>
                <input
                  type="number"
                  value={local.maxTotal}
                  onChange={(e) => update("maxTotal", e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-emerald-500/50 placeholder:text-slate-600"
                />
              </div>
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="flex items-center gap-2 text-xs font-black text-slate-300 mb-3">
              <Calendar size={14} className="text-blue-400" />
              التاريخ
            </label>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-500 mb-1 block">من تاريخ</label>
                <input
                  type="date"
                  value={local.from}
                  onChange={(e) => update("from", e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500/50 [color-scheme:dark]"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-500 mb-1 block">إلى تاريخ</label>
                <input
                  type="date"
                  value={local.to}
                  onChange={(e) => update("to", e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500/50 [color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          {/* Payment Status */}
          <div>
            <label className="flex items-center gap-2 text-xs font-black text-slate-300 mb-3">
              <DollarSign size={14} className="text-amber-400" />
              حالة الدفع
            </label>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => update("paymentStatus", opt.value)}
                  className={`px-3 py-2 rounded-xl text-xs font-black transition ${
                    local.paymentStatus === opt.value
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : "bg-slate-800 text-slate-400 border border-white/5 hover:text-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="flex items-center gap-2 text-xs font-black text-slate-300 mb-3">
              <CreditCard size={14} className="text-cyan-400" />
              طريقة الدفع
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHOD_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => update("paymentMethod", opt.value)}
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-black transition ${
                      local.paymentMethod === opt.value
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                        : "bg-slate-800 text-slate-400 border border-white/5 hover:text-white"
                    }`}
                  >
                    <Icon size={14} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 flex items-center justify-between">
          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-black hover:bg-slate-700 transition"
          >
            <RotateCcw size={14} />
            مسح الفلاتر
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-black hover:bg-slate-700 transition"
            >
              إلغاء
            </button>
            <button
              onClick={handleApply}
              className="px-5 py-2 rounded-xl bg-red-600 text-white text-xs font-black hover:bg-red-700 transition flex items-center gap-2"
            >
              <SlidersHorizontal size={14} />
              تطبيق الفلاتر
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
