/**
 * LayersReportPage.tsx — تقارير الدفعات (/inventory/layers?tab=&item=&warehouse=&layer=):
 *  - دفعات صنف: الفاتورة، المورّد، التاريخ، الوارد، المتبقي، السعر، القيمة (يُفتح من تقرير الأرصدة).
 *  - تتبّع دفعة: من أين جاءت (والدفعة الأصلية عبر التحويلات) وأين صُرفت، وفروق التكلفة.
 *  - تكلفة الصرف واستهلاك المبيعات حسب الفترة (شاملة فروق التسوية).
 *  - فحص المطابقة: الرصيد = المتبقي − النقص المعلّق، وقيمة الدفتر = قيمة الدفعات.
 */

import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "../../shared/Toast";
import { fmtNum, inventoryErrorMessage, type StockItem } from "../../../services/inventoryService";
import { layersService, type IssueCostsResult, type LayersCheckResult, type LayerTrace, type StockLayerRow } from "../../../services/layersService";
import { StockItemPicker } from "./StockItemPicker";
import { inputClass, PageHeader } from "./ui";

type Tab = "item" | "trace" | "issues" | "check";
const TABS: [Tab, string][] = [
  ["item", "دفعات صنف"],
  ["trace", "تتبّع دفعة"],
  ["issues", "تكلفة الصرف حسب الفترة"],
  ["check", "فحص المطابقة"],
];
const th = "px-2 py-2 text-right text-[11px] font-black text-slate-400 whitespace-nowrap";
const td = "px-2 py-2 tabular-nums";
const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB") : "—");
const money = (v: string | null | undefined) => (v === null || v === undefined ? "—" : `${fmtNum(v, 2)} ₪`);

export const LayersReportPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as Tab | null) ?? (params.get("layer") ? "trace" : "item");
  const set = (patch: Record<string, string | null>) =>
    setParams((p) => {
      const n = new URLSearchParams(p);
      Object.entries(patch).forEach(([k, v]) => (v === null ? n.delete(k) : n.set(k, v)));
      return n;
    });

  return (
    <div className="space-y-4" dir="rtl">
      <PageHeader title="تقارير الدفعات" subtitle="تكلفة المخزون بالدفعات: من أين جاءت كل كمية وبكم، وأين صُرفت" />
      <div role="tablist" className="flex gap-1 border-b border-white/5 overflow-x-auto custom-scrollbar">
        {TABS.map(([k, label]) => (
          <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => set({ tab: k })}
            className={`px-4 py-2.5 text-sm font-black whitespace-nowrap border-b-2 -mb-px ${tab === k ? "border-red-500 text-white" : "border-transparent text-slate-500 hover:text-slate-300"}`}>
            {label}
          </button>
        ))}
      </div>
      {tab === "item" && <ItemLayers itemId={Number(params.get("item")) || null} warehouseId={Number(params.get("warehouse")) || null}
        onItem={(id) => set({ item: id ? String(id) : null })} onTrace={(id) => set({ tab: "trace", layer: String(id) })} />}
      {tab === "trace" && <Trace layerId={Number(params.get("layer")) || null} onOpen={(id) => set({ layer: String(id) })} />}
      {tab === "issues" && <IssueCosts />}
      {tab === "check" && <Check />}
    </div>
  );
};

const Box: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-slate-900 rounded-2xl border border-white/5 p-3 overflow-x-auto custom-scrollbar relative">{children}</div>
);
const Spin = () => (
  <div className="py-10 flex justify-center">
    <Loader2 className="animate-spin text-red-500" />
  </div>
);

