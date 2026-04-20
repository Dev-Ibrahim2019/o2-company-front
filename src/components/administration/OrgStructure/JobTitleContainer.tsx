import React, { useState } from "react";
import { useApp } from "../../../../store";
import { Briefcase, Layers, FileText } from "lucide-react";

const JobTitleContainer: React.FC = () => {
  const { departments } = useApp();
  const [formData, setFormData] = useState<any>({});
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2">
          <Briefcase size={12} /> المسمى الوظيفي
        </label>
        <input
          type="text"
          className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-red-600 text-white font-bold text-xs transition-all"
          placeholder="مثلاً: مدير صالة، شيف دي بارتي..."
          value={formData.name || ""}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2">
          <Layers size={12} /> الأقسام المرتبطة بهذا المسمى
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 bg-slate-800 border border-white/5 rounded-xl">
          {departments.map((d) => (
            <label
              key={d.id}
              className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-white/5 rounded-lg transition-all"
            >
              <input
                type="checkbox"
                className="w-4 h-4 rounded-md accent-red-600"
                checked={(formData.departmentIds || []).includes(d.id)}
                onChange={(e) => {
                  const current = formData.departmentIds || [];
                  if (e.target.checked)
                    setFormData({
                      ...formData,
                      departmentIds: [...current, d.id],
                    });
                  else
                    setFormData({
                      ...formData,
                      departmentIds: current.filter(
                        (id: string) => id !== d.id,
                      ),
                    });
                }}
              />
              <span className="text-[10px] font-bold text-slate-300">
                {d.nameAr || d.name}
              </span>
            </label>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2">
          <FileText size={12} /> الوصف الوظيفي المختصر
        </label>
        <textarea
          className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-red-600 text-white font-bold text-xs transition-all h-24 resize-none"
          placeholder="اكتب مهام هذا المسمى باختصار..."
          value={formData.description || ""}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
        ></textarea>
      </div>
    </div>
  );
};

export default JobTitleContainer;
