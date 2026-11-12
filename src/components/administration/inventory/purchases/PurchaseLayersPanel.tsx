/**
 * PurchaseLayersPanel.tsx — فاتورة مشتريات مرحّلة على مستوى الدفعات: لكل سطر دفعته (الوارد، المصروف، المرتجع، المتبقي، السعر)،
 * ومرتجعات الفاتورة (تخرج من دفعة السطر بسعرها ولا تتجاوز متبقيها)، وتسويات السعر (تصحّح المتبقي والمصروف وقيد المورّد).
 */

import React, { useCallback, useEffect, useState } from "react";
import { Layers, RotateCcw, Tags, Undo2 } from "lucide-react";
import { toast } from "../../../shared/Toast";
import { fmtNum, inventoryErrorMessage } from "../../../../services/inventoryService";
import { layersService, type PurchaseLayersResult } from "../../../../services/layersService";
import { inputClass, Modal, PrimaryButton, SecondaryButton } from "../ui";

type Layer = PurchaseLayersResult["layers"][number];

export const PurchaseLayersPanel: React.FC<{ billId: number; canReturn: boolean; canAdjust: boolean; onChanged: () => void }> = ({
  billId,
  canReturn,
  canAdjust,
  onChanged,
}) => {
  const [data, setData] = useState<PurchaseLayersResult | null>(null);
  const [mode, setMode] = useState<"return" | "adjust" | null>(null);
  const [busy, setBusy] = useState(false);
  const [inputs, setInputs] = useState<Record<number, string>>({});
  const [reason, setReason] = useState("");

  const load = useCallback(() => {
    layersService.purchaseLayers(billId).then(setData).catch((e) => toast.error("تعذّر تحميل الدفعات", inventoryErrorMessage(e)));
  }, [billId]);
  useEffect(load, [load]);

  if (!data || data.layers.length === 0) return null;
  const costs = data.costs_visible;
  // الكميات بوحدة سطر الفاتورة (الدفعة بالوحدة الأساسية).
  const inLine = (l: Layer, v: string) => Number(v) / (Number(l.line_factor) || 1);

  const submit = async () => {
    const lines = data.layers
      .filter((l) => Number(inputs[l.layer_id] || 0) > 0)
      .map((l) =>
        mode === "return"
          ? { purchase_bill_item_id: l.purchase_bill_item_id, quantity: Number(inputs[l.layer_id]) }
          : { purchase_bill_item_id: l.purchase_bill_item_id, unit_cost: Number(inputs[l.layer_id]) },
      );
    if (lines.length === 0) return void toast.warning(mode === "return" ? "أدخل كمية المرتجع" : "أدخل السعر الجديد");
    if (mode === "adjust" && reason.trim().length < 3) return void toast.warning("اكتب سبب تسوية السعر");
    setBusy(true);
    try {
      if (mode === "return") {
        await layersService.purchaseReturn(billId, { reason: reason.trim() || undefined, lines: lines as { purchase_bill_item_id: number; quantity: number }[] });
        toast.success("تم ترحيل المرتجع", "خرج من دفعات الفاتورة بسعرها، وسُجّل قيده على المورّد.");
      } else {
        await layersService.costAdjustment(billId, { reason: reason.trim(), lines: lines as { purchase_bill_item_id: number; unit_cost: number }[] });
        toast.success("تم ترحيل تسوية السعر", "صُحّح سعر المتبقي وفرق المصروف وقيد المورّد.");
      }
      setMode(null);
      setInputs({});
      setReason("");
      load();
      onChanged();
    } catch (e) {
      toast.error("تعذّرت العملية", inventoryErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const reverseReturn = async (id: number, number: string) => {
    const why = window.prompt(`سبب عكس المرتجع ${number}:`);
    if (!why || why.trim().length < 3) return;
    try {
      await layersService.reversePurchaseReturn(id, why.trim());
      toast.success("تم عكس المرتجع", "عادت الكميات لدفعاتها وعُكس قيده.");
      load();
      onChanged();
    } catch (e) {
      toast.error("تعذّر عكس المرتجع", inventoryErrorMessage(e));
    }
  };

  return (
    <section className="bg-slate-900 rounded-2xl border border-white/5 p-4 space-y-3" aria-label="دفعات الفاتورة">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-black text-white flex items-center gap-2 me-auto">
          <Layers size={16} className="text-sky-400" aria-hidden /> دفعات الفاتورة
        </h3>
        {canReturn && (
          <SecondaryButton onClick={() => setMode("return")} className="!py-2 !text-xs flex items-center gap-1">
            <RotateCcw size={14} aria-hidden /> مرتجع مشتريات
          </SecondaryButton>
        )}
        {canAdjust && costs && (
          <SecondaryButton onClick={() => setMode("adjust")} className="!py-2 !text-xs flex items-center gap-1">
            <Tags size={14} aria-hidden /> تسوية سعر
          </SecondaryButton>
        )}
      </div>
      <div className="overflow-x-auto custom-scrollbar relative">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="border-b border-white/10 text-[11px] text-slate-400">
            <tr>
              {["الصنف", "الوارد", "المصروف", "المرتجع", "المتبقي", "سعر الوحدة الأساسية", "قيمة المتبقي"].map((h) => (
                <th key={h} className="px-2 py-2 text-right font-black whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data.layers.map((l) => (
              <tr key={l.layer_id} className={l.is_voided ? "opacity-50" : ""}>
                <td className="px-2 py-2 font-bold text-white">
                  {l.stock_item.name} <bdi className="text-[11px] text-slate-500 font-mono font-normal">{l.stock_item.code}</bdi>
                </td>
                <td className="px-2 py-2 tabular-nums text-green-400">{fmtNum(l.qty_in)} {l.base_unit}</td>
                <td className="px-2 py-2 tabular-nums text-red-400">{fmtNum(l.consumed)}</td>
                <td className="px-2 py-2 tabular-nums text-amber-300">{fmtNum(l.returned)}</td>
                <td className="px-2 py-2 tabular-nums text-white font-bold">{fmtNum(l.remaining)}</td>
                <td className="px-2 py-2 tabular-nums text-slate-300">{costs ? fmtNum(l.unit_cost, 6) : "—"}</td>
                <td className="px-2 py-2 tabular-nums text-slate-300">{costs ? `${fmtNum(l.value, 2)} ₪` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.returns.length > 0 && (
        <div className="text-xs space-y-1">
          <p className="font-black text-slate-400">المرتجعات</p>
          {data.returns.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-2 text-slate-300">
              <bdi className="font-mono text-white">{r.number}</bdi>
              <span className={r.status === "reversed" ? "text-slate-500" : "text-amber-300"}>{r.status === "reversed" ? "معكوس" : "مرحّل"}</span>
              <span>{r.lines.map((x) => `${x.stock_item} ${fmtNum(x.quantity)} ${x.unit ?? ""}`).join("، ")}</span>
              {costs && r.total_cost && <span className="tabular-nums">{fmtNum(r.total_cost, 2)} ₪</span>}
              {r.status === "posted" && canReturn && (
                <button type="button" onClick={() => reverseReturn(r.id, r.number)} className="inline-flex items-center gap-1 text-red-400 hover:text-red-300 font-bold">
                  <Undo2 size={12} aria-hidden /> عكس
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {data.adjustments.length > 0 && (
        <div className="text-xs space-y-1">
          <p className="font-black text-slate-400">تسويات الأسعار</p>
          {data.adjustments.map((a) => (
            <div key={a.id} className="text-slate-300">
              <bdi className="font-mono text-white">{a.number}</bdi> — {a.reason}
              {costs && a.total_value !== null && <span className="tabular-nums"> · الفرق {fmtNum(a.total_value, 2)} ₪</span>}
            </div>
          ))}
        </div>
      )}

      {mode && (
        <Modal
          title={mode === "return" ? "مرتجع مشتريات" : "تسوية سعر بعد الصرف"}
          onClose={() => !busy && setMode(null)}
          wide
          footer={
            <>
              <SecondaryButton onClick={() => setMode(null)} disabled={busy}>
                إلغاء
              </SecondaryButton>
              <PrimaryButton type="button" loading={busy} onClick={submit}>
                {mode === "return" ? "ترحيل المرتجع" : "ترحيل التسوية"}
              </PrimaryButton>
            </>
          }
        >
          <p className="text-xs text-slate-400 font-semibold">
            {mode === "return"
              ? "المرتجع يخرج من دفعة سطر الفاتورة بسعرها، ولا يتجاوز المتبقي فيها (بوحدة سطر الفاتورة)."
              : "أدخل السعر الصحيح لوحدة سطر الفاتورة بالشيكل (بلا الضريبة القابلة للخصم). المتبقي يأخذ السعر الجديد، والفرق على المصروف يُسجَّل على حركات صرفه، والقيد على المورّد."}
          </p>
          <table className="w-full text-sm">
            <thead className="text-[11px] text-slate-400">
              <tr>
                <th className="px-2 py-1 text-right">الصنف</th>
                <th className="px-2 py-1 text-right">{mode === "return" ? "المتبقي (وحدة السطر)" : "السعر الحالي (وحدة السطر)"}</th>
                <th className="px-2 py-1 text-right">{mode === "return" ? "الكمية المرتجعة" : "السعر الجديد"}</th>
              </tr>
            </thead>
            <tbody>
              {data.layers
                .filter((l) => !l.is_voided)
                .map((l) => (
                  <tr key={l.layer_id}>
                    <td className="px-2 py-1 text-white font-bold">{l.stock_item.name}</td>
                    <td className="px-2 py-1 tabular-nums text-slate-300">
                      {mode === "return" ? fmtNum(inLine(l, l.remaining)) : fmtNum(Number(l.unit_cost ?? 0) * (Number(l.line_factor) || 1), 4)}
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        dir="ltr"
                        className={`${inputClass} !py-1.5 !w-32 text-left`}
                        value={inputs[l.layer_id] ?? ""}
                        onChange={(e) => setInputs((p) => ({ ...p, [l.layer_id]: e.target.value }))}
                        aria-label={`${mode === "return" ? "كمية مرتجع" : "سعر جديد"} ${l.stock_item.name}`}
                      />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          <input className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300}
            placeholder={mode === "return" ? "السبب (اختياري)" : "سبب التسوية (مطلوب)"} aria-label="السبب" />
        </Modal>
      )}
    </section>
  );
};
