// src/components/administration/OrgStructure/BranchContainer.tsx
// فورم إضافة/تعديل الفرع - متطابق مع StoreBranchRequest في الباك إند

import React from "react";
import {
  Building2,
  MapPin,
  Phone,
  Settings,
  Hash,
  Clock,
  Crown,
} from "lucide-react";

interface BranchFormData {
  name: string;
  address?: string;
  phone?: string;
  is_active: boolean;
  code: string;
  isMainBranch: boolean;
  openingTime: string;
  closingTime: string;
}

interface Props {
  formData: BranchFormData;
  onChange: (data: BranchFormData) => void;
  errors?: Partial<Record<keyof BranchFormData, string>>;
}

const BranchContainer: React.FC<Props> = ({ formData, onChange, errors }) => {
  const set = (key: keyof BranchFormData, value: any) =>
    onChange({ ...formData, [key]: value });

  const inputClass = (key: keyof BranchFormData) =>
    `w-full p-3 bg-slate-800 border rounded-xl outline-none focus:ring-2 focus:ring-red-600 text-white font-bold text-xs transition-all ${errors?.[key] ? "border-red-500/60" : "border-white/5"
    }`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* اسم الفرع */}
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Building2 size={12} /> اسم الفرع التشغيلي *
        </label>
        <input
          type="text"
          className={inputClass("name")}
          placeholder="مثلاً: فرع الميناء الرئيسي"
          value={formData.name}
          onChange={(e) => set("name", e.target.value)}
        />
        {errors?.name && <p className="text-[10px] text-red-400 font-bold">{errors.name}</p>}
      </div>

      {/* الكود */}
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Hash size={12} /> الكود المميز للفرع *
        </label>
        <input
          type="text"
          className={inputClass("code")}
          placeholder="مثلاً: BR-001"
          value={formData.code}
          onChange={(e) => set("code", e.target.value.toUpperCase())}
        />
        {errors?.code && <p className="text-[10px] text-red-400 font-bold">{errors.code}</p>}
      </div>

      {/* الموقع */}
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <MapPin size={12} /> الموقع الجغرافي
        </label>
        <input
          type="text"
          className={inputClass("address")}
          placeholder="المدينة، الشارع..."
          value={formData.address ?? ""}
          onChange={(e) => set("address", e.target.value)}
        />
      </div>

      {/* رقم الاتصال */}
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Phone size={12} /> رقم الاتصال الموحد
        </label>
        <input
          type="text"
          className={inputClass("phone")}
          placeholder="059..."
          value={formData.phone ?? ""}
          onChange={(e) => set("phone", e.target.value)}
        />
      </div>

      {/* وقت الفتح */}
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Clock size={12} /> وقت الفتح *
        </label>
        <input
          type="time"
          className={inputClass("openingTime")}
          value={formData.openingTime}
          onChange={(e) => set("openingTime", e.target.value)}
        />
        {errors?.openingTime && <p className="text-[10px] text-red-400 font-bold">{errors.openingTime}</p>}
      </div>

      {/* وقت الإغلاق */}
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Clock size={12} /> وقت الإغلاق *
        </label>
        <input
          type="time"
          className={inputClass("closingTime")}
          value={formData.closingTime}
          onChange={(e) => set("closingTime", e.target.value)}
        />
        {errors?.closingTime && <p className="text-[10px] text-red-400 font-bold">{errors.closingTime}</p>}
      </div>

      {/* حالة الفرع */}
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Settings size={12} /> حالة الفرع
        </label>
        <select
          className={`${inputClass("is_active")} appearance-none`}
          value={formData.is_active ? "1" : "0"}
          onChange={(e) => set("is_active", e.target.value === "1")}
        >
          <option value="1">نشط (Active)</option>
          <option value="0">غير نشط (Inactive)</option>
        </select>
      </div>

      {/* الفرع الرئيسي */}
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Crown size={12} /> نوع الفرع
        </label>
        <div className="flex items-center gap-4 p-3 bg-slate-800 border border-white/5 rounded-xl">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-5 h-5 rounded-lg accent-red-600"
              checked={formData.isMainBranch}
              onChange={(e) => set("isMainBranch", e.target.checked)}
            />
            <span className="text-xs font-bold text-white">فرع رئيسي (Main Branch)</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default BranchContainer;