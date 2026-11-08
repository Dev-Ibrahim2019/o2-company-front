/**
 * StockItemFormModal.tsx — إنشاء/تعديل صنف مخزني، في تبويبات للبيانات الموجودة فعلاً:
 * المعلومات العامة، الوحدات، بيانات الشراء، رصيد الصنف (للقراءة، للصنف المحفوظ)، ملاحظات.
 *
 * قواعد مرآة للخادم (StockItemService) — الخادم هو الحَكَم، الواجهة تمنع الخطأ مبكراً فقط:
 *  - المنتج النهائي والصنف غير الخاضع للمخزون: ربط إلزامي بصنف بيع غير مربوط بصنف آخر.
 *  - المادة الخام والمنتج الوسيط: لا ربط بصنف بيع.
 *  - المادة الخام تُخزَّن دائماً؛ غير الخاضع للمخزون لا يُخزَّن أبداً.
 *  - صنف له حركات: لا يتغيّر نوعه ولا وحدته الأساسية.
 *  - الوحدة الأساسية لا تتكرر ضمن الوحدات البديلة.
 */

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, Link2, Lock, Loader2 } from "lucide-react";
import { toast } from "../../shared/Toast";
import {
  fmtNum,
  inventoryService,
  inventoryErrorMessage,
  SOLD_TYPES,
  type InventoryLookups,
  type SaleItem,
  type StockBalanceRow,
  type StockItem,
  type StockItemPayload,
  type StockItemType,
  type Warehouse,
} from "../../../services/inventoryService";
import { flattenTree } from "./CategoriesPage";
import { Field, Modal, PrimaryButton, SecondaryButton, Toggle, inputClass } from "./ui";

interface Props {
  lookups: InventoryLookups;
  /** null = صنف جديد */
  itemId: number | null;
  onClose: () => void;
  onSaved: () => void;
}

interface Form {
  type: StockItemType;
  name: string;
  code: string;
  item_id: number | null;
  base_unit_id: number | "";
  is_stored: boolean;
  barcode: string;
  supplier_code: string;
  safety_stock: string;
  is_active: boolean;
  notes: string;
  units: { unit_id: number | ""; factor: string }[];
  category_ids: number[];
  name_en: string;
  purchase_unit_id: number | "";
  default_warehouse_id: number | "";
}

const EMPTY: Form = {
  type: "raw",
  name: "",
  code: "",
  item_id: null,
  base_unit_id: "",
  is_stored: true,
  barcode: "",
  supplier_code: "",
  safety_stock: "0",
  is_active: true,
  notes: "",
  units: [],
  category_ids: [],
  name_en: "",
  purchase_unit_id: "",
  default_warehouse_id: "",
};

type Tab = "general" | "units" | "purchase" | "stock" | "notes";

const TABS: { id: Tab; label: string }[] = [
  { id: "general", label: "المعلومات العامة" },
  { id: "units", label: "الوحدات" },
  { id: "purchase", label: "بيانات الشراء" },
  { id: "stock", label: "رصيد الصنف" },
  { id: "notes", label: "ملاحظات" },
];

const saleItemLabel = (s: Pick<SaleItem, "name" | "name_ar" | "code">) => `${s.name_ar || s.name} (${s.code})`;

