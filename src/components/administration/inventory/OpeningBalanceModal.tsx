/**
 * OpeningBalanceModal.tsx — إدخال أرصدة أول المدة لمخزن.
 *
 * كل سطر يُسجَّل كحركة وارد من نوع "رصيد أول المدة" عبر محرك المخزون، والعملية كاملة ذرّية:
 * إن رُفض سطر واحد لا يُسجَّل شيء. الكمية والتكلفة بالوحدة المختارة، والخادم يحوّلهما للوحدة الأساسية.
 */

import React, { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "../../shared/Toast";
import {
  fmtNum,
  inventoryErrorMessage,
  inventoryService,
  type StockItem,
  type Warehouse,
} from "../../../services/inventoryService";
import { StockItemPicker } from "./StockItemPicker";
import { Field, Modal, PrimaryButton, SecondaryButton, inputClass } from "./ui";

interface UnitOption {
  id: number;
  name: string;
  factor: number;
}

interface Line {
  key: number;
  item: StockItem | null;
  units: UnitOption[];
  unitId: number | "";
  quantity: string;
  unitCost: string;
}

let nextKey = 1;
const emptyLine = (): Line => ({ key: nextKey++, item: null, units: [], unitId: "", quantity: "", unitCost: "" });

interface Props {
  warehouses: Warehouse[];
  defaultWarehouseId?: number;
  onClose: () => void;
  onSaved: () => void;
}

export const OpeningBalanceModal: React.FC<Props> = ({ warehouses, defaultWarehouseId, onClose, onSaved }) => {
  const [warehouseId, setWarehouseId] = useState<number | "">(defaultWarehouseId ?? "");
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const update = (key: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const selectItem = async (key: number, item: StockItem | null) => {
    if (!item) {
      update(key, { item: null, units: [], unitId: "" });
      return;
    }
    update(key, { item, units: [], unitId: item.base_unit_id });
    try {
      const full = await inventoryService.item(item.id);
      const units: UnitOption[] = [
        { id: full.base_unit_id, name: full.base_unit?.name ?? "الوحدة الأساسية", factor: 1 },
        ...(full.units ?? []).map((u) => ({ id: u.unit_id, name: u.unit?.name ?? "", factor: Number(u.factor) })),
      ];
      update(key, { units });
    } catch (e) {
      toast.error("تعذّر تحميل وحدات الصنف", inventoryErrorMessage(e));
    }
  };

  // قيمة السطر = الكمية × تكلفة الوحدة (بالوحدة المختارة)
  const lineValue = (l: Line) => (Number(l.quantity) || 0) * (Number(l.unitCost) || 0);
  const total = useMemo(() => lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitCost) || 0), 0), [lines]);
  const chosenIds = lines.map((l) => l.item?.id).filter((id): id is number => typeof id === "number");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (warehouseId === "") {
      toast.warning("اختر المخزن");
      return;
    }
    const filled = lines.filter((l) => l.item);
    if (filled.length === 0) {
      toast.warning("أضف صنفاً واحداً على الأقل");
      return;
    }
    const invalid = filled.find((l) => !(Number(l.quantity) > 0) || l.unitCost === "" || Number(l.unitCost) < 0);
    if (invalid) {
      toast.warning(`أكمل الكمية والتكلفة للصنف "${invalid.item?.name}"`, "الكمية أكبر من صفر، والتكلفة صفر أو أكثر.");
      return;
    }

    setSaving(true);
    try {
      await inventoryService.postOpening({
        warehouse_id: warehouseId,
        notes: notes.trim() || null,
        lines: filled.map((l) => ({
          stock_item_id: l.item!.id,
          quantity: Number(l.quantity),
          unit_id: l.unitId === "" ? null : l.unitId,
          unit_cost: Number(l.unitCost),
        })),
      });
      toast.success("تم تسجيل أرصدة أول المدة", `${filled.length} صنف`);
      onSaved();
    } catch (err) {
      toast.error("تعذّر التسجيل", inventoryErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      wide
      title="رصيد أول المدة"
      onClose={onClose}
      footer={
        <>
          <span className="text-sm text-slate-400 font-bold self-center ml-auto">
            الإجمالي: <span className="text-white tabular-nums">{fmtNum(total, 2)} ₪</span>
          </span>
          <SecondaryButton onClick={onClose}>إلغاء</SecondaryButton>
          <PrimaryButton type="submit" form="opening-form" loading={saving}>
            تسجيل
          </PrimaryButton>
        </>
      }
    >
      <form id="opening-form" onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="المخزن" required>
            <select
              className={inputClass}
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value ? Number(e.target.value) : "")}
              required
            >
              <option value="">— اختر المخزن —</option>
              {warehouses
                .filter((w) => w.is_active)
                .map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="ملاحظات">
            <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
          </Field>
        </div>

        <p className="text-[11px] text-slate-500 font-semibold">
          كل سطر يُسجَّل كحركة وارد تحدد متوسط تكلفة الصنف في المخزن. التصحيح لاحقاً يكون بعكس الحركة من سجل حركة الصنف.
        </p>

        <div className="space-y-3">
          {lines.map((l, idx) => (
            <div key={l.key} className="p-3 rounded-2xl bg-slate-800/40 border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
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
              <StockItemPicker
                value={l.item}
                onChange={(item) => selectItem(l.key, item)}
                excludeIds={chosenIds}
                ariaLabel={`صنف السطر ${idx + 1}`}
              />
              {l.item && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
                  <Field label="الوحدة">
                    <select
                      className={inputClass}
                      value={l.unitId}
                      onChange={(e) => update(l.key, { unitId: Number(e.target.value) })}
                    >
                      {(l.units.length ? l.units : [{ id: l.item.base_unit_id, name: l.item.base_unit?.name ?? "", factor: 1 }]).map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                          {u.factor !== 1 ? ` (${fmtNum(u.factor)})` : ""}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="الكمية" required>
                    <input
                      className={inputClass}
                      type="number"
                      min={0}
                      step="any"
                      dir="ltr"
                      value={l.quantity}
                      onChange={(e) => update(l.key, { quantity: e.target.value })}
                    />
                  </Field>
                  <Field label="تكلفة الوحدة (₪)" required>
                    <input
                      className={inputClass}
                      type="number"
                      min={0}
                      step="any"
                      dir="ltr"
                      value={l.unitCost}
                      onChange={(e) => update(l.key, { unitCost: e.target.value })}
                    />
                  </Field>
                  <div className="pb-3 text-sm font-bold text-slate-300 tabular-nums">= {fmtNum(lineValue(l), 2)} ₪</div>
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setLines((ls) => [...ls, emptyLine()])}
          className="flex items-center gap-1 text-xs font-bold text-red-400 hover:text-red-300"
        >
          <Plus size={14} /> إضافة صنف
        </button>
      </form>
    </Modal>
  );
};
