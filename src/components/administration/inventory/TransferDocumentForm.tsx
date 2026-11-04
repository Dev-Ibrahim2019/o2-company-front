/**
 * TransferDocumentForm.tsx — نموذج "صرف للأقسام / تحويل" بجدول إدخال سريع.
 *
 * لكل سطر: رصيد الصنف في مخزن المصدر بالوحدة المختارة ومتوسط تكلفته (نداء واحد items/{id}/stock).
 * الكمية التي تتجاوز المتاح تُعلَّم على السطر وتمنع "حفظ وترحيل" (المسودة مسموحة)؛ والخادم يرفض التجاوز
 * عند الترحيل على كل حال. الأنواع الأخرى من المستندات تبقى على StockDocumentFormModal.
 *
 * لوحة المفاتيح: Enter للخانة التالية (وفي آخر خانة لسطر جديد)، ↑/↓ بين الصفوف في خانات الكتابة
 * (القوائم المنسدلة تحتفظ بأسهمها)، Ctrl+Delete يحذف السطر. F2 مسودة، F9 ترحيل، F3 مستند جديد،
 * Esc إغلاق — مع تأكيد إن وُجدت تغييرات غير محفوظة.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { useCan } from "../../../auth";
import { INVENTORY_PERMISSIONS } from "../../../auth/permissions";
import { toast } from "../../shared/Toast";
import {
  fmtNum,
  inventoryErrorMessage,
  inventoryService,
  type ItemStock,
  type StockDocument,
  type StockDocumentPayload,
  type StockItem,
  type Warehouse,
} from "../../../services/inventoryService";
import { Field, Modal, PrimaryButton, SecondaryButton, inputClass } from "./ui";
import { ItemSearch, cellInput, useGridNavigation } from "./gridEntry";

interface Line {
  key: number;
  item: { id: number; name: string; code: string } | null;
  stock: ItemStock | null;
  loading: boolean;
  unitId: number | "";
  quantity: string;
  notes: string;
}

let nextKey = 1;
const emptyLine = (): Line => ({ key: nextKey++, item: null, stock: null, loading: false, unitId: "", quantity: "", notes: "" });

const EPS = 1e-9;
/** ترتيب خانات السطر لـ Enter. */
const COLS = ["unit", "qty", "notes"] as const;

interface LineState {
  factor: number;
  unitName: string;
  /** الرصيد الكلي في المصدر بالوحدة المختارة. */
  available: number | null;
  /** تكلفة الوحدة المختارة = متوسط تكلفة الوحدة الأساسية × المعامل. */
  cost: number | null;
  total: number | null;
  error: string | null;
}

/** حدّ الصرف للسطر (بالوحدة الأساسية) كما يفرضه الخادم عند الترحيل: رصيد الصنف في مخزن المصدر. */
function lineState(l: Line): LineState {
  const unit = l.stock?.units.find((u) => u.id === l.unitId);
  const factor = Number(unit?.factor ?? 1) || 1;
  const unitName = unit?.name ?? l.stock?.unit ?? "";
  if (!l.stock) return { factor, unitName, available: null, cost: null, total: null, error: null };

  const qty = Number(l.quantity) || 0;
  const balance = Number(l.stock.qty);
  const cost = l.stock.avg_cost !== null ? Number(l.stock.avg_cost) * factor : null;
  const total = cost !== null ? qty * cost : null;
  const show = (base: number) => `${fmtNum(base / factor)} ${unitName}`;

  let error: string | null = null;
  const requested = qty * factor;
  if (qty > 0) {
    if (requested > balance + EPS) error = `الكمية أكبر من الرصيد المتاح (${show(balance)})`;
  }

  return { factor, unitName, available: balance / factor, cost, total, error };
}

/* ── النموذج ── */

interface Props {
  document: StockDocument | null;
  warehouses: Warehouse[];
  onClose: () => void;
  onSaved: (doc: StockDocument) => void;
  /** F3: فتح مستند جديد فارغ مكان الحالي. */
  onNew: () => void;
}

