import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle,
  DollarSign,
  Hash,
  Loader2,
  Package,
  ShoppingBag,
  Star,
  Target,
  TrendingDown,
  XCircle,
  Bug,
} from "lucide-react";
import { discountService, type EntityRecord } from "../../../services/discountService";
import { EntityAsyncAutocomplete } from "./EntityAsyncAutocomplete";

type EntityType = "employee" | "customer" | "supplier" | "department" | "item" | "branch";

const ENTITY_TYPES: Array<{ value: EntityType; label: string }> = [
  { value: "employee", label: "موظف" },
  { value: "customer", label: "عميل" },
  { value: "supplier", label: "مورد" },
  { value: "department", label: "قسم" },
  { value: "item", label: "صنف" },
  { value: "branch", label: "فرع" },
];

const STRATEGY_LABELS: Record<string, string> = {
  per_quantity: "لكل قطعة",
  per_line: "لكل سطر",
  per_invoice: "لكل فاتورة",
  once: "مرة واحدة",
};

export const DiscountDebugPanel: React.FC = () => {
  const [entityType, setEntityType] = useState<EntityType>("employee");
  const [selectedEntity, setSelectedEntity] = useState<EntityRecord | null>(null);
  const [item, setItem] = useState<EntityRecord | null>(null);
  const [department, setDepartment] = useState<EntityRecord | null>(null);
  const [branch, setBranch] = useState<EntityRecord | null>(null);
  const [price, setPrice] = useState("100");
  const [quantity, setQuantity] = useState("1");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const payload = useMemo(() => ({
    price: Number(price) || 0,
    quantity: Number(quantity) || 1,
    ...(entityType === "employee" && selectedEntity ? { employee_id: selectedEntity.id } : {}),
    ...(entityType === "customer" && selectedEntity ? { customer_id: selectedEntity.id } : {}),
    ...(entityType === "supplier" && selectedEntity ? { supplier_id: selectedEntity.id } : {}),
    ...(entityType === "department" && selectedEntity ? { department_id: selectedEntity.id } : {}),
    ...(entityType === "item" && selectedEntity ? { item_id: selectedEntity.id } : {}),
    ...(entityType === "category" && selectedEntity ? { category_id: selectedEntity.id } : {}),
    ...(entityType === "branch" && selectedEntity ? { branch_id: selectedEntity.id } : {}),
    ...(item ? { item_id: item.id } : {}),
    ...(department ? { department_id: department.id } : {}),
    ...(branch ? { branch_id: branch.id } : {}),
    date: date || undefined,
  }), [branch, date, department, entityType, item, price, quantity, selectedEntity]);

  const handleRun = async () => {
    if (!selectedEntity && entityType !== "branch") {
      setError("اختر كياناً أولاً");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await discountService.debug(payload as any);
      setResult(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "فشل تنفيذ debug");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <Bug size={20} className="text-purple-400" />
        <div>
          <h3 className="text-lg font-bold">وحدة التشخيص</h3>
          <p className="text-xs text-white/40">البحث يبدأ بعد حرفين ويعمل من الخادم</p>
        </div>
      </div>

      <div className="grid gap-4 rounded-2xl border border-white/10 bg-slate-900 p-6 md:grid-cols-2 xl:grid-cols-4">
        <Field label="نوع الكيان">
          <select value={entityType} onChange={(e) => { setEntityType(e.target.value as EntityType); setSelectedEntity(null); }} className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-2 text-white">
            {ENTITY_TYPES.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </Field>

        <Field label="بحث الكيان">
          <EntityAsyncAutocomplete type={entityType} value={selectedEntity} onChange={setSelectedEntity} placeholder="ابحث بالكود أو الاسم" />
        </Field>

        <Field label="السعر">
          <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-2 text-white" />
        </Field>

        <Field label="الكمية">
          <input value={quantity} onChange={(e) => setQuantity(e.target.value)} type="number" className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-2 text-white" />
        </Field>

        <Field label="الصنف">
          <EntityAsyncAutocomplete type="item" value={item} onChange={setItem} placeholder="ابحث عن الصنف" />
        </Field>

        <Field label="القسم">
          <EntityAsyncAutocomplete type="department" value={department} onChange={setDepartment} placeholder="ابحث عن القسم" />
        </Field>

        <Field label="الفرع">
          <EntityAsyncAutocomplete type="branch" value={branch} onChange={setBranch} placeholder="ابحث عن الفرع" />
        </Field>

        <Field label="التاريخ">
          <input value={date} onChange={(e) => setDate(e.target.value)} type="date" className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-2 text-white" />
        </Field>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleRun}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2 text-sm font-bold text-white hover:bg-purple-500 disabled:opacity-50"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          Validate
        </button>
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
            <div className={`rounded-2xl border p-6 ${result.has_discount ? "border-emerald-500/30 bg-emerald-600/10" : "border-amber-500/30 bg-amber-600/10"}`}>
              <div className="mb-5 flex items-center gap-3">
                {result.has_discount ? <CheckCircle size={24} className="text-emerald-400" /> : <XCircle size={24} className="text-amber-400" />}
                <div>
                  <div className="text-lg font-black">{result.has_discount ? "تم العثور على خصم مطابق" : "لا يوجد خصم مطابق"}</div>
                  <div className="text-sm text-white/45">SQL count: {result.sql_count ?? 0} • Execution: {result.execution_time_ms ?? 0}ms</div>
                </div>
              </div>

              {result.matched_discount && (
                <>
                  <div className="grid gap-3 md:grid-cols-4">
                    <Metric title="Original" value={`${Number(result.matched_discount.original_price ?? 0).toFixed(2)} ₪`} icon={DollarSign} />
                    <Metric title="Discount" value={`${Number(result.matched_discount.discount_amount ?? 0).toFixed(2)} ₪`} icon={TrendingDown} />
                    <Metric title="Final" value={`${Number(result.matched_discount.final_price ?? 0).toFixed(2)} ₪`} icon={CheckCircle} />
                    <Metric title="Strategy" value={STRATEGY_LABELS[result.matched_discount.apply_strategy] || result.matched_discount.apply_strategy || "per_quantity"} icon={ShoppingBag} />
                  </div>

                  <div className="mt-4 rounded-xl border border-white/10 bg-slate-800/60 p-4">
                    <div className="flex items-center gap-2 text-sm text-white/45">
                      <Target size={14} />
                      Matched discount
                    </div>
                    <div className="mt-2 font-bold">{result.matched_discount.name} ({result.matched_discount.code})</div>
                    <div className="text-sm text-emerald-300">{result.matched_discount.reason}</div>
                  </div>
                </>
              )}
            </div>

            {Array.isArray(result.rejected_discounts) && result.rejected_discounts.length > 0 && (
              <Panel title={`Rejected Rules (${result.rejected_discounts.length})`} tone="red">
                {result.rejected_discounts.map((row: any) => (
                  <RuleRow key={row.id} title={row.name} code={row.code} reason={row.reason} />
                ))}
              </Panel>
            )}

            {Array.isArray(result.excluded_discounts) && result.excluded_discounts.length > 0 && (
              <Panel title={`Excluded Rules (${result.excluded_discounts.length})`} tone="amber">
                {result.excluded_discounts.map((row: any) => (
                  <RuleRow key={`${row.id}-${row.reason}`} title={row.name} code={row.code} reason={row.reason} />
                ))}
              </Panel>
            )}

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

const Metric: React.FC<{ title: string; value: string; icon: React.FC<{ size?: number }> }> = ({ title, value, icon: Icon }) => (
  <div className="rounded-xl border border-white/10 bg-slate-800 p-4">
    <div className="mb-1 flex items-center gap-2 text-xs text-white/40">
      <Icon size={14} />
      {title}
    </div>
    <div className="text-lg font-black">{value}</div>
  </div>
);

const Panel: React.FC<{ title: string; tone: "red" | "amber"; children: React.ReactNode }> = ({ title, tone, children }) => (
  <div className={`rounded-2xl border p-5 ${tone === "red" ? "border-red-500/30 bg-red-600/10" : "border-amber-500/30 bg-amber-600/10"}`}>
    <div className="mb-3 font-bold">{title}</div>
    <div className="space-y-2">{children}</div>
  </div>
);

const RuleRow: React.FC<{ title: string; code: string; reason: string }> = ({ title, code, reason }) => (
  <div className="rounded-xl border border-white/10 bg-slate-800/70 p-3">
    <div className="flex items-center justify-between gap-3">
      <div className="font-bold">{title}</div>
      <div className="text-xs text-purple-300">{code}</div>
    </div>
    <div className="mt-1 text-xs text-white/60">{reason}</div>
  </div>
);
