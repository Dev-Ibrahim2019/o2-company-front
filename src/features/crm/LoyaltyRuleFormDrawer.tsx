import { Info, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "../../components/shared/Toast";
import { crmApi } from "./api";
import { CustomerPicker } from "./CustomerPicker";
import { DepartmentPicker } from "./DepartmentPicker";
import { getCrmError } from "./components";
import { GroupPicker } from "./GroupPicker";
import { SCOPE_TYPE_HINTS, SCOPE_TYPE_LABELS } from "./loyaltyLabels";
import { ProductPicker } from "./ProductPicker";
import type {
  CrmLoyaltyRule, CrmLoyaltyRuleExclusion, CrmLoyaltyRuleInput, CrmLoyaltyScopeType, CrmId,
} from "./types";

const inputCls =
  "h-11 w-full rounded-xl border border-[var(--crmx-border)] bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none transition focus:border-[var(--crmx-primary)] focus:ring-2 focus:ring-[var(--crmx-primary)]/10";
const labelCls = "mb-1 block text-[13px] font-semibold text-[var(--crmx-text-secondary)]";
const sectionTitle = "text-[15px] font-bold text-[var(--crmx-text)]";

type Level = "item" | "invoice";
// The base rule's own scope owns "global + no min_order_value" — offering it
// here would either collide with that singleton (rejected 422 by the
// backend) or, if it carried an end date, read as a temporary campaign,
// which this prompt explicitly keeps out of scope. So the generic form
// offers only the four scopes a non-base rule can safely target.
const SELECTABLE_SCOPES: CrmLoyaltyScopeType[] = ["customer", "group", "category", "product"];

interface FormState {
  name: string;
  scope_type: CrmLoyaltyScopeType;
  scope_id: number | null;
  scope_label: string;
  level: Level;
  multiplier: string;
  min_order_value: string;
  starts_at: string;
  ends_at: string;
  priority: string;
  group_cascade_percent: string;
  is_active: boolean;
}

function emptyForm(): FormState {
  return {
    name: "", scope_type: "category", scope_id: null, scope_label: "",
    level: "item", multiplier: "1", min_order_value: "", starts_at: "", ends_at: "",
    priority: "0", group_cascade_percent: "", is_active: true,
  };
}

function fromRule(rule: CrmLoyaltyRule): FormState {
  return {
    name: rule.name,
    scope_type: rule.scope_type,
    scope_id: rule.scope_id ?? null,
    scope_label: "",
    level: rule.min_order_value != null ? "invoice" : "item",
    multiplier: String(rule.multiplier ?? "1"),
    min_order_value: rule.min_order_value != null ? String(rule.min_order_value) : "",
    starts_at: (rule.starts_at ?? "").slice(0, 10),
    ends_at: (rule.ends_at ?? "").slice(0, 10),
    priority: String(rule.priority ?? 0),
    group_cascade_percent: rule.group_cascade_percent != null ? String(rule.group_cascade_percent) : "",
    is_active: rule.is_active,
  };
}

/**
 * Create/edit drawer for every loyalty rule EXCEPT the permanent base rate,
 * which LoyaltyBaseRuleCard owns as a singleton — this form never touches
 * points_per_amount/per_amount, because only the base rule carries them.
 *
 * Live preview: LoyaltyEngine::priceItem() is the real formula
 * (item value / base.per_amount) × base.points_per_amount × winner.multiplier,
 * run per order line against whichever rule wins competition among every
 * matching rule. There is no backend endpoint to ask for a preview — adding
 * one is out of this prompt's scope — so this reproduces that single-rule
 * arithmetic client-side against a hypothetical ₪100 charge, using the real
 * base rate fetched once on mount. It is clearly labelled approximate: it
 * assumes the whole ₪100 falls under this one rule alone, with no competing
 * or excluded rule in play, which is the one thing a live preview here
 * cannot know without asking the engine itself.
 */
export function LoyaltyRuleFormDrawer({
  initial,
  saving,
  onClose,
  onSubmit,
}: {
  initial?: CrmLoyaltyRule;
  saving: boolean;
  onClose: () => void;
  onSubmit: (data: CrmLoyaltyRuleInput) => void;
}) {
  const [form, setForm] = useState<FormState>(initial ? fromRule(initial) : emptyForm());
  const [baseRate, setBaseRate] = useState<{ points_per_amount: number; per_amount: number } | null>(null);

  const [exclusions, setExclusions] = useState<CrmLoyaltyRuleExclusion[]>([]);
  const [exclusionsLoading, setExclusionsLoading] = useState(false);
  const [addingExclusion, setAddingExclusion] = useState(false);
  const [pendingExclusionId, setPendingExclusionId] = useState<CrmId | null>(null);

  useEffect(() => {
    let alive = true;
    void crmApi.loyaltyRules({ scope_type: "global", is_active: "1" }).then((page) => {
      if (!alive) return;
      const base = page.items.find((r) => r.min_order_value == null && r.ends_at == null && r.points_per_amount != null);
      if (base) {
        setBaseRate({
          points_per_amount: Number(base.points_per_amount),
          per_amount: Number(base.per_amount),
        });
      }
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const loadExclusions = () => {
    if (!initial) return;
    setExclusionsLoading(true);
    crmApi.loyaltyRuleExclusions(initial.id)
      .then(setExclusions)
      .catch(() => setExclusions([]))
      .finally(() => setExclusionsLoading(false));
  };
  useEffect(loadExclusions, [initial?.id]);

  const addExclusion = async (customer: { id: CrmId }) => {
    if (!initial) return;
    try {
      await crmApi.addLoyaltyRuleExclusion(initial.id, customer.id);
      toast.success("تم استثناء العميل من هذه القاعدة");
      setAddingExclusion(false);
      loadExclusions();
    } catch (e) {
      toast.error("تعذّر إضافة الاستثناء", getCrmError(e).message);
    }
  };

  const removeExclusion = async (customerId: CrmId) => {
    if (!initial) return;
    setPendingExclusionId(customerId);
    try {
      await crmApi.removeLoyaltyRuleExclusion(initial.id, customerId);
      toast.success("تم إلغاء الاستثناء");
      loadExclusions();
    } catch (e) {
      toast.error("تعذّر إلغاء الاستثناء", getCrmError(e).message);
    } finally {
      setPendingExclusionId(null);
    }
  };

  const preview = useMemo(() => {
    const multiplier = Number(form.multiplier || "1");
    const sampleTotal = 100;

    if (!baseRate || !Number.isFinite(multiplier) || multiplier <= 0) return null;

    if (form.level === "invoice") {
      const min = Number(form.min_order_value || "0");
      if (!form.min_order_value) return { text: "أدخل الحد الأدنى للفاتورة لعرض المعاينة." };
      if (sampleTotal < min) {
        return { text: `على فاتورة ${sampleTotal} ₪ — لن تُطبَّق هذه القاعدة (الحد الأدنى ${min} ₪).` };
      }
      const basePoints = (sampleTotal / baseRate.per_amount) * baseRate.points_per_amount;
      const finalPoints = basePoints * multiplier;
      return { text: `على فاتورة ${sampleTotal} ₪ تستوفي الحد الأدنى، سيكسب العميل ${round(finalPoints)} نقطة.` };
    }

    const points = (sampleTotal / baseRate.per_amount) * baseRate.points_per_amount * multiplier;
    return { text: `على بند بقيمة ${sampleTotal} ₪ من هذا النطاق، سيكسب العميل ${round(points)} نقطة.` };
  }, [form.level, form.multiplier, form.min_order_value, baseRate]);

  const canSubmit = form.name.trim() !== ""
    && (form.scope_type === "global" || form.scope_id != null)
    && (form.level === "item" || form.min_order_value.trim() !== "");

  const submit = () => {
    const data: CrmLoyaltyRuleInput = {
      name: form.name.trim(),
      scope_type: form.scope_type,
      scope_id: form.scope_type === "global" ? null : form.scope_id,
      multiplier: form.multiplier ? Number(form.multiplier) : 1,
      min_order_value: form.level === "invoice" && form.min_order_value ? Number(form.min_order_value) : null,
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
      priority: form.priority ? Number(form.priority) : 0,
      group_cascade_percent: form.group_cascade_percent ? Number(form.group_cascade_percent) : null,
      is_active: form.is_active,
    };
    onSubmit(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="قاعدة ولاء">
      <button aria-label="إغلاق" className="absolute inset-0 bg-[#0B1220]/25 backdrop-blur-[2px]" onClick={onClose} />
      <div dir="rtl" className="crmx-drawer-panel relative flex h-full w-full max-w-md flex-col bg-[var(--crmx-card)] shadow-2xl">
        <header className="flex items-center justify-between border-b border-[var(--crmx-border)] px-5 py-4">
          <h2 className="text-[17px] font-bold text-[var(--crmx-text)]">
            {initial ? "تعديل قاعدة" : "إنشاء قاعدة"}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--crmx-text-muted)] hover:bg-[var(--crmx-neutral-soft)]" aria-label="إغلاق">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="crmx-scrollbar flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div>
            <label className={labelCls}>اسم القاعدة</label>
            <input
              className={inputCls}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="مثال: مضاعف الكيك"
              maxLength={255}
              autoFocus
            />
          </div>

          <div>
            <label className={labelCls}>مستوى القاعدة</label>
            <div className="flex gap-2">
              {([["item", "مستوى بند"], ["invoice", "مستوى فاتورة"]] as const).map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, level: v }))}
                  className={`h-11 flex-1 rounded-xl border text-[14px] font-bold transition ${
                    form.level === v
                      ? "border-[var(--crmx-primary)] bg-[var(--crmx-primary-soft)] text-[var(--crmx-primary-text)]"
                      : "border-[var(--crmx-border)] bg-white text-[var(--crmx-text-secondary)] hover:bg-[var(--crmx-neutral-soft)]"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {form.level === "invoice" && (
            <div>
              <label className={labelCls}>الحد الأدنى لقيمة الفاتورة (₪)</label>
              <input
                type="number" min={0} step="0.01"
                className={inputCls}
                value={form.min_order_value}
                onChange={(e) => setForm((f) => ({ ...f, min_order_value: e.target.value }))}
                placeholder="مثال: 250"
              />
            </div>
          )}

          <div>
            <label className={labelCls}>نطاق التطبيق</label>
            <select
              className={inputCls}
              value={form.scope_type}
              onChange={(e) => setForm((f) => ({ ...f, scope_type: e.target.value as CrmLoyaltyScopeType, scope_id: null }))}
            >
              {SELECTABLE_SCOPES.map((s) => (
                <option key={s} value={s}>{SCOPE_TYPE_LABELS[s]}</option>
              ))}
              {/* Offered for a bounded-window invoice-level rule only — a
                  permanent global item-level rule is the base rule's own
                  shape and the backend rejects a second one. */}
              {form.level === "invoice" && <option value="global">{SCOPE_TYPE_LABELS.global}</option>}
            </select>
            <p className="mt-1.5 flex items-start gap-1.5 text-[12px] text-[var(--crmx-text-muted)]">
              <Info className="h-3.5 w-3.5 shrink-0 translate-y-0.5" />
              {SCOPE_TYPE_HINTS[form.scope_type]}
            </p>
          </div>

          {form.scope_type === "product" && (
            <div>
              <label className={labelCls}>المنتج</label>
              <ProductPicker value={form.scope_id} onChange={(id) => setForm((f) => ({ ...f, scope_id: id }))} />
            </div>
          )}
          {form.scope_type === "category" && (
            <div>
              <label className={labelCls}>القسم</label>
              <DepartmentPicker value={form.scope_id} onChange={(id) => setForm((f) => ({ ...f, scope_id: id }))} />
            </div>
          )}
          {form.scope_type === "group" && (
            <div>
              <label className={labelCls}>المجموعة</label>
              <GroupPicker value={form.scope_id} onChange={(id) => setForm((f) => ({ ...f, scope_id: id }))} />
            </div>
          )}
          {form.scope_type === "customer" && (
            <div>
              <label className={labelCls}>العميل</label>
              {form.scope_id != null && form.scope_label ? (
                <div className="flex h-11 items-center justify-between rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-neutral-soft)] px-3 text-[14px] font-semibold text-[var(--crmx-text)]">
                  {form.scope_label}
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, scope_id: null, scope_label: "" }))}
                    className="text-[12px] font-bold text-[var(--crmx-danger-text)] hover:underline"
                  >
                    تغيير
                  </button>
                </div>
              ) : (
                <CustomerPicker
                  label=""
                  autoFocus={false}
                  onPick={(c) => setForm((f) => ({ ...f, scope_id: Number(c.id), scope_label: c.name }))}
                />
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>المضاعِف</label>
              <input
                type="number" min={0} step="0.1"
                className={inputCls}
                value={form.multiplier}
                onChange={(e) => setForm((f) => ({ ...f, multiplier: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelCls}>الأولوية</label>
              <input
                type="number"
                className={inputCls}
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              />
            </div>
          </div>

          {/* Preview — see the docblock above for exactly what this does and
              does not simulate. */}
          {preview && (
            <div className="rounded-xl border border-dashed border-[var(--crmx-primary)]/40 bg-[var(--crmx-primary-soft)] p-3">
              <p className="text-[13px] font-semibold text-[var(--crmx-primary-text)]">{preview.text}</p>
              <p className="mt-1 text-[11px] text-[var(--crmx-text-muted)]">
                معاينة تقريبية: تفترض أن كامل المبلغ يقع ضمن هذه القاعدة وحدها، ولا تحسب تنافسها مع قواعد أخرى أو استثناءات حقيقية.
              </p>
            </div>
          )}
          {!baseRate && (
            <p className="text-[12px] text-[var(--crmx-text-muted)]">
              تعذّر تحميل السعر الأساسي — المعاينة الحيّة غير متاحة حالياً.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>يبدأ التطبيق من</label>
              <input type="date" className={inputCls} value={form.starts_at} onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>ينتهي في</label>
              <input type="date" className={inputCls} value={form.ends_at} onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className={labelCls}>تعميم على المجموعة (%)</label>
            <input
              type="number" min={0} max={100} step="1"
              className={inputCls}
              value={form.group_cascade_percent}
              onChange={(e) => setForm((f) => ({ ...f, group_cascade_percent: e.target.value }))}
              placeholder="اختياري — مثال: 50"
            />
            <p className="mt-1 text-[12px] text-[var(--crmx-text-muted)]">
              إن كان العميل عضو مجموعة، تُضاف هذه النسبة من نقاطه كسطر منفصل لرصيد مجموعته.
            </p>
          </div>

          <label className="flex items-center gap-2.5 text-[14px] font-semibold text-[var(--crmx-text)]">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-[var(--crmx-border)]"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            />
            فعّالة
          </label>

          {/* Exclusions — editing an existing rule only; a rule that does not
              exist yet has no id to attach an exclusion to. */}
          {initial && (
            <div className="border-t border-[var(--crmx-border)] pt-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className={sectionTitle}>العملاء المستثنَون</h3>
                <button
                  type="button"
                  onClick={() => setAddingExclusion((v) => !v)}
                  className="text-[13px] font-bold text-[var(--crmx-primary-text)] hover:underline"
                >
                  {addingExclusion ? "إلغاء" : "+ إضافة استثناء"}
                </button>
              </div>

              {addingExclusion && (
                <div className="mb-3">
                  <CustomerPicker label="" autoFocus onPick={(c) => void addExclusion(c)} />
                </div>
              )}

              {exclusionsLoading ? (
                <div className="crmx-skeleton h-16 w-full rounded-xl" />
              ) : exclusions.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--crmx-border)] p-3 text-center text-[12.5px] text-[var(--crmx-text-muted)]">
                  لا يوجد عملاء مستثنَون من هذه القاعدة
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {exclusions.map((ex) => (
                    <li key={String(ex.id)} className="flex items-center justify-between rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] px-3 py-2">
                      <span className="text-[13px] font-semibold text-[var(--crmx-text)]">
                        {ex.customer?.name ?? `عميل #${ex.customer_id}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => void removeExclusion(ex.customer_id)}
                        disabled={pendingExclusionId === ex.customer_id}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--crmx-text-muted)] hover:bg-[var(--crmx-danger-soft)] hover:text-[var(--crmx-danger-text)] disabled:opacity-50"
                        title="إلغاء الاستثناء"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <footer className="flex items-center gap-2.5 border-t border-[var(--crmx-border)] px-5 py-4">
          <button
            disabled={saving || !canSubmit}
            onClick={submit}
            className="h-11 flex-1 rounded-xl bg-[var(--crmx-primary)] text-[14px] font-bold text-white transition hover:bg-[var(--crmx-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "جارٍ الحفظ..." : "حفظ"}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="h-11 rounded-xl border border-[var(--crmx-border)] px-4 text-[14px] font-semibold text-[var(--crmx-text-secondary)] transition hover:bg-[var(--crmx-neutral-soft)]"
          >
            إلغاء
          </button>
        </footer>
      </div>
    </div>
  );
}

function round(n: number): string {
  return (Math.round(n * 100) / 100).toString();
}
