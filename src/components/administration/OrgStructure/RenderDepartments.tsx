import { useState } from "react";
import { useApp } from "../../../../store";
import {
  Plus,
  Search,
  Layers,
  Monitor,
} from "lucide-react";
import RenderKDS from "./RenderKDS";
import RenderDeptItem from "./RenderDeptItem";

type Props = {
  onAdd: (type: "DEPT") => void;
  onEdit: (type: "DEPT", id: string, data: any) => void;
};

const RenderDepartments: React.FC<Props> = ({ onAdd , onEdit }) => {
  const {
    departments,
  } = useApp();
  const [isKdsMode, setIsKdsMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalType, setModalType] = useState<
    "BRANCH" | "DEPT" | "JOB_TITLE" | "JOB_TYPE" | "EMP" | null
  >(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});
  const handleAddNew = (type: typeof modalType) => {
    setEditingId(null);
    setModalType(type);
    setFormData({});
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/20 p-3 rounded-xl border border-white/5 backdrop-blur-sm">
        <div>
          <h3 className="text-xl font-black text-white tracking-tighter">
            شجرة الهيكل الإداري
          </h3>
          <p className="text-slate-500 font-bold text-xs mt-1 flex items-center gap-2">
            <span className="w-4 h-[1px] bg-blue-600"></span>
            تنظيم الأقسام والمطابخ بنظام المحطات الذكي المترابط
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={() => setIsKdsMode(!isKdsMode)}
            className={`px-4 py-2 rounded-xl font-black text-xs shadow-lg flex items-center gap-2 transition-all whitespace-nowrap ${
              isKdsMode
                ? "bg-red-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <Monitor size={16} />{" "}
            {isKdsMode ? "العودة للإدارة" : "وضع الشاشة (KDS)"}
          </button>
          <div className="relative flex-1 md:w-64">
            <Search
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
              size={16}
            />
            <input
              type="text"
              placeholder="بحث في الأقسام..."
              className="w-full bg-slate-800/50 border border-white/10 rounded-xl py-2.5 pr-11 pl-4 text-xs text-white focus:ring-2 focus:ring-blue-600 outline-none transition-all backdrop-blur-md"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => onAdd("DEPT")}
            className="bg-blue-600 text-white px-5 py-2 rounded-xl font-black text-xs shadow-lg flex items-center gap-2 active:scale-95 transition-all whitespace-nowrap"
          >
            <Plus size={18} /> إضافة قسم
          </button>
        </div>
      </div>
      <div className="space-y-3">
        {isKdsMode ? (
          <RenderKDS />
        ) : (
          <>
            {departments
              .filter((d) => !d.parentId)
              .map((dept) => <RenderDeptItem dept={dept} onEdit={onEdit}/>)}
            {departments.length === 0 && (
              <div className="bg-slate-900/40 p-10 rounded-2xl text-center border border-white/5 shadow-2xl backdrop-blur-md">
                <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-700 border border-white/5">
                  <Layers size={24} />
                </div>
                <p className="text-slate-500 font-black text-base">
                  لم يتم إنشاء أقسام تشغيلية بعد
                </p>
                <button
                  onClick={() => onAdd("DEPT")}
                  className="mt-4 text-blue-500 font-bold hover:underline text-xs"
                >
                  ابدأ بإضافة أول قسم الآن
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default RenderDepartments;