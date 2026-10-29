/**
 * QualityPages.tsx — شاشات "الجودة والرقابة" المنقولة من نموذج O2 فوق محرك المخزون:
 * الدفعات وصلاحياتها، الإنتاجية اليومية والعجز (مع الجرد اليومي ومحضر الإتلاف)، الشاورما،
 * قالب القسم في الفرع، وتقارير الجودة. كل الحسابات في الخادم؛ الشاشات تعرض وتُدخل فقط.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ClipboardCheck, Download, FileText, Flame, Layers, Printer, Send } from "lucide-react";
import { useCan } from "../../../auth";
import { INVENTORY_PERMISSIONS } from "../../../auth/permissions";
import { toast } from "../../shared/Toast";
import {
  EXPIRY_STYLES,
  TREND_LABELS,
  WAREHOUSE_ROLES,
  fmtNum,
  inventoryErrorMessage,
  inventoryService,
  type BatchRow,
  type DepartmentSetting,
  type InventoryLookups,
  type ProductivityResult,
  type ShawarmaPeriod,
  type StockCount,
  type StockItem,
  type WasteMinutes,
  type Warehouse,
} from "../../../services/inventoryService";
import { flattenTree } from "./CategoriesPage";
import { StockItemPicker } from "./StockItemPicker";
import { EmptyBlock, Field, LoadingBlock, Modal, PageHeader, PrimaryButton, SearchBox, SecondaryButton, Toggle, inputClass } from "./ui";

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Gaza" });
/** غرام → كغ للعرض. */
const kg = (g: string | number | null | undefined) => (g === null || g === undefined ? "—" : `${fmtNum(Number(g) / 1000)} كغ`);

/** طباعة جزء من الصفحة فقط (المحاضر والتقارير). */
const PrintStyle: React.FC = () => (
  <style>{`@media print {
    body * { visibility: hidden !important; }
    .print-area, .print-area * { visibility: visible !important; color: #0f172a !important; background: #fff !important; border-color: #94a3b8 !important; }
    .print-area { position: absolute; inset: 0; padding: 24px; }
    [data-print-hide] { display: none !important; }
  }`}</style>
);

function useWarehouses() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  useEffect(() => {
    inventoryService.warehouses().then((w) => setWarehouses(w.filter((x) => x.type === "standard"))).catch(() => undefined);
  }, []);
  return warehouses;
}

const WarehouseSelect: React.FC<{ warehouses: Warehouse[]; value: number | ""; onChange: (v: number | "") => void; all?: boolean }> = ({
  warehouses,
  value,
  onChange,
  all,
}) => (
  <select className={`${inputClass} !w-auto min-w-[200px]`} value={value} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")} aria-label="المخزن">
    <option value="">{all ? "كل المخازن" : "— اختر المخزن —"}</option>
    {warehouses.map((w) => (
      <option key={w.id} value={w.id}>
        {w.name}
      </option>
    ))}
  </select>
);

/* ════════════════════════ الدفعات ════════════════════════ */

const EXPIRY_LABEL: Record<BatchRow["status"], string> = { ok: "سليمة", warning: "تقترب", critical: "حرجة", expired: "منتهية", none: "—" };

