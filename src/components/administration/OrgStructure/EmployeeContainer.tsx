// src/components/administration/OrgStructure/EmployeeContainer.tsx
// نسخة محدّثة - تقبل formData و onChange كـ props

import React from "react";
import { useApp } from "../../../../store";
import {
  Building2,
  Briefcase,
  Users2,
  DollarSign,
  Layers,
  Mail,
  Smartphone,
  BadgeInfo,
  Shield,
  Zap,
} from "lucide-react";

interface Props {
  formData: any;
  onChange: (data: any) => void;
}

const EmployeeContainer: React.FC<Props> = ({ formData, onChange }) => {
  const { branches, departments, jobTitles } = useApp();
  const set = (key: string, value: any) => onChange({ ...formData, [key]: value });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2">
          <Users2 size={12} /> الاسم الرباعي
        </label>
        <input type="text"
          className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-red-600 text-white font-bold text-xs transition-all"
          placeholder="الاسم الكامل كما في الهوية"
          value={formData.name || ""} onChange={(e) => set("name", e.target.value)} />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2">
          <BadgeInfo size={12} /> الرقم الوظيفي (ID)
        </label>
        <input type="text"
          className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-red-600 text-white font-bold text-xs transition-all"
          placeholder="مثلاً: EMP-1001"
          value={formData.employeeId || ""} onChange={(e) => set("employeeId", e.target.value)} />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2">
          <Smartphone size={12} /> رقم الجوال
        </label>
        <input type="text"
          className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-red-600 text-white font-bold text-xs transition-all"
          placeholder="059..."
          value={formData.phone || ""} onChange={(e) => set("phone", e.target.value)} />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2">
          <Mail size={12} /> البريد الإلكتروني
        </label>
        <input type="email"
          className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-red-600 text-white font-bold text-xs transition-all"
          placeholder="example@resto.com"
          value={formData.email || ""} onChange={(e) => set("email", e.target.value)} />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2">
          <Briefcase size={12} /> المسمى الوظيفي
        </label>
        <select
          className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-red-600 text-white font-bold text-xs transition-all appearance-none"
          value={formData.jobTitleId || ""}
          onChange={(e) => set("jobTitleId", e.target.value)}>
          <option value="">اختر المسمى...</option>
          {jobTitles.map((j) => (
            <option key={j.id} value={j.id}>{j.name}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2">
          <Layers size={12} /> القسم
        </label>
        <select
          className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-red-600 text-white font-bold text-xs transition-all appearance-none"
          value={formData.departmentId || ""}
          onChange={(e) => set("departmentId", e.target.value)}>
          <option value="">اختر القسم...</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{(d as any).nameAr || d.name}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2">
          <Building2 size={12} /> الفرع
        </label>
        <select
          className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-red-600 text-white font-bold text-xs transition-all appearance-none"
          value={formData.branchId || ""}
          onChange={(e) => set("branchId", e.target.value)}>
          <option value="">اختر الفرع...</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2">
          <DollarSign size={12} /> الراتب الأساسي
        </label>
        <input type="number"
          className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-red-600 text-white font-bold text-xs transition-all"
          placeholder="0.00"
          value={formData.salary || ""}
          onChange={(e) => set("salary", parseFloat(e.target.value))} />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2">
          <Shield size={12} /> دور المستخدم في النظام
        </label>
        <select
          className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-red-600 text-white font-bold text-xs transition-all appearance-none"
          value={formData.role || "WAITER"}
          onChange={(e) => set("role", e.target.value)}>
          <option value="ADMIN">مدير نظام (Admin)</option>
          <option value="BRANCH_MANAGER">مدير فرع</option>
          <option value="CASHIER">كاشير</option>
          <option value="WAITER">ويتر / كابتن</option>
          <option value="KITCHEN">مطبخ</option>
          <option value="FINANCE">محاسب</option>
          <option value="HOSPITALITY">استقبال</option>
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2">
          <Zap size={12} /> رمز الدخول (PIN)
        </label>
        <input type="text" maxLength={4}
          className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-red-600 text-white font-bold text-center text-xl tracking-[0.5rem]"
          placeholder="****"
          value={formData.pin || ""}
          onChange={(e) => set("pin", e.target.value)} />
      </div>
    </div>
  );
};

export default EmployeeContainer;