import {
  ArrowRight, BarChart3, Building2, CalendarHeart, Download, History,
  Pencil, ShoppingBag, Trash2, UserMinus, UserPlus, Users, X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../auth";
import { CRM_PERMISSIONS } from "../../auth/permissions";
import { toast } from "../../components/shared/Toast";
import { crmApi } from "./api";
import { CrmState, getCrmError } from "./components";
import { CustomerPicker } from "./CustomerPicker";
import { CrmGroupSpendChart, CrmKpiCard } from "./customers-ui";
import { date as fmtDate, money, relativeTime } from "./format";
import { GROUP_PILL, GROUP_TYPE_LABELS, GROUP_TYPE_TONE, GroupFormDrawer, groupColorHex } from "./GroupsPage";
import { LoyaltyPanel } from "./LoyaltyPanel";
import { OccasionsPanel } from "./OccasionsPanel";
import type { CrmCustomer, CrmCustomerGroup, CrmCustomerGroupInput, CrmGroupActivityEvent, CrmGroupSpendPoint, CrmOccasion } from "./types";

type Tab = "overview" | "members" | "occasions" | "loyalty";

const TABS: Array<[Tab, string]> = [
  ["overview", "نظرة عامة"],
  ["members", "الأعضاء"],
  ["occasions", "المناسبات"],
  ["loyalty", "الولاء"],
];

const cardCls = "rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)]";

/**
 * Group profile — the group's identity, its members and its own occasions.
 *
 * Laid out as Customer360Page is: a header card, a tab bar, then the tab body.
 * Nothing here is a new visual idea; a reader who knows a customer's profile
 * should recognise this one immediately.
 */
export function GroupProfilePage() {
  const { groupId = "" } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const canUpdate = hasPermission(CRM_PERMISSIONS.GROUPS_UPDATE);
  const canDelete = hasPermission(CRM_PERMISSIONS.GROUPS_DELETE);

  const [group, setGroup] = useState<CrmCustomerGroup | null>(null);
  const [members, setMembers] = useState<CrmCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status?: number; message: string } | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingId, setPendingId] = useState<string | number | null>(null);

  // Overview-only, real data — see CustomerGroupController::analytics()/
  // activity(). Loaded alongside the group/members so the tab a reader
  // lands on by default (overview) never shows a second spinner.
  const [monthlySpend, setMonthlySpend] = useState<CrmGroupSpendPoint[]>();
  const [activity, setActivity] = useState<CrmGroupActivityEvent[]>();
  const [upcomingOccasions, setUpcomingOccasions] = useState<CrmOccasion[]>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [g, m] = await Promise.all([
        crmApi.customerGroup(groupId),
        crmApi.groupMembers(groupId),
      ]);
      setGroup(g);
      setMembers(m);
    } catch (e) {
      setError(getCrmError(e));
    } finally {
      setLoading(false);
    }

    // Best-effort, non-blocking — a failure here must not hide the group
    // itself, which is why these run outside the try/catch above and each
    // fail silently into an empty state instead of a page-level error.
    void crmApi.groupAnalytics(groupId).then((a) => setMonthlySpend(a.monthly_spend)).catch(() => setMonthlySpend([]));
    void crmApi.groupActivity(groupId).then(setActivity).catch(() => setActivity([]));
    void crmApi.occasions("groups", groupId)
      .then((rows) => setUpcomingOccasions(
        [...rows].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3),
      ))
      .catch(() => setUpcomingOccasions([]));
  }, [groupId]);

  useEffect(() => { void load(); }, [load]);

  const exportMembersCsv = () => {
    const header = "الاسم,الرمز,الهاتف,الحالة\n";
    const rows = members.map((m) => [m.name, m.code ?? "", m.phone ?? "", m.status ?? ""]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const blob = new Blob(["﻿" + header + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${group?.name ?? "group"}-members.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveEdit = async (data: CrmCustomerGroupInput) => {
    setSaving(true);
    try {
      await crmApi.updateCustomerGroup(groupId, data);
      toast.success("تم تحديث المجموعة");
      setEditOpen(false);
      await load();
    } catch (e) {
      toast.error("تعذّر تحديث المجموعة", getCrmError(e).message);
    } finally {
      setSaving(false);
    }
  };

  const removeGroup = async () => {
    if (!window.confirm("سيتم حذف المجموعة وفكّ ارتباط أعضائها بها. هل أنت متأكد؟")) return;
    try {
      const result = await crmApi.deleteCustomerGroup(groupId);
      toast.success("تم حذف المجموعة", `تم فكّ ارتباط ${result.detached_customers} عميل`);
      navigate("/admin/crm/groups");
    } catch (e) {
      toast.error("تعذّر حذف المجموعة", getCrmError(e).message);
    }
  };

  const addMember = async (customer: CrmCustomer) => {
    setSaving(true);
    try {
      await crmApi.addGroupMember(groupId, customer.id);
      toast.success("تمت إضافة العضو");
      setAddOpen(false);
      await load();
    } catch (e) {
      toast.error("تعذّر إضافة العضو", getCrmError(e).message);
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async (customer: CrmCustomer) => {
    setPendingId(customer.id);
    try {
      await crmApi.removeGroupMember(groupId, customer.id);
      toast.success("تمت إزالة العضو");
      await load();
    } catch (e) {
      toast.error("تعذّر إزالة العضو", getCrmError(e).message);
    } finally {
      setPendingId(null);
    }
  };

  if (loading) return <div className="crmx-root p-4 sm:p-6"><CrmState kind="loading" title="جارٍ تحميل المجموعة" /></div>;
  if (error) {
    return (
      <div className="crmx-root p-4 sm:p-6">
        <CrmState kind={error.status === 403 ? "forbidden" : "error"} title={error.message} retry={load} />
      </div>
    );
  }
  if (!group) return null;

  return (
    <div className="crmx-root space-y-6 p-4 sm:p-6">
      <Link to="/admin/crm/groups" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--crmx-text-muted)] hover:text-[var(--crmx-text)]">
        <ArrowRight className="h-4 w-4" /> المجموعات
      </Link>

      <div className={`${cardCls} flex flex-wrap items-start justify-between gap-4 p-5`}>
        <div className="flex items-start gap-3">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white"
            style={{ background: groupColorHex(group) }}
          >
            <Building2 className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-[24px] font-extrabold text-[var(--crmx-text)]">{group.name}</h1>
            <span className={`${GROUP_PILL} mt-1.5 ${GROUP_TYPE_TONE[group.group_type]}`}>
              {GROUP_TYPE_LABELS[group.group_type] ?? group.group_type}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canUpdate && (
            <button
              onClick={() => setEditOpen(true)}
              className="flex h-11 items-center gap-2 rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] px-4 text-[14px] font-bold text-[var(--crmx-navy)] transition hover:bg-[var(--crmx-neutral-soft)]"
            >
              <Pencil className="h-4 w-4" /> تعديل
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => void removeGroup()}
              className="flex h-11 items-center gap-2 rounded-xl border border-[var(--crmx-danger-soft)] px-4 text-[14px] font-bold text-[var(--crmx-danger-text)] transition hover:bg-[var(--crmx-danger-soft)]"
            >
              <Trash2 className="h-4 w-4" /> حذف
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-[var(--crmx-border)]">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-4 py-3 text-[14px] font-bold transition ${
              tab === key
                ? "border-[var(--crmx-primary)] text-[var(--crmx-primary)]"
                : "border-transparent text-[var(--crmx-text-secondary)] hover:text-[var(--crmx-text)]"
            }`}
          >
            {label}{key === "members" ? ` (${members.length})` : ""}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <CrmKpiCard
              icon={<Users className="h-5 w-5" />}
              label="الأعضاء"
              // The list length, not group.customers_count: the backend count is
              // deliberately unscoped across branches, and showing it above a
              // branch-scoped list would read as a contradiction.
              value={String(members.length)}
              hint="ضمن نطاقك"
              tone="navy"
            />
            <CrmKpiCard
              icon={<BarChart3 className="h-5 w-5" />}
              label="إجمالي الإنفاق"
              value={group.total_spend != null ? money(group.total_spend) : "—"}
              hint="طلبات مدفوعة"
              tone="success"
              loading={group.total_spend == null}
            />
            <CrmKpiCard
              icon={<ShoppingBag className="h-5 w-5" />}
              label="عدد الطلبات"
              value={group.orders_count != null ? String(group.orders_count) : "—"}
              hint="كل الأعضاء"
              tone="accent"
              loading={group.orders_count == null}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className={`${cardCls} p-5 lg:col-span-2`}>
              <h3 className="mb-4 text-[15px] font-bold text-[var(--crmx-text)]">
                اتجاه الإنفاق <span className="font-semibold text-[var(--crmx-text-muted)]">(آخر 6 أشهر)</span>
              </h3>
              <CrmGroupSpendChart data={monthlySpend} loading={monthlySpend === undefined} />
            </div>

            <div className="space-y-4">
              <div className={`${cardCls} p-4`}>
                <h3 className="mb-3 flex items-center gap-2 text-[13px] font-bold text-[var(--crmx-text)]">
                  <CalendarHeart className="h-4 w-4 text-[var(--crmx-text-muted)]" /> المناسبات القادمة
                </h3>
                {upcomingOccasions === undefined ? (
                  <div className="space-y-2">
                    <div className="crmx-skeleton h-10 rounded-lg" />
                    <div className="crmx-skeleton h-10 rounded-lg" />
                  </div>
                ) : upcomingOccasions.length === 0 ? (
                  <p className="text-[12.5px] text-[var(--crmx-text-muted)]">لا توجد مناسبات مسجّلة لهذه المجموعة.</p>
                ) : (
                  <ul className="space-y-2.5">
                    {upcomingOccasions.map((o) => (
                      <li key={String(o.id)} className="flex items-center justify-between gap-2 text-[12.5px]">
                        <span className="min-w-0 truncate font-semibold text-[var(--crmx-text)]">{o.title}</span>
                        <span className="shrink-0 text-[var(--crmx-text-muted)]">{fmtDate(o.date)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className={`${cardCls} grid grid-cols-2 gap-2 p-4`}>
                {canUpdate && (
                  <button
                    onClick={() => { setTab("members"); setAddOpen(true); }}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--crmx-border)] px-2 py-3 text-[12px] font-bold text-[var(--crmx-text-secondary)] transition hover:bg-[var(--crmx-neutral-soft)]"
                  >
                    <UserPlus className="h-4 w-4" /> إضافة عضو
                  </button>
                )}
                <button
                  onClick={exportMembersCsv}
                  disabled={members.length === 0}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--crmx-border)] px-2 py-3 text-[12px] font-bold text-[var(--crmx-text-secondary)] transition hover:bg-[var(--crmx-neutral-soft)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Download className="h-4 w-4" /> تصدير الأعضاء
                </button>
                <button
                  onClick={() => setTab("occasions")}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--crmx-border)] px-2 py-3 text-[12px] font-bold text-[var(--crmx-text-secondary)] transition hover:bg-[var(--crmx-neutral-soft)]"
                >
                  <CalendarHeart className="h-4 w-4" /> إضافة مناسبة
                </button>
                {canDelete && (
                  <button
                    onClick={() => void removeGroup()}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--crmx-danger-soft)] px-2 py-3 text-[12px] font-bold text-[var(--crmx-danger-text)] transition hover:bg-[var(--crmx-danger-soft)]"
                  >
                    <Trash2 className="h-4 w-4" /> حذف المجموعة
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className={`${cardCls} p-5`}>
            <h3 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-[var(--crmx-text)]">
              <History className="h-4 w-4 text-[var(--crmx-text-muted)]" /> سجل النشاط
            </h3>
            {activity === undefined ? (
              <div className="space-y-2">
                <div className="crmx-skeleton h-8 rounded-lg" />
                <div className="crmx-skeleton h-8 rounded-lg" />
              </div>
            ) : activity.length === 0 ? (
              <p className="text-[12.5px] text-[var(--crmx-text-muted)]">لا يوجد نشاط مسجّل لهذه المجموعة بعد.</p>
            ) : (
              <ul className="space-y-3 border-s-2 border-[var(--crmx-border)] ps-4">
                {activity.map((ev) => (
                  <li key={ev.id} className="relative">
                    <span className="absolute -start-[21px] top-0.5 h-2.5 w-2.5 rounded-full bg-[var(--crmx-primary)]" />
                    <p className="text-[13px] font-semibold text-[var(--crmx-text)]">{ev.label}</p>
                    <p className="text-[12px] text-[var(--crmx-text-muted)]">
                      {ev.user?.name ?? "النظام"} · {ev.timestamp ? relativeTime(ev.timestamp) : "—"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === "members" && (
        <div className="space-y-3">
          {canUpdate && (
            <button
              onClick={() => setAddOpen(true)}
              className="flex h-11 items-center gap-2 rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] px-4 text-[14px] font-bold text-[var(--crmx-navy)] transition hover:bg-[var(--crmx-neutral-soft)]"
            >
              <UserPlus className="h-4 w-4" /> إضافة عضو
            </button>
          )}

          {members.length === 0 ? (
            <CrmState kind="empty" title="لا يوجد أعضاء في هذه المجموعة" />
          ) : (
            <div className={cardCls}>
              <ul>
                {members.map((m) => (
                  <li key={String(m.id)} className="flex items-center justify-between gap-3 border-b border-[var(--crmx-border)] px-4 py-3 last:border-0">
                    <Link
                      to={`/admin/crm/customers/${m.id}/overview`}
                      className="min-w-0 text-[14px] font-bold text-[var(--crmx-primary)] hover:underline"
                    >
                      {m.name}
                      <span className="block text-[12px] font-semibold text-[var(--crmx-text-muted)]">
                        {m.phone ?? "—"}{m.code ? ` · ${m.code}` : ""}
                      </span>
                    </Link>
                    {canUpdate && (
                      <button
                        onClick={() => void removeMember(m)}
                        disabled={pendingId === m.id}
                        title="إزالة من المجموعة"
                        className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[var(--crmx-border)] px-3 text-[12px] font-bold text-[var(--crmx-text-secondary)] transition hover:bg-[var(--crmx-danger-soft)] hover:text-[var(--crmx-danger-text)] disabled:opacity-50"
                      >
                        <UserMinus className="h-3.5 w-3.5" /> إزالة
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* The same panel the customer profile uses — customer_occasions is
          polymorphic, so only the owner segment differs. */}
      {tab === "occasions" && <OccasionsPanel owner="groups" ownerId={groupId} />}

      {/* Same structural mirror: one LoyaltyPanel, owner="groups" here and
          owner="customers" on the profile page — see LoyaltyPanel's docblock. */}
      {tab === "loyalty" && <LoyaltyPanel owner="groups" ownerId={groupId} />}

      {editOpen && (
        <GroupFormDrawer
          initial={{ name: group.name, group_type: group.group_type, color: group.color }}
          saving={saving}
          onClose={() => setEditOpen(false)}
          onSubmit={saveEdit}
        />
      )}

      {addOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="إضافة عضو">
          <button aria-label="إغلاق" className="absolute inset-0 bg-[#0B1220]/25 backdrop-blur-[2px]" onClick={() => setAddOpen(false)} />
          <div dir="rtl" className="crmx-drawer-panel crmx-root relative flex h-full w-full max-w-sm flex-col bg-[var(--crmx-card)] shadow-2xl">
            <header className="flex items-center justify-between border-b border-[var(--crmx-border)] px-5 py-4">
              <h2 className="text-[17px] font-bold text-[var(--crmx-text)]">إضافة عضو</h2>
              <button onClick={() => setAddOpen(false)} className="rounded-lg p-1.5 text-[var(--crmx-text-muted)] hover:bg-[var(--crmx-neutral-soft)]" aria-label="إغلاق">
                <X className="h-5 w-5" />
              </button>
            </header>
            <div className="crmx-scrollbar flex-1 overflow-y-auto px-5 py-4">
              {/* The same picker the complaint drawer uses; members already in
                  the group are filtered out so they cannot be added twice. */}
              <CustomerPicker
                excludeIds={members.map((m) => m.id)}
                onPick={(c) => void addMember(c)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