const LayerTable: React.FC<{ rows: StockLayerRow[]; costs: boolean; onTrace: (id: number) => void }> = ({ rows, costs, onTrace }) => (
  <table className="w-full text-sm min-w-[860px]">
    <thead className="border-b border-white/10">
      <tr>
        {["#", "الفاتورة / المرجع", "المورّد", "المخزن", "التاريخ", "الوارد", "المتبقي", "السعر (للوحدة الأساسية)", "القيمة"].map((h) => (
          <th key={h} className={th}>{h}</th>
        ))}
      </tr>
    </thead>
    <tbody className="divide-y divide-white/5">
      {rows.length === 0 && (
        <tr><td colSpan={9} className="py-8 text-center text-slate-500 font-bold">لا توجد دفعات</td></tr>
      )}
      {rows.map((l) => (
        <tr key={l.id} className="hover:bg-white/5 cursor-pointer" onClick={() => onTrace(l.id)} title="تتبّع الدفعة">
          <td className={`${td} text-sky-400`}>#{l.id}</td>
          <td className="px-2 py-2">
            <div className="font-bold text-white"><bdi>{l.purchase_bill?.number ?? l.reference ?? "—"}</bdi></div>
            <div className="text-[11px] text-slate-500">{l.source_label}{l.is_provisional ? " · تكلفة مؤقتة" : ""}</div>
          </td>
          <td className="px-2 py-2 text-slate-300">{l.supplier ?? "—"}</td>
          <td className="px-2 py-2 text-slate-400">{l.warehouse?.name ?? "—"}</td>
          <td className={`${td} text-slate-400`}>{date(l.received_at)}</td>
          <td className={`${td} text-green-400`}>{fmtNum(l.qty_in)}</td>
          <td className={`${td} text-white font-bold`}>{fmtNum(l.qty_remaining)}</td>
          <td className={`${td} text-slate-300`}>{costs ? fmtNum(l.unit_cost, 6) : "—"}</td>
          <td className={`${td} text-slate-300`}>{costs ? money(l.value) : "—"}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

const ItemLayers: React.FC<{ itemId: number | null; warehouseId: number | null; onItem: (id: number | null) => void; onTrace: (id: number) => void }> = ({
  itemId,
  warehouseId,
  onItem,
  onTrace,
}) => {
  const [picked, setPicked] = useState<Pick<StockItem, "id" | "name" | "code"> | null>(null);
  const [all, setAll] = useState(false);
  const [data, setData] = useState<{ layers: StockLayerRow[]; costs_visible: boolean } | null>(null);
  useEffect(() => {
    if (!itemId) return setData(null);
    layersService.itemLayers(itemId, warehouseId ? [warehouseId] : undefined, !all).then(setData).catch((e) => toast.error("تعذّر التحميل", inventoryErrorMessage(e)));
  }, [itemId, warehouseId, all]);
  const total = data?.layers.reduce((s, l) => s + Number(l.value ?? 0), 0) ?? 0;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-80 max-w-full">
          <StockItemPicker value={picked} onChange={(it) => { setPicked(it); onItem(it?.id ?? null); }} placeholder={itemId ? `الصنف #${itemId}` : "اختر صنفاً..."} />
        </div>
        <label className="flex items-center gap-2 text-xs font-bold text-slate-400">
          <input type="checkbox" className="accent-red-600" checked={all} onChange={(e) => setAll(e.target.checked)} /> يشمل الدفعات المنتهية
        </label>
        {data && data.costs_visible && <span className="text-sm font-black text-white ms-auto">قيمة المتبقي: {money(String(total))}</span>}
      </div>
      {itemId && (data ? <Box><LayerTable rows={data.layers} costs={data.costs_visible} onTrace={onTrace} /></Box> : <Spin />)}
    </div>
  );
};

const Trace: React.FC<{ layerId: number | null; onOpen: (id: number) => void }> = ({ layerId, onOpen }) => {
  const [input, setInput] = useState(layerId ? String(layerId) : "");
  const [data, setData] = useState<LayerTrace | null>(null);
  useEffect(() => {
    if (!layerId) return setData(null);
    setData(null);
    layersService.trace(layerId).then(setData).catch((e) => toast.error("تعذّر التحميل", inventoryErrorMessage(e)));
  }, [layerId]);
  const KIND: Record<string, string> = { consume: "صرف", settle: "تسوية نقص معلّق", restore: "عودة (عكس)", void: "إلغاء الدفعة", split: "تقسيم (تصحيح تكلفة)" };
  return (
    <div className="space-y-3">
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (Number(input)) onOpen(Number(input)); }}>
        <input className={`${inputClass} !w-48`} value={input} onChange={(e) => setInput(e.target.value)} placeholder="رقم الدفعة" dir="ltr" aria-label="رقم الدفعة" />
        <button type="submit" className="px-4 rounded-xl bg-red-600 text-white text-sm font-bold">تتبّع</button>
      </form>
      {layerId && !data && <Spin />}
      {data && (
        <>
          <p className="text-sm text-slate-300 font-bold">
            {data.layer.item.name} — {data.layer.source_label} <bdi>{data.layer.purchase_bill?.number ?? data.layer.reference ?? ""}</bdi>
            {data.origin && <> · الأصل: <button type="button" className="text-sky-400" onClick={() => onOpen(data.origin!.id)}>#{data.origin.id} ({data.origin.purchase_bill?.number ?? data.origin.source_label})</button></>}
          </p>
          <Box><LayerTable rows={[data.layer]} costs={data.costs_visible} onTrace={onOpen} /></Box>
          <h3 className="text-sm font-black text-white">أين صُرفت</h3>
          <Box>
            <table className="w-full text-sm min-w-[720px]">
              <thead className="border-b border-white/10"><tr>{["النوع", "الحركة", "المرجع", "التاريخ", "الكمية", "السعر", "التكلفة"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-white/5">
                {data.allocations.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-slate-500 font-bold">لم يُصرف منها شيء</td></tr>}
                {data.allocations.map((a) => (
                  <tr key={a.id} className={a.kind === "restore" ? "text-amber-300" : ""}>
                    <td className="px-2 py-2 text-slate-300">{KIND[a.kind] ?? a.kind}</td>
                    <td className="px-2 py-2 text-slate-300">{a.type_label}</td>
                    <td className="px-2 py-2"><bdi className="font-mono text-white">{a.reference ?? `#${a.movement_id}`}</bdi></td>
                    <td className={`${td} text-slate-400`}>{date(a.at)}</td>
                    <td className={`${td} ${Number(a.quantity) < 0 ? "text-green-400" : "text-red-400"}`}>{fmtNum(a.quantity)}</td>
                    <td className={`${td} text-slate-300`}>{data.costs_visible ? fmtNum(a.unit_cost, 6) : "—"}</td>
                    <td className={`${td} text-slate-300`}>{data.costs_visible ? money(a.total_cost) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
          {data.revaluations.length > 0 && (
            <p className="text-xs text-slate-400">
              فروق التكلفة: {data.revaluations.map((r) => `${r.reason === "cost_adjustment" ? "تسوية سعر" : "تسوية نقص"} ${fmtNum(r.quantity)} من ${fmtNum(r.old_unit_cost, 6)} إلى ${fmtNum(r.new_unit_cost, 6)}`).join(" · ")}
            </p>
          )}
          {data.children.length > 0 && (<><h3 className="text-sm font-black text-white">دفعات متفرعة (تحويلات)</h3><Box><LayerTable rows={data.children} costs={data.costs_visible} onTrace={onOpen} /></Box></>)}
        </>
      )}
    </div>
  );
};

const IssueCosts: React.FC = () => {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<IssueCostsResult | null>(null);
  useEffect(() => {
    layersService.issueCosts({ from: from || undefined, to: to || undefined }).then(setData).catch((e) => toast.error("تعذّر التحميل", inventoryErrorMessage(e)));
  }, [from, to]);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-400">
        من <input type="date" dir="ltr" className={`${inputClass} !w-auto !py-2`} value={from || data?.filters.from || ""} onChange={(e) => setFrom(e.target.value)} />
        إلى <input type="date" dir="ltr" className={`${inputClass} !w-auto !py-2`} value={to || data?.filters.to || ""} onChange={(e) => setTo(e.target.value)} />
        {data && data.costs_visible && <span className="ms-auto text-sm text-white font-black">الإجمالي: {money(data.total)}</span>}
      </div>
      {!data ? <Spin /> : data.types.filter((t) => t.items.length > 0).map((t) => (
        <Box key={t.type}>
          <div className="flex justify-between text-sm font-black text-white mb-2">
            <span>{t.label}</span>
            <span>{data.costs_visible ? money(t.cost) : ""}{data.costs_visible && Number(t.adjustments) !== 0 && <span className="text-[11px] text-amber-300"> (منها فروق تسوية {money(t.adjustments)})</span>}</span>
          </div>
          <table className="w-full text-sm">
            <thead><tr>{["الصنف", "الكمية", "التكلفة", "تكلفة الوحدة"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-white/5">
              {t.items.map((i) => (
                <tr key={i.stock_item_id}>
                  <td className="px-2 py-1.5 text-slate-200">{i.name} <bdi className="text-[11px] text-slate-500 font-mono">{i.code}</bdi></td>
                  <td className={`${td} text-red-300`}>{fmtNum(i.quantity)} {i.base_unit}</td>
                  <td className={`${td} text-slate-300`}>{data.costs_visible ? money(i.cost) : "—"}</td>
                  <td className={`${td} text-slate-400`}>{data.costs_visible ? fmtNum(i.unit_cost, 6) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      ))}
      {data && data.types.every((t) => t.items.length === 0) && <p className="text-center text-slate-500 font-bold py-6">لا يوجد صرف في هذه الفترة</p>}
    </div>
  );
};

const Check: React.FC = () => {
  const [data, setData] = useState<LayersCheckResult | null>(null);
  useEffect(() => {
    layersService.check().then(setData).catch((e) => toast.error("تعذّر الفحص", inventoryErrorMessage(e)));
  }, []);
  if (!data) return <Spin />;
  if (data.mismatches.length === 0) {
    return (
      <p className="flex items-center gap-2 p-4 rounded-xl bg-green-500/10 text-green-300 font-bold">
        <CheckCircle2 size={18} aria-hidden /> مطابق: الدفعات تطابق الأرصدة وقيمتها في {data.checked} صنف/مخزن.
      </p>
    );
  }
  return (
    <Box>
      <table className="w-full text-sm">
        <thead><tr>{["المخزن", "الصنف", "الرصيد", "كمية الدفعات", "قيمة الدفتر", "قيمة الدفعات"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-white/5">
          {data.mismatches.map((m) => (
            <tr key={`${m.warehouse_id}-${m.stock_item_id}`} className="text-red-300">
              <td className="px-2 py-2">{m.warehouse}</td>
              <td className="px-2 py-2">{m.name}</td>
              <td className={td}>{fmtNum(m.balance_quantity)}</td>
              <td className={td}>{fmtNum(m.layer_quantity)}</td>
              <td className={td}>{money(m.ledger_value)}</td>
              <td className={td}>{money(m.layer_value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Box>
  );
};
