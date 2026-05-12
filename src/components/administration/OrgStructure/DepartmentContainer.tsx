// src/components/administration/OrgStructure/DepartmentContainer.tsx
// نسخة محدّثة - تقبل formData و onChange كـ props

import { useApp } from "../../../../store";
import {
  Building2,
  Network,
  Layers,
  LayoutGrid,
  Monitor,
  Hash,
} from "lucide-react";

interface Props {
  formData: any;
  onChange: (data: any) => void;
}

const DepartmentContainer: React.FC<Props> = ({ formData, onChange }) => {
  const set = (key: string, value: any) => onChange({ ...formData, [key]: value });
  const { branches, departments } = useApp();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2">
          <Layers size={12} /> اسم القسم (عربي)
        </label>
        <input
          type="text"
          className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-red-600 text-white font-bold text-xs transition-all"
          placeholder="مثلاً: المطبخ الإيطالي"
          value={formData.nameAr || ""}
          onChange={(e) => {
            onChange({ ...formData, nameAr: e.target.value, name: e.target.value });
          }}
        />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2">
          <Hash size={12} /> الرمز المختصر
        </label>
        <input
          type="text"
          className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-red-600 text-white font-bold text-xs transition-all"
          placeholder="مثلاً: ITA"
          value={formData.shortName || ""}
          onChange={(e) => set("shortName", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2">
          <Building2 size={12} /> الفرع التابع له
        </label>
        <select
          className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-red-600 text-white font-bold text-xs transition-all appearance-none"
          value={formData.branchId || ""}
          onChange={(e) => set("branchId", e.target.value)}
        >
          <option value="">اختر الفرع...</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2">
          <Network size={12} /> القسم الأب (للتسلسل الهرمي)
        </label>
        <select
          className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-red-600 text-white font-bold text-xs transition-all appearance-none"
          value={formData.parentId || ""}
          onChange={(e) => set("parentId", e.target.value)}
        >
          <option value="">قسم رئيسي (بدون أب)</option>
          {departments
            .filter((d) => d.id !== formData.id)
            .map((d) => (
              <option key={d.id} value={d.id}>
                {(d as any).nameAr || d.name}
              </option>
            ))}
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2">
          <Monitor size={12} /> نظام شاشات المطبخ (KDS)
        </label>
        <div className="flex items-center gap-4 p-3 bg-slate-800 border border-white/5 rounded-xl">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-5 h-5 rounded-lg accent-red-600"
              checked={formData.hasKds || false}
              onChange={(e) => set("hasKds", e.target.checked)}
            />
            <span className="text-xs font-bold text-white">تفعيل نظام KDS</span>
          </label>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2">
          <LayoutGrid size={12} /> تصنيف القسم
        </label>
        <select
          className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-red-600 text-white font-bold text-xs transition-all appearance-none"
          value={formData.type || "MAIN_KITCHEN"}
          onChange={(e) => set("type", e.target.value)}
        >
          <option value="MAIN_KITCHEN">مطبخ رئيسي</option>
          <option value="FAST_FOOD">وجبات سريعة</option>
          <option value="BAR">بار مشروبات</option>
          <option value="COLD_PREP">تحضير بارد</option>
          <option value="BAKERY">مخبوزات</option>
          <option value="DESSERT">حلويات</option>
          <option value="sale">قسم مبيعات</option>
          <option value="production">قسم إنتاج</option>
          <option value="storage">قسم تخزين</option>
        </select>
      </div>
    </div>
  );
};

export default DepartmentContainer;