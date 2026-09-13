import { useState, useEffect } from "react";
import { useDepartments } from "../../../hooks/useDepartments";
import { useBranch } from "../../../hooks/useBranch";
import { employeeService, type EmployeeFromApi } from "../../../services/employeeService";
import type { Department } from "../../../services/departmentService";
import RenderKDS from "./RenderKDS";
import RenderDeptItem from "./RenderDeptItem";
import {
  Plus,
  Search,
  Layers,
  Monitor,
  Loader2,
  AlertCircle,
  X,
  Save,
  Building2,
  Network,
  Hash,
  Monitor as KdsIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const parentOf = (d: Department): number | null =>
  (d.parentId ?? d.parent_id ?? null) as number | null;

interface DeptFormData {
  name: string;
  shortName: string;
  branchId: string;
  parentId: string;
  hasKds: boolean;
  type: "section" | "department" | "unit";
}

const emptyForm = (): DeptFormData => ({
  name: "",
  shortName: "",
  branchId: "",
  parentId: "",
  hasKds: false,
  type: "department",
});

const formFromDept = (d: Department): DeptFormData => ({
  name: d.nameAr || d.name,
  shortName: d.shortName || "",
  branchId: (d as any).branch_ids?.[0] != null ? String((d as any).branch_ids[0]) : "",
  parentId: parentOf(d) != null ? String(parentOf(d)) : "",
  hasKds: d.hasKds || false,
  type: (d.type as DeptFormData["type"]) || "department",
});

const DeptModal: React.FC<{
  title: string;
  initial: DeptFormData;
  departments: Department[];
  branches: { id: number; name: string }[];
  currentId?: number;
  onSave: (data: DeptFormData) => Promise<void>;
  onClose: () => void;
}> = ({ title, initial, departments, branches, currentId, onSave, onClose }) => {
  const [form, setForm] = useState<DeptFormData>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof DeptFormData, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError("اسم القسم مطلوب");
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await onSave(form);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative bg-slate-900 w-full max-w-lg rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh] border border-white/10"
      >
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
          <div>
            <h3 className="text-base font-black text-white tracking-tight">{title}</h3>
            <p className="text-[10px] text-slate-500 font-bold mt-0.5 uppercase tracking-[0.1em]">
              Department Configuration
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-slate-950/30 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-600/10 border border-red-600/20 rounded-xl">
              <AlertCircle size={14} className="text-red-500 shrink-0" />
              <p className="text-xs text-red-400 font-bold">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2">
                <Layers size={12} /> اسم القسم *
              </label>
              <input
                type="text"
                className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-red-600 text-white font-bold text-xs transition-all"
                placeholder="مثلاً: المطبخ الإيطالي"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                autoFocus
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
                value={form.shortName}
                onChange={(e) => set("shortName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2">
                <Building2 size={12} /> الفرع التابع له
              </label>
              <select
                className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-red-600 text-white font-bold text-xs transition-all appearance-none"
                value={form.branchId}
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
                <Network size={12} /> القسم الأب
              </label>
              <select
                className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-red-600 text-white font-bold text-xs transition-all appearance-none"
                value={form.parentId}
                onChange={(e) => set("parentId", e.target.value)}
              >
                <option value="">قسم رئيسي (بدون أب)</option>
                {departments
                  .filter((d) => d.id !== currentId)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nameAr || d.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2">
                <Layers size={12} /> تصنيف القسم
              </label>
              <select
                className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-red-600 text-white font-bold text-xs transition-all appearance-none"
                value={form.type}
                onChange={(e) => set("type", e.target.value as DeptFormData["type"])}
              >
                <option value="department">قسم</option>
                <option value="section">شعبة</option>
                <option value="unit">وحدة</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2">
                <KdsIcon size={12} /> نظام شاشات المطبخ (KDS)
              </label>
              <div className="flex items-center gap-4 p-3 bg-slate-800 border border-white/5 rounded-xl h-[42px]">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded-lg accent-red-600"
                    checked={form.hasKds}
                    onChange={(e) => set("hasKds", e.target.checked)}
                  />
                  <span className="text-xs font-bold text-white">تفعيل نظام KDS</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="p-3 bg-slate-900/80 backdrop-blur-xl border-t border-white/5 flex items-center gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 bg-slate-800/50 text-slate-400 rounded-xl font-black text-xs hover:bg-slate-700 hover:text-white transition-all border border-white/5 flex items-center justify-center gap-2">
            <X size={14} /> إلغاء
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-[2] py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-black text-xs shadow-lg hover:shadow-red-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "جاري الحفظ..." : "حفظ بيانات القسم"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const RenderDepartments: React.FC = () => {
  const { departments, loading, error, addDepartment, updateDepartment, deleteDepartment } =
    useDepartments();
  const { branches } = useBranch();
  const [employees, setEmployees] = useState<EmployeeFromApi[]>([]);
  const [isKdsMode, setIsKdsMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [modal, setModal] = useState<{ mode: "add" | "edit"; dept?: Department } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    employeeService
      .getAll({ per_page: 1000 } as any)
      .then(setEmployees)
      .catch(() => setEmployees([]));
  }, []);

  const employeeCounts = employees.reduce<Record<number, number>>((acc, e) => {
    if (e.department_id) acc[e.department_id] = (acc[e.department_id] || 0) + 1;
    return acc;
  }, {});

  const deptMatchesQuery = (dept: Department): boolean => {
    if (!searchQuery.trim()) return true;
    const name = (dept.nameAr || dept.name || "").toLowerCase();
    if (name.includes(searchQuery.toLowerCase())) return true;
    return departments
      .filter((d) => parentOf(d) === dept.id)
      .some(deptMatchesQuery);
  };

  const rootDepartments = departments.filter((d) => !parentOf(d) && deptMatchesQuery(d));

  const handleDelete = async (dept: Department) => {
    const hasEmployees = (employeeCounts[dept.id] || 0) > 0;
    const hasChildren = departments.some((d) => parentOf(d) === dept.id);
    if (hasEmployees || hasChildren) {
      alert("لا يمكن حذف قسم يحتوي على موارد بشرية أو تبعيات هيكلية!");
      return;
    }
    if (!confirm(`هل أنت متأكد من حذف قسم "${dept.nameAr || dept.name}"؟`)) return;
    setDeletingId(dept.id);
    try {
      await deleteDepartment(dept.id);
    } finally {
      setDeletingId(null);
    }
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
            onClick={() => setModal({ mode: "add" })}
            className="bg-blue-600 text-white px-5 py-2 rounded-xl font-black text-xs shadow-lg flex items-center gap-2 active:scale-95 transition-all whitespace-nowrap"
          >
            <Plus size={18} /> إضافة قسم
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-blue-500" />
          <span className="mr-3 text-sm font-bold text-slate-400">جاري تحميل الأقسام...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-600/10 border border-red-600/20 rounded-xl">
          <AlertCircle size={18} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-400 font-bold">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-3">
          {isKdsMode ? (
            <RenderKDS />
          ) : (
            <>
              {rootDepartments.map((dept) => (
                <RenderDeptItem
                  key={dept.id}
                  dept={dept}
                  departments={departments}
                  employeeCounts={employeeCounts}
                  deletingId={deletingId}
                  onEdit={(d) => setModal({ mode: "edit", dept: d })}
                  onDelete={handleDelete}
                />
              ))}
              {rootDepartments.length === 0 && (
                <div className="bg-slate-900/40 p-10 rounded-2xl text-center border border-white/5 shadow-2xl backdrop-blur-md">
                  <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-700 border border-white/5">
                    <Layers size={24} />
                  </div>
                  <p className="text-slate-500 font-black text-base">
                    لم يتم إنشاء أقسام تشغيلية بعد
                  </p>
                  <button
                    onClick={() => setModal({ mode: "add" })}
                    className="mt-4 text-blue-500 font-bold hover:underline text-xs"
                  >
                    ابدأ بإضافة أول قسم الآن
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <AnimatePresence>
        {modal && (
          <DeptModal
            title={modal.mode === "add" ? "إضافة قسم تشغيلي جديد" : "تعديل بيانات القسم"}
            initial={modal.dept ? formFromDept(modal.dept) : emptyForm()}
            departments={departments}
            branches={branches}
            currentId={modal.dept?.id}
            onClose={() => setModal(null)}
            onSave={async (form) => {
              const payload = {
                name: form.name,
                nameAr: form.name,
                shortName: form.shortName || undefined,
                type: form.type,
                hasKds: form.hasKds,
                parent_id: form.parentId ? Number(form.parentId) : null,
                branch_ids: form.branchId ? [Number(form.branchId)] : [],
              };
              if (modal.mode === "add") {
                await addDepartment(payload as any);
              } else if (modal.dept) {
                await updateDepartment(modal.dept.id, payload as any);
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default RenderDepartments;
