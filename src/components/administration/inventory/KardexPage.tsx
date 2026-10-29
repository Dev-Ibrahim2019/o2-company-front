/**
 * KardexPage.tsx — سجل حركة الصنف في مخزن، لفترة بالأيام المحاسبية (02:00 → 02:00).
 *
 * الرصيد الجاري يحسبه الخادم: رصيد أول الفترة + مجموع الحركات حتى السطر. الحركات لا تُعدَّل؛
 * التصحيح بحركة عكسية بتكلفة الحركة الأصلية (متاح يدوياً لأرصدة أول المدة فقط).
 * الحالة (المخزن، الصنف، الفترة، الصفحة) في الرابط حتى يُفتح السجل مباشرة من شاشة الأرصدة.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { History, Undo2, ChevronRight, ChevronLeft, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useCan } from "../../../auth";
import { INVENTORY_PERMISSIONS } from "../../../auth/permissions";
import { toast } from "../../shared/Toast";
import {
  fmtNum,
  inventoryErrorMessage,
  inventoryService,
  type Kardex,
  type KardexRow,
  type StockItem,
  type Warehouse,
} from "../../../services/inventoryService";
import { StockItemPicker } from "./StockItemPicker";
import { EmptyBlock, Field, IconButton, LoadingBlock, Modal, PageHeader, PrimaryButton, SecondaryButton, inputClass } from "./ui";

const BUSINESS_TZ = "Asia/Gaza";

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-GB", { timeZone: BUSINESS_TZ, hour: "2-digit", minute: "2-digit" });

const SummaryCard: React.FC<{ label: string; value: string; sub?: string; tone?: string }> = ({ label, value, sub, tone = "text-white" }) => (
  <div className="bg-slate-900 rounded-2xl border border-white/5 p-4">
    <p className="text-[11px] text-slate-500 font-black">{label}</p>
    <p className={`text-xl font-black tabular-nums mt-1 ${tone}`}>{value}</p>
    {sub && <p className="text-[11px] text-slate-500 font-semibold mt-0.5 tabular-nums">{sub}</p>}
  </div>
);

export const KardexPage: React.FC = () => {
  const canReverse = useCan(INVENTORY_PERMISSIONS.MOVEMENTS_REVERSE);
  const [params, setParams] = useSearchParams();
  const warehouseId = Number(params.get("warehouse_id")) || null;
  const itemId = Number(params.get("stock_item_id")) || null;
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const page = Number(params.get("page")) || 1;

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [data, setData] = useState<Kardex | null>(null);
  const [pickedItem, setPickedItem] = useState<Pick<StockItem, "id" | "name" | "code"> | null>(null);
  const [loading, setLoading] = useState(false);
  const [reversing, setReversing] = useState<KardexRow | null>(null);
  const requestSeq = useRef(0);

  const setParam = useCallback(
    (patch: Record<string, string | number | null>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (v === null || v === "") next.delete(k);
            else next.set(k, String(v));
          }
          if (!("page" in patch)) next.delete("page");
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  useEffect(() => {
    inventoryService
      .warehouses()
      .then((list) => {
        setWarehouses(list);
        // مستخدم بمخزن واحد: يُختار تلقائياً.
        if (list.length === 1) setParam({ warehouse_id: list[0].id });
      })
      .catch((e) => toast.error("تعذّر تحميل المخازن", inventoryErrorMessage(e)));
  }, [setParam]);

  const load = useCallback(async () => {
    if (!warehouseId || !itemId) {
      setData(null);
      return;
    }
    const seq = ++requestSeq.current;
    setLoading(true);
    try {
      const k = await inventoryService.kardex({
        warehouse_id: warehouseId,
        stock_item_id: itemId,
        from: from || undefined,
        to: to || undefined,
        page,
      });
      if (seq !== requestSeq.current) return;
      setData(k);
      setPickedItem({ id: k.item.id, name: k.item.name, code: k.item.code });
    } catch (e) {
      if (seq === requestSeq.current) {
        setData(null);
        toast.error("تعذّر تحميل سجل الحركة", inventoryErrorMessage(e));
      }
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [warehouseId, itemId, from, to, page]);

  useEffect(() => {
    load();
  }, [load]);

  const unit = data?.item.base_unit ?? "";

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="سجل حركة الصنف"
        subtitle="كل حركة على الصنف في المخزن مع الرصيد الجاري. الفترة بالأيام المحاسبية (02:00 → 02:00)."
      />

      {/* ── الاختيار والفترة ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <Field label="المخزن">
          <select
            className={inputClass}
            value={warehouseId ?? ""}
            onChange={(e) => setParam({ warehouse_id: e.target.value || null })}
          >
            <option value="">— اختر المخزن —</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="space-y-1.5">
          <span className="text-xs font-black text-slate-400 tracking-wider">الصنف</span>
          <StockItemPicker
            value={pickedItem}
            onChange={(item) => {
              setPickedItem(item);
              setParam({ stock_item_id: item?.id ?? null });
            }}
            ariaLabel="الصنف"
          />
        </div>
        <Field label="من يوم">
          <input
            type="date"
            className={inputClass}
            value={from || data?.from || ""}
            max={to || data?.to || undefined}
            onChange={(e) => setParam({ from: e.target.value })}
            dir="ltr"
          />
        </Field>
        <Field label="إلى يوم">
          <input
            type="date"
            className={inputClass}
            value={to || data?.to || ""}
            min={from || data?.from || undefined}
            onChange={(e) => setParam({ to: e.target.value })}
            dir="ltr"
          />
        </Field>
      </div>

      {!warehouseId || !itemId ? (
        <EmptyBlock icon={History} text="اختر المخزن والصنف لعرض سجل الحركة" />
      ) : loading && !data ? (
        <LoadingBlock />
      ) : data ? (
        <>
          {/* ── الملخص ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryCard label="رصيد أول الفترة" value={`${fmtNum(data.opening.quantity)} ${unit}`} sub={`${fmtNum(data.opening.value, 2)} ₪`} />
            <SummaryCard label="الوارد" value={`${fmtNum(data.totals.quantity_in)} ${unit}`} tone="text-green-400" />
            <SummaryCard label="الصادر" value={`${fmtNum(data.totals.quantity_out)} ${unit}`} tone="text-red-400" />
            <SummaryCard
              label="رصيد آخر الفترة"
              value={`${fmtNum(data.totals.closing_quantity)} ${unit}`}
              sub={`${fmtNum(data.totals.closing_value, 2)} ₪`}
              tone={Number(data.totals.closing_quantity) < 0 ? "text-red-400" : "text-white"}
            />
          </div>

          {data.rows.length === 0 ? (
            <EmptyBlock icon={History} text="لا توجد حركات في هذه الفترة" />
          ) : (
            <div className={`bg-slate-900 rounded-2xl border border-white/5 overflow-x-auto transition-opacity ${loading ? "opacity-60" : ""}`}>
              <table className="w-full text-sm min-w-[980px]">
                <thead>
                  <tr className="text-slate-500 text-xs font-black border-b border-white/5">
                    <th className="text-right p-3">اليوم المحاسبي</th>
                    <th className="text-right p-3">الحركة</th>
                    <th className="text-right p-3">وارد</th>
                    <th className="text-right p-3">صادر</th>
                    <th className="text-right p-3">تكلفة الوحدة</th>
                    <th className="text-right p-3">القيمة (₪)</th>
                    <th className="text-right p-3">الرصيد</th>
                    <th className="text-right p-3">المتوسط بعدها</th>
                    <th className="text-right p-3">بواسطة / ملاحظات</th>
                    {canReverse && (
                      <th className="p-3 w-12">
                        <span className="sr-only">إجراءات</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => {
                    const incoming = Number(r.quantity) > 0;
                    return (
                      <tr key={r.id} className={`border-b border-white/5 last:border-0 ${r.is_reversed ? "opacity-60" : ""}`}>
                        <td className="p-3 whitespace-nowrap">
                          <span className="text-white font-bold tabular-nums">{r.accounting_day}</span>
                          <span className="text-[11px] text-slate-500 tabular-nums mr-1.5">{timeOf(r.occurred_at)}</span>
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 font-bold text-slate-200">
                            {incoming ? <ArrowDownLeft size={13} className="text-green-400" /> : <ArrowUpRight size={13} className="text-red-400" />}
                            {r.type_label}
                          </span>
                          {r.reversal_of_id && (
                            <span className="block text-[11px] text-amber-300 font-bold">عكس الحركة #{r.reversal_of_id}</span>
                          )}
                          {r.is_reversed && <span className="block text-[11px] text-slate-500 font-bold">معكوسة</span>}
                        </td>
                        <td className="p-3 text-green-400 font-bold tabular-nums">{incoming ? fmtNum(r.quantity) : ""}</td>
                        <td className="p-3 text-red-400 font-bold tabular-nums">{incoming ? "" : fmtNum(-Number(r.quantity))}</td>
                        <td className="p-3 text-slate-300 tabular-nums">{fmtNum(r.unit_cost, 4)}</td>
                        <td className="p-3 text-slate-300 tabular-nums">{fmtNum(r.total_cost, 2)}</td>
                        <td className={`p-3 font-black tabular-nums ${Number(r.running_quantity) < 0 ? "text-red-400" : "text-white"}`}>
                          {fmtNum(r.running_quantity)}
                        </td>
                        <td className="p-3 text-slate-400 tabular-nums">{fmtNum(r.avg_cost_after, 4)}</td>
                        <td className="p-3 text-xs text-slate-400 max-w-[220px]">
                          <span className="block font-bold text-slate-300">{r.created_by ?? "النظام"}</span>
                          {r.entered_unit && r.entered_quantity && (
                            <span className="block">
                              أُدخل: {fmtNum(r.entered_quantity)} {r.entered_unit}
                            </span>
                          )}
                          {r.notes && (
                            <span className="block truncate" title={r.notes}>
                              {r.notes}
                            </span>
                          )}
                        </td>
                        {canReverse && (
                          <td className="p-3">
                            {r.can_reverse && (
                              <IconButton label="عكس الحركة" tone="danger" onClick={() => setReversing(r)}>
                                <Undo2 size={15} />
                              </IconButton>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {data.last_page > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 font-bold">
                {data.total} حركة — صفحة {data.current_page} من {data.last_page}
              </span>
              <div className="flex gap-1.5">
                <IconButton label="الصفحة السابقة" disabled={page <= 1 || loading} onClick={() => setParam({ page: page - 1 })}>
                  <ChevronRight size={16} />
                </IconButton>
                <IconButton label="الصفحة التالية" disabled={page >= data.last_page || loading} onClick={() => setParam({ page: page + 1 })}>
                  <ChevronLeft size={16} />
                </IconButton>
              </div>
            </div>
          )}
        </>
      ) : null}

      {reversing && (
        <ReverseModal
          row={reversing}
          unit={unit}
          onClose={() => setReversing(null)}
          onDone={() => {
            setReversing(null);
            load();
          }}
        />
      )}
    </div>
  );
};

const ReverseModal: React.FC<{ row: KardexRow; unit: string; onClose: () => void; onDone: () => void }> = ({ row, unit, onClose, onDone }) => {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setSaving(true);
    try {
      await inventoryService.reverseMovement(row.id, reason.trim());
      toast.success("تم عكس الحركة");
      onDone();
    } catch (err) {
      toast.error("تعذّر عكس الحركة", inventoryErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`عكس الحركة #${row.id}`}
      onClose={onClose}
      footer={
        <>
          <SecondaryButton onClick={onClose}>إلغاء</SecondaryButton>
          <PrimaryButton type="submit" form="reverse-form" loading={saving} disabled={!reason.trim()}>
            تأكيد العكس
          </PrimaryButton>
        </>
      }
    >
      <form id="reverse-form" onSubmit={submit} className="space-y-4">
        <p className="text-sm text-slate-300">
          ستُسجَّل حركة جديدة بكمية <span className="font-black tabular-nums">{fmtNum(-Number(row.quantity))} {unit}</span> وبتكلفة
          الحركة الأصلية نفسها ({fmtNum(row.unit_cost, 4)} ₪). الحركة الأصلية تبقى كما هي، ولا يمكن عكسها مرة ثانية.
        </p>
        <Field label="سبب العكس" required>
          <textarea
            className={`${inputClass} min-h-[80px]`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            required
            autoFocus
          />
        </Field>
      </form>
    </Modal>
  );
};