export const StockItemFormModal: React.FC<Props> = ({ lookups, itemId, onClose, onSaved }) => {
  const [form, setForm] = useState<Form>(EMPTY);
  const [tab, setTab] = useState<Tab>("general");
  const [loading, setLoading] = useState(itemId !== null);
  const [saving, setSaving] = useState(false);
  const [hasMovements, setHasMovements] = useState(false);
  const [linked, setLinked] = useState<Pick<SaleItem, "id" | "name" | "name_ar" | "code"> | null>(null);
  const [saleSearch, setSaleSearch] = useState("");
  const [saleResults, setSaleResults] = useState<SaleItem[]>([]);
  const [saleLoading, setSaleLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  useEffect(() => {
    inventoryService.warehouses().then((list) => setWarehouses(list.filter((w) => w.is_active))).catch(() => undefined);
  }, []);

  const isSold = SOLD_TYPES.includes(form.type);
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  /* ── تحميل الصنف عند التعديل ── */
  useEffect(() => {
    if (itemId === null) return;
    let cancelled = false;
    inventoryService
      .item(itemId)
      .then((it: StockItem) => {
        if (cancelled) return;
        setForm({
          type: it.type,
          name: it.name,
          code: it.code,
          item_id: it.item_id,
          base_unit_id: it.base_unit_id,
          is_stored: it.is_stored,
          barcode: it.barcode ?? "",
          supplier_code: it.supplier_code ?? "",
          safety_stock: String(Number(it.safety_stock)),
          is_active: it.is_active,
          notes: it.notes ?? "",
          units: (it.units ?? []).map((u) => ({ unit_id: u.unit_id, factor: String(Number(u.factor)) })),
          category_ids: (it.categories ?? []).map((c) => c.id),
          name_en: it.name_en ?? "",
          purchase_unit_id: it.purchase_unit_id && it.purchase_unit_id !== it.base_unit_id ? it.purchase_unit_id : "",
          default_warehouse_id: it.default_warehouse_id ?? "",
        });
        setLinked(it.item ?? null);
        setHasMovements(Boolean(it.has_movements));
      })
      .catch((e) => {
        if (cancelled) return;
        toast.error("تعذّر تحميل الصنف", inventoryErrorMessage(e));
        onClose();
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [itemId, onClose]);

  /* ── بحث أصناف البيع غير المربوطة (مؤجّل 300ms) ── */
  useEffect(() => {
    if (!isSold) return;
    let cancelled = false;
    setSaleLoading(true);
    const t = setTimeout(() => {
      inventoryService
        .saleItems({ search: saleSearch.trim() || undefined, unlinked: true })
        .then((r) => !cancelled && setSaleResults(r))
        .catch(() => !cancelled && setSaleResults([]))
        .finally(() => !cancelled && setSaleLoading(false));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [saleSearch, isSold]);

  const changeType = (type: StockItemType) => {
    setForm((f) => ({
      ...f,
      type,
      item_id: SOLD_TYPES.includes(type) ? f.item_id : null,
      is_stored: type === "raw" ? true : type === "non_stock" ? false : f.is_stored,
    }));
    if (!SOLD_TYPES.includes(type)) setLinked(null);
  };

  const activeUnits = useMemo(() => lookups.units.filter((u) => u.is_active), [lookups.units]);
  const unitName = (id: number | "") => lookups.units.find((u) => u.id === id)?.name ?? "";
  const categoryTree = useMemo(() => flattenTree(lookups.categories), [lookups.categories]);

  const toggleCategory = (id: number) =>
    set("category_ids", form.category_ids.includes(id) ? form.category_ids.filter((c) => c !== id) : [...form.category_ids, id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSold && !form.item_id) {
      setTab("general");
      toast.warning("اختر صنف البيع المرتبط", "المنتج النهائي والصنف غير الخاضع للمخزون يُربطان إلزامياً بصنف من قائمة البيع.");
      return;
    }
    if (form.base_unit_id === "") {
      setTab("general");
      toast.warning("اختر الوحدة الأساسية");
      return;
    }
    const units = form.units.filter((u) => u.unit_id !== "" && u.factor !== "");
    if (units.some((u) => u.unit_id === form.base_unit_id)) {
      setTab("units");
      toast.warning("الوحدة الأساسية لا تُضاف ضمن الوحدات البديلة");
      return;
    }
    if (new Set(units.map((u) => u.unit_id)).size !== units.length) {
      setTab("units");
      toast.warning("وحدة مكرّرة في الوحدات البديلة");
      return;
    }

    const payload: StockItemPayload = {
      type: form.type,
      name: form.name.trim() || undefined,
      code: form.code.trim() || null,
      item_id: isSold ? form.item_id : null,
      base_unit_id: form.base_unit_id,
      is_stored: form.is_stored,
      barcode: form.barcode.trim() || null,
      supplier_code: form.supplier_code.trim() || null,
      safety_stock: Number(form.safety_stock) || 0,
      is_active: form.is_active,
      notes: form.notes.trim() || null,
      name_en: form.name_en.trim() || null,
      // وحدة شراء حُذفت من البديلة تعود للأساسية بدل رفض الحفظ.
      purchase_unit_id: units.some((u) => u.unit_id === form.purchase_unit_id) ? (form.purchase_unit_id as number) : null,
      default_warehouse_id: form.default_warehouse_id === "" ? null : form.default_warehouse_id,
      units: units.map((u) => ({ unit_id: Number(u.unit_id), factor: Number(u.factor) })),
      category_ids: form.category_ids,
    };

    setSaving(true);
    try {
      if (itemId === null) await inventoryService.createItem(payload);
      else await inventoryService.updateItem(itemId, payload);
      toast.success(itemId === null ? "تمت إضافة الصنف" : "تم تحديث الصنف");
      onSaved();
    } catch (err) {
      toast.error("تعذّر الحفظ", inventoryErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const tabs = TABS.filter((t) => t.id !== "stock" || (itemId !== null && form.is_stored));

  return (
    <Modal
      wide
      title={itemId === null ? "صنف مخزني جديد" : "تعديل صنف مخزني"}
      onClose={onClose}
      footer={
        <>
          <SecondaryButton onClick={onClose}>إلغاء</SecondaryButton>
          <PrimaryButton type="submit" form="stock-item-form" loading={saving} disabled={loading}>
            حفظ
          </PrimaryButton>
        </>
      }
    >
      {loading ? (
        <div className="flex justify-center p-10">
          <Loader2 size={30} className="text-red-500 animate-spin" />
        </div>
      ) : (
        <form id="stock-item-form" onSubmit={submit} onInvalidCapture={() => setTab("general")} className="space-y-5">
          {hasMovements && (
            <div className="flex items-center gap-2 p-3 bg-amber-500/10 text-amber-300 rounded-xl text-xs font-bold border border-amber-500/20">
              <Lock size={14} className="shrink-0" />
              لهذا الصنف حركات مخزنية: النوع والوحدة الأساسية مقفلان، ولا يمكن حذفه (يمكن إيقافه).
            </div>
          )}

          <div role="tablist" aria-label="أقسام الصنف" className="flex flex-wrap gap-1 border-b border-white/5 pb-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`item-tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls={`item-panel-${t.id}`}
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors ${
                  tab === t.id ? "bg-red-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {t.label}
                {t.id === "units" && form.units.length > 0 && <span className="mr-1 opacity-70">({form.units.length})</span>}
              </button>
            ))}
          </div>

          {/* ══ المعلومات العامة ══ */}
          <div role="tabpanel" id="item-panel-general" aria-labelledby="item-tab-general" hidden={tab !== "general"} className="space-y-5">
            <fieldset>
              <legend className="text-xs font-black text-slate-400 tracking-wider mb-1.5">
                نوع الصنف <span className="text-red-500">*</span>
              </legend>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {lookups.types.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    disabled={hasMovements && t.value !== form.type}
                    aria-pressed={form.type === t.value}
                    onClick={() => changeType(t.value)}
                    className={`p-2.5 rounded-xl text-sm font-bold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      form.type === t.value ? "bg-red-600/20 text-red-300 border-red-600/40" : "bg-slate-800 text-slate-400 border-white/5 hover:border-white/15"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </fieldset>

            {isSold && (
              <div className="space-y-2 p-4 rounded-2xl bg-slate-800/50 border border-white/5">
                <p className="text-xs font-black text-slate-400 flex items-center gap-1.5">
                  <Link2 size={14} /> صنف البيع المرتبط <span className="text-red-500">*</span>
                </p>
                {form.item_id && linked ? (
                  <div className="flex items-center justify-between gap-2 p-3 bg-slate-900 rounded-xl border border-green-600/30">
                    <span className="text-sm font-bold text-green-300">{saleItemLabel(linked)}</span>
                    <button
                      type="button"
                      onClick={() => {
                        set("item_id", null);
                        setLinked(null);
                      }}
                      className="text-xs font-bold text-slate-400 hover:text-white"
                    >
                      تغيير
                    </button>
                  </div>
                ) : (
                  <>
                    <input className={inputClass} value={saleSearch} onChange={(e) => setSaleSearch(e.target.value)} placeholder="ابحث باسم أو كود صنف البيع..." aria-label="بحث صنف البيع" />
                    <div className="max-h-44 overflow-y-auto custom-scrollbar rounded-xl border border-white/5 divide-y divide-white/5">
                      {saleLoading ? (
                        <p className="p-3 text-xs text-slate-500 font-bold">جارٍ البحث...</p>
                      ) : saleResults.length === 0 ? (
                        <p className="p-3 text-xs text-slate-500 font-bold">لا توجد أصناف بيع غير مربوطة مطابقة</p>
                      ) : (
                        saleResults.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setLinked(s);
                              setForm((f) => ({ ...f, item_id: s.id, name: f.name || s.name_ar || s.name }));
                            }}
                            className="w-full text-right p-2.5 text-sm text-slate-300 hover:bg-white/5 flex items-center justify-between gap-2"
                          >
                            <span className="font-bold">{s.name_ar || s.name}</span>
                            <bdi className="text-xs text-slate-500 font-mono">{s.code}</bdi>
                          </button>
                        ))
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 font-semibold">تظهر فقط أصناف البيع غير المربوطة بصنف مخزني.</p>
                  </>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="اسم الصنف" required={!isSold} hint={isSold ? "يُؤخذ من صنف البيع إن تُرك فارغاً." : undefined}>
                <input className={inputClass} value={form.name} onChange={(e) => set("name", e.target.value)} required={!isSold} placeholder="مثال: لحم بقري مفروم" />
              </Field>
              <Field label="الاسم بالإنجليزية">
                <input className={inputClass} value={form.name_en} onChange={(e) => set("name_en", e.target.value)} dir="ltr" placeholder="Minced beef" />
              </Field>
              <Field label="رقم الصنف (الكود)" hint={itemId === null ? "يُولَّد تلقائياً إن تُرك فارغاً." : undefined}>
                <input className={inputClass} value={form.code} onChange={(e) => set("code", e.target.value)} dir="ltr" />
              </Field>
              <Field label="الباركود">
                <input className={inputClass} value={form.barcode} onChange={(e) => set("barcode", e.target.value)} dir="ltr" />
              </Field>
              <Field label="الوحدة الأساسية" required hint={hasMovements ? "مقفلة لوجود حركات." : "وحدة الحساب والتخزين؛ كل الكميات تُحوَّل إليها."}>
                <select className={inputClass} value={form.base_unit_id} onChange={(e) => set("base_unit_id", e.target.value ? Number(e.target.value) : "")} disabled={hasMovements} required>
                  <option value="">— اختر —</option>
                  {lookups.units
                    .filter((u) => u.is_active || u.id === form.base_unit_id)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                        {u.symbol ? ` (${u.symbol})` : ""}
                      </option>
                    ))}
                </select>
              </Field>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-black text-slate-400 tracking-wider">التصنيفات</p>
              {categoryTree.length === 0 ? (
                <p className="text-xs text-slate-500 font-semibold">لا توجد تصنيفات. أنشئها من شاشة التصنيفات.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {categoryTree.map(({ category: c, depth }) => {
                    const on = form.category_ids.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleCategory(c.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                          on ? "bg-green-600/20 text-green-300 border-green-600/40" : "bg-slate-800 text-slate-400 border-white/5 hover:border-white/15"
                        }`}
                      >
                        {depth > 0 && <span className="text-slate-600">{"›".repeat(depth)} </span>}
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Toggle
                checked={form.is_stored}
                onChange={(v) => set("is_stored", v)}
                disabled={form.type === "raw" || form.type === "non_stock"}
                label={form.type === "raw" ? "يُخزَّن (إلزامي للمادة الخام)" : form.type === "non_stock" ? "لا يُخزَّن" : "يُخزَّن"}
              />
              <Toggle checked={form.is_active} onChange={(v) => set("is_active", v)} label="نشط" />
            </div>
          </div>

          {/* ══ الوحدات ══ */}
          <div role="tabpanel" id="item-panel-units" aria-labelledby="item-tab-units" hidden={tab !== "units"} className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black text-slate-400 tracking-wider">
                الوحدات البديلة — الوحدة الأساسية: <span className="text-slate-200">{unitName(form.base_unit_id) || "—"}</span>
              </p>
              <button type="button" onClick={() => set("units", [...form.units, { unit_id: "", factor: "" }])} className="flex items-center gap-1 text-xs font-bold text-red-400 hover:text-red-300">
                <Plus size={14} /> إضافة وحدة
              </button>
            </div>
            {form.units.length === 0 ? (
              <p className="text-xs text-slate-500 font-semibold">لا توجد وحدات بديلة. أضف مثلاً "كرتونة = 12 علبة".</p>
            ) : (
              form.units.map((u, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-slate-400 font-bold">1</span>
                  <select
                    className={`${inputClass} !w-auto flex-1 min-w-[120px]`}
                    aria-label="الوحدة البديلة"
                    value={u.unit_id}
                    onChange={(e) => set("units", form.units.map((x, j) => (j === i ? { ...x, unit_id: e.target.value ? Number(e.target.value) : "" } : x)))}
                  >
                    <option value="">— الوحدة —</option>
                    {activeUnits
                      .filter((opt) => opt.id !== form.base_unit_id)
                      .map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.name}
                        </option>
                      ))}
                  </select>
                  <span className="text-sm text-slate-400 font-bold">=</span>
                  <input
                    className={`${inputClass} !w-28`}
                    type="number"
                    min={0}
                    step="any"
                    aria-label="معامل التحويل"
                    value={u.factor}
                    onChange={(e) => set("units", form.units.map((x, j) => (j === i ? { ...x, factor: e.target.value } : x)))}
                    dir="ltr"
                  />
                  <span className="text-sm text-slate-400 font-bold min-w-[60px]">{unitName(form.base_unit_id) || "وحدة أساسية"}</span>
                  <button
                    type="button"
                    aria-label="حذف الوحدة"
                    onClick={() => set("units", form.units.filter((_, j) => j !== i))}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-600/10 text-red-400 hover:bg-red-600/20"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* ══ بيانات الشراء ══ */}
          <div role="tabpanel" id="item-panel-purchase" aria-labelledby="item-tab-purchase" hidden={tab !== "purchase"} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="وحدة الشراء" hint={form.is_stored ? "الوحدة الافتراضية في مستندات الاستلام (كرتونة، شوال...)." : "للأصناف المخزّنة فقط."}>
              <select className={inputClass} value={form.purchase_unit_id} disabled={!form.is_stored} onChange={(e) => set("purchase_unit_id", e.target.value ? Number(e.target.value) : "")}>
                <option value="">الوحدة الأساسية</option>
                {form.units
                  .filter((u) => u.unit_id !== "")
                  .map((u) => (
                    <option key={u.unit_id} value={u.unit_id}>
                      {unitName(u.unit_id)}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="المخزن الافتراضي" hint="يُقترح تلقائياً عند الاستلام.">
              <select className={inputClass} value={form.default_warehouse_id} disabled={!form.is_stored} onChange={(e) => set("default_warehouse_id", e.target.value ? Number(e.target.value) : "")}>
                <option value="">— بلا —</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="كود المورّد">
              <input className={inputClass} value={form.supplier_code} onChange={(e) => set("supplier_code", e.target.value)} dir="ltr" />
            </Field>
            <Field label="مخزون الأمان (الحد الأدنى)" hint={form.base_unit_id ? `بالوحدة الأساسية (${unitName(form.base_unit_id)})` : undefined}>
              <input className={inputClass} type="number" min={0} step="any" value={form.safety_stock} onChange={(e) => set("safety_stock", e.target.value)} dir="ltr" />
            </Field>
            <p className="sm:col-span-2 text-[11px] text-slate-500 font-semibold">أسعار المورّدين وروابطهم تُدار من زر "الموردون" في فهرس الأصناف.</p>
          </div>

          {/* ══ رصيد الصنف ══ */}
          {itemId !== null && tab === "stock" && (
            <div role="tabpanel" id="item-panel-stock" aria-labelledby="item-tab-stock">
              <ItemStockTab itemId={itemId} />
            </div>
          )}

          {/* ══ ملاحظات ══ */}
          <div role="tabpanel" id="item-panel-notes" aria-labelledby="item-tab-notes" hidden={tab !== "notes"}>
            <Field label="ملاحظات">
              <textarea className={`${inputClass} min-h-[140px]`} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </Field>
          </div>
        </form>
      )}
    </Modal>
  );
};

/** رصيد الصنف في كل مخزن يراه المستخدم (للقراءة)، مع رابط كرت الصنف. */
const ItemStockTab: React.FC<{ itemId: number }> = ({ itemId }) => {
  const [rows, setRows] = useState<StockBalanceRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    inventoryService
      .balances({ stock_item_id: itemId, per_page: 100 })
      .then((r) => !cancelled && setRows(r.data))
      .catch((e) => {
        if (!cancelled) {
          setRows([]);
          toast.error("تعذّر تحميل الرصيد", inventoryErrorMessage(e));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [itemId]);

  if (!rows) return <Loader2 size={24} className="mx-auto my-6 text-red-500 animate-spin" />;
  if (rows.length === 0) return <p className="text-sm text-slate-500 font-bold p-4">لا رصيد لهذا الصنف في مخازنك.</p>;

  const totalQty = rows.reduce((s, r) => s + Number(r.quantity), 0);
  const costs = rows.every((r) => r.value !== null);
  const totalValue = rows.reduce((s, r) => s + Number(r.value ?? 0), 0);
  return (
    <div className="rounded-xl border border-white/10 overflow-x-auto">
      <table className="w-full border-collapse text-sm min-w-[480px]">
        <thead>
          <tr>
            {["المخزن", "الكمية", ...(costs ? ["متوسط التكلفة", "القيمة"] : []), ""].map((h, i) => (
              <th key={i} className="bg-slate-800 text-slate-400 text-[11px] font-black px-2 py-2 border border-white/10 text-right">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.warehouse_id}>
              <td className="border border-white/10 px-2 py-1.5 text-slate-200">{r.warehouse_name}</td>
              <td className={`border border-white/10 px-2 py-1.5 tabular-nums ${r.below_safety ? "text-amber-300 font-bold" : "text-slate-200"}`}>
                {fmtNum(r.quantity)} <span className="text-xs text-slate-500">{r.base_unit}</span>
              </td>
              {costs && (
                <>
                  <td className="border border-white/10 px-2 py-1.5 tabular-nums text-slate-300">{fmtNum(r.avg_cost, 4)}</td>
                  <td className="border border-white/10 px-2 py-1.5 tabular-nums text-slate-300">{fmtNum(r.value, 2)}</td>
                </>
              )}
              <td className="border border-white/10 px-2 py-1.5">
                <Link to={`/inventory/kardex?warehouse_id=${r.warehouse_id}&stock_item_id=${r.stock_item_id}`} className="text-xs text-sky-300 hover:underline">
                  كرت الصنف
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="border border-white/10 px-2 py-1.5 font-black text-slate-300">الإجمالي</td>
            <td className="border border-white/10 px-2 py-1.5 font-black tabular-nums text-white">{fmtNum(totalQty)}</td>
            {costs && (
              <>
                <td className="border border-white/10" />
                <td className="border border-white/10 px-2 py-1.5 font-black tabular-nums text-white">{fmtNum(totalValue, 2)}</td>
              </>
            )}
            <td className="border border-white/10" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
};
