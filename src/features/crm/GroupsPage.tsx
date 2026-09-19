import { BarChart3, Building2, Check, ChevronLeft, Layers, Loader2, Plus, RotateCcw, Sparkles, Users, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth";
import { CRM_PERMISSIONS } from "../../auth/permissions";
import { toast } from "../../components/shared/Toast";
import { crmApi } from "./api";
import { CrmState, getCrmError } from "./components";
import { CrmKpiCard, CrmPageHeader, CrmSearchBar } from "./customers-ui";
import { money } from "./format";
import { CRM_GROUP_COLORS, type CrmCustomerGroup, type CrmCustomerGroupInput, type CrmGroupColor, type CrmGroupType } from "./types";

/**
 * The fixed swatch palette customer_groups.color offers (CustomerGroup::
 * COLORS on the backend) — real hex values, not crmx design tokens: these
 * exist to tell groups apart from each other, a different job than the
 * tone system's "what kind of status is this" colours.
 */
export const GROUP_COLOR_SWATCH: Record<CrmGroupColor, string> = {
  rose: "#E0202A", orange: "#EA580C", amber: "#F59E0B", green: "#16A34A",
  teal: "#0D9488", blue: "#2563EB", indigo: "#4F46E5", purple: "#7C3AED",
};

/** A stable colour for a group that predates the color column — hashed from its id, not random per render. */
export function groupColorHex(group: Pick<CrmCustomerGroup, "id" | "color">): string {
  if (group.color) return GROUP_COLOR_SWATCH[group.color];
  const n = Number(String(group.id).replace(/\D/g, "")) || 0;
  return Object.values(GROUP_COLOR_SWATCH)[n % CRM_GROUP_COLORS.length];
}

/** customer_groups.group_type — a DB enum since the table was created. */
export const GROUP_TYPE_LABELS: Record<CrmGroupType, string> = {
  retail: "تجزئة",
  wholesale: "جملة",
  corporate: "شركات",
  government: "جهات حكومية",
  service: "خدمات",
};

export const GROUP_TYPE_TONE: Record<CrmGroupType, string> = {
  retail: "bg-[var(--crmx-neutral-soft)] text-[var(--crmx-text-secondary)]",
  wholesale: "bg-[var(--crmx-info-soft)] text-[var(--crmx-info-text)]",
  corporate: "bg-[var(--crmx-navy-soft)] text-[var(--crmx-navy)]",
  government: "bg-[var(--crmx-accent-soft)] text-[var(--crmx-accent-text)]",
  service: "bg-[var(--crmx-success-soft)] text-[var(--crmx-success-text)]",
};

export const GROUP_PILL =
  "inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-bold whitespace-nowrap";

const cardCls = "rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)]";
const inputCls =
  "h-11 w-full rounded-xl border border-[var(--crmx-border)] bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none focus:border-[var(--crmx-primary)] focus:ring-2 focus:ring-[var(--crmx-primary)]/10";
const labelCls = "mb-1 block text-[13px] font-semibold text-[var(--crmx-text-secondary)]";

const EMPTY: CrmCustomerGroupInput = { name: "", group_type: "corporate" };

/** Shared by the create button here and the edit action on the group profile. */
/**
 * Shared by the create button here and the edit action on the group profile.
 *
 * A centered popup, not a side drawer — matching the occasions forms'
 * redesign: a real visual review rejected the drawer here for the same
 * reason, it reads as "hiding at the edge of the screen" for what is a
 * short, focused, deliberate action.
 */
export function GroupFormDrawer({
  initial, saving, onClose, onSubmit,
}: {
  initial?: CrmCustomerGroupInput;
  saving: boolean;
  onClose: () => void;
  onSubmit: (data: CrmCustomerGroupInput) => void;
}) {
  const [form, setForm] = useState(initial ?? EMPTY);
  const editing = Boolean(initial);

  return (
    <div className="crmx-root fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="مجموعة عملاء">
      <button aria-label="إغلاق" className="absolute inset-0 bg-[#0B1220]/40" onClick={onClose} />
      <div dir="rtl" className="relative flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] shadow-[var(--crmx-shadow-md)]">
        <header className="flex items-center justify-between border-b border-[var(--crmx-border)] px-5 py-4">
          <span className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--crmx-primary-soft)] text-[var(--crmx-primary-text)]">
              <Building2 className="h-4.5 w-4.5" />
            </span>
            <h2 className="text-[16px] font-bold text-[var(--crmx-text)]">
              {editing ? "تعديل المجموعة" : "إنشاء مجموعة"}
            </h2>
          </span>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--crmx-text-muted)] hover:bg-[var(--crmx-neutral-soft)]" aria-label="إغلاق">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="crmx-scrollbar flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div>
            <label className={labelCls}>اسم المجموعة</label>
            <input
              className={inputCls}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="مثال: شركة الأفق للتجارة"
              maxLength={255}
              autoFocus
            />
          </div>

          <div>
            <label className={labelCls}>النوع</label>
            <select
              className={inputCls}
              value={form.group_type}
              onChange={(e) => setForm((f) => ({ ...f, group_type: e.target.value as CrmGroupType }))}
            >
              {(Object.keys(GROUP_TYPE_LABELS) as CrmGroupType[]).map((v) => (
                <option key={v} value={v}>{GROUP_TYPE_LABELS[v]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>لون المجموعة</label>
            <div className="flex flex-wrap gap-2.5">
              {CRM_GROUP_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  aria-label={c}
                  aria-pressed={form.color === c}
                  className="flex h-9 w-9 items-center justify-center rounded-full transition"
                  style={{ background: GROUP_COLOR_SWATCH[c], outline: form.color === c ? "2px solid var(--crmx-text)" : undefined, outlineOffset: 2 }}
                >
                  {form.color === c && <Check className="h-4 w-4 text-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        <footer className="flex items-center gap-2.5 border-t border-[var(--crmx-border)] px-5 py-4">
          <button
            disabled={saving || !form.name.trim()}
            onClick={() => onSubmit(form)}
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

/**
 * Customer groups directory.
 *
 * Search is client-side here, unlike the complaints screen: the backend list
 * endpoint takes no filters and groups are few by nature, so a request per
 * keystroke would buy nothing. If the list ever outgrows one page this should
 * move server-side rather than paginating a filtered array.
 */
export function GroupsPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission(CRM_PERMISSIONS.GROUPS_CREATE);
  const navigate = useNavigate();

  const [groups, setGroups] = useState<CrmCustomerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status?: number; message: string } | null>(null);
  const [term, setTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<CrmGroupType | "">("");
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setGroups(await crmApi.customerGroups());
    } catch (e) {
      setError(getCrmError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const create = async (data: CrmCustomerGroupInput) => {
    setSaving(true);
    try {
      await crmApi.createCustomerGroup(data);
      toast.success("تم إنشاء المجموعة");
      setCreateOpen(false);
      await load();
    } catch (e) {
      toast.error("تعذّر إنشاء المجموعة", getCrmError(e).message);
    } finally {
      setSaving(false);
    }
  };

  // Derived from the list already loaded — no extra request, and the figures
  // therefore always describe exactly the rows rendered below them.
  const totalMembers = groups.reduce((sum, g) => sum + (g.customers_count ?? 0), 0);
  // Real sum of every group's own total_spend (CustomerGroupController's
  // paid-order aggregate) — never an estimate.
  const totalSpend = groups.reduce((sum, g) => sum + (g.total_spend ?? 0), 0);
  const busiestType = (() => {
    const counts = new Map<CrmGroupType, number>();
    for (const g of groups) counts.set(g.group_type, (counts.get(g.group_type) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    return top ? GROUP_TYPE_LABELS[top[0]] : "—";
  })();

  const needle = term.trim().toLowerCase();
  const visible = groups
    .filter((g) => (needle === "" ? true : g.name.toLowerCase().includes(needle)))
    .filter((g) => (typeFilter === "" ? true : g.group_type === typeFilter));

  return (
    <div className="crmx-root space-y-6 p-4 sm:p-6">
      <CrmPageHeader
        title="المجموعات"
        description="الشركات والعائلات والجهات التي ينتمي إليها عملاؤك — أعضاؤها ومناسباتها في مكان واحد."
        actions={
          <>
            <Link
              to="/admin/crm/groups/segments"
              className="flex h-11 items-center gap-2 rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] px-4 text-[14px] font-bold text-[var(--crmx-navy)] transition hover:bg-[var(--crmx-neutral-soft)]"
            >
              <Sparkles className="h-4 w-4" /> التصنيف الذكي
            </Link>
            <Link
              to="/admin/crm/groups/analytics"
              className="flex h-11 items-center gap-2 rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] px-4 text-[14px] font-bold text-[var(--crmx-navy)] transition hover:bg-[var(--crmx-neutral-soft)]"
            >
              <BarChart3 className="h-4 w-4" /> التحليلات
            </Link>
            {canCreate && (
              <button
                onClick={() => setCreateOpen(true)}
                className="flex h-11 items-center gap-2 rounded-xl bg-[var(--crmx-primary)] px-4 text-[14px] font-bold text-white transition hover:bg-[var(--crmx-primary-hover)]"
              >
                <Plus className="h-4 w-4" /> إنشاء مجموعة
              </button>
            )}
            <button
              onClick={() => void load()}
              className="flex h-11 items-center gap-2 rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] px-4 text-[14px] font-bold text-[var(--crmx-navy)] transition hover:bg-[var(--crmx-neutral-soft)]"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} تحديث
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <CrmKpiCard icon={<Layers className="h-5 w-5" />} label="عدد المجموعات" value={String(groups.length)} tone="navy" loading={loading} />
        <CrmKpiCard icon={<Users className="h-5 w-5" />} label="إجمالي الأعضاء" value={String(totalMembers)} hint="عبر كل المجموعات" tone="success" loading={loading} />
        <CrmKpiCard icon={<Building2 className="h-5 w-5" />} label="أكثر نوع" value={busiestType} tone="accent" loading={loading} />
        <CrmKpiCard icon={<BarChart3 className="h-5 w-5" />} label="إجمالي الإنفاق" value={money(totalSpend)} hint="طلبات مدفوعة لكل الأعضاء" tone="warning" loading={loading} />
      </div>

      <div className={`${cardCls} flex flex-wrap items-center gap-3 p-4`}>
        <CrmSearchBar value={term} onChange={setTerm} placeholder="ابحث باسم المجموعة…" />
        <div className="flex flex-wrap items-center gap-1.5">
          {([["", "الكل"], ...Object.entries(GROUP_TYPE_LABELS)] as Array<[CrmGroupType | "", string]>).map(([value, label]) => (
            <button
              key={value || "all"}
              onClick={() => setTypeFilter(value)}
              className={`h-9 rounded-full px-3.5 text-[13px] font-bold transition ${
                typeFilter === value
                  ? "bg-[var(--crmx-primary)] text-white"
                  : "bg-[var(--crmx-neutral-soft)] text-[var(--crmx-text-secondary)] hover:bg-[var(--crmx-border)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <CrmState kind="loading" title="جارٍ تحميل المجموعات" />
      ) : error ? (
        <CrmState kind={error.status === 403 ? "forbidden" : "error"} title={error.message} retry={load} />
      ) : visible.length === 0 ? (
        <div className={`${cardCls} flex flex-col items-center justify-center gap-3 py-16 text-center`}>
          <span className="flex h-12 w-12 items-center justify-center rounded-[var(--crmx-radius-control)] bg-[var(--crmx-navy-soft)] text-[var(--crmx-navy)]">
            <Building2 className="h-6 w-6" />
          </span>
          <div>
            <p className="text-[15px] font-bold text-[var(--crmx-text)]">
              {needle ? "لا توجد مجموعة مطابقة" : "لا توجد مجموعات بعد"}
            </p>
            <p className="mt-1 text-[13px] text-[var(--crmx-text-secondary)]">
              {needle
                ? "جرّب اسماً آخر أو امسح البحث."
                : "أنشئ أول مجموعة لتجميع عملاء شركة أو عائلة تحت ملف واحد."}
            </p>
          </div>
          {/* The header action is not enough here: on an empty screen the
              primary next step belongs where the reader is looking. */}
          {!needle && canCreate && (
            <button
              onClick={() => setCreateOpen(true)}
              className="mt-1 flex h-11 items-center gap-2 rounded-xl bg-[var(--crmx-primary)] px-4 text-[14px] font-bold text-white transition hover:bg-[var(--crmx-primary-hover)]"
            >
              <Plus className="h-4 w-4" /> إنشاء مجموعة
            </button>
          )}
        </div>
      ) : (
        <div className={cardCls}>
          <div className="crmx-scrollbar overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-right">
              <thead>
                <tr className="border-b border-[var(--crmx-border)] bg-[#FAFBFC]">
                  {["المجموعة", "النوع", "عدد الأعضاء", "الإنفاق", ""].map((h, i) => (
                    <th key={h || `sp-${i}`} className="whitespace-nowrap px-4 py-3.5 text-[12.5px] font-bold text-[var(--crmx-text-secondary)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((g) => (
                  <tr
                    key={String(g.id)}
                    onClick={() => navigate(`/admin/crm/groups/${g.id}`)}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(`/admin/crm/groups/${g.id}`); } }}
                    className="crmx-table-row group cursor-pointer border-b border-[var(--crmx-border)] transition-colors last:border-0 hover:bg-[var(--crmx-neutral-soft)]/70 focus:bg-[var(--crmx-neutral-soft)]/70 focus:outline-none"
                  >
                    <td className="px-4 py-3 text-[13px] font-bold text-[var(--crmx-text)]">
                      <span className="flex items-center gap-2.5">
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
                          style={{ background: groupColorHex(g) }}
                        >
                          <Building2 className="h-4 w-4" />
                        </span>
                        {g.name}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`${GROUP_PILL} ${GROUP_TYPE_TONE[g.group_type]}`}>
                        {GROUP_TYPE_LABELS[g.group_type] ?? g.group_type}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[13px] text-[var(--crmx-text-secondary)]">
                      {g.customers_count ?? 0}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[13px] font-bold text-[var(--crmx-text)]">
                      {g.total_spend != null ? money(g.total_spend) : "—"}
                    </td>
                    <td className="w-8 px-3 py-3 text-[var(--crmx-text-muted)]">
                      <ChevronLeft className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {createOpen && (
        <GroupFormDrawer saving={saving} onClose={() => setCreateOpen(false)} onSubmit={create} />
      )}
    </div>
  );
}
