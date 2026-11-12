/**
 * LayerAllocationModal.tsx — توزيع كمية سطر صرف على دفعات الصنف (التحديد المعيّن).
 *
 * الدفعات المتاحة في المخزن بالأقدم أولاً: رقم الفاتورة، المورّد، التاريخ، الكمية المتبقية، سعر الوحدة. المستخدم يوزّع
 * الكمية على دفعة أو أكثر، أو يضغط "توزيع تلقائي (الأقدم أولاً)" ثم يعدّل. قبل التطبيق: المجموع = الكمية، ولا تجاوز
 * للمتبقي في أي دفعة. "الأقدم أولاً عند الترحيل" = بلا توزيع يدوي. الكميات تُعرض بوحدة السطر وتُرسل بالوحدة الأساسية.
 */

import React, { useEffect, useMemo, useState } from "react";
import { Layers, Loader2, Wand2 } from "lucide-react";
import { fmtNum, inventoryErrorMessage } from "../../../services/inventoryService";
import { fifoAllocate, layersService, validateAllocation, type LayerAllocation, type StockLayerRow } from "../../../services/layersService";
import { Modal, PrimaryButton, SecondaryButton } from "./ui";

interface Props {
  itemId: number;
  itemName: string;
  warehouseId: number;
  /** الوحدة الأساسية في وحدة السطر (الكيلو = 1000 غرام). */
  factor: number;
  unitName: string;
  /** كمية السطر بوحدته. */
  quantity: number;
  value: LayerAllocation[] | null;
  readOnly?: boolean;
  onApply: (allocations: LayerAllocation[] | null) => void;
  onClose: () => void;
}

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB") : "—");

