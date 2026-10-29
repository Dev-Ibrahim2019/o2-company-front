/**
 * UnitsPage.tsx — وحدات القياس (كغ، غرام، لتر، كرتونة...).
 * معاملات التحويل لا تُعرّف هنا بل لكل صنف على حدة في نموذج الصنف.
 */

import React, { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Ruler } from "lucide-react";
import { useCan } from "../../../auth";
import { INVENTORY_PERMISSIONS } from "../../../auth/permissions";
import { toast } from "../../shared/Toast";
import { inventoryService, inventoryErrorMessage, type StockUnit } from "../../../services/inventoryService";
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

type Draft = { id?: number; name: string; symbol: string; is_active: boolean };

const EMPTY: Draft = { name: "", symbol: "", is_active: true };

export const UnitsPage: React.FC = () => {
  const canManage = useCan(INVENTORY_PERMISSIONS.CATALOG_MANAGE);
  const [units, setUnits] = useState<StockUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setUnits(await inventoryService.units());
    } catch (e) {
      toast.error("تعذّر تحميل الوحدات", inventoryErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    setSaving(true);
    const payload = { name: draft.name.trim(), symbol: draft.symbol.trim() || null, is_active: draft.is_active };
    try {
      if (draft.id) await inventoryService.updateUnit(draft.id, payload);
      else await inventoryService.createUnit(payload);
      toast.success(draft.id ? "تم تحديث الوحدة" : "تمت إضافة الوحدة");
      setDraft(null);
      load();
    } catch (err) {
      toast.error("تعذّر الحفظ", inventoryErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (unit: StockUnit) => {
    if (!confirm(`حذف الوحدة "${unit.name}"؟`)) return;
    try {
      await inventoryService.deleteUnit(unit.id);
      toast.success("تم حذف الوحدة");
      load();
    } catch (err) {
      toast.error("تعذّر الحذف", inventoryErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="وحدات القياس"
        subtitle="الوحدات المستخدمة للأصناف المخزنية. معامل التحويل يُحدَّد لكل صنف."
        action={
          canManage && (
            <PrimaryButton onClick={() => setDraft({ ...EMPTY })}>
              <Plus size={18} /> وحدة جديدة
            </PrimaryButton>
          )
        }
      />

      {loading ? (
        <LoadingBlock />
      ) : units.length === 0 ? (
        <EmptyBlock icon={Ruler} text="لا توجد وحدات بعد" />
      ) : (
        <div className="bg-slate-900 rounded-2xl border border-white/5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500 text-xs font-black border-b border-white/5">
                <th className="text-right p-4">الوحدة</th>
                <th className="text-right p-4">الرمز</th>
                <th className="text-right p-4">الحالة</th>
                {canManage && <th className="p-4 w-24"><span className="sr-only">إجراءات</span></th>}
              </tr>
            </thead>
            <tbody>
              {units.map((u) => (
                <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="p-4 font-bold text-white">{u.name}</td>
                  <td className="p-4 text-slate-400">
                    <bdi>{u.symbol || "—"}</bdi>
                  </td>
                  <td className="p-4">
                    <StatusBadge active={u.is_active} />
                  </td>
                  {canManage && (
                    <td className="p-4">
                      <div className="flex gap-1.5 justify-end">
                        <IconButton
                          label="تعديل"
                          onClick={() => setDraft({ id: u.id, name: u.name, symbol: u.symbol ?? "", is_active: u.is_active })}
                        >
                          <Pencil size={15} />
                        </IconButton>
                        <IconButton label="حذف" tone="danger" onClick={() => remove(u)}>
                          <Trash2 size={15} />
                        </IconButton>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {draft && (
        <Modal
          title={draft.id ? "تعديل وحدة" : "وحدة جديدة"}
          onClose={() => setDraft(null)}
          footer={
            <>
              <SecondaryButton onClick={() => setDraft(null)}>إلغاء</SecondaryButton>
              <PrimaryButton type="submit" form="unit-form" loading={saving}>
                حفظ
              </PrimaryButton>
            </>
          }
        >
          <form id="unit-form" onSubmit={save} className="space-y-4">
            <Field label="اسم الوحدة" required>
              <input
                className={inputClass}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="مثال: كيلوغرام"
                required
                autoFocus
              />
            </Field>
            <Field label="الرمز">
              <input
                className={inputClass}
                value={draft.symbol}
                onChange={(e) => setDraft({ ...draft, symbol: e.target.value })}
                placeholder="مثال: كغ"
              />
            </Field>
            <Toggle checked={draft.is_active} onChange={(v) => setDraft({ ...draft, is_active: v })} label="نشطة" />
          </form>
        </Modal>
      )}
    </div>
  );
};
