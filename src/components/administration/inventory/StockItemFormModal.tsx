/**
 * StockItemFormModal.tsx — إنشاء/تعديل صنف مخزني.
 *
 * قواعد مرآة للخادم (StockItemService) — الخادم هو الحَكَم، الواجهة تمنع الخطأ مبكراً فقط:
 *  - المنتج النهائي والصنف غير الخاضع للمخزون: ربط إلزامي بصنف بيع غير مربوط بصنف آخر.
 *  - المادة الخام والمنتج الوسيط: لا ربط بصنف بيع.
 *  - المادة الخام تُخزَّن دائماً؛ غير الخاضع للمخزون لا يُخزَّن أبداً ولا يتتبع الصلاحية.
 *  - صنف له حركات: لا يتغيّر نوعه ولا وحدته الأساسية.
 *  - الوحدة الأساسية لا تتكرر ضمن الوحدات البديلة.
 */

import React, { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Link2, Lock, Loader2 } from "lucide-react";
import { toast } from "../../shared/Toast";
import {
  inventoryService,
  inventoryErrorMessage,
  SOLD_TYPES,
  type InventoryLookups,
  type SaleItem,
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
  tracks_expiry: boolean;
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
  tracks_expiry: false,
  is_active: true,
  notes: "",
  units: [],
  category_ids: [],
  name_en: "",
  purchase_unit_id: "",
  default_warehouse_id: "",
};

const saleItemLabel = (s: Pick<SaleItem, "name" | "name_ar" | "code">) => `${s.name_ar || s.name} (${s.code})`;

