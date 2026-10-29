/**
 * StockDocumentFormModal.tsx — إنشاء/تعديل مسودة مستند مخزني بكل أنواعه:
 * استلام (دفعات بتاريخ إنتاج وانتهاء)، صرف/تحويل بالدفعة، إتلاف، تفريك، إنتاج مصنع، أسياخ شاورما، مبيعات معرض.
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
  type BatchRow,
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
  transfer: "صرف للأقسام / تحويل",
  waste: "الإتلاف",
  breakdown: "التفريك",
  production: "إنتاج المصنع",
  skewer: "أسياخ الشاورما",
  showroom_sale: "مبيعات المعرض",
};

const HINTS: Record<StockDocumentType, string> = {
  receipt: "الكمية والتكلفة بالوحدة المختارة. الصنف الذي يتتبع الصلاحية يُنشئ دفعة بكود تلقائي (كود الصنف + تسلسل) ويتطلب تاريخ الانتهاء.",
  transfer: "الصرف من دفعة محددة ولا يتجاوز رصيدها. الصنف يخرج بمتوسط تكلفته ويدخل مخزن القسم بالتكلفة نفسها.",
  waste: "يخرج بمتوسط التكلفة الحالي، من دفعة إن وُجدت. الإتلاف لا يُحسب عجزاً في الإنتاجية اليومية.",
  breakdown: "صنف داخل واحد (مثلاً دجاج كامل) وأصناف ناتجة (صدر، فخذ، جناح...). قيمة الداخل توزَّع على الناتج بالوزن × نسبة القيمة، وكل ناتج يصبح دفعة جديدة.",
  production: "كل منتج بوزنه يدخل مخزن المنتجات كدفعة برقم تلقائي بتكلفة وصفته. المواد الخام تُحسب من جرد مخزن المواد اليومي.",
  skewer: "كل سطر سيخ واحد بوزنه، برقم تسلسلي فريد لا يتكرر. مجموع أوزان أسياخ اليوم لا يتجاوز اللحوم المستهلكة حسب جرد اليوم.",
  showroom_sale: "مبيعات بالوزن تُخصم من المعرض ولا تتجاوز المتوفر. بلا دفعة محددة تُخصم من الأقرب انتهاءً أولاً.",
};

interface UnitOption {
  id: number;
  name: string;
  factor: number;
}

interface Line {
  key: number;
  item: Pick<StockItem, "id" | "name" | "code"> | null;
  tracksExpiry: boolean;
  units: UnitOption[];
  unitId: number | "";
  quantity: string;
  unitCost: string;
  wasteReason: string;
  notes: string;
  batchId: number | "";
  batches: BatchRow[];
  cartons: string;
  productionDate: string;
  expiryDate: string;
  direction: "in" | "out";
  valueRatio: string;
  isPrime: boolean;
  salePrice: string;
}

let nextKey = 1;
const emptyLine = (direction: "in" | "out" = "out"): Line => ({
  key: nextKey++,
  item: null,
  tracksExpiry: false,
  units: [],
  unitId: "",
  quantity: "",
  unitCost: "",
  wasteReason: "",
  notes: "",
  batchId: "",
  batches: [],
  cartons: "",
  productionDate: "",
  expiryDate: "",
  direction,
  valueRatio: "",
  isPrime: false,
  salePrice: "",
});

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

const fetchBatches = (itemId: number, wh: number | "") =>
  wh === "" ? Promise.resolve([] as BatchRow[]) : inventoryService.batches({ warehouse_id: wh, stock_item_id: itemId, available: 1 }).catch(() => [] as BatchRow[]);

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
  const [toWarehouseId, setToWarehouseId] = useState<number | "">(document?.to_warehouse_id ?? "");
  const [supplierId, setSupplierId] = useState<number | "">(document?.supplier_id ?? "");
  const [invoiceNo, setInvoiceNo] = useState(document?.supplier_invoice_no ?? "");
  const [destination, setDestination] = useState(document?.destination ?? "");
  const [delivery, setDelivery] = useState<"delivered" | "undelivered">(document?.delivery_status ?? "undelivered");
  const [documentDate, setDocumentDate] = useState(document?.document_date ?? "");
  const [notes, setNotes] = useState(document?.notes ?? "");
  const [lines, setLines] = useState<Line[]>(() => (type === "breakdown" ? [emptyLine("in"), emptyLine("out")] : [emptyLine()]));
  const [saving, setSaving] = useState<"draft" | "post" | null>(null);

  const isReceipt = type === "receipt";
  const isTransfer = type === "transfer";
  const isWaste = type === "waste";
  const isBreakdown = type === "breakdown";
  const isProduction = type === "production";
  const isSale = type === "showroom_sale";
  const isSkewer = type === "skewer";
  const usesBatch = isTransfer || isWaste || isSale || isBreakdown;

  // تحميل أسطر المسودة عند التعديل.
  useEffect(() => {
    if (!document?.lines) return;
    let cancelled = false;
    Promise.all(
      document.lines.map(async (l): Promise<Line> => {
        const { units } = await loadUnits(l.stock_item_id).catch(() => ({ units: [] as UnitOption[] }));
        return {
          ...emptyLine(l.direction ?? "out"),
          item: l.stock_item ? { id: l.stock_item.id, name: l.stock_item.name, code: l.stock_item.code } : null,
          tracksExpiry: Boolean(l.stock_item?.tracks_expiry),
          units,
          unitId: l.unit_id,
          quantity: String(Number(l.quantity)),
          unitCost: l.unit_cost !== null ? String(Number(l.unit_cost)) : "",
          wasteReason: l.waste_reason ?? "",
          notes: l.notes ?? "",
          batchId: l.batch_id ?? "",
          batches: await fetchBatches(l.stock_item_id, document.warehouse_id),
          cartons: l.cartons ? String(Number(l.cartons)) : "",
          productionDate: l.production_date ?? "",
          expiryDate: l.expiry_date ?? "",
          valueRatio: l.value_ratio ? String(Number(l.value_ratio)) : "",
          isPrime: Boolean(l.is_prime),
          salePrice: l.sale_price ? String(Number(l.sale_price)) : "",
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
      update(key, { item: null, units: [], unitId: "", unitCost: "", batchId: "", batches: [] });
      return;
    }
    update(key, { item: picked, units: [], unitId: "", batchId: "", batches: [] });
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
      const batches = usesBatch ? await fetchBatches(item.id, warehouseId) : [];
      update(key, { units, unitId, unitCost, tracksExpiry: Boolean(item.tracks_expiry), batches, batchId: batches.length === 1 ? batches[0].id : "" });
      if (isReceipt && warehouseId === "" && item.default_warehouse_id) setWarehouseId(item.default_warehouse_id);
    } catch (e) {
      toast.error("تعذّر تحميل الصنف", inventoryErrorMessage(e));
    }
  };

  const changeWarehouse = async (wh: number | "") => {
    setWarehouseId(wh);
    if (!usesBatch) return;
    // تغيير المخزن المصدر يعيد تحميل دفعات الأسطر.
    for (const l of lines) {
      if (!l.item) continue;
      const batches = await fetchBatches(l.item.id, wh);
      update(l.key, { batches, batchId: batches.some((b) => b.id === l.batchId) ? l.batchId : "" });
    }
  };

  const total = useMemo(() => lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(isSale ? l.salePrice : l.unitCost) || 0), 0), [lines, isSale]);
  const chosenIds = isBreakdown ? [] : lines.map((l) => l.item?.id).filter((id): id is number => typeof id === "number");

  // التفريك: الفاقد = (الداخل − مجموع الناتج) ÷ الداخل (بالوحدة الأساسية)
  const breakdownPreview = useMemo(() => {
    if (!isBreakdown) return null;
    const base = (l: Line) => (Number(l.quantity) || 0) * (l.units.find((u) => u.id === l.unitId)?.factor ?? 1);
    const input = lines.filter((l) => l.direction === "in").reduce((s, l) => s + base(l), 0);
    const output = lines.filter((l) => l.direction === "out").reduce((s, l) => s + base(l), 0);
    const prime = lines.filter((l) => l.direction === "out" && l.isPrime).reduce((s, l) => s + base(l), 0);
    return input > 0 ? { loss: ((input - output) / input) * 100, prime: (prime / input) * 100 } : null;
  }, [lines, isBreakdown]);

  const buildPayload = (): StockDocumentPayload | null => {
    if (warehouseId === "") {
      toast.warning("اختر المخزن");
      return null;
    }
    if ((isTransfer || isProduction) && toWarehouseId === "") {
      toast.warning(isProduction ? "اختر مخزن منتجات المصنع" : "اختر المخزن الوجهة");
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
    const bad = filled.find(
      (l) =>
        !(Number(l.quantity) > 0) ||
        (isReceipt && (l.unitCost === "" || Number(l.unitCost) < 0 || (l.tracksExpiry && !l.expiryDate))) ||
        (isWaste && !l.wasteReason) ||
        (isSale && (l.salePrice === "" || Number(l.salePrice) < 0)),
    );
    if (bad) {
      toast.warning(
        `أكمل بيانات الصنف "${bad.item?.name}"`,
        isReceipt
          ? "الكمية وتكلفة الوحدة مطلوبتان، وتاريخ الانتهاء للأصناف التي تتتبع الصلاحية."
          : isWaste
            ? "الكمية وسبب الإتلاف مطلوبان."
            : isSale
              ? "الكمية وسعر البيع مطلوبان."
              : "الكمية أكبر من صفر.",
      );
      return null;
    }
    return {
      ...(document ? {} : { type }),
      warehouse_id: warehouseId,
      to_warehouse_id: isTransfer || isProduction ? (toWarehouseId as number) : null,
      supplier_id: isReceipt ? (supplierId as number) : null,
      supplier_invoice_no: isReceipt ? invoiceNo.trim() || null : null,
      destination: isTransfer ? destination.trim() || null : null,
      delivery_status: isTransfer ? delivery : null,
      document_date: documentDate || null,
      notes: notes.trim() || null,
      lines: filled.map((l) => ({
        stock_item_id: l.item!.id,
        unit_id: l.unitId === "" ? null : l.unitId,
        quantity: Number(l.quantity),
        unit_cost: isReceipt ? Number(l.unitCost) : null,
        waste_reason: isWaste ? l.wasteReason : null,
        notes: l.notes.trim() || null,
        batch_id: usesBatch && l.batchId !== "" && (!isBreakdown || l.direction === "in") ? l.batchId : null,
        direction: isBreakdown ? l.direction : null,
        cartons: isReceipt && l.cartons ? Number(l.cartons) : null,
        production_date: l.productionDate || null,
        expiry_date: l.expiryDate || null,
        value_ratio: isBreakdown && l.direction === "out" && l.valueRatio ? Number(l.valueRatio) : null,
        is_prime: isBreakdown && l.direction === "out" ? l.isPrime : false,
        sale_price: isSale ? Number(l.salePrice) : null,
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

  const sourceLabel = isTransfer ? "من مخزن" : isProduction ? "مخزن مواد المصنع" : isSale ? "المعرض" : isWaste || isSkewer ? "مخزن القسم" : "المخزن";

  return (
    <Modal
      wide
      title={document ? `تعديل ${document.number}` : `${DOCUMENT_TITLES[type]} — مستند جديد`}
      onClose={onClose}
      footer={
        <>
          {(isReceipt || isSale) && (
            <span className="text-sm text-slate-400 font-bold self-center ml-auto">
              {isSale ? "الإيراد" : "الإجمالي"}: <span className="text-white tabular-nums">{fmtNum(total, 2)} ₪</span>
            </span>
          )}
          {breakdownPreview && (
            <span className="text-sm text-slate-400 font-bold self-center ml-auto">
              الفاقد <span className={`tabular-nums ${breakdownPreview.loss < 0 ? "text-red-400" : "text-white"}`}>{fmtNum(breakdownPreview.loss, 2)}%</span> · صدر + فخذ{" "}
              <span className="text-white tabular-nums">{fmtNum(breakdownPreview.prime, 2)}%</span>
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
          <Field label={sourceLabel} required>
            {whSelect(warehouseId, changeWarehouse)}
          </Field>
          {(isTransfer || isProduction) && (
            <Field label={isProduction ? "مخزن منتجات المصنع" : "إلى مخزن (القسم)"} required>
              {whSelect(toWarehouseId, setToWarehouseId, warehouseId)}
            </Field>
          )}
          {isTransfer && (
            <>
              <Field label="الجهة">
                <input className={inputClass} value={destination} onChange={(e) => setDestination(e.target.value)} maxLength={150} placeholder="مثال: قسم الشاورما — النصيرات" />
              </Field>
              <Field label="حالة الفاتورة">
                <select className={inputClass} value={delivery} onChange={(e) => setDelivery(e.target.value as "delivered" | "undelivered")}>
                  <option value="undelivered">غير مسلّمة</option>
                  <option value="delivered">مسلّمة</option>
                </select>
              </Field>
            </>
          )}
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
                <span className="text-xs font-black text-slate-500">
                  {isBreakdown ? (l.direction === "in" ? "الصنف الداخل" : `ناتج ${idx}`) : isSkewer ? `سيخ ${idx + 1}` : `سطر ${idx + 1}`}
                </span>
                {lines.length > 1 && !(isBreakdown && l.direction === "in") && (
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
                  <Field label={isSkewer ? "الوزن" : "الكمية"} required>
                    <input className={inputClass} type="number" min={0} step="any" dir="ltr" value={l.quantity} onChange={(e) => update(l.key, { quantity: e.target.value })} />
                  </Field>

                  {usesBatch && (!isBreakdown || l.direction === "in") && (
                    <Field label={isSale ? "الدفعة (اختياري)" : "الدفعة"} hint={l.batches.length === 0 ? "لا دفعات متاحة في هذا المخزن." : undefined}>
                      <select className={inputClass} value={l.batchId} onChange={(e) => update(l.key, { batchId: e.target.value ? Number(e.target.value) : "" })}>
                        <option value="">{isSale ? "الأقرب انتهاءً تلقائياً" : "— بلا دفعة —"}</option>
                        {l.batches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.code} — متبقٍ {fmtNum(b.remaining)} {b.base_unit}
                            {b.expiry_date ? ` — ينتهي ${b.expiry_date}` : ""}
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}

                  {isReceipt && (
                    <>
                      <Field label="تكلفة الوحدة (₪)" required>
                        <input className={inputClass} type="number" min={0} step="any" dir="ltr" value={l.unitCost} onChange={(e) => update(l.key, { unitCost: e.target.value })} />
                      </Field>
                      <Field label="الكراتين">
                        <input className={inputClass} type="number" min={0} step="any" dir="ltr" value={l.cartons} onChange={(e) => update(l.key, { cartons: e.target.value })} />
                      </Field>
                      <Field label="تاريخ الإنتاج">
                        <input className={inputClass} type="date" dir="ltr" value={l.productionDate} onChange={(e) => update(l.key, { productionDate: e.target.value })} />
                      </Field>
                      <Field label="تاريخ الانتهاء" required={l.tracksExpiry}>
                        <input className={inputClass} type="date" dir="ltr" value={l.expiryDate} onChange={(e) => update(l.key, { expiryDate: e.target.value })} />
                      </Field>
                      <div className="pb-3 text-sm font-bold text-slate-300 tabular-nums">= {fmtNum((Number(l.quantity) || 0) * (Number(l.unitCost) || 0), 2)} ₪</div>
                    </>
                  )}

                  {isWaste && (
                    <Field label="سبب الإتلاف" required>
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

                  {isSale && (
                    <Field label="سعر الوحدة (₪)" required>
                      <input className={inputClass} type="number" min={0} step="any" dir="ltr" value={l.salePrice} onChange={(e) => update(l.key, { salePrice: e.target.value })} />
                    </Field>
                  )}

                  {isBreakdown && l.direction === "out" && (
                    <>
                      <Field label="نسبة القيمة" hint="فارغ = بالوزن (1).">
                        <input className={inputClass} type="number" min={0} step="any" dir="ltr" value={l.valueRatio} onChange={(e) => update(l.key, { valueRatio: e.target.value })} />
                      </Field>
                      <label className="flex items-center gap-2 pb-3 text-xs font-bold text-slate-300">
                        <input type="checkbox" checked={l.isPrime} onChange={(e) => update(l.key, { isPrime: e.target.checked })} className="w-4 h-4 accent-red-600" />
                        صدر / فخذ
                      </label>
                    </>
                  )}

                  {(isProduction || (isBreakdown && l.direction === "out")) && (
                    <Field label="تاريخ الانتهاء">
                      <input className={inputClass} type="date" dir="ltr" value={l.expiryDate} onChange={(e) => update(l.key, { expiryDate: e.target.value })} />
                    </Field>
                  )}

                  {isSkewer && (
                    <Field label="تاريخ الإنتاج">
                      <input className={inputClass} type="date" dir="ltr" value={l.productionDate} onChange={(e) => update(l.key, { productionDate: e.target.value })} />
                    </Field>
                  )}

                  {!isReceipt && !isSale && (
                    <Field label="ملاحظة">
                      <input className={inputClass} value={l.notes} onChange={(e) => update(l.key, { notes: e.target.value })} maxLength={500} />
                    </Field>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setLines((ls) => [...ls, emptyLine("out")])}
          className="flex items-center gap-1 text-xs font-bold text-red-400 hover:text-red-300"
        >
          <Plus size={14} /> {isBreakdown ? "إضافة صنف ناتج" : isSkewer ? "إضافة سيخ" : "إضافة صنف"}
        </button>
      </form>
    </Modal>
  );
};
