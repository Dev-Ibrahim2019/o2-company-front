import React, { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { callCenterService } from "../../services/callCenterService";
import type { CustomerSearchResult } from "../../services/callCenterService";
import { toast } from "../shared/Toast";

interface Props {
  onClose: () => void;
  onCreated: (customer: CustomerSearchResult) => void;
}

export const QuickCustomerForm: React.FC<Props> = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    mobile: "",
    email: "",
    address: "",
    city: "",
    area: "",
    district: "",
    street: "",
    landmark: "",
    building_no: "",
    floor: "",
    apartment: "",
    delivery_notes: "",
    birth_date: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError("اسم العميل مطلوب");
      return;
    }
    if (!form.phone.trim() && !form.mobile.trim()) {
      setError("أدخل رقم هاتف أو رقم جوال واحدًا على الأقل");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const res = await callCenterService.quickCreateCustomer({
        name: form.name,
        phone: form.phone || undefined,
        mobile: form.mobile || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
        city: form.city || undefined,
        area: form.area || undefined,
        district: form.district || undefined,
        street: form.street || undefined,
        landmark: form.landmark || undefined,
        building_no: form.building_no || undefined,
        floor: form.floor || undefined,
        apartment: form.apartment || undefined,
        delivery_notes: form.delivery_notes || undefined,
        birth_date: form.birth_date || undefined,
        notes: form.notes || undefined,
      });
      onCreated(res.data);
      toast.success("تم إنشاء العميل بنجاح");
      onClose();
    } catch (requestError: any) {
      const validationErrors = requestError?.response?.data?.errors;
      const firstValidationError = validationErrors
        ? Object.values(validationErrors).flat().find(Boolean)
        : null;
      const message = String(firstValidationError || requestError?.response?.data?.message || "تعذر إنشاء العميل");
      setError(message);
      toast.error("فشل إنشاء العميل", message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-white/5 sticky top-0 bg-slate-900 z-10">
          <h2 className="text-base font-black text-white">إنشاء عميل جديد</h2>
          <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-lg"><X size={18} className="text-slate-400" /></button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="الاسم *" value={form.name} onChange={v => set("name", v)} required />
            <Input label="رقم الجوال" value={form.mobile} onChange={v => set("mobile", v)} type="tel" />
            <Input label="رقم الهاتف" value={form.phone} onChange={v => set("phone", v)} type="tel" />
            <Input label="البريد الإلكتروني" value={form.email} onChange={v => set("email", v)} type="email" />
          </div>

          <div className="border-t border-white/5 pt-3">
            <h3 className="text-xs font-bold text-slate-400 mb-2">العنوان</h3>
            <div className="grid grid-cols-2 gap-3">
              <Input label="المدينة" value={form.city} onChange={v => set("city", v)} />
              <Input label="المنطقة" value={form.area} onChange={v => set("area", v)} />
              <Input label="الحي" value={form.district} onChange={v => set("district", v)} />
              <Input label="الشارع" value={form.street} onChange={v => set("street", v)} />
              <Input label="أقرب معلم" value={form.landmark} onChange={v => set("landmark", v)} />
              <Input label="رقم المبنى" value={form.building_no} onChange={v => set("building_no", v)} />
              <Input label="الطابق" value={form.floor} onChange={v => set("floor", v)} />
              <Input label="الشقة" value={form.apartment} onChange={v => set("apartment", v)} />
            </div>
            <div className="mt-3">
              <label className="text-[10px] font-bold text-slate-500 mb-1 block">العنوان كاملاً</label>
              <input value={form.address} onChange={e => set("address", e.target.value)} className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500" placeholder="..." />
            </div>
            <div className="mt-3">
              <label className="text-[10px] font-bold text-slate-500 mb-1 block">ملاحظات التوصيل</label>
              <input value={form.delivery_notes} onChange={e => set("delivery_notes", e.target.value)} className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500" placeholder="..." />
            </div>
          </div>

          <div className="border-t border-white/5 pt-3">
            <h3 className="text-xs font-bold text-slate-400 mb-2">معلومات إضافية</h3>
            <div className="grid grid-cols-2 gap-3">
              <Input label="تاريخ الميلاد" value={form.birth_date} onChange={v => set("birth_date", v)} type="date" />
              <div>
                <label className="text-[10px] font-bold text-slate-500 mb-1 block">ملاحظات</label>
                <input value={form.notes} onChange={e => set("notes", e.target.value)} className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500" placeholder="..." />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-white/5 flex gap-3">
          {error && <p role="alert" className="absolute bottom-20 right-4 left-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300">{error}</p>}
          <button onClick={onClose} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300 transition-all">إلغاء</button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.name.trim()}
            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 disabled:text-slate-500 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            إنشاء العميل
          </button>
        </div>
      </div>
    </div>
  );
};

const Input: React.FC<{ label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }> = ({ label, value, onChange, type = "text", required }) => (
  <div>
    <label className="text-[10px] font-bold text-slate-500 mb-1 block">{label}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} required={required} className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500" />
  </div>
);