export const StockItemFormModal: React.FC<Props> = ({ lookups, itemId, onClose, onSaved }) => {
  const [form, setForm] = useState<Form>(EMPTY);
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
          tracks_expiry: it.tracks_expiry,
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
      tracks_expiry: type === "non_stock" ? false : f.tracks_expiry,
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
      toast.warning("اختر صنف البيع المرتبط", "المنتج النهائي والصنف غير الخاضع للمخزون يُربطان إلزامياً بصنف من قائمة البيع.");
      return;
    }
    if (form.base_unit_id === "") {
      toast.warning("اختر الوحدة الأساسية");
      return;
    }
    const units = form.units.filter((u) => u.unit_id !== "" && u.factor !== "");
    if (units.some((u) => u.unit_id === form.base_unit_id)) {
      toast.warning("الوحدة الأساسية لا تُضاف ضمن الوحدات البديلة");
      return;
    }
    if (new Set(units.map((u) => u.unit_id)).size !== units.length) {
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
      tracks_expiry: form.tracks_expiry,
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
        <form id="stock-item-form" onSubmit={submit} className="space-y-5">
          {hasMovements && (
            <div className="flex items-center gap-2 p-3 bg-amber-500/10 text-amber-300 rounded-xl text-xs font-bold border border-amber-500/20">
              <Lock size={14} className="shrink-0" />
              لهذا الصنف حركات مخزنية: النوع والوحدة الأساسية مقفلان، ولا يمكن حذفه (يمكن إيقافه).
            </div>
          )}

          {/* ── النوع ── */}
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
                    form.type === t.value
                      ? "bg-red-600/20 text-red-300 border-red-600/40"
                      : "bg-slate-800 text-slate-400 border-white/5 hover:border-white/15"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </fieldset>

          {/* ── صنف البيع المرتبط ── */}
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
                  <input
                    className={inputClass}
                    value={saleSearch}
                    onChange={(e) => setSaleSearch(e.target.value)}
                    placeholder="ابحث باسم أو كود صنف البيع..."
                    aria-label="بحث صنف البيع"
                  />
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

          {/* ── البيانات الأساسية ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="اسم الصنف" required={!isSold} hint={isSold ? "يُؤخذ من صنف البيع إن تُرك فارغاً." : undefined}>
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required={!isSold}
                placeholder="مثال: لحم بقري مفروم"
              />
            </Field>
            <Field label="الاسم بالإنجليزية">
              <input
                className={inputClass}
                value={form.name_en}
                onChange={(e) => set("name_en", e.target.value)}
                dir="ltr"
                placeholder="Minced beef"
              />
            </Field>
            <Field label="الكود" hint={itemId === null ? "يُولَّد تلقائياً إن تُرك فارغاً." : undefined}>
              <input className={inputClass} value={form.code} onChange={(e) => set("code", e.target.value)} dir="ltr" />
            </Field>
            <Field
              label="الوحدة الأساسية"
              required
              hint={hasMovements ? "مقفلة لوجود حركات." : "وحدة الحساب والتخزين؛ كل الكميات تُحوَّل إليها."}
            >
              <select
                className={inputClass}
                value={form.base_unit_id}
                onChange={(e) => set("base_unit_id", e.target.value ? Number(e.target.value) : "")}
                disabled={hasMovements}
                required
              >
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
            <Field label="مخزون الأمان" hint={form.base_unit_id ? `بالوحدة الأساسية (${unitName(form.base_unit_id)})` : undefined}>
              <input
                className={inputClass}
                type="number"
                min={0}
                step="any"
                value={form.safety_stock}
                onChange={(e) => set("safety_stock", e.target.value)}
                dir="ltr"
              />
            </Field>
            <Field label="الباركود">
              <input className={inputClass} value={form.barcode} onChange={(e) => set("barcode", e.target.value)} dir="ltr" />
            </Field>
            <Field label="كود المورّد">
              <input
                className={inputClass}
                value={form.supplier_code}
                onChange={(e) => set("supplier_code", e.target.value)}
                dir="ltr"
              />
            </Field>
          </div>

          {/* ── الوحدات البديلة ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black text-slate-400 tracking-wider">الوحدات البديلة</p>
              <button
                type="button"
                onClick={() => set("units", [...form.units, { unit_id: "", factor: "" }])}
                className="flex items-center gap-1 text-xs font-bold text-red-400 hover:text-red-300"
              >
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
                    onChange={(e) =>
                      set(
                        "units",
                        form.units.map((x, j) => (j === i ? { ...x, unit_id: e.target.value ? Number(e.target.value) : "" } : x)),
                      )
                    }
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

          {/* ── الشراء والتخزين ── */}
          {form.is_stored && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="وحدة الشراء" hint="الوحدة الافتراضية في مستندات الاستلام (كرتونة، شوال...).">
                <select
                  className={inputClass}
                  value={form.purchase_unit_id}
                  onChange={(e) => set("purchase_unit_id", e.target.value ? Number(e.target.value) : "")}
                >
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
                <select
                  className={inputClass}
                  value={form.default_warehouse_id}
                  onChange={(e) => set("default_warehouse_id", e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">— بلا —</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          )}

          {/* ── التصنيفات ── */}
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
                        on
                          ? "bg-green-600/20 text-green-300 border-green-600/40"
                          : "bg-slate-800 text-slate-400 border-white/5 hover:border-white/15"
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

          {/* ── الخيارات ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Toggle
              checked={form.is_stored}
              onChange={(v) => set("is_stored", v)}
              disabled={form.type === "raw" || form.type === "non_stock"}
              label={form.type === "raw" ? "يُخزَّن (إلزامي للمادة الخام)" : form.type === "non_stock" ? "لا يُخزَّن" : "يُخزَّن"}
            />
            <Toggle
              checked={form.tracks_expiry}
              onChange={(v) => set("tracks_expiry", v)}
              disabled={form.type === "non_stock"}
              label="يتتبع تاريخ الصلاحية"
            />
            <Toggle checked={form.is_active} onChange={(v) => set("is_active", v)} label="نشط" />
          </div>

          <Field label="ملاحظات">
            <textarea className={`${inputClass} min-h-[70px]`} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
        </form>
      )}
    </Modal>
  );
};