export const TransferDocumentForm: React.FC<Props> = ({ document, warehouses, onClose, onSaved, onNew }) => {
  const canPost = useCan(INVENTORY_PERMISSIONS.DOCUMENTS_POST);
  const active = warehouses.filter((w) => w.is_active);
  const [warehouseId, setWarehouseId] = useState<number | "">(document?.warehouse_id ?? (active.length === 1 ? active[0].id : ""));
  const [toWarehouseId, setToWarehouseId] = useState<number | "">(document?.to_warehouse_id ?? "");
  const [destination, setDestination] = useState(document?.destination ?? "");
  const [referenceNo, setReferenceNo] = useState(document?.reference_no ?? "");
  const [documentDate, setDocumentDate] = useState(document?.document_date ?? "");
  const [notes, setNotes] = useState(document?.notes ?? "");
  const [lines, setLines] = useState<Line[]>(() => [emptyLine()]);
  const [saving, setSaving] = useState<"draft" | "post" | null>(null);
  /** تغييرات المستخدم منذ الفتح (لتأكيد الإغلاق). */
  const dirty = useRef(false);

  const update = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  /** تعديل من المستخدم (لا من تحميل الرصيد). */
  const edit = (key: number, patch: Partial<Line>) => {
    dirty.current = true;
    update(key, patch);
  };
  const touched =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      dirty.current = true;
      set(v);
    };

  /** يجلب رصيد الصنف في المصدر بوحداته. */
  const loadStock = async (key: number, itemId: number, wh: number | "", keep?: { unitId: number | "" }) => {
    if (wh === "") return;
    update(key, { loading: true });
    try {
      const stock = await inventoryService.itemStock(itemId, wh);
      const unitId = keep?.unitId !== undefined && stock.units.some((u) => u.id === keep.unitId) ? keep.unitId : stock.units[0]?.id ?? "";
      update(key, { stock, unitId, loading: false });
    } catch (e) {
      update(key, { loading: false });
      toast.error("تعذّر تحميل رصيد الصنف", inventoryErrorMessage(e));
    }
  };

  // أسطر المسودة عند التعديل: نداء رصيد واحد لكل سطر.
  useEffect(() => {
    if (!document?.lines?.length) return;
    const loaded = document.lines.map(
      (l): Line => ({
        ...emptyLine(),
        item: l.stock_item ? { id: l.stock_item.id, name: l.stock_item.name, code: l.stock_item.code } : null,
        unitId: l.unit_id,
        quantity: String(Number(l.quantity)),
        notes: l.notes ?? "",
      }),
    );
    setLines([...loaded, emptyLine()]);
    loaded.forEach((l) => l.item && loadStock(l.key, l.item.id, document.warehouse_id, { unitId: l.unitId }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document]);

  const changeWarehouse = (wh: number | "") => {
    dirty.current = true;
    setWarehouseId(wh);
    // تغيير المصدر يعيد رصيد كل الأسطر.
    for (const l of lines) {
      if (!l.item) continue;
      if (wh === "") update(l.key, { stock: null });
      else loadStock(l.key, l.item.id, wh, { unitId: l.unitId });
    }
  };

  const pickItem = (key: number, item: StockItem) => {
    dirty.current = true;
    setLines((ls) => {
      const next = ls.map((l) => (l.key === key ? { ...l, item: { id: item.id, name: item.name, code: item.code } } : l));
      return next[next.length - 1].item ? [...next, emptyLine()] : next;
    });
    grid.requestFocus({ key, col: "qty" });
    loadStock(key, item.id, warehouseId);
  };

  const removeLine = (key: number) => {
    dirty.current = true;
    setLines((ls) => (ls.length > 1 ? ls.filter((l) => l.key !== key) : ls));
  };

  const grid = useGridNavigation({ rows: lines.map((l) => ({ key: l.key, filled: Boolean(l.item) })), cols: COLS, upCol: "qty", onRemove: removeLine });

  const filled = lines.filter((l) => l.item);
  const states = useMemo(() => new Map(lines.map((l) => [l.key, lineState(l)])), [lines]);
  const costsVisible = filled.every((l) => !l.stock || l.stock.avg_cost !== null);
  const grandTotal = filled.reduce((s, l) => s + (states.get(l.key)?.total ?? 0), 0);
  const hasErrors = filled.some((l) => states.get(l.key)?.error);
  const anyLoading = filled.some((l) => l.loading);
  const excludeIds = filled.map((l) => l.item!.id);

  const buildPayload = (): StockDocumentPayload | null => {
    if (warehouseId === "") {
      toast.warning("اختر «من مخزن»");
      return null;
    }
    if (toWarehouseId === "") {
      toast.warning("اختر المخزن الوجهة");
      return null;
    }
    if (filled.length === 0) {
      toast.warning("أضف صنفاً واحداً على الأقل");
      return null;
    }
    const bad = filled.find((l) => !(Number(l.quantity) > 0));
    if (bad) {
      toast.warning(`أدخل كمية أكبر من صفر للصنف "${bad.item?.name}"`);
      return null;
    }
    return {
      ...(document ? {} : { type: "transfer" as const }),
      warehouse_id: warehouseId,
      to_warehouse_id: toWarehouseId,
      destination: destination.trim() || null,
      reference_no: referenceNo.trim() || null,
      document_date: documentDate || null,
      notes: notes.trim() || null,
      lines: filled.map((l) => ({
        stock_item_id: l.item!.id,
        unit_id: l.unitId === "" ? null : l.unitId,
        quantity: Number(l.quantity),
        notes: l.notes.trim() || null,
      })),
    };
  };

  const save = async (andPost: boolean) => {
    if (saving) return;
    if (andPost && (hasErrors || anyLoading)) {
      toast.warning("لا يمكن الترحيل", "صحّح الأسطر المعلَّمة بالأحمر أولاً، أو احفظ كمسودة.");
      return;
    }
    const payload = buildPayload();
    if (!payload) return;
    setSaving(andPost ? "post" : "draft");
    let saved: StockDocument;
    try {
      saved = document ? await inventoryService.updateDocument(document.id, payload) : await inventoryService.createDocument(payload);
    } catch (err) {
      toast.error("تعذّر حفظ المسودة", inventoryErrorMessage(err));
      setSaving(null);
      return;
    }
    if (andPost) {
      try {
        saved = await inventoryService.postDocument(saved.id);
        toast.success(`تم ترحيل ${saved.number}`);
      } catch (err) {
        toast.error("حُفظت المسودة لكن تعذّر الترحيل", inventoryErrorMessage(err));
      }
    } else {
      toast.success(`تم حفظ المسودة ${saved.number}`);
    }
    setSaving(null);
    dirty.current = false;
    onSaved(saved);
  };

  const confirmDiscard = () => !dirty.current || window.confirm("توجد تغييرات غير محفوظة. تجاهلها؟");
  const requestClose = () => confirmDiscard() && onClose();

  // اختصارات المستند — فقط والنموذج مفتوح؛ أحدث الدوال عبر ref حتى لا يُعاد ربط المستمع كل رسم.
  const actions = useRef({ save, requestClose, onNew, confirmDiscard });
  actions.current = { save, requestClose, onNew, confirmDiscard };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      const a = actions.current;
      if (e.key === "F2" || e.key === "F9") {
        e.preventDefault();
        a.save(e.key === "F9");
      } else if (e.key === "F3") {
        e.preventDefault();
        if (a.confirmDiscard()) a.onNew();
      } else if (e.key === "Escape") {
        e.preventDefault();
        a.requestClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const whSelect = (value: number | "", set: (v: number | "") => void, exclude?: number | "") => (
    <select className={inputClass} value={value} onChange={(e) => set(e.target.value ? Number(e.target.value) : "")}>
      <option value="">— اختر —</option>
      {active
        .filter((w) => w.id !== exclude)
        .map((w) => (
          <option key={w.id} value={w.id}>
            {w.name}
          </option>
        ))}
    </select>
  );

  return (
    <Modal
      xwide
      title={document ? `تعديل ${document.number}` : "صرف للأقسام / تحويل — مستند جديد"}
      onClose={requestClose}
      footer={
        <>
          <span className="hidden lg:flex items-center text-[11px] text-slate-500 font-semibold" dir="rtl">
            <kbd className="font-mono">F2</kbd>&nbsp;مسودة · <kbd className="font-mono">F9</kbd>&nbsp;ترحيل · <kbd className="font-mono">F3</kbd>&nbsp;جديد ·{" "}
            <kbd className="font-mono">Ctrl+Del</kbd>&nbsp;حذف سطر · <kbd className="font-mono">Esc</kbd>&nbsp;إغلاق
          </span>
          <div className="flex items-center gap-4 ml-auto text-sm font-bold text-slate-400">
            <span>
              عدد الأصناف: <span className="text-white tabular-nums">{filled.length}</span>
            </span>
            {costsVisible && (
              <span>
                الإجمالي: <span className="text-white tabular-nums">{fmtNum(grandTotal, 2)} ₪</span>
              </span>
            )}
          </div>
          <SecondaryButton onClick={requestClose}>إلغاء</SecondaryButton>
          <SecondaryButton onClick={() => save(false)} disabled={saving !== null}>
            {saving === "draft" ? "جارٍ الحفظ..." : "حفظ كمسودة"}
          </SecondaryButton>
          {canPost && (
            <PrimaryButton
              onClick={() => save(true)}
              loading={saving === "post"}
              disabled={saving !== null || hasErrors || anyLoading}
              title={hasErrors ? "توجد أسطر تتجاوز الرصيد" : undefined}
            >
              حفظ وترحيل
            </PrimaryButton>
          )}
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <Field label="من مخزن" required>
          {whSelect(warehouseId, changeWarehouse)}
        </Field>
        <Field label="إلى مخزن (القسم)" required>
          {whSelect(toWarehouseId, touched(setToWarehouseId), warehouseId)}
        </Field>
        <Field label="الجهة">
          <input className={inputClass} value={destination} onChange={(e) => touched(setDestination)(e.target.value)} maxLength={150} placeholder="مثال: قسم الشاورما — النصيرات" />
        </Field>
        <Field label="رقم المرجع">
          <input className={inputClass} value={referenceNo} onChange={(e) => touched(setReferenceNo)(e.target.value)} maxLength={64} dir="auto" placeholder="اختياري" />
        </Field>
        <Field label="التاريخ" hint="اليوم المحاسبي؛ فارغ = اليوم.">
          <input type="date" className={inputClass} value={documentDate} onChange={(e) => touched(setDocumentDate)(e.target.value)} dir="ltr" />
        </Field>
        <Field label="ملاحظات">
          <input className={inputClass} value={notes} onChange={(e) => touched(setNotes)(e.target.value)} maxLength={1000} />
        </Field>
      </div>

      <p className="text-[11px] text-slate-500 font-semibold">
        الصرف لا يتجاوز رصيد مخزن المصدر. الصنف يخرج بمتوسط تكلفته ويدخل مخزن القسم بالتكلفة نفسها.
      </p>

      <div ref={grid.tableRef} onKeyDown={grid.onKeyDown} className="bg-slate-950/40 rounded-2xl border border-white/5 overflow-x-auto custom-scrollbar">
        <table className="w-full text-sm min-w-[1100px]">
          <thead>
            <tr className="text-slate-500 text-xs font-black border-b border-white/5">
              <th className="text-right p-2 w-8">#</th>
              <th className="text-right p-2 w-28">رقم الصنف</th>
              <th className="text-right p-2">اسم الصنف</th>
              <th className="text-right p-2 w-28">الوحدة</th>
              <th className="text-right p-2 w-28">الرصيد</th>
              <th className="text-right p-2 w-28">الكمية</th>
              <th className="text-right p-2 w-24">التكلفة</th>
              <th className="text-right p-2 w-28">الإجمالي</th>
              <th className="text-right p-2 w-40">ملاحظة</th>
              <th className="p-2 w-10">
                <span className="sr-only">حذف</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, idx) => {
              const st = states.get(l.key)!;
              if (!l.item) {
                return (
                  <tr key={l.key} className="border-t border-white/5">
                    <td className="p-2 text-slate-600 tabular-nums">{idx + 1}</td>
                    <td className="p-2" colSpan={2}>
                      <ItemSearch disabled={warehouseId === ""} disabledPlaceholder="اختر «من مخزن» أولاً" excludeIds={excludeIds} onPick={(item) => pickItem(l.key, item)} inputRef={grid.searchRef} />
                    </td>
                    <td colSpan={7} />
                  </tr>
                );
              }
              return (
                <React.Fragment key={l.key}>
                  <tr className={`border-t border-white/5 align-top ${st.error ? "bg-red-500/5" : ""}`}>
                    <td className="p-2 pt-3.5 text-slate-500 tabular-nums">{idx + 1}</td>
                    <td className="p-2 pt-3.5">
                      <bdi className="font-mono text-xs text-slate-300">{l.item.code}</bdi>
                    </td>
                    <td className="p-2 pt-3.5 font-bold text-white">{l.item.name}</td>
                    <td className="p-2">
                      <select
                        className={cellInput}
                        value={l.unitId}
                        onChange={(e) => edit(l.key, { unitId: Number(e.target.value) })}
                        disabled={!l.stock}
                        data-key={l.key}
                        data-col="unit"
                        aria-label={`وحدة السطر ${idx + 1}`}
                      >
                        {l.stock?.units.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2 pt-3.5 tabular-nums text-slate-300 whitespace-nowrap">
                      {l.loading ? <Loader2 size={14} className="animate-spin text-slate-500" /> : st.available !== null ? `${fmtNum(st.available)} ${st.unitName}` : "—"}
                    </td>
                    <td className="p-2">
                      <input
                        className={`${cellInput} ${st.error ? "!border-red-500/60" : ""}`}
                        type="number"
                        min={0}
                        step="any"
                        dir="ltr"
                        value={l.quantity}
                        onChange={(e) => edit(l.key, { quantity: e.target.value })}
                        data-key={l.key}
                        data-col="qty"
                        aria-label={`كمية السطر ${idx + 1}`}
                        aria-invalid={Boolean(st.error)}
                      />
                    </td>
                    <td className="p-2 pt-3.5 tabular-nums text-slate-300">{st.cost !== null ? fmtNum(st.cost, 4) : "—"}</td>
                    <td className="p-2 pt-3.5 tabular-nums font-bold text-white">{st.total !== null ? fmtNum(st.total, 2) : "—"}</td>
                    <td className="p-2">
                      <input
                        className={cellInput}
                        value={l.notes}
                        onChange={(e) => edit(l.key, { notes: e.target.value })}
                        maxLength={500}
                        data-key={l.key}
                        data-col="notes"
                        aria-label={`ملاحظة السطر ${idx + 1}`}
                      />
                    </td>
                    <td className="p-2">
                      <button
                        type="button"
                        aria-label={`حذف السطر ${idx + 1}`}
                        onClick={() => removeLine(l.key)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-600/10 text-red-400 hover:bg-red-600/20"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                  {st.error && (
                    <tr className="bg-red-500/5">
                      <td />
                      <td colSpan={9} className="px-2 pb-2">
                        <span role="alert" className="flex items-center gap-1.5 text-xs font-bold text-red-400">
                          <AlertTriangle size={13} /> {st.error}
                        </span>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </Modal>
  );
};
