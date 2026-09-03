import { AlertTriangle, Coins, Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "../../components/shared/Toast";
import { getCrmError } from "./components";
import type { CrmLoyaltyRule } from "./types";

const inputCls =
  "h-11 w-24 rounded-xl border border-[var(--crmx-border)] bg-white px-3 text-center text-[14px] text-[var(--crmx-text)] outline-none transition focus:border-[var(--crmx-primary)] focus:ring-2 focus:ring-[var(--crmx-primary)]/10";

/**
 * The permanent global base rate, shown as a singleton settings card rather
 * than a row in the rules table below.
 *
 * Deliberately narrow: only points_per_amount and per_amount can be edited
 * here, and there is no delete affordance at all — not disabled, simply
 * absent. The backend already refuses to deactivate the sole active base
 * rule (422, "سيتوقف حساب النقاط على كل طلب بلا بديل"), but a screen that
 * shows a delete button only to fail on click is worse than one that never
 * offers it: this card exists so that failure is never reachable, not just
 * caught.
 */
export function LoyaltyBaseRuleCard({
  rule,
  canManage,
  onSave,
}: {
  rule: CrmLoyaltyRule | null;
  canManage: boolean;
  onSave: (pointsPerAmount: number, perAmount: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [pointsPerAmount, setPointsPerAmount] = useState("");
  const [perAmount, setPerAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setPointsPerAmount(String(rule?.points_per_amount ?? "1"));
    setPerAmount(String(rule?.per_amount ?? "10"));
    setEditing(true);
  };

  const save = async () => {
    const p = Number(pointsPerAmount);
    const a = Number(perAmount);
    if (!Number.isFinite(p) || p <= 0 || !Number.isFinite(a) || a <= 0) {
      toast.error("قيم غير صالحة", "المعدّل والمبلغ يجب أن يكونا رقمين أكبر من صفر.");
      return;
    }
    setSaving(true);
    try {
      await onSave(p, a);
      toast.success("تم تحديث السعر الأساسي");
      setEditing(false);
    } catch (e) {
      toast.error("تعذّر الحفظ", getCrmError(e).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border-2 border-[var(--crmx-primary)]/25 bg-[var(--crmx-primary-soft)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--crmx-primary)] text-white">
            <Coins className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[15px] font-bold text-[var(--crmx-text)]">القاعدة الأساسية العامة</p>
            <p className="text-[12.5px] text-[var(--crmx-text-secondary)]">
              السعر الذي يُبنى عليه حساب كل نقطة — دائمة ولا يمكن حذفها.
            </p>
          </div>
        </div>
        {canManage && !editing && rule && (
          <button
            onClick={startEdit}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-[var(--crmx-primary)]/40 bg-white px-3 text-[12.5px] font-bold text-[var(--crmx-primary-text)] hover:bg-[var(--crmx-primary-soft)]"
          >
            <Pencil className="h-3.5 w-3.5" /> تعديل المعدّل
          </button>
        )}
        {/* No rule yet: the same form doubles as a first-time setup — there
            is nothing to "edit" until one exists, so the label reflects that. */}
        {canManage && !editing && !rule && (
          <button
            onClick={startEdit}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-[var(--crmx-primary)] px-3 text-[12.5px] font-bold text-white hover:bg-[var(--crmx-primary-hover)]"
          >
            <Pencil className="h-3.5 w-3.5" /> إنشاء القاعدة الأساسية
          </button>
        )}
      </div>

      {editing ? null : !rule ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-[var(--crmx-danger)]/40 bg-white p-3 text-[13px] font-semibold text-[var(--crmx-danger-text)]">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          لا توجد قاعدة أساسية نشطة — لن يُكتسب أي رصيد ولاء حتى تُنشأ واحدة.
        </div>
      ) : null}
      {editing ? (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-[13px] font-semibold text-[var(--crmx-text-secondary)]">
            نقطة واحدة
          </label>
          <input type="number" min={0} step="0.01" className={inputCls} value={pointsPerAmount} onChange={(e) => setPointsPerAmount(e.target.value)} />
          <label className="text-[13px] font-semibold text-[var(--crmx-text-secondary)]">لكل</label>
          <input type="number" min={0.01} step="0.01" className={inputCls} value={perAmount} onChange={(e) => setPerAmount(e.target.value)} />
          <label className="text-[13px] font-semibold text-[var(--crmx-text-secondary)]">₪</label>
          <div className="flex gap-2">
            <button
              onClick={() => void save()}
              disabled={saving}
              className="h-10 rounded-xl bg-[var(--crmx-primary)] px-4 text-[13px] font-bold text-white hover:bg-[var(--crmx-primary-hover)] disabled:opacity-50"
            >
              {saving ? "جارٍ الحفظ..." : "حفظ"}
            </button>
            <button
              onClick={() => setEditing(false)}
              disabled={saving}
              className="h-10 rounded-xl border border-[var(--crmx-border)] bg-white px-4 text-[13px] font-semibold text-[var(--crmx-text-secondary)]"
            >
              إلغاء
            </button>
          </div>
        </div>
      ) : rule ? (
        <p className="mt-4 text-[24px] font-extrabold text-[var(--crmx-text)]">
          {num(rule.points_per_amount)} نقطة
          <span className="mx-1.5 text-[15px] font-semibold text-[var(--crmx-text-muted)]">لكل</span>
          {num(rule.per_amount)} ₪
        </p>
      ) : null}
    </div>
  );
}

function num(v: number | string | null | undefined): string {
  return v == null ? "—" : String(Number(v));
}
