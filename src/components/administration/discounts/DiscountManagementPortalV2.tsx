import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  BarChart3,
  Clock,
  Loader2,
  Percent,
  Plus,
  Search,
  Shield,
  SlidersHorizontal,
  List,
  Trash2,
  Edit3,
  Tag,
  X,
} from "lucide-react";
import {
  discountService,
  type Discount,
  type DiscountCreatePayload,
  type DiscountTarget,
  type EntityRecord,
} from "../../../services/discountService";
import { EntityAsyncAutocomplete } from "./EntityAsyncAutocomplete";
import { DiscountDebugPanel } from "./DiscountDebugPanel";
import { DiscountValidationPanel } from "./DiscountValidationPanel";

type TabKey = "dashboard" | "all" | "active" | "expired" | "debug" | "validation" | "settings";

const TABS: Array<{ key: TabKey; label: string; icon: React.FC<{ size?: number }> }> = [
  { key: "dashboard", label: "لوحة الخصومات", icon: BarChart3 },
  { key: "all", label: "الخصومات", icon: List },
  { key: "active", label: "النشطة", icon: Percent },
  { key: "expired", label: "المنتهية", icon: Clock },
  { key: "debug", label: "Debug", icon: SlidersHorizontal },
  { key: "validation", label: "Validation", icon: Shield },
  { key: "settings", label: "Settings", icon: Tag },
];

const TARGET_TYPE_OPTIONS: Array<{ value: DiscountTarget["target_type"]; label: string }> = [
  { value: "customer", label: "عميل" },
  { value: "employee", label: "موظف" },
  { value: "supplier", label: "مورد" },
  { value: "department", label: "قسم" },
  { value: "item", label: "صنف" },
  { value: "branch", label: "فرع" },
  { value: "all_customers", label: "جميع العملاء" },
  { value: "all_employees", label: "جميع الموظفين" },
  { value: "all_suppliers", label: "جميع الموردين" },
  { value: "all", label: "الجميع" },
];

const CONCRETE_TYPES = new Set(["customer", "employee", "supplier", "department", "item", "branch"]);

