import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  Building2,
  CheckCircle,
  Hash,
  Loader2,
  Package,
  Shield,
  Target,
  Users,
  XCircle,
} from "lucide-react";
import { discountService, type EntityRecord } from "../../../services/discountService";
import { EntityAsyncAutocomplete } from "./EntityAsyncAutocomplete";

type TargetType = "customer" | "employee" | "supplier" | "department" | "item" | "branch" | "all_customers" | "all_employees" | "all_suppliers" | "all";

const TARGET_TYPES: Array<{ value: TargetType; label: string }> = [
  { value: "employee", label: "موظف" },
  { value: "customer", label: "عميل" },
  { value: "supplier", label: "مورد" },
  { value: "department", label: "قسم" },
  { value: "item", label: "صنف" },
  { value: "branch", label: "فرع" },
  { value: "all_employees", label: "جميع الموظفين" },
  { value: "all_customers", label: "جميع العملاء" },
  { value: "all_suppliers", label: "جميع الموردين" },
  { value: "all", label: "الجميع" },
];

export const DiscountValidationPanel: React.FC = () => {
  const [targetType, setTargetType] = useState<TargetType>("employee");
  const [entity, setEntity] = useState<EntityRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const needsLookup = !["all", "all_customers", "all_employees", "all_suppliers"].includes(targetType);

  const handleValidate = async () => {
    if (needsLookup && !entity) {
      setError("اختر كياناً أولاً");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await discountService.validateTarget({
        target_type: targetType,
        target_id: entity?.id,
      });
      setResult(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "فشل التحقق");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <Shield size={20} className="text-emerald-400" />
        <div>
          <h3 className="text-lg font-bold">التحقق من الهدف</h3>
          <p className="text-xs text-white/40">النتائج تشمل الخصومات المطابقة والاستثناءات والخصومات المنتهية</p>
        </div>
      </div>

      <div className="grid gap-4 rounded-2xl border border-white/10 bg-slate-900 p-6 lg:grid-cols-[220px_1fr_160px]">
        <Field label="نوع الهدف">
          <select value={targetType} onChange={(e) => { setTargetType(e.target.value as TargetType); setEntity(null); }} className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-2 text-white">
            {TARGET_TYPES.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </Field>

        <Field label="بحث الكيان">
          {needsLookup ? (
            <EntityAsyncAutocomplete type={targetType} value={entity} onChange={setEntity} placeholder="ابحث بالكود أو الاسم" />
          ) : (
            <div className="rounded-xl border border-white/10 bg-slate-800 px-4 py-2 text-white/45">لا يحتاج رقم داخلي</div>
          )}
        </Field>

        <div className="flex items-end">
          <button
            type="button"
            onClick={handleValidate}
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Target size={16} />}
            تحقق
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-600/10 px-4 py-3 text-red-300">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className={`rounded-2xl border p-6 ${result.found ? "border-emerald-500/30 bg-emerald-600/10" : "border-red-500/30 bg-red-600/10"}`}>
              <div className="flex items-center gap-3">
                {result.found ? <CheckCircle size={24} className="text-emerald-400" /> : <XCircle size={24} className="text-red-400" />}
                <div>
                  <h4 className="font-black">{result.found ? "تم العثور على الكيان" : "الكيان غير موجود"}</h4>
                  <p className="text-sm text-white/70">{result.message}</p>
                </div>
              </div>
            </div>

            {result.entity && (
              <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
                <div className="mb-3 font-bold">تفاصيل الكيان</div>
                <div className="grid gap-2 md:grid-cols-2">
                  {Object.entries(result.entity).map(([key, value]) => (
                    <div key={key} className="rounded-xl border border-white/5 bg-slate-800 px-3 py-2 text-sm">
                      <div className="text-white/40">{key}</div>
                      <div className="font-bold">{String(value ?? "—")}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              <Metric label="Matched Discounts" value={result.matched_discounts ?? 0} icon={CheckCircle} tone="emerald" />
              <Metric label="Excluded Discounts" value={result.excluded_discounts ?? 0} icon={XCircle} tone="amber" />
              <Metric label="Expired Discounts" value={result.expired_discounts ?? 0} icon={AlertCircle} tone="red" />
            </div>

            <details className="rounded-2xl border border-white/10 bg-slate-900 p-4">
              <summary className="cursor-pointer text-sm text-white/45">Raw JSON</summary>
              <pre className="mt-3 max-h-96 overflow-auto text-xs text-white/50">{JSON.stringify(result, null, 2)}</pre>
            </details>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="space-y-2">
    <span className="block text-sm text-white/45">{label}</span>
    {children}
  </label>
);

const Metric: React.FC<{ label: string; value: number; icon: React.FC<{ size?: number }>; tone: "emerald" | "amber" | "red" }> = ({ label, value, icon: Icon, tone }) => (
  <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
    <div className="mb-1 flex items-center gap-2 text-xs text-white/40">
      <Icon size={14} className={tone === "emerald" ? "text-emerald-400" : tone === "amber" ? "text-amber-400" : "text-red-400"} />
      {label}
    </div>
    <div className="text-2xl font-black">{value}</div>
  </div>
);
