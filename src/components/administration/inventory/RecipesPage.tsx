/**
 * RecipesPage.tsx — وصفات منتجات المنيو والمنتجات الوسيطة (مثل الثومية)، بتكلفتها ونسبة تكلفة الطعام.
 *
 * التعديل يُنشئ نسخة جديدة بتاريخ سريان (اليوم أو لاحقاً)، فلا تتغير حسابات الأيام الماضية.
 * المكوّن الذي هو منتج وسيط له وصفة يُفكَّك تلقائياً إلى مواده الخام في التكلفة والاستهلاك النظري.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useCan } from "../../../auth";
import { INVENTORY_PERMISSIONS } from "../../../auth/permissions";
import { toast } from "../../shared/Toast";
import {
  fmtNum,
  inventoryErrorMessage,
  inventoryService,
  type Paginated,
  type RecipeDetail,
  type RecipeListRow,
  type RecipeOwnerType,
  type StockItem,
} from "../../../services/inventoryService";
import { StockItemPicker } from "./StockItemPicker";
import { EmptyBlock, Field, IconButton, LoadingBlock, Modal, PageHeader, PrimaryButton, SearchBox, SecondaryButton, Toggle, inputClass } from "./ui";

const TABS: { value: RecipeOwnerType; label: string }[] = [
  { value: "product", label: "منتجات المنيو" },
  { value: "intermediate", label: "منتجات وسيطة (وصفات فرعية)" },
];

/** لون نسبة تكلفة الطعام: حتى 30% جيد، حتى 35% مقبول، أعلى من ذلك مرتفع. */
const foodCostTone = (pct: string | null) =>
  pct === null ? "text-slate-500" : Number(pct) <= 30 ? "text-green-400" : Number(pct) <= 35 ? "text-amber-300" : "text-red-400";