export const BatchesPage: React.FC = () => {
  const warehouses = useWarehouses();
  const [warehouseId, setWarehouseId] = useState<number | "">("");
  const [search, setSearch] = useState("");
  const [available, setAvailable] = useState(true);
  const [rows, setRows] = useState<BatchRow[] | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      inventoryService
        .batches({ warehouse_id: warehouseId, available: available ? 1 : undefined, search: search.trim() || undefined })
        .then(setRows)
        .catch((e) => toast.error("تعذّر تحميل الدفعات", inventoryErrorMessage(e)));
    }, 250);
    return () => clearTimeout(t);
  }, [warehouseId, search, available]);

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="الدفعات والصلاحية"
        subtitle="كل دفعة بكودها (كود الصنف + تسلسل) ومتبقيها في كل مخزن، ومدة تخزينها والمدة المتبقية لصلاحيتها: برتقالي ≤ 90 يوماً، أحمر ≤ 30 يوماً أو منتهية."
      />
      <div className="flex flex-wrap items-center gap-3">
        <SearchBox value={search} onChange={setSearch} placeholder="كود الدفعة أو اسم الصنف..." />
        <WarehouseSelect warehouses={warehouses} value={warehouseId} onChange={setWarehouseId} all />
        <Toggle checked={available} onChange={setAvailable} label="المتبقي منها فقط" />
      </div>
      {!rows ? (
        <LoadingBlock />
      ) : rows.length === 0 ? (
        <EmptyBlock icon={Layers} text="لا توجد دفعات مطابقة" />
      ) : (
        <div className="bg-slate-900 rounded-2xl border border-white/5 overflow-x-auto">
          <table className="w-full text-sm min-w-[1000px]">
            <thead>
              <tr className="text-slate-500 text-xs font-black border-b border-white/5">
                {["الدفعة", "الصنف", "المخزن", "المورّد", "المتبقي / الأصلي", "الكراتين", "الإنتاج", "الانتهاء", "مدة التخزين", "سعر الوحدة"].map((h) => (
                  <th key={h} className="text-right p-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={`${b.id}-${b.warehouse_id}`} className="border-b border-white/5 last:border-0 tabular-nums">
                  <td className="p-3">
                    <bdi className="font-mono text-xs font-bold text-white">{b.code}</bdi>
                  </td>
                  <td className="p-3 font-bold text-white">{b.item}</td>
                  <td className="p-3 text-slate-400">{b.warehouse}</td>
                  <td className="p-3 text-slate-400">{b.supplier ?? "—"}</td>
                  <td className="p-3 text-slate-200">
                    {fmtNum(b.remaining)} / <span className="text-slate-500">{fmtNum(b.original)}</span> {b.base_unit}
                  </td>
                  <td className="p-3 text-slate-400">{b.cartons ? fmtNum(b.cartons) : "—"}</td>
                  <td className="p-3 text-slate-400">{b.production_date ?? "—"}</td>
                  <td className="p-3">
                    {b.expiry_date ? (
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-black whitespace-nowrap ${EXPIRY_STYLES[b.status]}`}>
                        {b.expiry_date} · {b.days_to_expiry! < 0 ? "منتهية" : `${b.days_to_expiry} يوماً`} · {EXPIRY_LABEL[b.status]}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-3">
                    <span className={b.showroom_overdue ? "text-red-400 font-black" : "text-slate-300"}>
                      {b.storage_days ?? "—"} يوم{b.showroom_overdue && " · تجاوز مدة العرض"}
                    </span>
                  </td>
                  <td className="p-3 text-slate-400">{b.unit_cost !== null ? fmtNum(b.unit_cost, 4) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/* ════════════════════════ الإنتاجية اليومية ════════════════════════ */

export const ProductivityPage: React.FC = () => {
  const warehouses = useWarehouses();
  const canCount = useCan(INVENTORY_PERMISSIONS.COUNTS_MANAGE);
  const [warehouseId, setWarehouseId] = useState<number | "">("");
  const [day, setDay] = useState(today());
  const [data, setData] = useState<ProductivityResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [countId, setCountId] = useState<number | null>(null);
  const [minutes, setMinutes] = useState(false);
  const [shawarmaIds, setShawarmaIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    inventoryService
      .departmentSettings()
      .then((s) => setShawarmaIds(new Set(s.filter((d) => d.is_shawarma).flatMap((d) => d.warehouses.map((w) => w.id)))))
      .catch(() => undefined);
  }, []);

  const load = useCallback(() => {
    if (warehouseId === "") return;
    setLoading(true);
    inventoryService
      .productivity(warehouseId, day)
      .then(setData)
      .catch((e) => toast.error("تعذّر تحميل الإنتاجية", inventoryErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [warehouseId, day]);

  useEffect(() => {
    load();
  }, [load]);

  const openCount = async () => {
    if (warehouseId === "") return;
    try {
      setCountId((await inventoryService.dailyCount(warehouseId, day)).id);
    } catch (e) {
      toast.error("تعذّر فتح جرد اليوم", inventoryErrorMessage(e));
    }
  };

  const t = data?.totals;
  return (
    <div className="space-y-6" dir="rtl">
      <PrintStyle />
      <PageHeader
        title="الإنتاجية اليومية والعجز"
        subtitle="لكل قسم في كل يوم: المستلمة − المتبقي (الجرد) − الإتلاف = المستهلك، مقابل المفترض من المبيعات والإنتاج حسب الوصفات. الإتلاف المسجّل لا يُحسب عجزاً."
      />
      <div className="flex flex-wrap items-center gap-3" data-print-hide>
        <WarehouseSelect warehouses={warehouses} value={warehouseId} onChange={setWarehouseId} />
        <input type="date" className={`${inputClass} !w-auto`} value={day} max={today()} onChange={(e) => setDay(e.target.value)} dir="ltr" aria-label="اليوم" />
        {warehouseId !== "" && (
          <>
            {canCount && (
              <PrimaryButton onClick={openCount}>
                <ClipboardCheck size={16} /> {data?.count?.status === "posted" ? "جرد اليوم (مرحّل)" : "جرد اليوم"}
              </PrimaryButton>
            )}
            <SecondaryButton onClick={() => setMinutes(true)}>
              <FileText size={15} className="inline ml-1" /> محضر الإتلاف
            </SecondaryButton>
            <SecondaryButton onClick={() => inventoryService.productivityExport(warehouseId, day).catch((e) => toast.error("تعذّر التصدير", inventoryErrorMessage(e)))}>
              <Download size={15} className="inline ml-1" /> Excel
            </SecondaryButton>
            <SecondaryButton onClick={() => window.print()}>
              <Printer size={15} className="inline ml-1" /> طباعة / PDF
            </SecondaryButton>
          </>
        )}
      </div>

      {warehouseId === "" ? (
        <EmptyBlock icon={ClipboardCheck} text="اختر مخزن القسم" />
      ) : loading && !data ? (
        <LoadingBlock />
      ) : !data ? null : (
        <div className="space-y-4 print-area">
          <h2 className="text-lg font-black text-white">
            {data.warehouse.name} — {data.day}
          </h2>
          {data.count?.status !== "posted" && (
            <p className="flex items-center gap-1 text-xs font-bold text-amber-300" data-print-hide>
              <AlertTriangle size={14} /> لم يُرحَّل جرد هذا اليوم بعد — المتبقي والمستهلك من الحركات المسجّلة فقط.
            </p>
          )}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              ["المستهلك", t?.consumed_value],
              ["المفترض", t?.theoretical_value],
              ["العجز", t?.deficit_value],
            ].map(([label, v]) => (
              <div key={label as string} className="bg-slate-900 rounded-2xl border border-white/5 p-4">
                <p className="text-[11px] text-slate-500 font-black">{label}</p>
                <p className="text-xl font-black tabular-nums text-white mt-1">{v !== null && v !== undefined ? `${fmtNum(v, 2)} ₪` : "—"}</p>
              </div>
            ))}
            <div className="bg-slate-900 rounded-2xl border border-white/5 p-4">
              <p className="text-[11px] text-slate-500 font-black">نسبة العجز</p>
              <p className="text-xl font-black tabular-nums text-white mt-1">{t?.deficit_percent !== null ? `${fmtNum(t?.deficit_percent, 2)}%` : "—"}</p>
              {t?.trend && <p className={`text-[11px] font-black ${TREND_LABELS[t.trend].tone}`}>{TREND_LABELS[t.trend].label} من أمس</p>}
            </div>
          </div>
          {data.rows.length === 0 ? (
            <EmptyBlock icon={ClipboardCheck} text="لا حركة ولا مبيعات لهذا القسم في هذا اليوم" />
          ) : (
            <div className="bg-slate-900 rounded-2xl border border-white/5 overflow-x-auto">
              <table className="w-full text-xs min-w-[1000px]">
                <thead>
                  <tr className="text-slate-500 font-black border-b border-white/5">
                    {["الصنف", "رصيد البداية", "المستلمة", "المحوَّل للخارج", "المتبقي", "الإتلاف", "المستهلك", "المفترض", "العجز", "العجز %", "الوضع"].map((h) => (
                      <th key={h} className="text-right p-2">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.stock_item_id} className="border-b border-white/5 last:border-0 tabular-nums whitespace-nowrap">
                      <td className="p-2 font-bold text-white">
                        {r.alert && <AlertTriangle size={12} className="inline text-red-400 ml-1" />}
                        {r.name}
                      </td>
                      <td className="p-2 text-slate-400">{kg(r.opening)}</td>
                      <td className="p-2 text-slate-300">{kg(r.received)}</td>
                      <td className="p-2 text-slate-400">{kg(r.transferred_out)}</td>
                      <td className="p-2 text-slate-300">{kg(r.remaining)}</td>
                      <td className="p-2 text-slate-400">{kg(r.waste)}</td>
                      <td className="p-2 font-bold text-red-300">{kg(r.consumed)}</td>
                      <td className="p-2 font-bold text-sky-300">{kg(r.theoretical)}</td>
                      <td className={`p-2 font-bold ${Number(r.deficit) > 0 ? "text-red-400" : "text-green-400"}`}>{kg(r.deficit)}</td>
                      <td className={`p-2 font-black ${r.alert ? "text-red-400" : "text-slate-300"}`}>{r.deficit_percent !== null ? `${fmtNum(r.deficit_percent, 2)}%` : "—"}</td>
                      <td className={`p-2 font-black ${r.trend ? TREND_LABELS[r.trend].tone : "text-slate-500"}`}>{r.trend ? TREND_LABELS[r.trend].label : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {countId !== null && (
        <DailyCountModal
          id={countId}
          meatDetails={warehouseId !== "" && shawarmaIds.has(warehouseId)}
          onClose={() => setCountId(null)}
          onPosted={() => {
            setCountId(null);
            load();
          }}
        />
      )}
      {minutes && warehouseId !== "" && <WasteMinutesModal warehouseId={warehouseId} day={day} onClose={() => setMinutes(false)} />}
    </div>
  );
};

/** الجرد اليومي: المتبقي لكل صنف (الفارغ = صفر)، وتفصيل اللحوم في قسم الشاورما. */
const DailyCountModal: React.FC<{ id: number; meatDetails: boolean; onClose: () => void; onPosted: () => void }> = ({ id, meatDetails, onClose, onPosted }) => {
  const canPost = useCan(INVENTORY_PERMISSIONS.COUNTS_POST);
  const [count, setCount] = useState<StockCount | null>(null);
  const [values, setValues] = useState<Record<number, { qty: string; dissected: string; marinated: string }>>({});
  const [busy, setBusy] = useState(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    inventoryService
      .count(id)
      .then((c) => {
        setCount(c);
        const v: Record<number, { qty: string; dissected: string; marinated: string }> = {};
        for (const l of c.lines ?? []) {
          const f = l.stock_item?.units?.some((u) => Number(u.factor) === 1000) ? 1000 : 1;
          v[l.stock_item_id] = {
            qty: l.counted_quantity !== null ? String(Number(l.counted_quantity) / f) : "",
            dissected: l.dissected_quantity ? String(Number(l.dissected_quantity) / f) : "",
            marinated: l.marinated_quantity ? String(Number(l.marinated_quantity) / f) : "",
          };
        }
        setValues(v);
      })
      .catch((e) => {
        toast.error("تعذّر تحميل الجرد", inventoryErrorMessage(e));
        closeRef.current();
      });
  }, [id]);

  const posted = count?.status === "posted";
  /** الإدخال بالكيلو حين يكون للصنف وحدة كغ (معامل 1000)، وإلا بالوحدة الأساسية. */
  const kgUnit = (l: NonNullable<StockCount["lines"]>[number]) => l.stock_item?.units?.find((u) => Number(u.factor) === 1000);

  const save = async (post: boolean) => {
    if (!count) return;
    const empty = (count.lines ?? []).filter((l) => !values[l.stock_item_id]?.qty).length;
    if (post && empty > 0 && !window.confirm(`${empty} صنف بلا متبقٍ — سيُعتبر المتبقي صفراً (كل رصيده مستهلك). متابعة الترحيل؟`)) return;
    setBusy(true);
    try {
      await inventoryService.saveCount(count.id, {
        lines: (count.lines ?? []).map((l) => {
          const v = values[l.stock_item_id] ?? { qty: "", dissected: "", marinated: "" };
          const unit = kgUnit(l);
          const factor = unit ? 1000 : 1;
          const n = (s: string) => (s === "" ? null : Number(s) * (unit ? 1 : factor));
          return {
            stock_item_id: l.stock_item_id,
            unit_id: unit?.unit_id ?? null,
            entered_quantity: n(v.qty),
            dissected: meatDetails ? n(v.dissected) : null,
            marinated: meatDetails ? n(v.marinated) : null,
          };
        }),
      });
      if (post) {
        await inventoryService.postCount(count.id);
        toast.success("تم ترحيل جرد اليوم");
        onPosted();
        return;
      }
      toast.success("تم حفظ الجرد");
    } catch (e) {
      toast.error("تعذّرت العملية", inventoryErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      wide
      title={count ? `جرد اليوم ${count.business_day ?? ""} — ${count.number}` : "جرد اليوم"}
      onClose={onClose}
      footer={
        !posted && count ? (
          <>
            <SecondaryButton onClick={() => save(false)} disabled={busy}>
              حفظ
            </SecondaryButton>
            {canPost && (
              <PrimaryButton onClick={() => save(true)} loading={busy}>
                <Send size={15} /> ترحيل الجرد
              </PrimaryButton>
            )}
          </>
        ) : (
          <SecondaryButton onClick={onClose}>إغلاق</SecondaryButton>
        )
      }
    >
      {!count ? (
        <LoadingBlock />
      ) : (
        <div className="space-y-3">
          <p className="text-[11px] text-amber-300 font-bold">المتبقي الفارغ يُعتبر صفراً عند الترحيل. الكميات بالكيلو للأصناف الموزونة.</p>
          <div className="overflow-x-auto max-h-[60vh] overflow-y-auto custom-scrollbar">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="sticky top-0 bg-slate-900">
                <tr className="text-slate-500 text-xs font-black border-b border-white/5">
                  <th className="text-right p-2">الصنف</th>
                  <th className="text-right p-2">رصيد نهاية اليوم المسجّل</th>
                  <th className="text-right p-2">المتبقي (جرد)</th>
                  {meatDetails && <th className="text-right p-2">مشرّح</th>}
                  {meatDetails && <th className="text-right p-2">مبهّر</th>}
                  {meatDetails && <th className="text-right p-2">بدون تشريح</th>}
                </tr>
              </thead>
              <tbody>
                {(count.lines ?? []).map((l) => {
                  const v = values[l.stock_item_id] ?? { qty: "", dissected: "", marinated: "" };
                  const set = (patch: Partial<typeof v>) => setValues((s) => ({ ...s, [l.stock_item_id]: { ...v, ...patch } }));
                  const unit = kgUnit(l) ? "كغ" : (l.stock_item?.base_unit?.name ?? "");
                  const expected = kgUnit(l) ? Number(l.expected_quantity) / 1000 : Number(l.expected_quantity);
                  const undissected = (Number(v.qty) || 0) - (Number(v.dissected) || 0) - (Number(v.marinated) || 0);
                  const input = (val: string, onChange: (s: string) => void, label: string) => (
                    <input
                      type="number"
                      min={0}
                      step="any"
                      className={`${inputClass} !py-1.5 !w-28`}
                      value={val}
                      onChange={(e) => onChange(e.target.value)}
                      disabled={posted}
                      dir="ltr"
                      aria-label={label}
                    />
                  );
                  return (
                    <tr key={l.id} className="border-b border-white/5 last:border-0 tabular-nums">
                      <td className="p-2 font-bold text-white">{l.stock_item?.name}</td>
                      <td className="p-2 text-slate-400">
                        {fmtNum(expected)} {unit}
                      </td>
                      <td className="p-2">{input(v.qty, (s) => set({ qty: s }), `المتبقي من ${l.stock_item?.name ?? ""}`)}</td>
                      {meatDetails && <td className="p-2">{input(v.dissected, (s) => set({ dissected: s }), "مشرّح")}</td>}
                      {meatDetails && <td className="p-2">{input(v.marinated, (s) => set({ marinated: s }), "مبهّر")}</td>}
                      {meatDetails && <td className={`p-2 font-bold ${undissected < 0 ? "text-red-400" : "text-slate-300"}`}>{v.qty ? fmtNum(undissected) : "—"}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
};

/** محضر الإتلاف ليوم: الفرع والقسم والجدول والإجمالي وخانات التوقيع. */
const WasteMinutesModal: React.FC<{ warehouseId: number; day: string; onClose: () => void }> = ({ warehouseId, day, onClose }) => {
  const [data, setData] = useState<WasteMinutes | null>(null);
  useEffect(() => {
    inventoryService.wasteMinutes(warehouseId, day).then(setData).catch((e) => toast.error("تعذّر تحميل المحضر", inventoryErrorMessage(e)));
  }, [warehouseId, day]);

  return (
    <Modal
      wide
      title="محضر إتلاف"
      onClose={onClose}
      footer={
        <>
          <SecondaryButton onClick={onClose}>إغلاق</SecondaryButton>
          <PrimaryButton onClick={() => window.print()}>
            <Printer size={15} /> طباعة / PDF
          </PrimaryButton>
        </>
      }
    >
      <PrintStyle />
      {!data ? (
        <LoadingBlock />
      ) : (
        <div className="print-area space-y-4 text-slate-200" dir="rtl">
          <h2 className="text-xl font-black text-center">محضر إتلاف</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
            <p>
              <span className="text-slate-500">التاريخ: </span>
              <bdi className="font-bold">{data.day}</bdi>
            </p>
            <p>
              <span className="text-slate-500">الفرع: </span>
              <span className="font-bold">{data.branch ?? "—"}</span>
            </p>
            <p>
              <span className="text-slate-500">القسم: </span>
              <span className="font-bold">{data.department ?? "—"}</span>
            </p>
            <p>
              <span className="text-slate-500">المخزن: </span>
              <span className="font-bold">{data.warehouse}</span>
            </p>
          </div>
          {data.rows.length === 0 ? (
            <p className="text-center text-slate-500 font-bold py-6">لا إتلاف مرحّل في هذا اليوم</p>
          ) : (
            <table className="w-full text-sm border border-white/10">
              <thead>
                <tr className="font-black border-b border-white/10">
                  {["#", "الصنف", "الدفعة", "الكمية", "السبب", "القيمة (₪)", "المستند"].map((h) => (
                    <th key={h} className="text-right p-2 border-l border-white/10">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r, i) => (
                  <tr key={i} className="border-b border-white/10 tabular-nums">
                    <td className="p-2 border-l border-white/10">{i + 1}</td>
                    <td className="p-2 border-l border-white/10 font-bold">{r.item}</td>
                    <td className="p-2 border-l border-white/10 font-mono">{r.batch ?? "—"}</td>
                    <td className="p-2 border-l border-white/10">
                      {fmtNum(r.quantity)} {r.unit}
                    </td>
                    <td className="p-2 border-l border-white/10">{r.reason}</td>
                    <td className="p-2 border-l border-white/10">{r.value !== null ? fmtNum(r.value, 2) : "—"}</td>
                    <td className="p-2 font-mono text-xs">{r.document}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-black">
                  <td colSpan={5} className="p-2 text-left">
                    الإجمالي
                  </td>
                  <td className="p-2 tabular-nums">{data.total_value !== null ? `${fmtNum(data.total_value, 2)} ₪` : "—"}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
          <div className="grid grid-cols-3 gap-6 pt-10 text-sm text-center">
            {["المسؤول", "مدير القسم", "المراقب"].map((s) => (
              <div key={s} className="space-y-8">
                <p className="font-black">{s}</p>
                <p className="border-t border-white/30 pt-1 text-slate-500">الاسم والتوقيع</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
};

/* ════════════════════════ الشاورما ════════════════════════ */

export const ShawarmaPage: React.FC = () => {
  const canPost = useCan(INVENTORY_PERMISSIONS.DOCUMENTS_POST);
  const [settings, setSettings] = useState<DepartmentSetting[]>([]);
  const [warehouseId, setWarehouseId] = useState<number | "">("");
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [data, setData] = useState<ShawarmaPeriod | null>(null);
  const [skewers, setSkewers] = useState<BatchRow[]>([]);

  useEffect(() => {
    inventoryService.departmentSettings().then(setSettings).catch(() => undefined);
  }, []);
  const options = useMemo(
    () => settings.filter((s) => s.is_shawarma).flatMap((s) => s.warehouses.filter((w) => w.role === "department").map((w) => ({ ...w, skewer: s.skewer_item_id, label: `${s.department} — ${s.branch}` }))),
    [settings],
  );
  const current = options.find((o) => o.id === warehouseId);

  const load = useCallback(() => {
    if (warehouseId === "") return;
    inventoryService.shawarma(warehouseId, from, to).then(setData).catch((e) => toast.error("تعذّر تحميل الشاورما", inventoryErrorMessage(e)));
    if (current?.skewer) {
      inventoryService.batches({ warehouse_id: warehouseId, stock_item_id: current.skewer, available: 1 }).then(setSkewers).catch(() => setSkewers([]));
    }
  }, [warehouseId, from, to, current?.skewer]);

  useEffect(() => {
    load();
  }, [load]);

  const exportSkewer = async (b: BatchRow) => {
    if (!window.confirm(`تصدير السيخ ${b.code} (${kg(b.remaining)})؟`)) return;
    try {
      await inventoryService.exportSkewer(b.id);
      toast.success(`تم تصدير ${b.code}`);
      load();
    } catch (e) {
      toast.error("تعذّر التصدير", inventoryErrorMessage(e));
    }
  };

  const t = data?.totals;
  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="قسم الشاورما"
        subtitle="اللحوم المستهلكة من الجرد اليومي، والأسياخ المنتجة والصادرة، والبهار المفترض مقابل الفعلي، والغلة (الإيراد ÷ الشاورما الصادرة). إنتاج الأسياخ من شاشة أسياخ الشاورما."
      />
      <div className="flex flex-wrap items-center gap-3">
        <select className={`${inputClass} !w-auto min-w-[220px]`} value={warehouseId} onChange={(e) => setWarehouseId(e.target.value ? Number(e.target.value) : "")} aria-label="قسم الشاورما">
          <option value="">— اختر قسم الشاورما —</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <input type="date" className={`${inputClass} !w-auto`} value={from} onChange={(e) => setFrom(e.target.value)} dir="ltr" aria-label="من" />
        <input type="date" className={`${inputClass} !w-auto`} value={to} min={from} onChange={(e) => setTo(e.target.value)} dir="ltr" aria-label="إلى" />
      </div>
      {options.length === 0 && <EmptyBlock icon={Flame} text='لا يوجد قسم شاورما مضبوط. فعّل "قسم شاورما" من قالب الأقسام.' />}
      {data && t && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              ["الأسياخ المنتجة", `${t.skewers_count} · ${kg(t.skewers_weight)}`],
              ["الشاورما الصادرة", kg(t.exported_weight)],
              ["اللحوم المستهلكة", kg(t.meat_consumed)],
              ["الإيراد · الغلة", `${fmtNum(t.revenue, 2)} ₪ · ${t.yield_per_kg ? `${fmtNum(t.yield_per_kg, 2)} ₪/كغ` : "—"}`],
              ["البهار: مفترض / فعلي / عجز", `${kg(t.spice_theoretical)} / ${kg(t.spice_actual)} / ${kg(t.spice_deficit)}`],
            ].map(([l, v]) => (
              <div key={l} className="bg-slate-900 rounded-2xl border border-white/5 p-4">
                <p className="text-[11px] text-slate-500 font-black">{l}</p>
                <p className="text-sm font-black tabular-nums text-white mt-1">{v}</p>
              </div>
            ))}
          </div>
          {data.days.length > 1 && (data.best_day || data.worst_day) && (
            <p className="text-xs font-bold text-slate-400">
              أفضل يوم: <span className="text-green-400">{data.best_day?.day} ({fmtNum(data.best_day?.yield_per_kg, 2)} ₪/كغ)</span> · أضعف يوم:{" "}
              <span className="text-red-400">{data.worst_day?.day} ({fmtNum(data.worst_day?.yield_per_kg, 2)} ₪/كغ)</span>
            </p>
          )}
          <div className="bg-slate-900 rounded-2xl border border-white/5 overflow-x-auto">
            <table className="w-full text-xs min-w-[980px]">
              <thead>
                <tr className="text-slate-500 font-black border-b border-white/5">
                  {["اليوم", "اللحوم المستهلكة", "مشرّح / مبهّر / بدون تشريح", "الأسياخ", "الصادرة", "الإيراد", "الغلة", "البهار مفترض", "البهار فعلي", "عجز البهار"].map((h) => (
                    <th key={h} className="text-right p-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.days.map((d) => {
                  const det = d.meat_details.reduce(
                    (a, m) => ({ dis: a.dis + Number(m.dissected), mar: a.mar + Number(m.marinated), und: a.und + Number(m.undissected) }),
                    { dis: 0, mar: 0, und: 0 },
                  );
                  return (
                    <tr key={d.day} className="border-b border-white/5 last:border-0 tabular-nums whitespace-nowrap">
                      <td className="p-2 font-bold text-white">{d.day}</td>
                      <td className="p-2">{d.counted ? kg(d.meat_consumed) : <span className="text-amber-300 font-bold">لا جرد</span>}</td>
                      <td className="p-2 text-slate-400">{d.counted ? `${kg(det.dis)} / ${kg(det.mar)} / ${kg(det.und)}` : "—"}</td>
                      <td className={`p-2 ${d.skewers_exceed_meat ? "text-red-400 font-black" : "text-slate-300"}`}>
                        {d.skewers_count} · {kg(d.skewers_weight)}
                        {d.skewers_exceed_meat && " ⚠ أكثر من اللحوم"}
                      </td>
                      <td className="p-2 text-slate-300">{kg(d.exported_weight)}</td>
                      <td className="p-2 text-slate-300">{fmtNum(d.revenue, 2)} ₪</td>
                      <td className="p-2 font-bold text-white">{d.yield_per_kg ? `${fmtNum(d.yield_per_kg, 2)} ₪/كغ` : "—"}</td>
                      <td className="p-2 text-sky-300">{kg(d.spice_theoretical)}</td>
                      <td className="p-2 text-red-300">{kg(d.spice_actual)}</td>
                      <td className={`p-2 font-bold ${Number(d.spice_deficit) > 0 ? "text-red-400" : "text-green-400"}`}>{kg(d.spice_deficit)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="bg-slate-900 rounded-2xl border border-white/5 p-4 space-y-2">
            <h3 className="text-sm font-black text-white">الأسياخ في مخزن القسم ({skewers.length})</h3>
            {skewers.length === 0 ? (
              <p className="text-xs text-slate-500 font-bold">لا أسياخ في المخزن</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {skewers.map((b) => (
                  <span key={b.id} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-bold text-slate-200">
                    <bdi className="font-mono">{b.code}</bdi> · {kg(b.remaining)} · {b.production_date}
                    {canPost && (
                      <button type="button" onClick={() => exportSkewer(b)} className="text-red-400 hover:text-red-300">
                        تصدير
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

/* ════════════════════════ قالب الأقسام ════════════════════════ */

export const DepartmentSettingsPage: React.FC = () => {
  const canManage = useCan(INVENTORY_PERMISSIONS.WAREHOUSES_MANAGE);
  const [rows, setRows] = useState<DepartmentSetting[] | null>(null);
  const [lookups, setLookups] = useState<InventoryLookups | null>(null);
  const [itemNames, setItemNames] = useState<Record<number, string>>({});

  const load = () =>
    inventoryService
      .departmentSettings()
      .then(setRows)
      .catch((e) => toast.error("تعذّر تحميل الأقسام", inventoryErrorMessage(e)));
  useEffect(() => {
    load();
    inventoryService.lookups().then(setLookups).catch(() => undefined);
  }, []);
  const tree = useMemo(() => flattenTree(lookups?.categories ?? []), [lookups]);

  const save = async (r: DepartmentSetting, patch: Partial<DepartmentSetting>) => {
    const next = { ...r, ...patch };
    setRows((rs) => rs?.map((x) => (x.department_id === r.department_id && x.branch_id === r.branch_id ? next : x)) ?? null);
    if (next.is_shawarma && (!next.meat_category_id || !next.skewer_item_id)) return; // يُحفظ عند اكتمال إعداد الشاورما
    try {
      await inventoryService.saveDepartmentSetting({
        department_id: next.department_id, branch_id: next.branch_id, has_meals: next.has_meals, has_factory: next.has_factory,
        has_showroom: next.has_showroom, is_shawarma: next.is_shawarma, meat_category_id: next.meat_category_id,
        spice_item_id: next.spice_item_id, skewer_item_id: next.skewer_item_id,
      });
      toast.success("تم الحفظ");
    } catch (e) {
      toast.error("تعذّر الحفظ", inventoryErrorMessage(e));
      load();
    }
  };

  const picker = (r: DepartmentSetting, key: "spice_item_id" | "skewer_item_id", label: string) => (
    <div className="space-y-1">
      <span className="text-[11px] font-black text-slate-500">{label}</span>
      <StockItemPicker
        value={r[key] ? { id: r[key]!, name: itemNames[r[key]!] ?? `صنف #${r[key]}`, code: "" } : null}
        onChange={(it: StockItem | null) => {
          if (it) setItemNames((n) => ({ ...n, [it.id]: it.name }));
          save(r, { [key]: it?.id ?? null } as Partial<DepartmentSetting>);
        }}
        ariaLabel={label}
      />
    </div>
  );

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="قالب الأقسام في الفروع"
        subtitle="لكل قسم في كل فرع: هل فيه وجبات؟ مصنع؟ معرض؟ وهل هو قسم شاورما؟ المخازن تُربط بالقسم ودورها من شاشة المخازن (مخزن القسم، مواد المصنع، منتجات المصنع، المعرض)."
      />
      {!rows ? (
        <LoadingBlock />
      ) : rows.length === 0 ? (
        <EmptyBlock icon={Layers} text="لا أقسام مربوطة بفروع" />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={`${r.department_id}-${r.branch_id}`} className="bg-slate-900 rounded-2xl border border-white/5 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-black text-white">
                  {r.department} <span className="text-slate-500 font-bold">— {r.branch}</span>
                </h3>
                <div className="flex flex-wrap gap-4">
                  {(
                    [
                      ["has_meals", "وجبات"],
                      ["has_factory", "مصنع"],
                      ["has_showroom", "معرض"],
                      ["is_shawarma", "قسم شاورما"],
                    ] as const
                  ).map(([k, l]) => (
                    <Toggle key={k} checked={r[k]} onChange={(v) => save(r, { [k]: v })} label={l} disabled={!canManage} />
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-[11px] font-bold">
                {r.warehouses.length === 0 ? (
                  <span className="text-amber-300">لا مخزن مربوط بهذا القسم في الفرع — اربطه من شاشة المخازن.</span>
                ) : (
                  r.warehouses.map((w) => (
                    <span key={w.id} className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                      {WAREHOUSE_ROLES[w.role]}: {w.name}
                    </span>
                  ))
                )}
              </div>
              {r.is_shawarma && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field label="تصنيف اللحوم" required>
                    <select
                      className={inputClass}
                      value={r.meat_category_id ?? ""}
                      onChange={(e) => save(r, { meat_category_id: e.target.value ? Number(e.target.value) : null })}
                      disabled={!canManage}
                    >
                      <option value="">— اختر —</option>
                      {tree.map(({ category, depth }) => (
                        <option key={category.id} value={category.id}>
                          {"  ".repeat(depth * 2)}
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {picker(r, "skewer_item_id", "صنف السيخ (منتج وسيط)")}
                  {picker(r, "spice_item_id", "صنف البهار")}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ════════════════════════ تقارير الجودة ════════════════════════ */

type ReportKind = "main" | "department" | "factory";

export const QualityReportsPage: React.FC = () => {
  const warehouses = useWarehouses();
  const [settings, setSettings] = useState<DepartmentSetting[]>([]);
  const [kind, setKind] = useState<ReportKind>("main");
  const [from, setFrom] = useState(() => today().slice(0, 8) + "01");
  const [to, setTo] = useState(today());
  const [warehouseId, setWarehouseId] = useState<number | "">("");
  const [pair, setPair] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<Record<string, any> | null>(null);
  const [sections, setSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    inventoryService.departmentSettings().then(setSettings).catch(() => undefined);
  }, []);

  useEffect(() => {
    setData(null);
    const params: Record<string, string | number | undefined> = { period: "custom", from, to };
    if (kind === "factory") {
      if (!pair) return;
      const [d, b] = pair.split(":").map(Number);
      params.department_id = d;
      params.branch_id = b;
    } else {
      if (warehouseId === "") return;
      params.warehouse_id = warehouseId;
    }
    inventoryService.qualityReport(kind, params).then(setData).catch((e) => toast.error("تعذّر تحميل التقرير", inventoryErrorMessage(e)));
  }, [kind, from, to, warehouseId, pair]);

  const show = (k: string) => sections[k] !== false;
  const toggle = (k: string, label: string) => (
    <label key={k} className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
      <input type="checkbox" checked={show(k)} onChange={(e) => setSections((s) => ({ ...s, [k]: e.target.checked }))} className="w-4 h-4 accent-red-600" />
      {label}
    </label>
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = (title: string, rows: any[], cols: [string, (r: any) => React.ReactNode][]) => (
    <section className="bg-slate-900 rounded-2xl border border-white/5 p-4 space-y-2 break-inside-avoid">
      <h3 className="text-sm font-black text-white">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-500 font-bold">لا بيانات</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 font-black border-b border-white/5">
                {cols.map(([h]) => (
                  <th key={h} className="text-right p-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-white/5 last:border-0 tabular-nums">
                  {cols.map(([h, f]) => (
                    <td key={h} className="p-2 text-slate-300">
                      {f(r)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
  const factoryPairs = settings.filter((s) => s.has_factory || s.has_showroom);

  return (
    <div className="space-y-6" dir="rtl">
      <PrintStyle />
      <PageHeader title="تقارير الجودة" subtitle="المخزن الرئيسي، والأقسام، والمصانع والمعارض لفترة. اختر المحتوى، واطبع أو احفظ PDF. تقارير الشاورما في شاشة قسم الشاورما." />
      <div className="flex flex-wrap items-center gap-3" data-print-hide>
        <div className="flex gap-1 p-1 rounded-xl bg-slate-900 border border-white/5" role="tablist">
          {(
            [
              ["main", "المخزن الرئيسي"],
              ["department", "الأقسام"],
              ["factory", "المصانع والمعارض"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={kind === k}
              onClick={() => setKind(k)}
              className={`px-4 py-2 rounded-lg text-sm font-bold ${kind === k ? "bg-red-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              {l}
            </button>
          ))}
        </div>
        <input type="date" className={`${inputClass} !w-auto`} value={from} onChange={(e) => setFrom(e.target.value)} dir="ltr" aria-label="من" />
        <input type="date" className={`${inputClass} !w-auto`} value={to} min={from} onChange={(e) => setTo(e.target.value)} dir="ltr" aria-label="إلى" />
        {kind === "factory" ? (
          <select className={`${inputClass} !w-auto min-w-[220px]`} value={pair} onChange={(e) => setPair(e.target.value)} aria-label="القسم">
            <option value="">— اختر القسم والفرع —</option>
            {factoryPairs.map((s) => (
              <option key={`${s.department_id}:${s.branch_id}`} value={`${s.department_id}:${s.branch_id}`}>
                {s.department} — {s.branch}
              </option>
            ))}
          </select>
        ) : (
          <WarehouseSelect warehouses={warehouses} value={warehouseId} onChange={setWarehouseId} />
        )}
        <SecondaryButton onClick={() => window.print()}>
          <Printer size={15} className="inline ml-1" /> طباعة / PDF
        </SecondaryButton>
      </div>

      {data && (
        <div className="flex flex-wrap gap-4" data-print-hide>
          {kind === "main" &&
            [
              ["totals", "الإجماليات"],
              ["supplied", "أعلى الأصناف توريداً"],
              ["items", "استهلاك الأصناف"],
              ["depts", "استهلاك الأقسام"],
              ["suppliers", "أكبر الموردين"],
              ["undelivered", "فواتير غير مسلّمة"],
              ["stagnant", "الراكدة"],
            ].map(([k, l]) => toggle(k, l))}
          {kind === "department" &&
            [
              ["totals", "الإجماليات"],
              ["deficit", "العجز بالتفصيل"],
              ["wasted", "الأعلى والأقل هدراً"],
            ].map(([k, l]) => toggle(k, l))}
          {kind === "factory" &&
            [
              ["production", "الإنتاج وتكلفة الكيلو"],
              ["sales", "الأعلى والأقل مبيعاً"],
              ["storage", "أطول مدة تخزين"],
            ].map(([k, l]) => toggle(k, l))}
        </div>
      )}

      {!data ? (
        <EmptyBlock icon={FileText} text={kind === "factory" ? "اختر القسم والفرع" : "اختر المخزن"} />
      ) : (
        <div className="space-y-4 print-area">
          <h2 className="text-lg font-black text-white">
            {{ main: "تقرير المخزن الرئيسي", department: "تقرير القسم", factory: "تقرير المصنع والمعرض" }[kind]} — <bdi>{data.period?.from}</bdi> ← <bdi>{data.period?.to}</bdi>
          </h2>

          {kind === "main" && (
            <>
              {show("totals") && (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  {[
                    ["إجمالي الوارد", `${fmtNum(data.total_in_value, 2)} ₪`],
                    ["إجمالي الصادر", `${fmtNum(data.total_out_value, 2)} ₪`],
                    ["الإتلاف", `${fmtNum(data.waste_value, 2)} ₪`],
                    ["نسبة الإتلاف", data.waste_percent !== null ? `${fmtNum(data.waste_percent, 2)}%` : "—"],
                    ["أيام التغطية", data.coverage_days ? fmtNum(data.coverage_days, 1) : "—"],
                  ].map(([l, v]) => (
                    <div key={l} className="bg-slate-900 rounded-2xl border border-white/5 p-4">
                      <p className="text-[11px] text-slate-500 font-black">{l}</p>
                      <p className="text-lg font-black tabular-nums text-white mt-1">{v}</p>
                    </div>
                  ))}
                </div>
              )}
              {show("depts") && data.consumption_by_department.length > 0 && (
                <section className="bg-slate-900 rounded-2xl border border-white/5 p-4">
                  <h3 className="text-sm font-black text-white mb-2">استهلاك الأقسام (₪)</h3>
                  <div dir="ltr" className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.consumption_by_department.map((d: { name: string; value: string }) => ({ name: d.name, value: Number(d.value) }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} />
                        <YAxis tick={{ fill: "#64748b", fontSize: 11 }} width={70} />
                        <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "none", borderRadius: 12 }} />
                        <Bar dataKey="value" name="القيمة" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              )}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {show("supplied") && table("أعلى الأصناف توريداً", data.top_supplied, [["الصنف", (r) => r.name], ["القيمة ₪", (r) => fmtNum(r.value, 2)]])}
                {show("items") &&
                  table("الأكثر والأقل استهلاكاً (صرف للأقسام)", [...data.consumption_by_item.slice(0, 5), ...data.consumption_by_item.slice(-5)], [
                    ["الصنف", (r) => r.name],
                    ["القيمة ₪", (r) => fmtNum(r.value, 2)],
                  ])}
                {show("suppliers") && table("أكبر الموردين", data.top_supplier, [["المورّد", (r) => r.name], ["المستندات", (r) => r.documents], ["القيمة ₪", (r) => fmtNum(r.value, 2)]])}
                {show("undelivered") &&
                  table("فواتير صرف غير مسلّمة", data.undelivered, [
                    ["الرقم", (r) => r.number],
                    ["التاريخ", (r) => r.document_date],
                    ["الجهة", (r) => r.destination ?? r.to_warehouse?.name],
                    ["القيمة ₪", (r) => fmtNum(r.total_cost, 2)],
                  ])}
                {show("stagnant") &&
                  table("الأصناف الراكدة", data.stagnant, [
                    ["الصنف", (r) => r.name],
                    ["الرصيد", (r) => `${fmtNum(r.quantity)} ${r.base_unit}`],
                    ["آخر حركة", (r) => r.last_movement_day],
                    ["أيام", (r) => r.idle_days],
                  ])}
              </div>
            </>
          )}

          {kind === "department" && (
            <>
              {show("totals") && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    ["المبيعات", `${fmtNum(data.sales.revenue, 2)} ₪`],
                    ["الاستهلاك الفعلي", `${fmtNum(data.totals.actual_value, 2)} ₪`],
                    ["المفترض", `${fmtNum(data.totals.theoretical_value, 2)} ₪`],
                    ["الفرق", data.totals.variance_percent !== null ? `${fmtNum(data.totals.variance_percent, 2)}%` : "—"],
                  ].map(([l, v]) => (
                    <div key={l} className="bg-slate-900 rounded-2xl border border-white/5 p-4">
                      <p className="text-[11px] text-slate-500 font-black">{l}</p>
                      <p className="text-lg font-black tabular-nums text-white mt-1">{v}</p>
                    </div>
                  ))}
                </div>
              )}
              {show("deficit") &&
                table("العجز بالتفصيل", data.rows, [
                  ["الصنف", (r) => r.name],
                  ["المستهلك", (r) => kg(r.consumed)],
                  ["المفترض", (r) => kg(r.theoretical)],
                  ["العجز", (r) => kg(r.deficit)],
                  ["العجز %", (r) => (r.deficit_percent !== null ? `${fmtNum(r.deficit_percent, 2)}%` : "—")],
                  ["الهدر", (r) => kg(r.waste)],
                  ["نسبة الهدر", (r) => (r.waste_percent !== null ? `${fmtNum(r.waste_percent, 2)}%` : "—")],
                ])}
              {show("wasted") && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {table("الأعلى هدراً", data.most_wasted, [["الصنف", (r) => r.name], ["الهدر", (r) => kg(r.waste)], ["الوجبات التي يدخل فيها", (r) => r.meals.join("، ") || "—"]])}
                  {table("الأقل هدراً", data.least_wasted, [["الصنف", (r) => r.name], ["الهدر", (r) => kg(r.waste)], ["الوجبات التي يدخل فيها", (r) => r.meals.join("، ") || "—"]])}
                </div>
              )}
            </>
          )}

          {kind === "factory" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900 rounded-2xl border border-white/5 p-4">
                  <p className="text-[11px] text-slate-500 font-black">إجمالي الإنتاج</p>
                  <p className="text-lg font-black text-white mt-1">{kg(data.total_production_weight)}</p>
                </div>
                <div className="bg-slate-900 rounded-2xl border border-white/5 p-4">
                  <p className="text-[11px] text-slate-500 font-black">قيمة الهدر</p>
                  <p className="text-lg font-black text-white mt-1">{fmtNum(data.waste_value, 2)} ₪</p>
                </div>
              </div>
              {show("production") && table("الإنتاج وتكلفة الكيلو", data.production, [["المنتج", (r) => r.name], ["الوزن", (r) => kg(r.weight)], ["التكلفة ₪", (r) => fmtNum(r.cost, 2)], ["تكلفة الكيلو ₪", (r) => fmtNum(r.cost_per_kg, 2)]])}
              {show("sales") && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {table("الأعلى مبيعاً في المعرض", data.top_sold, [["المنتج", (r) => r.name], ["الكمية", (r) => fmtNum(r.quantity)], ["الإيراد ₪", (r) => fmtNum(r.revenue, 2)]])}
                  {table("الأقل مبيعاً", data.least_sold, [["المنتج", (r) => r.name], ["الكمية", (r) => fmtNum(r.quantity)], ["الإيراد ₪", (r) => fmtNum(r.revenue, 2)]])}
                </div>
              )}
              {show("storage") &&
                table("أطول مدة تخزين في المعرض", data.longest_storage, [
                  ["الدفعة", (r) => r.code],
                  ["المنتج", (r) => r.item],
                  ["المتبقي", (r) => kg(r.remaining)],
                  ["مدة التخزين", (r) => `${r.storage_days} يوم${r.showroom_overdue ? " ⚠" : ""}`],
                ])}
            </>
          )}
        </div>
      )}
    </div>
  );
};
