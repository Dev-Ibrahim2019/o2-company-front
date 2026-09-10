import React, { useState } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { callCenterService } from "./services/callCenterService";
import { toast } from "../shared/Toast";

const complaintTypes = [
  { value: "delay", label: "تأخير" },
  { value: "missing_item", label: "صنف ناقص" },
  { value: "wrong_item", label: "صنف خاطئ" },
  { value: "food_quality", label: "جودة الطعام" },
  { value: "packaging", label: "مشكلة في التغليف" },
  { value: "delivery", label: "مشكلة مع المندوب" },
  { value: "payment", label: "مشكلة دفع" },
  { value: "discount", label: "مشكلة خصم" },
  { value: "service", label: "سوء خدمة" },
  { value: "other", label: "أخرى" },
];

interface Props {
  customerId: number;
  customerName: string;
  orderId?: number | null;
  onClose: () => void;
  onCreated?: () => void;
}

export const QuickComplaintModal: React.FC<Props> = ({
  customerId,
  customerName,
  orderId,
  onClose,
  onCreated,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("other");
  const [priority, setPriority] = useState("normal");
  const [isSensitive, setIsSensitive] = useState(false);
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSending(true);
    setErrors({});
    try {
      await callCenterService.createComplaint({
        customer_id: customerId,
        order_id: orderId ?? undefined,
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        priority,
        is_sensitive: isSensitive,
      });
      toast.success("تم تسجيل الشكوى", `تم ربط الشكوى بالعميل ${customerName}`);
      onCreated?.();
      onClose();
    } catch (error: any) {
      const validationErrors = error?.response?.data?.errors;
      if (validationErrors) {
        setErrors(validationErrors);
      } else {
        toast.error("تعذر تسجيل الشكوى", error?.response?.data?.message || "حاول مرة أخرى");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4" dir="rtl" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-400" />
            <h3 className="text-sm font-black text-white">تقديم شكوى سريعة</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-white/5" aria-label="إغلاق">
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        <div className="mb-3 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300">
          <div><span className="text-slate-500">العميل:</span> {customerName}</div>
          {orderId ? (
            <div className="mt-1"><span className="text-slate-500">الطلب المرتبط:</span> #{orderId}</div>
          ) : (
            <div className="mt-1 text-amber-300">سيتم ربط الشكوى بالعميل فقط — لا يوجد طلب حالي</div>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="عنوان الشكوى *"
              className="w-full rounded-xl border border-white/10 bg-slate-800 p-2.5 text-xs text-white placeholder-slate-500 focus:border-red-500/50 focus:outline-none"
            />
            {errors.title && <p className="mt-1 text-[11px] text-red-400">{errors.title[0]}</p>}
          </div>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="وصف مختصر للمشكلة"
            className="h-20 w-full resize-none rounded-xl border border-white/10 bg-slate-800 p-2.5 text-xs text-white placeholder-slate-500 focus:border-red-500/50 focus:outline-none"
          />

          <div className="flex gap-2">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="flex-1 rounded-xl border border-white/10 bg-slate-800 p-2.5 text-xs text-white focus:border-red-500/50 focus:outline-none"
            >
              {complaintTypes.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="flex-1 rounded-xl border border-white/10 bg-slate-800 p-2.5 text-xs text-white focus:border-red-500/50 focus:outline-none"
            >
              <option value="low">منخفضة</option>
              <option value="normal">متوسطة</option>
              <option value="high">عالية</option>
              <option value="critical">حرجة</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={isSensitive}
              onChange={(e) => setIsSensitive(e.target.checked)}
              className="rounded border-white/10 bg-slate-800"
            />
            شكوى حساسة
          </label>

          <button
            onClick={handleSubmit}
            disabled={sending || !title.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white transition-all hover:bg-red-700 disabled:opacity-50"
          >
            {sending ? <><Loader2 size={14} className="animate-spin" /> جاري التسجيل...</> : "تسجيل الشكوى"}
          </button>
        </div>
      </div>
    </div>
  );
};