export const RecipesPage: React.FC = () => {
  const [type, setType] = useState<RecipeOwnerType>("product");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [missingOnly, setMissingOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Paginated<RecipeListRow> | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<RecipeListRow | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch((prev) => {
        const next = searchInput.trim();
        if (prev !== next) setPage(1);
        return next;
      });
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    const s = ++seq.current;
    setLoading(true);
    try {
      const data = await inventoryService.recipes({ type, search: search || undefined, missing: missingOnly ? 1 : undefined, page, per_page: 25 });
      if (s === seq.current) setResult(data);
    } catch (e) {
      if (s === seq.current) toast.error("تعذّر تحميل الوصفات", inventoryErrorMessage(e));
    } finally {
      if (s === seq.current) setLoading(false);
    }
  }, [type, search, missingOnly, page]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = result?.data ?? [];

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="الوصفات"
        subtitle="مكوّنات كل منتج بالوحدة الأساسية، وتكلفته الحالية ونسبة تكلفة الطعام من سعر البيع. أساس الاستهلاك النظري."
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 p-1 rounded-xl bg-slate-900 border border-white/5" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={type === t.value}
              onClick={() => {
                setType(t.value);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${type === t.value ? "bg-red-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <SearchBox value={searchInput} onChange={setSearchInput} placeholder="بحث بالاسم أو الكود..." />
        <Toggle
          checked={missingOnly}
          onChange={(v) => {
            setMissingOnly(v);
            setPage(1);
          }}
          label="بلا وصفة فقط"
        />
      </div>

      {loading && !result ? (
        <LoadingBlock />
      ) : rows.length === 0 ? (
        <EmptyBlock
          icon={BookOpen}
          text={type === "intermediate" ? 'لا توجد منتجات وسيطة. أنشئ صنفاً مخزنياً من نوع "منتج وسيط" أولاً.' : "لا توجد منتجات مطابقة"}
        />
      ) : (
        <div className={`bg-slate-900 rounded-2xl border border-white/5 overflow-x-auto transition-opacity ${loading ? "opacity-60" : ""}`}>
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-slate-500 text-xs font-black border-b border-white/5">
                <th className="text-right p-4">{type === "product" ? "المنتج" : "المنتج الوسيط"}</th>
                <th className="text-right p-4">الوصفة</th>
                <th className="text-right p-4">سارية منذ</th>
                <th className="text-right p-4">المكوّنات</th>
                {type === "product" && <th className="text-right p-4">سعر البيع (₪)</th>}
                <th className="text-right p-4">{type === "product" ? "التكلفة (₪)" : "تكلفة الوحدة (₪)"}</th>
                {type === "product" && <th className="text-right p-4">نسبة التكلفة</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setEditing(r)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setEditing(r)}
                  tabIndex={0}
                  role="button"
                  aria-label={`وصفة ${r.name}`}
                  className="border-b border-white/5 last:border-0 hover:bg-white/[0.03] cursor-pointer focus:outline-none focus:bg-white/[0.05]"
                >
                  <td className="p-4">
                    <span className="font-bold text-white">{r.name}</span>
                    {r.code && <bdi className="block text-[11px] text-slate-500 font-mono">{r.code}</bdi>}
                  </td>
                  <td className="p-4">
                    {r.has_recipe ? (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-green-500/15 text-green-400">موجودة</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-amber-500/15 text-amber-300">بلا وصفة</span>
                    )}
                  </td>
                  <td className="p-4 text-slate-400 tabular-nums">{r.effective_from ?? "—"}</td>
                  <td className="p-4 text-slate-400 tabular-nums">{r.lines_count || "—"}</td>
                  {type === "product" && <td className="p-4 text-slate-300 tabular-nums">{fmtNum(r.price, 2)}</td>}
                  <td className="p-4 text-slate-200 font-bold tabular-nums">{fmtNum(r.unit_cost, type === "product" ? 2 : 4)}</td>
                  {type === "product" && (
                    <td className={`p-4 font-black tabular-nums ${foodCostTone(r.food_cost_percent)}`}>
                      {r.food_cost_percent !== null ? `${fmtNum(r.food_cost_percent, 1)}%` : "—"}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result && result.last_page > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500 font-bold">
            {result.total} — صفحة {result.current_page} من {result.last_page}
          </span>
          <div className="flex gap-1.5">
            <IconButton label="الصفحة السابقة" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
              <ChevronRight size={16} />
            </IconButton>
            <IconButton label="الصفحة التالية" disabled={page >= result.last_page || loading} onClick={() => setPage((p) => p + 1)}>
              <ChevronLeft size={16} />
            </IconButton>
          </div>
        </div>
      )}

      {editing && <RecipeEditorModal type={type} ownerId={editing.id} onClose={() => setEditing(null)} onSaved={load} />}
    </div>
  );
};

/* ── محرر الوصفة ── */

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
}

let nextKey = 1;
const emptyLine = (): Line => ({ key: nextKey++, item: null, units: [], unitId: "", quantity: "" });

async function unitsOf(itemId: number): Promise<UnitOption[]> {
  const item = await inventoryService.item(itemId);
  return [
    { id: item.base_unit_id, name: item.base_unit?.name ?? "الوحدة الأساسية", factor: 1 },
    ...(item.units ?? []).map((u) => ({ id: u.unit_id, name: u.unit?.name ?? "", factor: Number(u.factor) })),
  ];
}

const RecipeEditorModal: React.FC<{ type: RecipeOwnerType; ownerId: number; onClose: () => void; onSaved: () => void }> = ({
  type,
  ownerId,
  onClose,
  onSaved,
}) => {
  const canManage = useCan(INVENTORY_PERMISSIONS.RECIPES_MANAGE);
  const [detail, setDetail] = useState<RecipeDetail | null>(null);
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [yieldQty, setYieldQty] = useState("1");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [saving, setSaving] = useState(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  const load = useCallback(async () => {
    try {
      const d = await inventoryService.recipe(type, ownerId);
      setDetail(d);
      setEffectiveFrom(d.today);
      // النموذج يبدأ من النسخة المستقبلية إن وُجدت، وإلا السارية، لتعديلها كنسخة جديدة.
      const base = d.versions.find((v) => v.editable) ?? d.versions.find((v) => v.is_current) ?? null;
      setYieldQty(base ? String(Number(base.yield_quantity)) : "1");
      setNotes(base?.notes ?? "");
      const loaded = await Promise.all(
        (base?.lines ?? []).map(async (l) => ({
          key: nextKey++,
          item: l.stock_item ? { id: l.stock_item.id, name: l.stock_item.name, code: l.stock_item.code } : null,
          units: await unitsOf(l.stock_item_id).catch(() => [] as UnitOption[]),
          unitId: l.unit_id,
          quantity: String(Number(l.quantity)),
        })),
      );
      setLines(loaded.length ? loaded : [emptyLine()]);
    } catch (e) {
      toast.error("تعذّر تحميل الوصفة", inventoryErrorMessage(e));
      closeRef.current();
    }
  }, [type, ownerId]);

  useEffect(() => {
    load();
  }, [load]);

  const update = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const pick = async (key: number, item: StockItem | null) => {
    if (!item) {
      update(key, { item: null, units: [], unitId: "" });
      return;
    }
    update(key, { item, units: [], unitId: item.base_unit_id });
    try {
      update(key, { units: await unitsOf(item.id) });
    } catch (e) {
      toast.error("تعذّر تحميل وحدات الصنف", inventoryErrorMessage(e));
    }
  };

  const save = async () => {
    const filled = lines.filter((l) => l.item);
    if (filled.length === 0) {
      toast.warning("أضف مكوّناً واحداً على الأقل");
      return;
    }
    if (filled.some((l) => !(Number(l.quantity) > 0))) {
      toast.warning("كمية كل مكوّن يجب أن تكون أكبر من صفر");
      return;
    }
    setSaving(true);
    try {
      await inventoryService.saveRecipe(type, ownerId, {
        effective_from: effectiveFrom || null,
        yield_quantity: type === "intermediate" ? Number(yieldQty) : 1,
        notes: notes.trim() || null,
        lines: filled.map((l) => ({ stock_item_id: l.item!.id, unit_id: l.unitId === "" ? null : l.unitId, quantity: Number(l.quantity) })),
      });
      toast.success("تم حفظ الوصفة");
      onSaved();
      await load();
    } catch (e) {
      toast.error("تعذّر الحفظ", inventoryErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const removeVersion = async (id: number, from: string) => {
    if (!window.confirm(`حذف نسخة الوصفة السارية من ${from}؟`)) return;
    try {
      await inventoryService.deleteRecipeVersion(id);
      toast.success("تم حذف النسخة");
      onSaved();
      await load();
    } catch (e) {
      toast.error("تعذّر الحذف", inventoryErrorMessage(e));
    }
  };

  const chosen = lines.map((l) => l.item?.id).filter((id): id is number => typeof id === "number");
  const ownerUnit = detail?.owner.base_unit ?? "وحدة";

  return (
    <Modal
      wide
      title={detail ? `وصفة: ${detail.owner.name}` : "الوصفة"}
      onClose={onClose}
      footer={
        <>
          <SecondaryButton onClick={onClose}>{canManage ? "إلغاء" : "إغلاق"}</SecondaryButton>
          {canManage && detail && (
            <PrimaryButton onClick={save} loading={saving}>
              حفظ الوصفة
            </PrimaryButton>
          )}
        </>
      }
    >
      {!detail ? (
        <LoadingBlock />
      ) : (
        <div className="space-y-5">
          {/* ── التكلفة الحالية ── */}
          {detail.costing ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className="text-slate-400 font-bold">
                  التكلفة الحالية {type === "product" ? "للحصة" : `لكل ${ownerUnit}`}:{" "}
                  <span className="text-white tabular-nums">{fmtNum(detail.costing.cost, 4)} ₪</span>
                </span>
                {detail.price && (
                  <span className="text-slate-400 font-bold">
                    متوسط سعر البيع: <span className="text-white tabular-nums">{fmtNum(detail.price, 2)} ₪</span>
                  </span>
                )}
                {detail.food_cost_percent && (
                  <span className={`font-black ${foodCostTone(detail.food_cost_percent)}`}>نسبة التكلفة {fmtNum(detail.food_cost_percent, 1)}%</span>
                )}
              </div>
              <div className="bg-slate-900 rounded-xl border border-white/5 overflow-x-auto">
                <table className="w-full text-xs min-w-[520px]">
                  <thead>
                    <tr className="text-slate-500 font-black border-b border-white/5">
                      <th className="text-right p-2">المادة (بعد تفكيك الوصفات الفرعية)</th>
                      <th className="text-right p-2">الكمية</th>
                      <th className="text-right p-2">تكلفة الوحدة</th>
                      <th className="text-right p-2">التكلفة (₪)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.costing.ingredients.map((i) => (
                      <tr key={i.stock_item_id} className="border-b border-white/5 last:border-0">
                        <td className="p-2 font-bold text-slate-200">{i.name}</td>
                        <td className="p-2 tabular-nums text-slate-300">
                          {fmtNum(i.quantity)} <span className="text-slate-500">{i.base_unit}</span>
                        </td>
                        <td className="p-2 tabular-nums text-slate-400">{fmtNum(i.unit_cost, 4)}</td>
                        <td className="p-2 tabular-nums text-slate-200">{fmtNum(i.cost, 4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-sm text-amber-300 font-bold">لا توجد وصفة سارية اليوم — مبيعات هذا المنتج لا تدخل في الاستهلاك النظري.</p>
          )}

          {/* ── النسخ ── */}
          {detail.versions.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-black text-slate-400">النسخ</p>
              <div className="flex flex-wrap gap-2">
                {detail.versions.map((v) => (
                  <span
                    key={v.id}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold ${v.is_current ? "bg-green-500/15 text-green-300" : v.editable ? "bg-sky-500/15 text-sky-300" : "bg-slate-800 text-slate-400"}`}
                  >
                    من <bdi className="tabular-nums">{v.effective_from}</bdi> · {v.lines.length} مكوّن
                    {v.is_current ? " · سارية" : v.editable ? " · مستقبلية" : ""}
                    {canManage && v.editable && (
                      <button type="button" aria-label="حذف النسخة" onClick={() => removeVersion(v.id, v.effective_from)} className="hover:text-red-400">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── المحرر ── */}
          {canManage && (
            <div className="space-y-3 pt-2 border-t border-white/5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="تسري من" hint="اليوم أو لاحقاً. التاريخ نفسه يستبدل نسخته.">
                  <input type="date" className={inputClass} value={effectiveFrom} min={detail.today} onChange={(e) => setEffectiveFrom(e.target.value)} dir="ltr" />
                </Field>
                {type === "intermediate" && (
                  <Field label={`الكمية الناتجة (${ownerUnit})`} required hint="كم تُنتج هذه المكوّنات من المنتج الوسيط.">
                    <input type="number" min={0} step="any" className={inputClass} value={yieldQty} onChange={(e) => setYieldQty(e.target.value)} dir="ltr" />
                  </Field>
                )}
                <Field label="ملاحظات">
                  <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
                </Field>
              </div>
              <p className="text-xs font-black text-slate-400">{type === "product" ? "مكوّنات الحصة الواحدة" : "المكوّنات لكامل الكمية الناتجة"}</p>
              {lines.map((l, idx) => (
                <div key={l.key} className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_auto] gap-2 items-start">
                  <StockItemPicker value={l.item} onChange={(it) => pick(l.key, it)} excludeIds={chosen} ariaLabel={`المكوّن ${idx + 1}`} />
                  <select
                    className={inputClass}
                    value={l.unitId}
                    onChange={(e) => update(l.key, { unitId: Number(e.target.value) })}
                    disabled={!l.item || l.units.length === 0}
                    aria-label="الوحدة"
                  >
                    {l.units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    className={inputClass}
                    placeholder="الكمية"
                    value={l.quantity}
                    onChange={(e) => update(l.key, { quantity: e.target.value })}
                    dir="ltr"
                    aria-label="الكمية"
                  />
                  <button
                    type="button"
                    aria-label="حذف المكوّن"
                    onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((x) => x.key !== l.key) : ls))}
                    className="w-10 h-11 flex items-center justify-center rounded-lg bg-red-600/10 text-red-400 hover:bg-red-600/20"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setLines((ls) => [...ls, emptyLine()])}
                className="flex items-center gap-1 text-xs font-bold text-red-400 hover:text-red-300"
              >
                <Plus size={14} /> إضافة مكوّن
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
