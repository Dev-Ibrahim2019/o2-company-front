/**
 * ItemSuppliersModal.tsx — موردو الصنف المخزني: سعر كل مورّد للوحدة، وكود الصنف لديه، والمورّد المفضّل.
 * بيانات المورّد نفسه تُدار من شاشة الموردين في المالية. السعر يُقترح تلقائياً في مستند الاستلام.
 */

import React, { useEffect, useRef, useState } from "react";
import { Plus, Star, Trash2 } from "lucide-react";
import { useCan } from "../../../auth";
import { INVENTORY_PERMISSIONS } from "../../../auth/permissions";
import { toast } from "../../shared/Toast";
import { inventoryErrorMessage, inventoryService, type StockItem, type SupplierLite } from "../../../services/inventoryService";
import { LoadingBlock, Modal, PrimaryButton, SecondaryButton, inputClass } from "./ui";

interface Row {
  key: number;
  supplierId: number | "";
  unitId: number | "";
  price: string;
  code: string;
  preferred: boolean;
}

let nextKey = 1;

export const ItemSuppliersModal: React.FC<{ item: Pick<StockItem, "id" | "name">; onClose: () => void }> = ({ item, onClose }) => {
  const canManage = useCan(INVENTORY_PERMISSIONS.SUPPLIERS_MANAGE);
  const [suppliers, setSuppliers] = useState<SupplierLite[]>([]);
  const [units, setUnits] = useState<{ id: number; name: string }[]>([]);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [saving, setSaving] = useState(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    let cancelled = false;
    Promise.all([inventoryService.documentsMeta(), inventoryService.item(item.id), inventoryService.itemSuppliers(item.id)])
      .then(([meta, full, links]) => {
        if (cancelled) return;
        setSuppliers(meta.suppliers);
        setUnits((full.units ?? []).map((u) => ({ id: u.unit_id, name: u.unit?.name ?? "" })));
        setRows(
          links.map((l) => ({
            key: nextKey++,
            supplierId: l.supplier_id,
            unitId: l.unit_id ?? "",
            price: l.price !== null ? String(Number(l.price)) : "",
            code: l.supplier_item_code ?? "",
            preferred: l.is_preferred,
          })),
        );
      })
      .catch((e) => {
        toast.error("تعذّر تحميل موردي الصنف", inventoryErrorMessage(e));
        closeRef.current();
      });
    return () => {
      cancelled = true;
    };
  }, [item.id]);

  const update = (key: number, patch: Partial<Row>) => setRows((rs) => (rs ?? []).map((r) => (r.key === key ? { ...r, ...patch } : r)));
  // مورّد مفضّل واحد: اختيار مورّد يلغي غيره.
  const prefer = (key: number) => setRows((rs) => (rs ?? []).map((r) => ({ ...r, preferred: r.key === key ? !r.preferred : false })));

  const save = async () => {
    if (!rows) return;
    setSaving(true);
    try {
      await inventoryService.syncItemSuppliers(
        item.id,
        rows
          .filter((r) => r.supplierId !== "")
          .map((r) => ({
            supplier_id: r.supplierId as number,
            unit_id: r.unitId === "" ? null : r.unitId,
            price: r.price === "" ? null : Number(r.price),
            supplier_item_code: r.code.trim() || null,
            is_preferred: r.preferred,
          })),
      );
      toast.success("تم حفظ موردي الصنف");
      onClose();
    } catch (e) {
      toast.error("تعذّر الحفظ", inventoryErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const chosen = (rows ?? []).map((r) => r.supplierId);

  return (
    <Modal
      wide
      title={`موردو الصنف: ${item.name}`}
      onClose={onClose}
      footer={
        <>
          <SecondaryButton onClick={onClose}>{canManage ? "إلغاء" : "إغلاق"}</SecondaryButton>
          {canManage && (
            <PrimaryButton onClick={save} loading={saving} disabled={!rows}>
              حفظ
            </PrimaryButton>
          )}
        </>
      }
    >
      {!rows ? (
        <LoadingBlock />
      ) : (
        <div className="space-y-3">
          {rows.length === 0 && <p className="text-sm text-slate-500 font-bold">لا يوجد موردون مربوطون بهذا الصنف.</p>}
          {rows.map((r) => (
            <div
              key={r.key}
              className="grid grid-cols-2 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-center p-3 rounded-2xl bg-slate-800/40 border border-white/5"
            >
              <select
                className={inputClass}
                value={r.supplierId}
                onChange={(e) => update(r.key, { supplierId: e.target.value ? Number(e.target.value) : "" })}
                disabled={!canManage}
                aria-label="المورّد"
              >
                <option value="">— المورّد —</option>
                {suppliers
                  .filter((s) => s.id === r.supplierId || !chosen.includes(s.id))
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
              <input
                className={inputClass}
                type="number"
                min={0}
                step="any"
                dir="ltr"
                placeholder="السعر ₪"
                value={r.price}
                onChange={(e) => update(r.key, { price: e.target.value })}
                disabled={!canManage}
                aria-label="السعر"
              />
              <select
                className={inputClass}
                value={r.unitId}
                onChange={(e) => update(r.key, { unitId: e.target.value ? Number(e.target.value) : "" })}
                disabled={!canManage}
                aria-label="وحدة السعر"
              >
                <option value="">لكل وحدة أساسية</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    لكل {u.name}
                  </option>
                ))}
              </select>
              <input
                className={inputClass}
                dir="ltr"
                placeholder="كود المورّد"
                value={r.code}
                onChange={(e) => update(r.key, { code: e.target.value })}
                disabled={!canManage}
                aria-label="كود الصنف لدى المورّد"
              />
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => prefer(r.key)}
                  disabled={!canManage}
                  aria-pressed={r.preferred}
                  aria-label="المورّد المفضّل"
                  title="المورّد المفضّل"
                  className={`w-9 h-9 flex items-center justify-center rounded-lg ${r.preferred ? "bg-amber-500/20 text-amber-300" : "bg-white/5 text-slate-500 hover:text-slate-300"}`}
                >
                  <Star size={15} fill={r.preferred ? "currentColor" : "none"} />
                </button>
                {canManage && (
                  <button
                    type="button"
                    aria-label="إزالة المورّد"
                    onClick={() => setRows((rs) => (rs ?? []).filter((x) => x.key !== r.key))}
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-600/10 text-red-400 hover:bg-red-600/20"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {canManage && (
            <button
              type="button"
              onClick={() => setRows((rs) => [...(rs ?? []), { key: nextKey++, supplierId: "", unitId: "", price: "", code: "", preferred: false }])}
              className="flex items-center gap-1 text-xs font-bold text-red-400 hover:text-red-300"
            >
              <Plus size={14} /> ربط مورّد
            </button>
          )}
        </div>
      )}
    </Modal>
  );
};
