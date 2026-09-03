import { CalendarOff, Pencil, Plus, ShieldOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../auth";
import { CRM_PERMISSIONS } from "../../auth/permissions";
import { toast } from "../../components/shared/Toast";
import { crmApi } from "./api";
import { CrmState, getCrmError } from "./components";
import { LoyaltyBaseRuleCard } from "./LoyaltyBaseRuleCard";
import { LoyaltyRuleFormDrawer } from "./LoyaltyRuleFormDrawer";
import { SCOPE_TYPE_LABELS } from "./loyaltyLabels";
import { date as fmtDate } from "./format";
import type { CrmLoyaltyRule } from "./types";

const cardCls = "rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)]";
const selectCls =
  "h-11 rounded-xl border border-[var(--crmx-border)] bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none focus:border-[var(--crmx-primary)] focus:ring-2 focus:ring-[var(--crmx-primary)]/10";
const fieldLabelCls = "flex flex-col gap-1 text-[13px] font-semibold text-[var(--crmx-text-secondary)]";
const pill = "inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-bold whitespace-nowrap";

/** Exactly the shape LoyaltyEngine::baseRule() and the backend's own invariant guard look for. */
function isActiveBaseRule(rule: CrmLoyaltyRule): boolean {
  return rule.scope_type === "global"
    && rule.min_order_value == null
    && rule.ends_at == null
    && rule.points_per_amount != null
    && rule.is_active;
}

export function LoyaltyRulesTab({ onChanged }: { onChanged?: () => void }) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(CRM_PERMISSIONS.LOYALTY_MANAGE);

  const [rules, setRules] = useState<CrmLoyaltyRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status?: number; message: string } | null>(null);
  const [scopeFilter, setScopeFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");

  const [drawer, setDrawer] = useState<{ mode: "add" } | { mode: "edit"; rule: CrmLoyaltyRule } | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingId, setPendingId] = useState<string | number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { per_page: "100" };
      if (scopeFilter) params.scope_type = scopeFilter;
      if (activeFilter) params.is_active = activeFilter;
      const page = await crmApi.loyaltyRules(params);
      setRules(page.items);
    } catch (e) {
      setError(getCrmError(e));
    } finally {
      setLoading(false);
    }
  }, [scopeFilter, activeFilter]);

  const reload = async () => { await load(); onChanged?.(); };

  useEffect(() => { void load(); }, [load]);

  const baseRule = rules.find(isActiveBaseRule) ?? null;
  const otherRules = rules.filter((r) => r.id !== baseRule?.id);

  const saveBaseRate = async (pointsPerAmount: number, perAmount: number) => {
    if (baseRule) {
      await crmApi.updateLoyaltyRule(baseRule.id, { points_per_amount: pointsPerAmount, per_amount: perAmount });
    } else {
      await crmApi.createLoyaltyRule({
        name: "القاعدة الأساسية", scope_type: "global",
        points_per_amount: pointsPerAmount, per_amount: perAmount,
      });
    }
    await reload();
  };

  const submit = async (data: Parameters<typeof crmApi.createLoyaltyRule>[0]) => {
    setSaving(true);
    try {
      if (drawer?.mode === "edit") {
        await crmApi.updateLoyaltyRule(drawer.rule.id, data);
        toast.success("تم تحديث القاعدة");
      } else {
        await crmApi.createLoyaltyRule(data);
        toast.success("تم إنشاء القاعدة");
      }
      setDrawer(null);
      await reload();
    } catch (e) {
      toast.error("تعذّر حفظ القاعدة", getCrmError(e).message);
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (rule: CrmLoyaltyRule) => {
    if (!window.confirm(`هل أنت متأكد من تعطيل "${rule.name}"؟ الأثر يتوقف على الطلبات القادمة فقط.`)) return;
    setPendingId(rule.id);
    try {
      await crmApi.deactivateLoyaltyRule(rule.id);
      toast.success("تم تعطيل القاعدة");
      await reload();
    } catch (e) {
      // Surfaces the backend's own reason verbatim — e.g. the sole-active-
      // base-rule guard — rather than a generic failure message.
      toast.error("تعذّر تعطيل القاعدة", getCrmError(e).message);
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <LoyaltyBaseRuleCard rule={baseRule} canManage={canManage} onSave={saveBaseRate} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className={fieldLabelCls}>
            النطاق
            <select className={selectCls} value={scopeFilter} onChange={(e) => setScopeFilter(e.target.value)}>
              <option value="">كل الأنطقة</option>
              {(Object.keys(SCOPE_TYPE_LABELS) as Array<keyof typeof SCOPE_TYPE_LABELS>).map((s) => (
                <option key={s} value={s}>{SCOPE_TYPE_LABELS[s]}</option>
              ))}
            </select>
          </label>
          <label className={fieldLabelCls}>
            الحالة
            <select className={selectCls} value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}>
              <option value="">الكل</option>
              <option value="1">فعّالة</option>
              <option value="0">معطَّلة</option>
            </select>
          </label>
        </div>
        {canManage && (
          <button
            onClick={() => setDrawer({ mode: "add" })}
            className="flex h-11 items-center gap-2 rounded-xl bg-[var(--crmx-primary)] px-4 text-[14px] font-bold text-white transition hover:bg-[var(--crmx-primary-hover)]"
          >
            <Plus className="h-4 w-4" /> إنشاء قاعدة
          </button>
        )}
      </div>

      {loading ? (
        <CrmState kind="loading" title="جارٍ تحميل القواعد" />
      ) : error ? (
        <CrmState kind={error.status === 403 ? "forbidden" : "error"} title={error.message} retry={load} />
      ) : otherRules.length === 0 ? (
        <CrmState kind="empty" title="لا توجد قواعد إضافية بعد" />
      ) : (
        <div className={cardCls}>
          <div className="crmx-scrollbar overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-right">
              <thead>
                <tr className="border-b border-[var(--crmx-border)] bg-[#FAFBFC]">
                  {["الاسم", "النطاق", "المستوى", "المضاعِف", "الفترة", "الحالة", ""].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3.5 text-[12.5px] font-bold text-[var(--crmx-text-secondary)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {otherRules.map((r) => (
                  <tr key={String(r.id)} className="crmx-table-row border-b border-[var(--crmx-border)] transition-colors last:border-0 hover:bg-[var(--crmx-neutral-soft)]/70">
                    <td className="px-4 py-3 text-[13px] font-bold text-[var(--crmx-text)]">{r.name}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`${pill} bg-[var(--crmx-info-soft)] text-[var(--crmx-info-text)]`}>
                        {SCOPE_TYPE_LABELS[r.scope_type]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[13px] text-[var(--crmx-text-secondary)]">
                      {r.min_order_value != null ? `فاتورة ≥ ${num(r.min_order_value)} ₪` : "بند"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[13px] font-bold text-[var(--crmx-text)]">×{num(r.multiplier)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-[12.5px] text-[var(--crmx-text-muted)]">
                      {r.starts_at || r.ends_at ? (
                        <span className="inline-flex items-center gap-1">
                          <CalendarOff className="h-3 w-3" />
                          {r.starts_at ? fmtDate(r.starts_at) : "—"} → {r.ends_at ? fmtDate(r.ends_at) : "بلا نهاية"}
                        </span>
                      ) : "دائمة"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`${pill} ${r.is_active ? "bg-[var(--crmx-success-soft)] text-[var(--crmx-success-text)]" : "bg-[var(--crmx-neutral-soft)] text-[var(--crmx-text-muted)]"}`}>
                        {r.is_active ? "فعّالة" : "معطَّلة"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {canManage && (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setDrawer({ mode: "edit", rule: r })}
                            title="تعديل"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--crmx-text-muted)] hover:bg-[var(--crmx-neutral-soft)] hover:text-[var(--crmx-navy)]"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {r.is_active && (
                            <button
                              onClick={() => void deactivate(r)}
                              disabled={pendingId === r.id}
                              title="تعطيل"
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--crmx-text-muted)] hover:bg-[var(--crmx-danger-soft)] hover:text-[var(--crmx-danger-text)] disabled:opacity-50"
                            >
                              <ShieldOff className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {drawer && (
        <LoyaltyRuleFormDrawer
          initial={drawer.mode === "edit" ? drawer.rule : undefined}
          saving={saving}
          onClose={() => setDrawer(null)}
          onSubmit={submit}
        />
      )}
    </div>
  );
}

function num(v: number | string | null | undefined): string {
  return v == null ? "—" : String(Number(v));
}
