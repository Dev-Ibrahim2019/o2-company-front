/**
 * StockDocumentFormModal.tsx — إنشاء/تعديل مسودة استلام مشتريات أو إتلاف.
 * الصرف/التحويل له نموذجه الخاص (TransferDocumentForm).
 *
 * المسودة لا تمس المخزون؛ الترحيل (من نافذة العرض أو زر "حفظ وترحيل") يسجّل الحركات.
 */

import React, { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useCan } from "../../../auth";
import { INVENTORY_PERMISSIONS } from "../../../auth/permissions";
import { toast } from "../../shared/Toast";
import {
  fmtNum,
  inventoryErrorMessage,
  inventoryService,
  type DocumentsMeta,
  type StockDocument,
  type StockDocumentPayload,
  type StockDocumentType,
  type StockItem,
  type Warehouse,
} from "../../../services/inventoryService";
import { StockItemPicker } from "./StockItemPicker";
import { Field, Modal, PrimaryButton, SecondaryButton, inputClass } from "./ui";

export const DOCUMENT_TITLES: Record<StockDocumentType, string> = {
  receipt: "استلام مشتريات",
  transfer: "صرفيات الأصناف",
  waste: "الهالك",
};

const HINTS: Record<StockDocumentType, string> = {
  receipt: "الكمية والتكلفة بالوحدة المختارة.",
  transfer: "الصرف لا يتجاوز رصيد مخزن المصدر.",
  waste: "يخرج بمتوسط التكلفة الحالي، مع سبب لكل سطر.",
};

interface UnitOption {
  id: number;
  name: string;
  factor: number;
}

interface Line {
  key: number;
  item: Pick<StockItem, "id" | "name" | "code"> | null;
  units: UnitOption[];
  unitId: number | "";
  quantity: string;
  unitCost: string;
  wasteReason: string;
  notes: string;
}

let nextKey = 1;
const emptyLine = (): Line => ({ key: nextKey++, item: null, units: [], unitId: "", quantity: "", unitCost: "", wasteReason: "", notes: "" });

/** وحدات الصنف: الأساسية (معامل 1) ثم البديلة. */
async function loadUnits(itemId: number): Promise<{ units: UnitOption[]; item: StockItem }> {
  const item = await inventoryService.item(itemId);
  return {
    item,
    units: [
      { id: item.base_unit_id, name: item.base_unit?.name ?? "الوحدة الأساسية", factor: 1 },
      ...(item.units ?? []).map((u) => ({ id: u.unit_id, name: u.unit?.name ?? "", factor: Number(u.factor) })),
    ],
  };
}

interface Props {
  type: StockDocumentType;
  document: StockDocument | null;
  meta: DocumentsMeta;
  warehouses: Warehouse[];
  onClose: () => void;
  onSaved: (doc: StockDocument) => void;
}