export const LayerAllocationModal: React.FC<Props> = ({ itemId, itemName, warehouseId, factor, unitName, quantity, value, readOnly, onApply, onClose }) => {
  const [layers, setLayers] = useState<StockLayerRow[] | null>(null);
  const [costs, setCosts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // المُدخل بوحدة السطر لكل دفعة
  const [inputs, setInputs] = useState<Record<number, string>>(() =>
    Object.fromEntries((value ?? []).map((a) => [a.layer_id, String(Math.round((a.quantity / factor) * 1e6) / 1e6)])),
  );

  useEffect(() => {
    let cancelled = false;
    layersService
      .available(itemId, warehouseId)
      .then((r) => {
        if (cancelled) return;
        setLayers(r.layers);
        setCosts(r.costs_visible);
      })
      .catch((e) => !cancelled && setError(inventoryErrorMessage(e)));
    return () => {
      cancelled = true;
    };
  }, [itemId, warehouseId]);

  const baseQty = quantity * factor;
  const allocations: LayerAllocation[] = useMemo(
    () =>
      Object.entries(inputs)
        .map(([id, v]) => ({ layer_id: Number(id), quantity: Math.round(Number(v || 0) * factor * 1e6) / 1e6 }))
        .filter((a) => a.quantity > 0),
    [inputs, factor],
  );
  const problem = layers ? validateAllocation(layers, allocations, baseQty) : null;
  const total = layers
    ? allocations.reduce((s, a) => s + a.quantity * Number(layers.find((l) => l.id === a.layer_id)?.unit_cost ?? 0), 0)
    : 0;
  const available = layers?.reduce((s, l) => s + Number(l.qty_remaining), 0) ?? 0;

  const autoFill = () => {
    if (!layers) return;
    const fifo = fifoAllocate(layers, baseQty);
    setInputs(Object.fromEntries(fifo.map((a) => [a.layer_id, String(Math.round((a.quantity / factor) * 1e6) / 1e6)])));
  };

  return (
    <Modal
      title={`دفعات الصنف — ${itemName}`}
      onClose={onClose}
      xwide
      footer={
        readOnly ? (
          <SecondaryButton onClick={onClose}>إغلاق</SecondaryButton>
        ) : (
          <>
            <SecondaryButton onClick={() => onApply(null)}>الأقدم أولاً عند الترحيل</SecondaryButton>
            <SecondaryButton onClick={onClose}>إلغاء</SecondaryButton>
            <PrimaryButton type="button" disabled={!layers || problem !== null} onClick={() => onApply(allocations)}>
              تطبيق التوزيع
            </PrimaryButton>
          </>
        )
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-bold text-slate-300">
          الكمية المطلوبة: <b className="text-white tabular-nums">{fmtNum(quantity)}</b> {unitName}
          <span className="text-slate-500 text-xs"> · المتاح في المخزن {fmtNum(available / factor)} {unitName}</span>
        </span>
        {!readOnly && (
          <button
            type="button"
            onClick={autoFill}
            disabled={!layers}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-black bg-sky-600/15 text-sky-300 hover:bg-sky-600/25 disabled:opacity-50"
          >
            <Wand2 size={14} aria-hidden /> توزيع تلقائي (الأقدم أولاً)
          </button>
        )}
      </div>

      {error ? (
        <p className="text-sm text-red-400 font-bold">{error}</p>
      ) : !layers ? (
        <div className="py-8 flex justify-center">
          <Loader2 className="animate-spin text-red-500" />
        </div>
      ) : layers.length === 0 ? (
        <div className="py-8 text-center text-sm text-slate-500 font-bold">
          <Layers className="mx-auto mb-2 text-slate-600" aria-hidden />
          لا توجد دفعات متاحة لهذا الصنف في المخزن.
        </div>
      ) : (
        <div className="overflow-x-auto custom-scrollbar relative">
          <table className="w-full text-sm min-w-[760px]">
            <thead className="border-b border-white/10 text-[11px] text-slate-400">
              <tr>
                {["#", "رقم الفاتورة / المرجع", "المورّد", "التاريخ", `المتبقي (${unitName})`, `سعر الوحدة (${unitName})`, `يُصرف منها (${unitName})`, "التكلفة"].map((h) => (
                  <th key={h} className="px-2 py-2 text-right font-black whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {layers.map((l, i) => {
                const raw = inputs[l.id] ?? "";
                const taken = Number(raw || 0);
                const over = taken * factor > Number(l.qty_remaining) + 1e-9;
                const unitCost = l.unit_cost === null ? null : Number(l.unit_cost) * factor;
                return (
                  <tr key={l.id} className={taken > 0 ? "bg-sky-500/5" : ""}>
                    <td className="px-2 py-2 text-slate-500 tabular-nums">{i + 1}</td>
                    <td className="px-2 py-2">
                      <div className="font-bold text-white">
                        <bdi>{l.purchase_bill?.number ?? l.reference ?? `#${l.id}`}</bdi>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {l.source_label}
                        {l.is_provisional && <span className="text-amber-300"> · تكلفة مؤقتة</span>}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-slate-300">{l.supplier ?? "—"}</td>
                    <td className="px-2 py-2 text-slate-400 tabular-nums">{fmtDate(l.received_at)}</td>
                    <td className="px-2 py-2 tabular-nums text-slate-200">{fmtNum(Number(l.qty_remaining) / factor)}</td>
                    <td className="px-2 py-2 tabular-nums text-slate-300">{costs && unitCost !== null ? fmtNum(unitCost, 4) : "—"}</td>
                    <td className="px-2 py-1">
                      {readOnly ? (
                        <span className="tabular-nums">{taken ? fmtNum(taken) : "—"}</span>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          step="any"
                          dir="ltr"
                          value={raw}
                          onChange={(e) => setInputs((p) => ({ ...p, [l.id]: e.target.value }))}
                          aria-label={`الكمية من الدفعة ${l.purchase_bill?.number ?? l.id}`}
                          className={`w-28 px-2 py-1.5 rounded-lg bg-slate-800 border text-left tabular-nums text-white outline-none focus:ring-2 focus:ring-red-600 ${
                            over ? "border-red-500" : "border-white/10"
                          }`}
                        />
                      )}
                    </td>
                    <td className="px-2 py-2 tabular-nums text-slate-300">
                      {costs && unitCost !== null && taken > 0 ? fmtNum(taken * unitCost, 2) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t border-white/10 font-black text-white">
              <tr>
                <td className="px-2 py-2" colSpan={6}>
                  المجموع
                </td>
                <td className="px-2 py-2 tabular-nums">{fmtNum(allocations.reduce((s, a) => s + a.quantity, 0) / factor)}</td>
                <td className="px-2 py-2 tabular-nums">{costs ? `${fmtNum(total, 2)} ₪` : "—"}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      {!readOnly && layers && problem && allocations.length > 0 && (
        <p role="alert" className="text-xs font-bold text-red-400">
          {problem}
        </p>
      )}
      {layers && baseQty > available + 1e-9 && (
        <p className="text-xs font-bold text-amber-300">الكمية أكبر من المتاح في الدفعات — يمكن توزيع المتاح فقط، والباقي يُعامل حسب إعداد الرصيد السالب.</p>
      )}
    </Modal>
  );
};
