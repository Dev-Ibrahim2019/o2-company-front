import { useState } from "react";
import { useEmployees } from "../../../hooks/useEmployees";
import { useBranch } from "../../../hooks/useBranch";
import { useDepartments } from "../../../hooks/useDepartments";
import { useJobTitles } from "../../../hooks/useJobTitles";
import type { EmployeeFromApi } from "../../../services/employeeService";
import {
  Building2,
  Network,
  Users2,
  Plus,
  Search,
  Edit3,
  Trash2,
  Mail,
  Smartphone,
  Shield,
  Clock,
  CheckCircle2,
  Hash,
  Loader2,
  AlertCircle,
  X,
  Save,
  Briefcase,
  Layers,
  DollarSign,
  BadgeInfo,
  Zap,
  Calendar,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface EmpFormData {
  name: string;
  employeeId: string;
  phone: string;
  email: string;
  jobTitleId: string;
  departmentId: string;
  branchId: string;
  salary: string;
  role: string;
  status: string;
  hireDate: string;
  pin: string;
}

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = (): EmpFormData => ({
  name: "",
  employeeId: "",
  phone: "",
  email: "",
  jobTitleId: "",
  departmentId: "",
  branchId: "",
  salary: "",
  role: "WAITER",
  status: "ACTIVE",
  hireDate: today(),
  pin: "",
});

const formFromEmployee = (e: EmployeeFromApi): EmpFormData => ({
  name: e.name || "",
  employeeId: e.employeeId || "",
  phone: e.phone || "",
  email: e.email || "",
  jobTitleId: (e as any).job_title_id ? String((e as any).job_title_id) : "",
  departmentId: e.department_id ? String(e.department_id) : "",
  branchId: e.branch_id ? String(e.branch_id) : "",
  salary: e.salary != null ? String(e.salary) : "",
  role: e.role || "WAITER",
  status: e.status || "ACTIVE",
  hireDate: e.hireDate ? e.hireDate.slice(0, 10) : today(),
  pin: "",
});

const EmployeeModal: React.FC<{
  title: string;
  initial: EmpFormData;
  branches: { id: number; name: string }[];
  departments: { id: number; name: string; nameAr?: string }[];
  jobTitles: { id: number; name: string }[];
  onSave: (data: EmpFormData) => Promise<void>;
  onClose: () => void;
}> = ({ title, initial, branches, departments, jobTitles, onSave, onClose }) => {
  const [form, setForm] = useState<EmpFormData>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof EmpFormData, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.branchId) {
      setError("الاسم، الجوال، والفرع حقول مطلوبة");
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
        className="relative bg-slate-900 w-full max-w-2xl rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh] border border-white/10"
      >
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
          <div>
            <h3 className="text-base font-black text-white tracking-tight">{title}</h3>
            <p className="text-[10px] text-slate-500 font-bold mt-0.5 uppercase tracking-[0.1em]">
              Employee Record
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
                <Users2 size={12} /> الاسم الرباعي *
              </label>
              <input type="text"
                className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-600 text-white font-bold text-xs transition-all"
                placeholder="الاسم الكامل كما في الهوية"
                value={form.name} onChange={(e) => set("name", e.target.value)} autoFocus />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2">
                <BadgeInfo size={12} /> الرقم الوظيفي (ID)
              </label>
              <input type="text"
                className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-600 text-white font-bold text-xs transition-all"
                placeholder="مثلاً: EMP-1001"
                value={form.employeeId} onChange={(e) => set("employeeId", e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2">
                <Smartphone size={12} /> رقم الجوال *
              </label>
              <input type="text"
                className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-600 text-white font-bold text-xs transition-all"
                placeholder="059..."
                value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2">
                <Mail size={12} /> البريد الإلكتروني
              </label>
              <input type="email"
                className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-600 text-white font-bold text-xs transition-all"
                placeholder="example@resto.com"
                value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2">
                <Briefcase size={12} /> المسمى الوظيفي
              </label>
              <select
                className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-600 text-white font-bold text-xs transition-all appearance-none"
                value={form.jobTitleId}
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
                className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-600 text-white font-bold text-xs transition-all appearance-none"
                value={form.departmentId}
                onChange={(e) => set("departmentId", e.target.value)}>
                <option value="">اختر القسم...</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.nameAr || d.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2">
                <Building2 size={12} /> الفرع *
              </label>
              <select
                className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-600 text-white font-bold text-xs transition-all appearance-none"
                value={form.branchId}
                onChange={(e) => set("branchId", e.target.value)}>
                <option value="">اختر الفرع...</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={12} /> تاريخ التعيين *
              </label>
              <input type="date"
                className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-600 text-white font-bold text-xs transition-all"
                value={form.hireDate} onChange={(e) => set("hireDate", e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2">
                <DollarSign size={12} /> الراتب الأساسي
              </label>
              <input type="number"
                className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-600 text-white font-bold text-xs transition-all"
                placeholder="0.00"
                value={form.salary}
                onChange={(e) => set("salary", e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2">
                <Shield size={12} /> دور المستخدم في النظام *
              </label>
              <select
                className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-600 text-white font-bold text-xs transition-all appearance-none"
                value={form.role}
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
                <CheckCircle2 size={12} /> حالة الموظف *
              </label>
              <select
                className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-600 text-white font-bold text-xs transition-all appearance-none"
                value={form.status}
                onChange={(e) => set("status", e.target.value)}>
                <option value="ACTIVE">نشط</option>
                <option value="ON_LEAVE">في إجازة</option>
                <option value="SUSPENDED">موقوف</option>
                <option value="RESIGNED">مستقيل</option>
                <option value="TERMINATED">منتهي الخدمة</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2">
                <Zap size={12} /> رمز الدخول (PIN)
              </label>
              <input type="text" maxLength={4}
                className="w-full p-3 bg-slate-800 border border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-600 text-white font-bold text-center text-xl tracking-[0.5rem]"
                placeholder="****"
                value={form.pin}
                onChange={(e) => set("pin", e.target.value)} />
            </div>
          </div>
        </div>

        <div className="p-3 bg-slate-900/80 backdrop-blur-xl border-t border-white/5 flex items-center gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 bg-slate-800/50 text-slate-400 rounded-xl font-black text-xs hover:bg-slate-700 hover:text-white transition-all border border-white/5 flex items-center justify-center gap-2">
            <X size={14} /> إلغاء
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-[2] py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl font-black text-xs shadow-lg hover:shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "جاري الحفظ..." : "حفظ بيانات الموظف"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const RenderEmployees: React.FC = () => {
  const { employees, loading, error, addEmployee, updateEmployee, deleteEmployee } =
    useEmployees();
  const { branches } = useBranch();
  const { departments } = useDepartments();
  const { jobTitles } = useJobTitles();
  const [searchQuery, setSearchQuery] = useState("");
  const [modal, setModal] = useState<{ mode: "add" | "edit"; emp?: EmployeeFromApi } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (emp: EmployeeFromApi) => {
    if (!confirm(`هل أنت متأكد من حذف الموظف "${emp.name}"؟`)) return;
    setDeletingId(emp.id);
    try {
      await deleteEmployee(emp.id);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredEmployees = employees.filter(
    (e) =>
      !searchQuery ||
      e.name?.includes(searchQuery) ||
      e.employeeId?.includes(searchQuery) ||
      e.phone?.includes(searchQuery),
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/20 p-3 rounded-xl border border-white/5 backdrop-blur-sm">
        <div>
          <h3 className="text-lg font-black text-white tracking-tighter">
            سجل الموظفين
          </h3>
          <p className="text-slate-500 font-bold mt-1 flex items-center gap-2 text-[10px]">
            <span className="w-4 h-[1px] bg-emerald-600"></span>
            إدارة بيانات الكادر الوظيفي، الصلاحيات، والوصول الآمن
          </p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
              size={16}
            />
            <input
              type="text"
              placeholder="بحث بالاسم، المعرف، أو الهاتف..."
              className="w-full bg-slate-800/50 border border-white/10 rounded-xl py-2.5 pr-11 pl-4 text-xs text-white focus:ring-2 focus:ring-emerald-600 outline-none transition-all backdrop-blur-md"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => setModal({ mode: "add" })}
            className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-black text-xs shadow-lg flex items-center gap-2 active:scale-95 transition-all whitespace-nowrap"
          >
            <Plus size={18} /> إضافة موظف
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-emerald-500" />
          <span className="mr-3 text-sm font-bold text-slate-400">جاري تحميل الموظفين...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-600/10 border border-red-600/20 rounded-xl">
          <AlertCircle size={18} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-400 font-bold">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map((emp, idx) => {
            const job = (emp as any).job_title;
            const dept = emp.department;
            const branch = emp.branch;

            return (
              <motion.div
                key={emp.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ y: -4 }}
                className="bg-slate-900/60 backdrop-blur-xl p-1.5 rounded-xl border border-white/5 shadow-xl group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-600/5 rounded-full blur-xl -mr-12 -mt-12 group-hover:bg-emerald-600/10 transition-colors duration-700"></div>

                <div className="flex items-start justify-between mb-2 relative z-10">
                  <div className="flex items-center gap-1.5">
                    <div className="relative">
                      <div className="w-7 h-7 bg-slate-800 rounded-lg overflow-hidden border border-white/5 shadow-lg flex items-center justify-center text-slate-600 group-hover:border-emerald-600/50 transition-all duration-500">
                        {emp.image ? (
                          <img
                            src={emp.image}
                            alt={emp.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Users2 size={12} />
                        )}
                      </div>
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-md flex items-center justify-center border border-slate-900 shadow-md ${emp.status === "ACTIVE" ? "bg-emerald-500 text-white" : "bg-slate-700 text-slate-400"}`}
                      >
                        {emp.status === "ACTIVE" ? (
                          <CheckCircle2 size={5} />
                        ) : (
                          <Clock size={5} />
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white leading-tight tracking-tight">
                        {emp.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="bg-emerald-600/10 text-emerald-500 text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider border border-emerald-600/20">
                          {job?.name || "Unassigned Role"}
                        </span>
                      </div>
                      <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mt-1 flex items-center gap-1">
                        <Hash size={10} className="text-slate-700" /> ID:{" "}
                        {emp.employeeId}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-500">
                    <button
                      onClick={() => setModal({ mode: "edit", emp })}
                      className="p-1 bg-slate-800/80 text-slate-400 hover:text-white rounded-lg shadow-md border border-white/5 backdrop-blur-md hover:border-emerald-600/30"
                    >
                      <Edit3 size={10} />
                    </button>
                    <button
                      onClick={() => handleDelete(emp)}
                      disabled={deletingId === emp.id}
                      className="p-1 bg-slate-800/80 text-slate-400 hover:text-red-500 rounded-lg shadow-md border border-white/5 backdrop-blur-md hover:border-red-500/30 disabled:opacity-50"
                    >
                      {deletingId === emp.id ? (
                        <Loader2 size={10} className="animate-spin" />
                      ) : (
                        <Trash2 size={10} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3 relative z-10">
                  <div className="bg-slate-950/50 p-1.5 rounded-xl border border-white/5 group-hover:border-emerald-600/20 transition-colors">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5 flex items-center gap-1">
                      <Network size={10} className="text-blue-500" /> Dept
                    </p>
                    <p className="text-xs font-black text-white truncate">
                      {dept?.name || "General"}
                    </p>
                  </div>
                  <div className="bg-slate-950/50 p-1.5 rounded-xl border border-white/5 group-hover:border-emerald-600/20 transition-colors">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5 flex items-center gap-1">
                      <Building2 size={10} className="text-red-500" /> Branch
                    </p>
                    <p className="text-xs font-black text-white truncate">
                      {branch?.name || "HQ"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 group-hover:text-emerald-500 transition-colors">
                        <Smartphone size={10} />
                      </div>
                      <span className="text-[10px] font-black text-slate-400">
                        {emp.phone}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 group-hover:text-blue-500 transition-colors">
                        <Mail size={10} />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 truncate max-w-[70px]">
                        {emp.email || "N/A"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-800/50 px-2 py-1 rounded-lg border border-white/5">
                    <Shield size={10} className="text-slate-600" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      {emp.role}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
          {filteredEmployees.length === 0 && (
            <div className="col-span-full bg-slate-900/40 p-10 rounded-2xl text-center border border-white/5 shadow-2xl backdrop-blur-md">
              <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-700 border border-white/5">
                <Users2 size={24} />
              </div>
              <p className="text-slate-500 font-black text-base">
                لا يوجد موظفون مطابقون
              </p>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {modal && (
          <EmployeeModal
            title={modal.mode === "add" ? "تسجيل موظف جديد" : "تحديث بيانات الموظف"}
            initial={modal.emp ? formFromEmployee(modal.emp) : emptyForm()}
            branches={branches}
            departments={departments as any}
            jobTitles={jobTitles}
            onClose={() => setModal(null)}
            onSave={async (form) => {
              const payload: Record<string, unknown> = {
                name: form.name,
                employeeId: form.employeeId || undefined,
                phone: form.phone,
                email: form.email || undefined,
                branch_id: Number(form.branchId),
                department_id: form.departmentId ? Number(form.departmentId) : null,
                job_title_id: form.jobTitleId ? Number(form.jobTitleId) : null,
                salary: form.salary ? Number(form.salary) : null,
                role: form.role,
                status: form.status,
                hireDate: form.hireDate,
                pin: form.pin || undefined,
              };
              if (modal.mode === "add") {
                await addEmployee(payload as any);
              } else if (modal.emp) {
                await updateEmployee(modal.emp.id, payload as any);
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default RenderEmployees;
