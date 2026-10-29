/**
 * CategoriesPage.tsx — شجرة تصنيفات المواد الخام، مستقلة عن أقسام البيع.
 * الخادم يرجع قائمة مسطّحة (parent_id)؛ الشجرة تُبنى هنا. الحلقات الدورية مرفوضة في
 * الخادم، والواجهة تستبعد التصنيف وأحفاده من قائمة "التصنيف الأب" مسبقاً.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, FolderTree, CornerDownLeft } from "lucide-react";
import { useCan } from "../../../auth";
import { INVENTORY_PERMISSIONS } from "../../../auth/permissions";
import { toast } from "../../shared/Toast";
import { inventoryService, inventoryErrorMessage, type StockCategory } from "../../../services/inventoryService";
import {
  EmptyBlock,
  Field,
  IconButton,
  LoadingBlock,
  Modal,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
  Toggle,
  inputClass,
} from "./ui";

type Draft = { id?: number; name: string; code: string; parent_id: number | null; is_active: boolean };

/** يرتّب التصنيفات بترتيب الشجرة (عمق أولاً) مع عمق كل عنصر. */
export function flattenTree(categories: StockCategory[]): { category: StockCategory; depth: number }[] {
  const children = new Map<number | null, StockCategory[]>();
  const ids = new Set(categories.map((c) => c.id));
  for (const c of categories) {
    // أب غير موجود في القائمة → يُعامل كجذر حتى لا يختفي التصنيف.
    const key = c.parent_id !== null && ids.has(c.parent_id) ? c.parent_id : null;
    children.set(key, [...(children.get(key) ?? []), c]);
  }
  const out: { category: StockCategory; depth: number }[] = [];
  const walk = (parent: number | null, depth: number) => {
    for (const c of children.get(parent) ?? []) {
      out.push({ category: c, depth });
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

function descendantsOf(categories: StockCategory[], id: number): Set<number> {
  const result = new Set<number>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of categories) {
      if (c.parent_id !== null && result.has(c.parent_id) && !result.has(c.id)) {
        result.add(c.id);
        grew = true;
      }
    }
  }
  return result;
}

export const CategoriesPage: React.FC = () => {
  const canManage = useCan(INVENTORY_PERMISSIONS.CATALOG_MANAGE);
  const [categories, setCategories] = useState<StockCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setCategories(await inventoryService.categories());
    } catch (e) {
      toast.error("تعذّر تحميل التصنيفات", inventoryErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const tree = useMemo(() => flattenTree(categories), [categories]);

  const parentOptions = useMemo(() => {
    if (!draft) return [];
    const excluded = draft.id ? descendantsOf(categories, draft.id) : new Set<number>();
    return tree.filter(({ category }) => !excluded.has(category.id));
  }, [draft, categories, tree]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    setSaving(true);
    const payload = {
      name: draft.name.trim(),
      code: draft.code.trim() || null,
      parent_id: draft.parent_id,
      is_active: draft.is_active,
    };
    try {
      if (draft.id) await inventoryService.updateCategory(draft.id, payload);
      else await inventoryService.createCategory(payload);
      toast.success(draft.id ? "تم تحديث التصنيف" : "تمت إضافة التصنيف");
      setDraft(null);
      load();
    } catch (err) {
      toast.error("تعذّر الحفظ", inventoryErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: StockCategory) => {
    if (!confirm(`حذف التصنيف "${c.name}"؟`)) return;
    try {
      await inventoryService.deleteCategory(c.id);
      toast.success("تم حذف التصنيف");
      load();
    } catch (err) {
      toast.error("تعذّر الحذف", inventoryErrorMessage(err));
    }
  };

  const newDraft = (parent_id: number | null = null): Draft => ({ name: "", code: "", parent_id, is_active: true });

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="تصنيفات المخزون"
        subtitle="شجرة مستقلة عن أقسام البيع. الصنف الواحد يمكن أن يتبع أكثر من تصنيف."
        action={
          canManage && (
            <PrimaryButton onClick={() => setDraft(newDraft())}>
              <Plus size={18} /> تصنيف رئيسي
            </PrimaryButton>
          )
        }
      />

      {loading ? (
        <LoadingBlock />
      ) : tree.length === 0 ? (
        <EmptyBlock icon={FolderTree} text="لا توجد تصنيفات بعد" />
      ) : (
        <div className="bg-slate-900 rounded-2xl border border-white/5 divide-y divide-white/5">
          {tree.map(({ category: c, depth }) => (
            <div key={c.id} className="flex flex-wrap items-center gap-3 p-3 hover:bg-white/[0.02]">
              <div className="flex items-center gap-2 flex-1 min-w-[160px]" style={{ paddingInlineStart: depth * 24 }}>
                {depth > 0 && <CornerDownLeft size={14} className="text-slate-600 shrink-0" />}
                <span className={`font-bold truncate ${depth === 0 ? "text-white" : "text-slate-300"}`}>{c.name}</span>
                {c.code && (
                  <bdi className="text-[11px] text-slate-500 font-mono bg-slate-800 px-1.5 py-0.5 rounded">{c.code}</bdi>
                )}
              </div>
              <span className="text-xs text-slate-500 font-bold whitespace-nowrap">{c.items_count ?? 0} صنف</span>
              <StatusBadge active={c.is_active} />
              {canManage && (
                <div className="flex gap-1.5">
                  <IconButton label="إضافة تصنيف فرعي" onClick={() => setDraft(newDraft(c.id))}>
                    <Plus size={15} />
                  </IconButton>
                  <IconButton
                    label="تعديل"
                    onClick={() =>
                      setDraft({ id: c.id, name: c.name, code: c.code ?? "", parent_id: c.parent_id, is_active: c.is_active })
                    }
                  >
                    <Pencil size={15} />
                  </IconButton>
                  <IconButton label="حذف" tone="danger" onClick={() => remove(c)}>
                    <Trash2 size={15} />
                  </IconButton>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {draft && (
        <Modal
          title={draft.id ? "تعديل تصنيف" : "تصنيف جديد"}
          onClose={() => setDraft(null)}
          footer={
            <>
              <SecondaryButton onClick={() => setDraft(null)}>إلغاء</SecondaryButton>
              <PrimaryButton type="submit" form="category-form" loading={saving}>
                حفظ
              </PrimaryButton>
            </>
          }
        >
          <form id="category-form" onSubmit={save} className="space-y-4">
            <Field label="اسم التصنيف" required>
              <input
                className={inputClass}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="مثال: لحوم"
                required
                autoFocus
              />
            </Field>
            <Field label="الكود">
              <input
                className={inputClass}
                value={draft.code}
                onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                dir="ltr"
              />
            </Field>
            <Field label="التصنيف الأب">
              <select
                className={inputClass}
                value={draft.parent_id ?? ""}
                onChange={(e) => setDraft({ ...draft, parent_id: e.target.value ? Number(e.target.value) : null })}
              >
                <option value="">— بدون (تصنيف رئيسي) —</option>
                {parentOptions.map(({ category, depth }) => (
                  <option key={category.id} value={category.id}>
                    {"  ".repeat(depth * 2)}
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>
            <Toggle checked={draft.is_active} onChange={(v) => setDraft({ ...draft, is_active: v })} label="نشط" />
          </form>
        </Modal>
      )}
    </div>
  );
};