export const DiscountManagementPortalV2: React.FC = () => {
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Discount | null>(null);

  const status = useMemo(() => {
    if (tab === "active") return "active";
    if (tab === "expired") return "expired";
    return undefined;
  }, [tab]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (tab === "dashboard") {
          const res = await discountService.dashboard();
          if (mounted) setDashboard(res.data);
        } else if (tab === "debug" || tab === "validation" || tab === "settings") {
          // no-op
        } else {
          const res = await discountService.getAll({ status, search: search || undefined, per_page: 100 });
          if (mounted) setDiscounts(res.data ?? []);
        }
      } catch (err: any) {
        if (mounted) setError(err?.response?.data?.message || err.message || "Failed to load discounts");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [tab, search, status]);

  const saveSuccess = async () => {
    setShowModal(false);
    setEditing(null);
    if (tab !== "dashboard" && tab !== "debug" && tab !== "validation" && tab !== "settings") {
      const res = await discountService.getAll({ status, search: search || undefined, per_page: 100 });
      setDiscounts(res.data ?? []);
    }
    const dash = await discountService.dashboard();
    setDashboard(dash.data);
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-white overflow-hidden" dir="rtl">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/70">
        <div className="flex items-center gap-3">
          <Tag size={22} className="text-purple-400" />
          <div>
            <h1 className="text-xl font-black">إدارة الخصومات</h1>
            <p className="text-xs text-white/40">بحث server-side، استراتيجيات تطبيق، واستثناءات منفصلة</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث..."
              className="w-56 bg-slate-800 border border-white/10 rounded-xl px-4 py-2 pr-9 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setShowModal(true);
            }}
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-sm font-bold"
          >
            <Plus size={16} />
            خصم جديد
          </button>
        </div>
      </div>

      <div className="flex gap-2 px-6 py-3 border-b border-white/5 overflow-x-auto">
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${
                active ? "bg-purple-600/20 text-purple-300 border border-purple-500/30" : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon size={16} />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading && <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-purple-400" size={28} /></div>}
        {error && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-600/10 px-4 py-3 text-red-300">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && tab === "dashboard" && <DashboardPanel data={dashboard} />}
        {!loading && !error && tab !== "dashboard" && tab !== "debug" && tab !== "validation" && tab !== "settings" && (
          <DiscountsPanel
            discounts={discounts}
            onEdit={(discount) => {
              setEditing(discount);
              setShowModal(true);
            }}
            onDelete={async (id) => {
              await discountService.delete(id);
              const res = await discountService.getAll({ status, search: search || undefined, per_page: 100 });
              setDiscounts(res.data ?? []);
            }}
          />
        )}
        {!loading && tab === "debug" && <DiscountDebugPanel />}
        {!loading && tab === "validation" && <DiscountValidationPanel />}
        {!loading && tab === "settings" && <SettingsPanel />}
      </div>

      <AnimatePresence>
        {showModal && (
          <DiscountFormModal
            editDiscount={editing}
            onClose={() => {
              setShowModal(false);
              setEditing(null);
            }}
            onSaved={saveSuccess}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const DashboardPanel: React.FC<{ data: any }> = ({ data }) => {
  const stats = data?.stats ?? {};
  const cards = [
    ["إجمالي الخصومات", stats.total_discounts ?? 0],
    ["النشطة", stats.active_discounts ?? 0],
    ["المنتهية", stats.expired_discounts ?? 0],
    ["مجموع الاستخدام", stats.total_usage ?? 0],
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-white/10 bg-slate-900 p-4">
            <div className="text-3xl font-black text-white">{String(value)}</div>
            <div className="mt-1 text-sm text-white/45">{String(label)}</div>
          </div>
        ))}
      </div>
      {Array.isArray(data?.recent_usage) && data.recent_usage.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-slate-900 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 font-bold">آخر الاستخدامات</div>
          <div className="divide-y divide-white/5">
            {data.recent_usage.map((row: any) => (
              <div key={row.id} className="px-4 py-3 text-sm flex justify-between gap-4">
                <div className="truncate">{row.discount?.name || `#${row.discount_id}`}</div>
                <div className="text-yellow-400 shrink-0">{Number(row.discount_amount ?? 0).toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const DiscountsPanel: React.FC<{
  discounts: Discount[];
  onEdit: (discount: Discount) => void;
  onDelete: (id: number) => void;
}> = ({ discounts, onEdit, onDelete }) => {
  if (discounts.length === 0) {
    return <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-white/35">لا توجد خصومات</div>;
  }

  return (
    <div className="grid gap-4">
      {discounts.map((discount) => (
        <div key={discount.id} className="rounded-2xl border border-white/10 bg-slate-900 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold">{discount.name_ar || discount.name}</h3>
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-white/45">{discount.code}</span>
                <span className="rounded-full bg-purple-600/20 px-2 py-0.5 text-xs text-purple-300">{discount.apply_strategy || "per_quantity"}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/45">
                <span>{discount.discount_type}</span>
                <span>{discount.value}</span>
                <span>{discount.is_valid ? "نشط" : "غير نشط"}</span>
                <span>{discount.targets?.length ?? 0} هدف</span>
                <span>{discount.exclusions?.length ?? 0} استثناء</span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button type="button" onClick={() => onEdit(discount)} className="rounded-xl p-2 hover:bg-white/5">
                <Edit3 size={16} className="text-white/60" />
              </button>
              <button type="button" onClick={() => onDelete(discount.id)} className="rounded-xl p-2 hover:bg-red-500/10">
                <Trash2 size={16} className="text-red-400" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const SettingsPanel: React.FC = () => (
  <div className="max-w-2xl rounded-2xl border border-white/10 bg-slate-900 p-6 space-y-4">
    <div className="text-lg font-bold">إعدادات الخصومات</div>
    <div className="rounded-xl bg-slate-800 px-4 py-3 text-sm text-white/70">الاستراتيجية الافتراضية: per_quantity</div>
    <div className="rounded-xl bg-slate-800 px-4 py-3 text-sm text-white/70">الاستثناءات لها أولوية أعلى من الاستهداف</div>
    <div className="rounded-xl bg-slate-800 px-4 py-3 text-sm text-white/70">البحث يتم من السيرفر بعد حرفين</div>
  </div>
);

interface FormTargetRow {
  target_type: DiscountTarget["target_type"];
  target_id: number | null;
  target_name?: string | null;
  business_code?: string;
  target_business_code?: string;
}

const DiscountFormModal: React.FC<{
  editDiscount: Discount | null;
  onClose: () => void;
  onSaved: () => void;
}> = ({ editDiscount, onClose, onSaved }) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(editDiscount?.name ?? "");
  const [nameAr, setNameAr] = useState(editDiscount?.name_ar ?? "");
  const [code, setCode] = useState(editDiscount?.code ?? "");
  const [description, setDescription] = useState(editDiscount?.description ?? "");
  const [discountType, setDiscountType] = useState(editDiscount?.discount_type ?? "percentage");
  const [applyStrategy, setApplyStrategy] = useState(editDiscount?.apply_strategy ?? "per_quantity");
  const [value, setValue] = useState(String(editDiscount?.value ?? 0));
  const [priority, setPriority] = useState(String(editDiscount?.priority ?? 0));
  const [startDate, setStartDate] = useState(editDiscount?.start_date ?? "");
  const [endDate, setEndDate] = useState(editDiscount?.end_date ?? "");
  const [maxDiscountAmount, setMaxDiscountAmount] = useState(String(editDiscount?.max_discount_amount ?? ""));
  const [minOrderAmount, setMinOrderAmount] = useState(String(editDiscount?.min_order_amount ?? ""));
  const [targets, setTargets] = useState<FormTargetRow[]>(
    (editDiscount?.targets ?? []).map((target) => ({
      target_type: target.target_type,
      target_id: target.target_id ?? null,
      target_name: target.target_name,
    }))
  );
  const [exclusions, setExclusions] = useState<FormTargetRow[]>(
    (editDiscount?.exclusions ?? []).map((target) => ({
      target_type: target.target_type,
      target_id: target.target_id ?? null,
      target_name: target.target_name,
    }))
  );

  const upsertSelected = (list: FormTargetRow[], setList: React.Dispatch<React.SetStateAction<FormTargetRow[]>>, index: number, entity: EntityRecord | null) => {
    const next = [...list];
    next[index] = {
      ...next[index],
      target_id: entity?.id ?? null,
      business_code: entity?.business_code,
      target_business_code: entity?.business_code,
      target_name: entity ? `${entity.name_ar || entity.name}` : null,
    };
    setList(next);
  };

  const renderRows = (label: string, list: FormTargetRow[], setList: React.Dispatch<React.SetStateAction<FormTargetRow[]>>) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-bold text-white/75">{label}</div>
        <button
          type="button"
          onClick={() => setList([...list, { target_type: "employee", target_id: null }])}
          className="text-sm font-bold text-purple-300"
        >
          + إضافة
        </button>
      </div>
      {list.length === 0 && <div className="rounded-xl border border-dashed border-white/10 px-4 py-3 text-sm text-white/35">لا توجد عناصر</div>}
      {list.map((row, index) => (
        <div key={`${label}-${index}`} className="grid grid-cols-1 gap-2 md:grid-cols-[160px_1fr_36px]">
          <select
            value={row.target_type}
            onChange={(event) => {
              const next = [...list];
              next[index] = { target_type: event.target.value as DiscountTarget["target_type"], target_id: null };
              setList(next);
            }}
            className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-white"
          >
            {TARGET_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {CONCRETE_TYPES.has(row.target_type) ? (
            <EntityAsyncAutocomplete
              type={row.target_type}
              value={row.target_id ? { id: row.target_id, name: row.target_name || "", type: row.target_type, business_code: row.target_business_code } as EntityRecord : null}
              onChange={(entity) => upsertSelected(list, setList, index, entity)}
              placeholder="ابحث بالكود أو الاسم"
            />
          ) : (
            <div className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white/45">لا يحتاج رقم داخلي</div>
          )}
          <button
            type="button"
            onClick={() => setList(list.filter((_, i) => i !== index))}
            className="rounded-xl text-red-400 hover:bg-red-500/10"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: DiscountCreatePayload = {
        name: name || nameAr || "Discount",
        name_ar: nameAr || undefined,
        code: code || `DISC-${Date.now().toString(36).toUpperCase()}`,
        description: description || undefined,
        discount_type: discountType as DiscountCreatePayload["discount_type"],
        apply_strategy: applyStrategy as NonNullable<DiscountCreatePayload["apply_strategy"]>,
        value: Number(value) || 0,
        priority: Number(priority) || 0,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        max_discount_amount: maxDiscountAmount ? Number(maxDiscountAmount) : undefined,
        min_order_amount: minOrderAmount ? Number(minOrderAmount) : undefined,
        targets: targets.length ? targets.map(({ target_type, target_id, business_code, target_business_code }) => ({
          target_type,
          target_id,
          business_code,
          target_business_code,
        })) : undefined,
        exclusions: exclusions.length ? exclusions.map(({ target_type, target_id, business_code, target_business_code }) => ({
          target_type,
          target_id,
          business_code,
          target_business_code,
        })) : undefined,
      };

      if (editDiscount) {
        await discountService.update(editDiscount.id, payload);
      } else {
        await discountService.create(payload);
      }
      onSaved();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "فشل حفظ الخصم");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black">{editDiscount ? "تعديل خصم" : "خصم جديد"}</h2>
            <p className="text-sm text-white/40">الأهداف والاستثناءات تستخدم البحث الخدمي، والـ IDs تبقى داخلية فقط</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-white/5">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-600/10 px-4 py-3 text-red-300">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="الاسم العربي">
            <input value={nameAr} onChange={(e) => setNameAr(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-2 text-white" />
          </Field>
          <Field label="الاسم الإنجليزي">
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-2 text-white" />
          </Field>
          <Field label="الكود">
            <input value={code} onChange={(e) => setCode(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-2 text-white" />
          </Field>
          <Field label="النوع">
            <select value={discountType} onChange={(e) => setDiscountType(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-2 text-white">
              <option value="percentage">نسبة مئوية</option>
              <option value="fixed_amount">مبلغ ثابت</option>
              <option value="price_override">تجاوز السعر</option>
              <option value="buy_x_get_y">Buy X Get Y</option>
            </select>
          </Field>
          <Field label="القيمة">
            <input value={value} onChange={(e) => setValue(e.target.value)} type="number" className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-2 text-white" />
          </Field>
          <Field label="الاستراتيجية">
            <select value={applyStrategy} onChange={(e) => setApplyStrategy(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-2 text-white">
              <option value="per_quantity">Per Quantity</option>
              <option value="per_line">Per Line</option>
              <option value="per_invoice">Per Invoice</option>
              <option value="once">Once</option>
            </select>
          </Field>
          <Field label="الأولوية">
            <input value={priority} onChange={(e) => setPriority(e.target.value)} type="number" className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-2 text-white" />
          </Field>
          <Field label="الحد الأعلى">
            <input value={maxDiscountAmount} onChange={(e) => setMaxDiscountAmount(e.target.value)} type="number" className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-2 text-white" />
          </Field>
          <Field label="الحد الأدنى">
            <input value={minOrderAmount} onChange={(e) => setMinOrderAmount(e.target.value)} type="number" className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-2 text-white" />
          </Field>
          <Field label="تاريخ البداية">
            <input value={startDate} onChange={(e) => setStartDate(e.target.value)} type="date" className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-2 text-white" />
          </Field>
          <Field label="تاريخ النهاية">
            <input value={endDate} onChange={(e) => setEndDate(e.target.value)} type="date" className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-2 text-white" />
          </Field>
        </div>

        <div className="mt-6 grid gap-6">
          <Field label="الوصف">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-24 w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-2 text-white" />
          </Field>
          {renderRows("الجهات المستهدفة", targets, setTargets)}
          {renderRows("الاستثناءات", exclusions, setExclusions)}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/10 pt-4">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm text-white/60 hover:bg-white/5">
            إلغاء
          </button>
          <button type="button" disabled={saving} onClick={handleSave} className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2 text-sm font-bold text-white hover:bg-green-500 disabled:opacity-50">
            {saving && <Loader2 size={16} className="animate-spin" />}
            حفظ
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="space-y-2">
    <span className="block text-sm text-white/45">{label}</span>
    {children}
  </label>
);
