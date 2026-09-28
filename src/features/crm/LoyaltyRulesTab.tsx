import { CalendarOff, Pencil, Plus, ShieldOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../auth";
import { CRM_PERMISSIONS } from "../../auth/permissions";
import { toast } from "../../components/shared/Toast";
import { departmentService } from "../../services/departmentService";
import { fetchItems } from "../../services/itemService";
import { crmApi } from "./api";
import { CrmState, getCrmError } from "./components";
import { CrmDataView, CrmViewToggle, useCrmViewMode } from "./customers-ui";
import { LoyaltyBaseRuleCard } from "./LoyaltyBaseRuleCard";
import { LoyaltyRuleFormDrawer } from "./LoyaltyRuleFormDrawer";
import { SCOPE_TYPE_LABELS } from "./loyaltyLabels";
import { date as fmtDate } from "./format";
import type { CrmLoyaltyRule } from "./types";

const selectCls =
  "h-11 rounded-xl border border-[var(--crmx-border)] bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none focus:border-[var(--crmx-primary)] focus:ring-2 focus:ring-[var(--crmx-primary)]/10";
const fieldLabelCls = "flex flex-col gap-1 text-[13px] font-semibold text-[var(--crmx-text-secondary)]";
const pill = "inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-bold whitespace-nowrap";

export function LoyaltyRulesTab({ onChanged }: { onChanged?: () => void }) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(CRM_PERMISSIONS.LOYALTY_MANAGE);
  const [viewMode, setViewMode] = useCrmViewMode("loyalty-rules");

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

  // The scope column used to say "قسم" and stop there — correct but useless
  // for telling two category rules apart without opening each one. Resolved
  // once per rule set, keyed by "scope_type:scope_id" so a customer-scoped
  // and a group-scoped rule can never collide on a numeric id.
  const [targetNames, setTargetNames] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;

    void (async () => {
      const names: Record<string, string> = {};

      const productIds = new Set(rules.filter((r) => r.scope_type === "product" && r.scope_id != null).map((r) => r.scope_id as number));
      const categoryIds = new Set(rules.filter((r) => r.scope_type === "category" && r.scope_id != null).map((r) => r.scope_id as number));
      const groupIds = new Set(rules.filter((r) => r.scope_type === "group" && r.scope_id != null).map((r) => r.scope_id as number));
      const customerIds = new Set(rules.filter((r) => r.scope_type === "customer" && r.scope_id != null).map((r) => r.scope_id as number));

      if (productIds.size > 0) {
        const items = await fetchItems().catch(() => []);
        items.forEach((i) => { if (productIds.has(i.id)) names[`product:${i.id}`] = i.name_ar || i.name; });
      }
      if (categoryIds.size > 0) {
        const departments = await departmentService.getAll().catch(() => []);
        departments.forEach((d) => { if (categoryIds.has(d.id)) names[`category:${d.id}`] = d.nameAr || d.name; });
      }
      if (groupIds.size > 0) {
        const groups = await crmApi.customerGroups().catch(() => []);
        groups.forEach((g) => { if (groupIds.has(Number(g.id))) names[`group:${g.id}`] = g.name; });
      }
      if (customerIds.size > 0) {
        // No bulk "customers by ids" endpoint exists — a rule scoped to one
        // specific customer is expected to be rare, so N small requests here
        // is the honest cost rather than a reason to leave the name blank.
        await Promise.all([...customerIds].map(async (id) => {
          try {
            const c = await crmApi.customer(id);
            names[`customer:${id}`] = c.name;
          } catch { /* leave unresolved — falls back to the id below */ }
        }));
      }

      if (alive) setTargetNames(names);
    })();

    return () => { alive = false; };
  }, [rules]);

  const scopeTarget = (r: CrmLoyaltyRule): string | null => {
    if (r.scope_type === "global" || r.scope_id == null) return null;
    return targetNames[`${r.scope_type}:${r.scope_id}`] ?? `#${r.scope_id}`;
  };

  // is_base_rule is computed server-side (LoyaltyRule::isBaseRule()) and
  // appended to every rule the API returns — the frontend must never
  // re-derive this shape locally, or the two definitions can drift apart
  // exactly as they already had before this field existed.
  const baseRule = rules.find((r) => r.is_base_rule) ?? null;
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
        <div className="space-y-2">
          <div className="flex justify-end">
            <CrmViewToggle mode={viewMode} onChange={setViewMode} />
          </div>
          <CrmDataView
            rows={otherRules}
            rowKey={(r) => String(r.id)}
            mode={viewMode}
            minTableWidth={820}
            columns={[
              { key: "name", label: "الاسم", card: "title", wrap: true, cellClassName: "min-w-[160px] text-[13px] font-bold", render: (r) => r.name },
              {
                key: "scope",
                label: "النطاق",
                card: "wide",
                // "قسم: الكيك" not just "قسم" — a row should answer "what does
                // this rule do?" without opening it.
                render: (r) => (
                  <span className={`${pill} bg-[var(--crmx-info-soft)] text-[var(--crmx-info-text)]`}>
                    {scopeTarget(r) ? `${SCOPE_TYPE_LABELS[r.scope_type]}: ${scopeTarget(r)}` : SCOPE_TYPE_LABELS[r.scope_type]}
                  </span>
                ),
              },
              {
                key: "level",
                label: "المستوى",
                cellClassName: "text-[13px] text-[var(--crmx-text-secondary)]",
                render: (r) => (r.min_order_value != null ? `فاتورة ≥ ${num(r.min_order_value)} ₪` : "بند"),
              },
              { key: "multiplier", label: "المضاعِف", cellClassName: "text-[13px] font-bold", render: (r) => <span dir="ltr">×{num(r.multiplier)}</span> },
              {
                key: "period",
                label: "الفترة",
                card: "wide",
                cellClassName: "text-[12.5px] text-[var(--crmx-text-muted)]",
                // "من X إلى Y", not "X → Y": an arrow between two Latin-digit
                // dates inside RTL text is exactly what the bidi algorithm
                // reorders. Each date is isolated in its own dir="ltr" span.
                render: (r) =>
                  r.starts_at || r.ends_at ? (
                    <span className="inline-flex flex-wrap items-center gap-1">
                      <CalendarOff className="h-3 w-3 shrink-0" />
                      <span>من</span>
                      <span dir="ltr">{r.starts_at ? fmtDate(r.starts_at) : "—"}</span>
                      <span>إلى</span>
                      <span dir="ltr">{r.ends_at ? fmtDate(r.ends_at) : "بلا نهاية"}</span>
                    </span>
                  ) : "دائمة",
              },
              {
                key: "active",
                label: "الحالة",
                card: "badge",
                render: (r) => (
                  <span className={`${pill} ${r.is_active ? "bg-[var(--crmx-success-soft)] text-[var(--crmx-success-text)]" : "bg-[var(--crmx-neutral-soft)] text-[var(--crmx-text-muted)]"}`}>
                    {r.is_active ? "فعّالة" : "معطَّلة"}
                  </span>
                ),
              },
              ...(canManage
                ? [{
                    key: "actions",
                    label: "",
                    card: "actions" as const,
                    render: (r: CrmLoyaltyRule) => (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setDrawer({ mode: "edit", rule: r })}
                          title="تعديل"
                          aria-label={`تعديل ${r.name}`}
                          className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--crmx-text-muted)] hover:bg-[var(--crmx-neutral-soft)] hover:text-[var(--crmx-navy)] lg:h-8 lg:w-8"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {r.is_active && (
                          <button
                            onClick={() => void deactivate(r)}
                            disabled={pendingId === r.id}
                            title="تعطيل"
                            aria-label={`تعطيل ${r.name}`}
                            className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--crmx-text-muted)] hover:bg-[var(--crmx-danger-soft)] hover:text-[var(--crmx-danger-text)] disabled:opacity-50 lg:h-8 lg:w-8"
                          >
                            <ShieldOff className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ),
                  }]
                : []),
            ]}
          />
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