export const StockDocumentFormModal: React.FC<Props> = ({ type, document, meta, warehouses, onClose, onSaved }) => {
  const canPost = useCan(INVENTORY_PERMISSIONS.DOCUMENTS_POST);
  const active = warehouses.filter((w) => w.is_active);
  const [warehouseId, setWarehouseId] = useState<number | "">(document?.warehouse_id ?? (active.length === 1 ? active[0].id : ""));
  const [supplierId, setSupplierId] = useState<number | "">(document?.supplier_id ?? "");
  const [invoiceNo, setInvoiceNo] = useState(document?.supplier_invoice_no ?? "");
  const [documentDate, setDocumentDate] = useState(document?.document_date ?? "");
  const [notes, setNotes] = useState(document?.notes ?? "");
  const [lines, setLines] = useState<Line[]>(() => [emptyLine()]);
  const [saving, setSaving] = useState<"draft" | "post" | null>(null);

  const isReceipt = type === "receipt";
  const isWaste = type === "waste";

  // تحميل أسطر المسودة عند التعديل.
  useEffect(() => {
    if (!document?.lines) return;
    let cancelled = false;
    Promise.all(
      document.lines.map(async (l): Promise<Line> => {
        const { units } = await loadUnits(l.stock_item_id).catch(() => ({ units: [] as UnitOption[] }));
        return {
          ...emptyLine(),
          item: l.stock_item ? { id: l.stock_item.id, name: l.stock_item.name, code: l.stock_item.code } : null,
          units,
          unitId: l.unit_id,
          quantity: String(Number(l.quantity)),
          unitCost: l.unit_cost !== null ? String(Number(l.unit_cost)) : "",
          wasteReason: l.waste_reason ?? "",
          notes: l.notes ?? "",
        };
      }),
    ).then((loaded) => !cancelled && loaded.length > 0 && setLines(loaded));
    return () => {
      cancelled = true;
    };
  }, [document]);

  const update = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const selectItem = async (key: number, picked: StockItem | null) => {
    if (!picked) {
      update(key, { item: null, units: [], unitId: "", unitCost: "" });
      return;
    }
    update(key, { item: picked, units: [], unitId: "" });
    try {
      const { item, units } = await loadUnits(picked.id);
      let unitId: number = isReceipt ? (item.purchase_unit_id ?? item.base_unit_id) : item.base_unit_id;
      let unitCost = "";
      if (isReceipt && supplierId !== "") {
        const link = (await inventoryService.itemSuppliers(item.id).catch(() => [])).find((s) => s.supplier_id === supplierId);
        if (link?.price != null) {
          unitId = link.unit_id ?? item.base_unit_id;
          unitCost = String(Number(link.price));
        }
      }
      update(key, { units, unitId, unitCost });
      if (isReceipt && warehouseId === "" && item.default_warehouse_id) setWarehouseId(item.default_warehouse_id);
    } catch (e) {
      toast.error("تعذّر تحميل الصنف", inventoryErrorMessage(e));
    }
  };

  const total = useMemo(() => lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitCost) || 0), 0), [lines]);
  const chosenIds = lines.map((l) => l.item?.id).filter((id): id is number => typeof id === "number");

  const buildPayload = (): StockDocumentPayload | null => {
    if (warehouseId === "") {
      toast.warning("اختر المخزن");
      return null;
    }
    if (isReceipt && supplierId === "") {
      toast.warning("اختر المورّد");
      return null;
    }
    const filled = lines.filter((l) => l.item);
    if (filled.length === 0) {
      toast.warning("أضف صنفاً واحداً على الأقل");
      return null;
    }
    const bad = filled.find((l) => !(Number(l.quantity) > 0) || (isReceipt && (l.unitCost === "" || Number(l.unitCost) < 0)) || (isWaste && !l.wasteReason));
    if (bad) {
      toast.warning(`أكمل بيانات الصنف "${bad.item?.name}"`, isReceipt ? "الكمية وتكلفة الوحدة مطلوبتان." : isWaste ? "الكمية وسبب الهالك مطلوبان." :"الكمية أكبر من صفر.");
      return null;
    }
    return {
      ...(document ? {} : { type }),
      warehouse_id: warehouseId,
      supplier_id: isReceipt ? (supplierId as number) : null,
      supplier_invoice_no: isReceipt ? invoiceNo.trim() || null : null,
      document_date: documentDate || null,
      notes: notes.trim() || null,
      lines: filled.map((l) => ({
        stock_item_id: l.item!.id,
        unit_id: l.unitId === "" ? null : l.unitId,
        quantity: Number(l.quantity),
        unit_cost: isReceipt ? Number(l.unitCost) : null,
        waste_reason: isWaste ? l.wasteReason : null,
        notes: l.notes.trim() || null,
      })),
    };
  };

  const save = async (andPost: boolean) => {
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
    onSaved(saved);
  };

  return (
    <Modal
      wide
      title={document ? `تعديل ${document.number}` : `${DOCUMENT_TITLES[type]} — مستند جديد`}
      onClose={onClose}
      footer={
        <>
          {isReceipt && (
            <span className="text-sm text-slate-400 font-bold self-center ml-auto">
              الإجمالي: <span className="text-white tabular-nums">{fmtNum(total, 2)} ₪</span>
            </span>
          )}
          <SecondaryButton onClick={onClose}>إلغاء</SecondaryButton>
          <SecondaryButton onClick={() => save(false)} disabled={saving !== null}>
            {saving === "draft" ? "جارٍ الحفظ..." : "حفظ كمسودة"}
          </SecondaryButton>
          {canPost && (
            <PrimaryButton onClick={() => save(true)} loading={saving === "post"} disabled={saving !== null}>
              حفظ وترحيل
            </PrimaryButton>
          )}
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save(false);
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="المخزن" required>
            <select className={inputClass} value={warehouseId} onChange={(e) => setWarehouseId(e.target.value ? Number(e.target.value) : "")}>
              <option value="">— اختر —</option>
              {active.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </Field>
          {isReceipt && (
            <>
              <Field label="المورّد" required>
                <select className={inputClass} value={supplierId} onChange={(e) => setSupplierId(e.target.value ? Number(e.target.value) : "")}>
                  <option value="">— اختر —</option>
                  {meta.suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="رقم فاتورة المورّد">
                <input className={inputClass} value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} dir="ltr" maxLength={64} />
              </Field>
            </>
          )}
          <Field label="التاريخ" hint="اليوم المحاسبي؛ فارغ = اليوم.">
            <input type="date" className={inputClass} value={documentDate} onChange={(e) => setDocumentDate(e.target.value)} dir="ltr" />
          </Field>
          <Field label="ملاحظات">
            <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
          </Field>
        </div>

        <p className="text-[11px] text-slate-500 font-semibold">{HINTS[type]}</p>

        <div className="space-y-3">
          {lines.map((l, idx) => (
            <div key={l.key} className="p-3 rounded-2xl bg-slate-800/40 border border-white/5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-slate-500">سطر {idx + 1}</span>
                {lines.length > 1 && (
                  <button
                    type="button"
                    aria-label="حذف السطر"
                    onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-600/10 text-red-400 hover:bg-red-600/20"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <StockItemPicker value={l.item} onChange={(item) => selectItem(l.key, item)} excludeIds={chosenIds} ariaLabel={`صنف السطر ${idx + 1}`} />
              {l.item && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
                  <Field label="الوحدة">
                    <select className={inputClass} value={l.unitId} onChange={(e) => update(l.key, { unitId: Number(e.target.value) })} disabled={l.units.length === 0}>
                      {l.units.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                          {u.factor !== 1 ? ` (${fmtNum(u.factor)})` : ""}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="الكمية" required>
                    <input className={inputClass} type="number" min={0} step="any" dir="ltr" value={l.quantity} onChange={(e) => update(l.key, { quantity: e.target.value })} />
                  </Field>

                  {isReceipt && (
                    <>
                      <Field label="تكلفة الوحدة (₪)" required>
                        <input className={inputClass} type="number" min={0} step="any" dir="ltr" value={l.unitCost} onChange={(e) => update(l.key, { unitCost: e.target.value })} />
                      </Field>
                      <div className="pb-3 text-sm font-bold text-slate-300 tabular-nums">= {fmtNum((Number(l.quantity) || 0) * (Number(l.unitCost) || 0), 2)} ₪</div>
                    </>
                  )}

                  {isWaste && (
                    <Field label="سبب الهالك" required>
                      <select className={inputClass} value={l.wasteReason} onChange={(e) => update(l.key, { wasteReason: e.target.value })}>
                        <option value="">— اختر —</option>
                        {meta.waste_reasons.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}

                  {!isReceipt && (
                    <Field label="ملاحظة">
                      <input className={inputClass} value={l.notes} onChange={(e) => update(l.key, { notes: e.target.value })} maxLength={500} />
                    </Field>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <button type="button" onClick={() => setLines((ls) => [...ls, emptyLine()])} className="flex items-center gap-1 text-xs font-bold text-red-400 hover:text-red-300">
          <Plus size={14} /> إضافة صنف
        </button>
      </form>
    </Modal>
  );
};
