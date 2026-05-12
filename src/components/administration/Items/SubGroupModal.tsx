import { useEffect, useMemo, useState } from "react";
import { Hash, RefreshCw, X } from "lucide-react";
import type { ReactNode } from "react";
import type { Department } from "../../../services/departmentService";

interface Props {
  departments: Department[];
  initialDepartment?: Department | null;
  onSave: (data: Omit<Department, "id">, id?: number) => Promise<void>;
  onClose: () => void;
}

interface FormState {
  parent_id: number;
  name: string;
  nameAr: string;
  code: string;
  color: string;
}

const COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#06b6d4", "#8b5cf6"];

const flattenDepartments = (
  departments: Department[],
  result: Department[] = [],
): Department[] => {
  departments.forEach((department) => {
    result.push(department);
    if ((department as Department & { children?: Department[] }).children?.length) {
      flattenDepartments((department as Department & { children: Department[] }).children, result);
    }
  });
  return result;
};

const getParentId = (department: Department) =>
  department.parent_id ?? department.parentId ?? null;

const onlyDigits = (value?: string) => (value ?? "").replace(/\D/g, "");

const generateNextSubGroupCode = (
  parent: Department | undefined,
  departments: Department[],
  currentDepartmentId?: number,
) => {
  const parentCode = onlyDigits(parent?.code);
  if (!parent || !parentCode) return "";

  const childCodeWidth = 1;
  const childCodes = departments
    .filter((department) => getParentId(department) === parent.id && department.id !== currentDepartmentId)
    .map((department) => onlyDigits(department.code))
    .filter((code) => code.startsWith(parentCode) && code.length === parentCode.length + childCodeWidth);

  const usedNumbers = childCodes
    .map((code) => Number(code.slice(parentCode.length)))
    .filter((number) => Number.isFinite(number));
  const next = Array.from({ length: 9 }, (_, index) => index + 1)
    .find((number) => !usedNumbers.includes(number));
  if (!next) return "";

  return `${parentCode}${String(next).padStart(childCodeWidth, "0")}`;
};

const SubGroupModal = ({ departments, initialDepartment, onSave, onClose }: Props) => {
  const flatDepartments = useMemo(() => flattenDepartments(departments), [departments]);
  const editing = !!initialDepartment;
  const parentOptions = useMemo(() => {
    const roots = flatDepartments.filter((department) => !getParentId(department));
    return roots.length ? roots : flatDepartments;
  }, [flatDepartments]);

  const initialParentId = initialDepartment ? getParentId(initialDepartment) ?? 0 : parentOptions[0]?.id ?? 0;
  const initialParent = parentOptions.find((department) => department.id === initialParentId);

  const [form, setForm] = useState<FormState>({
    parent_id: initialParentId,
    name: initialDepartment?.name ?? "",
    nameAr: initialDepartment?.nameAr ?? "",
    code: initialDepartment?.code ?? generateNextSubGroupCode(initialParent, flatDepartments),
    color: initialDepartment?.color ?? COLORS[0],
  });
  const [saving, setSaving] = useState(false);
  const [codeManual, setCodeManual] = useState(editing);

  const selectedParent = parentOptions.find((department) => department.id === form.parent_id);

  useEffect(() => {
    if (codeManual) return;
    setForm((current) => ({
      ...current,
      code: generateNextSubGroupCode(selectedParent, flatDepartments, initialDepartment?.id),
    }));
  }, [codeManual, flatDepartments, selectedParent, initialDepartment?.id]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const regenerateCode = () => {
    setCodeManual(false);
    set("code", generateNextSubGroupCode(selectedParent, flatDepartments, initialDepartment?.id));
  };

  const handleSubmit = async () => {
    if (!form.parent_id) return alert("اختر المجموعة الرئيسية");
    if (!form.name.trim()) return alert("اسم المجموعة بالإنجليزي مطلوب");
    if (!form.nameAr.trim()) return alert("اسم المجموعة بالعربي مطلوب");
    if (!form.code.trim()) return alert("الكود مطلوب");

    setSaving(true);
    try {
      await onSave({
        name: form.name.trim(),
        nameAr: form.nameAr.trim(),
        code: form.code.trim(),
        parent_id: form.parent_id,
        parentId: form.parent_id,
        color: form.color,
        type: initialDepartment?.type ?? "section",
        status: initialDepartment?.status ?? "ACTIVE",
      }, initialDepartment?.id);
      onClose();
    } catch (error: any) {
      alert(error.response?.data?.message ?? "فشل حفظ المجموعة الفرعية");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div>
            <h2 className="text-lg font-bold text-white">
              {editing ? "تعديل مجموعة فرعية" : "إضافة مجموعة فرعية"}
            </h2>
            <p className="text-[11px] text-slate-500 mt-1">
              سيتم توليد الكود تلقائياً حسب المجموعة الرئيسية المختارة
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4" dir="rtl">
          <Field label="المجموعة الرئيسية *">
            <select
              value={form.parent_id}
              onChange={(event) => {
                setCodeManual(false);
                set("parent_id", Number(event.target.value));
              }}
              className={inputCls}
            >
              {parentOptions.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.nameAr ?? department.name}
                  {department.code ? ` (${department.code})` : ""}
                </option>
              ))}
            </select>
          </Field>

          <Field label="كود المجموعة *">
            <div className="flex gap-2" dir="ltr">
              <div className="relative flex-1">
                <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={form.code}
                  onChange={(event) => {
                    setCodeManual(true);
                    set("code", event.target.value.replace(/\D/g, ""));
                  }}
                  className={`${inputCls} pl-8 font-mono tracking-widest`}
                  placeholder="12"
                />
              </div>
              <button
                type="button"
                onClick={regenerateCode}
                title="إعادة توليد الكود"
                className="p-2.5 bg-slate-800 border border-white/10 rounded-xl text-slate-400 hover:text-white hover:border-red-500/40 transition-colors"
              >
                <RefreshCw size={15} />
              </button>
            </div>
            {selectedParent?.code && (
              <p className="text-[10px] text-slate-600 mt-1">
                مثال: إذا كانت المجموعة الرئيسية {selectedParent.code} فالمجموعة التالية تكون {form.code || "-"}
              </p>
            )}
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="الاسم بالإنجليزي *">
              <input
                value={form.name}
                onChange={(event) => set("name", event.target.value)}
                className={inputCls}
                placeholder="Inventory Items"
                dir="ltr"
              />
            </Field>
            <Field label="الاسم بالعربي *">
              <input
                value={form.nameAr}
                onChange={(event) => set("nameAr", event.target.value)}
                className={inputCls}
                placeholder="أصناف مخزنية"
              />
            </Field>
          </div>

          <Field label="اللون">
            <div className="flex flex-wrap gap-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => set("color", color)}
                  className={`w-9 h-9 rounded-xl border-2 transition-colors ${
                    form.color === color ? "border-white" : "border-white/10"
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`اختيار اللون ${color}`}
                />
              ))}
            </div>
          </Field>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors">
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50"
          >
            {saving ? "جاري الحفظ..." : editing ? "حفظ التعديلات" : "إضافة المجموعة"}
          </button>
        </div>
      </div>
    </div>
  );
};

const inputCls = "w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors";

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div>
    <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">{label}</label>
    {children}
  </div>
);

export default SubGroupModal;
