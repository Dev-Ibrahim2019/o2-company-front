/**
 * StockCountsPage.tsx — الجرد الفعلي: ورقة لكل مخزن، إدخال المعدود بأي وحدة معرّفة، ثم ترحيل يسوّي الفروق.
 * الفرق يُحسب عند الترحيل مقابل الرصيد المسجّل لحظتها، والصنف غير المعدود لا يُسوّى.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClipboardCheck, Plus, Send, Trash2 } from "lucide-react";
import { useCan } from "../../../auth";
import { INVENTORY_PERMISSIONS } from "../../../auth/permissions";
import { toast } from "../../shared/Toast";
import {
  fmtNum,
  inventoryErrorMessage,
  inventoryService,
  type InventoryLookups,
  type StockCount,
  type StockCountLine,
  type Warehouse,
} from "../../../services/inventoryService";
import { flattenTree } from "./CategoriesPage";
import { EmptyBlock, Field, LoadingBlock, Modal, PageHeader, PrimaryButton, SearchBox, SecondaryButton, inputClass } from "./ui";

export const StockCountsPage: React.FC = () => {
  const canManage = useCan(INVENTORY_PERMISSIONS.COUNTS_MANAGE);
  const [counts, setCounts] = useState<StockCount[] | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [lookups, setLookups] = useState<InventoryLookups | null>(null);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);

  const load = useCallback(() => {
    inventoryService
      .counts({ per_page: 50 })
      .then((p) => setCounts(p.data))
      .catch((e) => toast.error("تعذّر تحميل أوراق الجرد", inventoryErrorMessage(e)));
  }, []);

  useEffect(() => {
    load();
    inventoryService.warehouses().then((w) => setWarehouses(w.filter((x) => x.is_active && x.type === "standard"))).catch(() => undefined);
    inventoryService.lookups().then(setLookups).catch(() => undefined);
  }, [load]);

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="الجرد الفعلي"
        subtitle="عدّ ما في المخزن فعلاً ومقارنته بالرصيد المسجّل. الترحيل يسوّي الفروق ويجعل الاستهلاك الفعلي في التحليلات حقيقياً."
        action={
          canManage && (
            <PrimaryButton onClick={() => setCreating(true)} disabled={warehouses.length === 0}>
              <Plus size={18} /> ورقة جرد جديدة
            </PrimaryButton>
          )
        }
      />

      {!counts ? (
        <LoadingBlock />
      ) : counts.length === 0 ? (
        <EmptyBlock icon={ClipboardCheck} text="لا توجد أوراق جرد بعد" />
      ) : (
        <div className="bg-slate-900 rounded-2xl border border-white/5 overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-slate-500 text-xs font-black border-b border-white/5">
                <th className="text-right p-4">الرقم</th>
                <th className="text-right p-4">المخزن</th>
                <th className="text-right p-4">الحالة</th>
                <th className="text-right p-4">المعدود</th>
                <th className="text-right p-4">تاريخ الجرد</th>
                <th className="text-right p-4">قيمة الفروق (₪)</th>
                <th className="text-right p-4">بواسطة</th>
              </tr>
            </thead>
            <tbody>
              {counts.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setOpenId(c.id)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setOpenId(c.id)}
                  tabIndex={0}
                  role="button"
                  aria-label={`ورقة الجرد ${c.number}`}
                  className="border-b border-white/5 last:border-0 hover:bg-white/[0.03] cursor-pointer focus:outline-none focus:bg-white/[0.05]"
                >
                  <td className="p-4">
                    <bdi className="font-mono text-xs font-bold text-white">{c.number}</bdi>
                  </td>
                  <td className="p-4 text-slate-300">{c.warehouse?.name}</td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-black ${c.status === "posted" ? "bg-green-500/15 text-green-400" : "bg-slate-500/15 text-slate-300"}`}
                    >
                      {c.status === "posted" ? "مرحّل" : "مسودة"}
                    </span>
                  </td>
                  <td className="p-4 text-slate-400 tabular-nums">
                    {c.counted_lines_count} / {c.lines_count}
                  </td>
                  <td className="p-4 text-slate-300 tabular-nums">{c.count_date ?? "—"}</td>
                  <td className={`p-4 tabular-nums font-bold ${Number(c.variance_value) < 0 ? "text-red-400" : "text-slate-300"}`}>
                    {c.status === "posted" ? fmtNum(c.variance_value, 2) : "—"}
                  </td>
                  <td className="p-4 text-xs text-slate-400">{c.poster?.name ?? c.creator?.name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <NewCountModal
          warehouses={warehouses}
          lookups={lookups}
          onClose={() => setCreating(false)}
          onCreated={(c) => {
            setCreating(false);
            load();
            setOpenId(c.id);
          }}
        />
      )}
      {openId !== null && <CountSheetModal id={openId} onClose={() => setOpenId(null)} onChanged={load} />}
    </div>
  );
};

const NewCountModal: React.FC<{
  warehouses: Warehouse[];
  lookups: InventoryLookups | null;
  onClose: () => void;
  onCreated: (c: StockCount) => void;
}> = ({ warehouses, lookups, onClose, onCreated }) => {
  const [warehouseId, setWarehouseId] = useState<number | "">(warehouses.length === 1 ? warehouses[0].id : "");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  const tree = useMemo(() => flattenTree(lookups?.categories ?? []), [lookups]);

  const create = async () => {
    if (warehouseId === "") {
      toast.warning("اختر المخزن");
      return;
    }
    setSaving(true);
    try {
      onCreated(await inventoryService.createCount({ warehouse_id: warehouseId, category_id: categoryId === "" ? null : categoryId }));
    } catch (e) {
      toast.error("تعذّر إنشاء ورقة الجرد", inventoryErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="ورقة جرد جديدة"
      onClose={onClose}
      footer={
        <>
          <SecondaryButton onClick={onClose}>إلغاء</SecondaryButton>
          <PrimaryButton onClick={create} loading={saving}>
            إنشاء
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="المخزن" required>
          <select className={inputClass} value={warehouseId} onChange={(e) => setWarehouseId(e.target.value ? Number(e.target.value) : "")}>
            <option value="">— اختر —</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="التصنيف" hint="فارغ = كل الأصناف المخزنية النشطة.">
          <select className={inputClass} value={categoryId} onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")}>
            <option value="">كل التصنيفات</option>
            {tree.map(({ category, depth }) => (
              <option key={category.id} value={category.id}>
                {"  ".repeat(depth * 2)}
                {category.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </Modal>
  );
};

interface Entry {
  unitId: number | "";
  quantity: string;
}

const CountSheetModal: React.FC<{ id: number; onClose: () => void; onChanged: () => void }> = ({ id, onClose, onChanged }) => {
  const canManage = useCan(INVENTORY_PERMISSIONS.COUNTS_MANAGE);
  const canPost = useCan(INVENTORY_PERMISSIONS.COUNTS_POST);
  const [count, setCount] = useState<StockCount | null>(null);
  const [entries, setEntries] = useState<Record<number, Entry>>({});
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<"save" | "post" | "delete" | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  const apply = (c: StockCount) => {
    setCount(c);
    const next: Record<number, Entry> = {};
    for (const l of c.lines ?? []) {
      next[l.stock_item_id] = {
        unitId: l.unit_id ?? l.stock_item?.base_unit_id ?? "",
        quantity: l.entered_quantity !== null ? String(Number(l.entered_quantity)) : "",
      };
    }
    setEntries(next);
  };

  useEffect(() => {
    inventoryService
      .count(id)
      .then(apply)
      .catch((e) => {
        toast.error("تعذّر تحميل ورقة الجرد", inventoryErrorMessage(e));
        closeRef.current();
      });
  }, [id]);

  const draft = count?.status === "draft";
  const editable = draft && canManage;
  const term = search.trim();
  const lines = (count?.lines ?? []).filter((l) => !term || l.stock_item?.name.includes(term) || l.stock_item?.code.includes(term));

  const payload = () =>
    (count?.lines ?? []).map((l) => {
      const e = entries[l.stock_item_id];
      return {
        stock_item_id: l.stock_item_id,
        unit_id: !e || e.unitId === "" ? null : e.unitId,
        entered_quantity: e && e.quantity !== "" ? Number(e.quantity) : null,
      };
    });

  const save = async (andPost: boolean) => {
    if (!count) return;
    if (andPost && !window.confirm("ترحيل الجرد يسجّل تسويات لكل الأصناف المعدودة ولا يمكن تعديله بعدها. متابعة؟")) return;
    setBusy(andPost ? "post" : "save");
    try {
      let c = await inventoryService.saveCount(count.id, { notes: count.notes, lines: payload() });
      if (andPost) {
        c = await inventoryService.postCount(count.id);
        toast.success("تم ترحيل الجرد وتسوية الفروق");
      } else {
        toast.success("تم حفظ المعدود");
      }
      apply(c);
      onChanged();
    } catch (e) {
      toast.error("تعذّرت العملية", inventoryErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!count || !window.confirm(`حذف ورقة الجرد ${count.number}؟`)) return;
    setBusy("delete");
    try {
      await inventoryService.deleteCount(count.id);
      onChanged();
      onClose();
    } catch (e) {
      toast.error("تعذّر الحذف", inventoryErrorMessage(e));
      setBusy(null);
    }
  };

  const unitOptions = (l: StockCountLine) => [
    { id: l.stock_item?.base_unit_id ?? 0, name: l.stock_item?.base_unit?.name ?? "", factor: 1 },
    ...(l.stock_item?.units ?? []).map((u) => ({ id: u.unit_id, name: u.unit?.name ?? "", factor: Number(u.factor) })),
  ];

  /** الفرق التقديري قبل الترحيل = المعدود بالوحدة الأساسية − الرصيد المسجّل عند إنشاء الورقة. */
  const previewVariance = (l: StockCountLine): number | null => {
    const e = entries[l.stock_item_id];
    if (!e || e.quantity === "") return null;
    const factor = unitOptions(l).find((u) => u.id === e.unitId)?.factor ?? 1;
    return Number(e.quantity) * factor - Number(l.expected_quantity);
  };

  return (
    <Modal
      wide
      title={count ? `جرد ${count.warehouse?.name ?? ""} — ${count.number}` : "ورقة الجرد"}
      onClose={onClose}
      footer={
        count && (
          <>
            {count.status === "posted" && count.costs_visible && (
              <span className="text-sm font-bold text-slate-400 self-center ml-auto">
                قيمة الفروق:{" "}
                <span className={`tabular-nums ${Number(count.variance_value) < 0 ? "text-red-400" : "text-white"}`}>{fmtNum(count.variance_value, 2)} ₪</span>
              </span>
            )}
            {editable && (
              <>
                <SecondaryButton onClick={remove} disabled={busy !== null}>
                  <Trash2 size={15} className="inline ml-1" /> حذف
                </SecondaryButton>
                <SecondaryButton onClick={() => save(false)} disabled={busy !== null}>
                  {busy === "save" ? "جارٍ الحفظ..." : "حفظ المعدود"}
                </SecondaryButton>
              </>
            )}
            {draft && canPost && (
              <PrimaryButton onClick={() => save(true)} loading={busy === "post"} disabled={busy !== null}>
                <Send size={15} /> ترحيل الجرد
              </PrimaryButton>
            )}
          </>
        )
      }
    >
      {!count ? (
        <LoadingBlock />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <SearchBox value={search} onChange={setSearch} placeholder="بحث في الأصناف..." />
            <p className="text-[11px] text-slate-500 font-semibold">
              {draft
                ? "اترك الكمية فارغة للصنف الذي لم يُعدّ — لا تُسجَّل له تسوية. الفرق النهائي يُحسب لحظة الترحيل."
                : `رُحّل في ${count.count_date ?? ""} بواسطة ${count.poster?.name ?? "—"}.`}
            </p>
          </div>
          <div className="bg-slate-900 rounded-2xl border border-white/5 overflow-x-auto max-h-[60vh] overflow-y-auto custom-scrollbar">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="sticky top-0 bg-slate-900">
                <tr className="text-slate-500 text-xs font-black border-b border-white/5">
                  <th className="text-right p-3">الصنف</th>
                  <th className="text-right p-3">المسجّل</th>
                  <th className="text-right p-3">المعدود</th>
                  <th className="text-right p-3">الفرق</th>
                  {!draft && count.costs_visible && <th className="text-right p-3">قيمة الفرق (₪)</th>}
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => {
                  const e = entries[l.stock_item_id] ?? { unitId: "", quantity: "" };
                  const variance = draft ? previewVariance(l) : l.variance_quantity !== null ? Number(l.variance_quantity) : null;
                  const unit = l.stock_item?.base_unit?.name ?? "";
                  return (
                    <tr key={l.id} className="border-b border-white/5 last:border-0">
                      <td className="p-3">
                        <span className="font-bold text-white">{l.stock_item?.name}</span>
                        <bdi className="block text-[11px] text-slate-500 font-mono">{l.stock_item?.code}</bdi>
                      </td>
                      <td className="p-3 text-slate-300 tabular-nums whitespace-nowrap">
                        {fmtNum(l.expected_quantity)} <span className="text-xs text-slate-500">{unit}</span>
                      </td>
                      <td className="p-3">
                        {editable ? (
                          <div className="flex gap-1.5 min-w-[220px]">
                            <input
                              type="number"
                              min={0}
                              step="any"
                              className={`${inputClass} !py-2`}
                              value={e.quantity}
                              onChange={(ev) => setEntries((s) => ({ ...s, [l.stock_item_id]: { ...e, quantity: ev.target.value } }))}
                              dir="ltr"
                              aria-label={`المعدود من ${l.stock_item?.name ?? ""}`}
                            />
                            <select
                              className={`${inputClass} !py-2 !w-28`}
                              value={e.unitId}
                              onChange={(ev) => setEntries((s) => ({ ...s, [l.stock_item_id]: { ...e, unitId: Number(ev.target.value) } }))}
                              aria-label="الوحدة"
                            >
                              {unitOptions(l).map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <span className="tabular-nums text-slate-200">
                            {l.counted_quantity !== null ? `${fmtNum(l.counted_quantity)} ${unit}` : <span className="text-slate-500">لم يُعدّ</span>}
                          </span>
                        )}
                      </td>
                      <td
                        className={`p-3 font-bold tabular-nums whitespace-nowrap ${variance === null ? "text-slate-500" : variance < 0 ? "text-red-400" : variance > 0 ? "text-green-400" : "text-slate-300"}`}
                      >
                        {variance === null ? "—" : `${variance > 0 ? "+" : ""}${fmtNum(variance)} ${unit}`}
                      </td>
                      {!draft && count.costs_visible && (
                        <td className={`p-3 tabular-nums ${Number(l.variance_value) < 0 ? "text-red-400" : "text-slate-300"}`}>
                          {l.variance_value !== null ? fmtNum(l.variance_value, 2) : "—"}
                        </td>
                      )}
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
