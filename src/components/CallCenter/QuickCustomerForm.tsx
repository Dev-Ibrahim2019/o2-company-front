import React, { useEffect, useId, useState } from "react";
import { X, Loader2, MapPin, Heart } from "lucide-react";
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
    wedding_date: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [childrenBirthdays, setChildrenBirthdays] = useState<string[]>([]);
  const [error, setError] = useState("");

  const set = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));
  const titleId = useId();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape" && !saving) onClose(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, saving]);

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
      const occasions = [
        ...(form.wedding_date ? [{ occasion_type: "wedding_anniversary", title: "ذكرى الزواج", date: form.wedding_date }] : []),
        ...childrenBirthdays.filter(Boolean).map((date, index) => ({
          occasion_type: "child_birthday", title: `ميلاد الابن/الابنة ${index + 1}`, date,
        })),
      ];
      if (occasions.length) {
        const results = await Promise.allSettled(occasions.map(occasion =>
          callCenterService.createCustomerOccasion(res.data.id, { ...occasion, repeats_annually: true }),
        ));
        if (results.some(result => result.status === "rejected")) {
          toast.info("تم إنشاء العميل", "تعذر حفظ بعض المناسبات ويمكن إضافتها لاحقاً من ملف العميل");
        }
      }
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
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4" dir="rtl" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { if (!saving) onClose(); }} />
      <div className="relative bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[94vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-white/5 sticky top-0 bg-slate-900 z-10">
          <div><h2 id={titleId} className="text-base font-black text-white">إضافة عميل سريع</h2><p className="mt-0.5 text-[11px] text-slate-400">بيانات التوصيل أولاً، ثم معلومات العناية التسويقية الاختيارية</p></div>
          <button onClick={onClose} disabled={saving} aria-label="إغلاق" className="p-2 hover:bg-white/5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-40"><X size={18} className="text-slate-400" /></button>
        </div>

        <div className="p-4 space-y-4">
          <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3" aria-labelledby="delivery-section">
            <h3 id="delivery-section" className="mb-3 flex items-center gap-2 text-sm font-black text-emerald-300"><MapPin size={16} /> معلومات التوصيل الأساسية</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="الاسم *" value={form.name} onChange={v => set("name", v)} required />
            <Input label="رقم الجوال الأساسي *" value={form.mobile} onChange={v => set("mobile", v)} type="tel" />
            <Input label="هاتف بديل" value={form.phone} onChange={v => set("phone", v)} type="tel" />
            <Input label="المدينة" value={form.city} onChange={v => set("city", v)} />
            <Input label="المنطقة" value={form.area} onChange={v => set("area", v)} />
            <Input label="تفاصيل العنوان" value={form.address} onChange={v => set("address", v)} />
          </div>
            <details className="mt-3 text-xs text-slate-300"><summary className="cursor-pointer font-bold text-slate-400">تفاصيل إضافية للعنوان</summary><div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Input label="الحي" value={form.district} onChange={v => set("district", v)} />
              <Input label="الشارع" value={form.street} onChange={v => set("street", v)} />
              <Input label="رقم المبنى" value={form.building_no} onChange={v => set("building_no", v)} />
              <Input label="الطابق" value={form.floor} onChange={v => set("floor", v)} />
              <Input label="الشقة" value={form.apartment} onChange={v => set("apartment", v)} />
            </div></details>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3"><Input label="أقرب معلم" value={form.landmark} onChange={v => set("landmark", v)} /><Input label="ملاحظات للسائق" value={form.delivery_notes} onChange={v => set("delivery_notes", v)} /></div>
          </section>

          <section className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3" aria-labelledby="marketing-section">
            <h3 id="marketing-section" className="mb-1 flex items-center gap-2 text-sm font-black text-amber-300"><Heart size={16} /> التسويق والعناية</h3>
            <p className="mb-3 text-[11px] text-slate-400">اختياري — يساعد الفريق على تقديم عروض واهتمام شخصي مناسب.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="البريد الإلكتروني" value={form.email} onChange={v => set("email", v)} type="email" />
              <Input label="تاريخ الميلاد" value={form.birth_date} onChange={v => set("birth_date", v)} type="date" />
              <Input label="تاريخ الزواج" value={form.wedding_date} onChange={v => set("wedding_date", v)} type="date" />
            </div>
            <div className="mt-3 space-y-2">
              <p className="text-xs font-bold text-slate-300">تواريخ ميلاد الأبناء</p>
              {childrenBirthdays.map((date, index) => <div key={index} className="flex gap-2"><input aria-label={`تاريخ ميلاد الابن أو الابنة ${index + 1}`} type="date" value={date} onChange={e => setChildrenBirthdays(values => values.map((value, i) => i === index ? e.target.value : value))} className="flex-1 rounded-xl border border-white/10 bg-slate-800 px-3 py-2.5 text-xs text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500" /><button type="button" aria-label={`حذف تاريخ الميلاد ${index + 1}`} onClick={() => setChildrenBirthdays(values => values.filter((_, i) => i !== index))} className="rounded-lg px-3 text-red-300 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500">حذف</button></div>)}
              <button type="button" onClick={() => setChildrenBirthdays(values => [...values, ""])} className="text-xs font-bold text-amber-300 hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">+ إضافة تاريخ ميلاد ابن/ابنة</button>
            </div>
            <div className="mt-3"><Input label="التفضيلات وملاحظات العناية" value={form.notes} onChange={v => set("notes", v)} placeholder="الأصناف المفضلة، وقت التواصل، حساسية..." /></div>
          </section>
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

const Input: React.FC<{ label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string }> = ({ label, value, onChange, type = "text", required, placeholder }) => (
  <div>
    <label className="text-xs font-bold text-slate-400 mb-1 block">{label}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} required={required} placeholder={placeholder} className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500" />
  </div>
);
