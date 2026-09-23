import {
  AlertTriangle, Ban, CalendarHeart, Check, ChevronDown, Gift, KeyRound, ListOrdered, Loader2,
  MessagesSquare, RotateCcw, Search, Settings2, ShieldAlert, ShieldCheck, StickyNote, Users, UsersRound, Wallet,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "../../auth";
import { toast } from "../../components/shared/Toast";
import { crmApi } from "./api";
import { CrmState, getCrmError } from "./components";
import { CrmConfirmDialog, CrmKpiCard, CrmPageHeader } from "./customers-ui";
import "./customers-ui/crmx.css";
import type {
  CrmStaffMember, CrmStaffPermissionActivityEvent, CrmStaffPermissionCatalogItem, CrmStaffPermissionDetail,
} from "./types";

const ROLE_LABELS: Record<string, string> = {
  "crm-manager": "مدير CRM", "super-admin": "مدير النظام", accountant: "محاسب",
  "branch-manager": "مدير فرع", "call-center": "كول سنتر", "crm-staff": "موظف CRM",
  cashier: "كاشير", hospitality: "ضيافة",
};

/** Purely decorative — matches each catalog group name to an icon + a distinct tone so groups read as separate sections, not one long uniform list. */
const GROUP_ICON: Record<string, LucideIcon> = {
  "عام": Settings2, "العملاء": UsersRound, "طلبات العملاء": ListOrdered, "المجموعات": UsersRound,
  "الشكاوى": MessagesSquare, "الملاحظات": StickyNote, "المناسبات": CalendarHeart, "الولاء": Gift,
  "تعارضات الهوية": ShieldAlert, "البيانات المالية": Wallet,
};
const GROUP_TONES = [
  { bg: "bg-[var(--crmx-navy-soft)]", text: "text-[var(--crmx-navy)]" },
  { bg: "bg-[var(--crmx-info-soft)]", text: "text-[var(--crmx-info)]" },
  { bg: "bg-[var(--crmx-success-soft)]", text: "text-[var(--crmx-success-text)]" },
  { bg: "bg-[var(--crmx-accent-soft)]", text: "text-[var(--crmx-accent-text)]" },
  { bg: "bg-[var(--crmx-orange-soft)]", text: "text-[var(--crmx-orange-text)]" },
  { bg: "bg-[var(--crmx-warning-soft)]", text: "text-[var(--crmx-warning-text)]" },
  { bg: "bg-[var(--crmx-danger-soft)]", text: "text-[var(--crmx-danger-text)]" },
  { bg: "bg-[var(--crmx-primary-soft)]", text: "text-[var(--crmx-primary-text)]" },
];
/** Stable per-employee avatar tone, hashed from id — not random per render, and distinct from the reddish "selected" look the audit flagged as reading like an error state. */
function toneFor(seed: number) {
  return GROUP_TONES[Math.abs(seed) % GROUP_TONES.length];
}

type PermState = "deny" | "default" | "grant";

const symDiffCount = (a: Set<string>, b: Set<string>) => {
  let count = 0;
  a.forEach((x) => { if (!b.has(x)) count++; });
  b.forEach((x) => { if (!a.has(x)) count++; });
  return count;
};

// Prefer the backend's own reason when it has one — a 403/422 here almost
// always carries a specific, already-Arabic explanation (self-edit blocked,
// permission not held, the delegation permission itself) — before falling
// back to getCrmError()'s generic per-status text. Laravel's validation
// shape nests the message under errors.<field>[0], not the top-level message.
function apiErrorMessage(e: unknown): string {
  const data = (e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
  const fieldError = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined;
  return fieldError || data?.message || getCrmError(e).message;
}

/**
 * Three explicit states per permission — منع (deny) / افتراضي (default) / منح
 * (grant) — replacing the old pair of independent switches, which let both
 * read "off" at once (the role-default state) with nothing on screen saying
 * so. A role-granted permission collapses to two states only: منع, or a
 * locked "من الدور" pill — there is no separate "منح" to offer since the
 * role already grants it and toggling a redundant control would be a dead end.
 */
function PermissionStateControl({
  state, roleGranted, canGrant, onSelect,
}: { state: PermState; roleGranted: boolean; canGrant: boolean; onSelect: (s: PermState) => void }) {
  const seg = (active: boolean, tone: "danger" | "neutral" | "success") => {
    const toneClass = active
      ? tone === "danger" ? "bg-[var(--crmx-danger)] text-white"
        : tone === "success" ? "bg-[var(--crmx-success)] text-white"
          : "bg-[var(--crmx-navy)] text-white"
      : "bg-[var(--crmx-neutral-soft)] text-[var(--crmx-text-muted)] hover:text-[var(--crmx-text)]";
    return `px-2.5 py-1.5 text-[11.5px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${toneClass}`;
  };

  if (roleGranted) {
    return (
      <div className="inline-flex overflow-hidden rounded-lg border border-[var(--crmx-border)]">
        <button onClick={() => onSelect("deny")} className={seg(state === "deny", "danger")}>منع</button>
        <button disabled className={`${seg(true, "success")} opacity-70`} title="من صلاحيات الدور">من الدور</button>
      </div>
    );
  }

  return (
    <div className="inline-flex text-white overflow-hidden rounded-lg border border-[var(--crmx-border)]">
      <button onClick={() => onSelect("deny")} className={seg(state === "deny", "danger")}>منع</button>
      <button onClick={() => onSelect("default")} className='{seg(state === "default", "neutral")} text-white '>افتراضي</button>
      <button
        onClick={() => onSelect("grant")}
        disabled={!canGrant}
        title={!canGrant ? "لا تملك هذه الصلاحية بنفسك، لا يمكنك منحها" : undefined}
        className={seg(state === "grant", "success")}
      >
        منح
      </button>
    </div>
  );
}

export function CrmStaffPermissionsPage() {
  const { hasPermission } = useAuth();
  const [staff, setStaff] = useState<CrmStaffMember[]>([]);
  const [catalog, setCatalog] = useState<CrmStaffPermissionCatalogItem[]>([]);
  const [listState, setListState] = useState<"loading" | "ready" | "error">("loading");
  const [listError, setListError] = useState("");
  const [staffSearch, setStaffSearch] = useState("");
  const [permSearch, setPermSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const [selectedId, setSelectedId] = useState<number | string | null>(null);
  const [detail, setDetail] = useState<CrmStaffPermissionDetail | null>(null);
  const [activity, setActivity] = useState<CrmStaffPermissionActivityEvent[]>([]);
  const [detailState, setDetailState] = useState<"idle" | "loading" | "ready" | "error">("idle");

  const [directDraft, setDirectDraft] = useState<Set<string>>(new Set());
  const [denyDraft, setDenyDraft] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [pendingGrant, setPendingGrant] = useState<CrmStaffPermissionCatalogItem | null>(null);

  const loadList = useCallback(async () => {
    setListState("loading");
    try {
      const [staffRes, catalogRes] = await Promise.all([crmApi.staffMembers(), crmApi.staffPermissionsCatalog()]);
      setStaff(staffRes);
      setCatalog(catalogRes);
      setListState("ready");
    } catch (e) {
      setListError(getCrmError(e).message);
      setListState("error");
    }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  const loadDetail = useCallback(async (userId: number | string) => {
    setDetailState("loading");
    try {
      const [detailRes, activityRes] = await Promise.all([
        crmApi.staffPermissions(userId),
        crmApi.staffPermissionActivity(userId),
      ]);
      setDetail(detailRes);
      setActivity(activityRes);
      setDirectDraft(new Set(detailRes.direct_permissions));
      setDenyDraft(new Set(detailRes.denied_permissions));
      setDetailState("ready");
    } catch {
      setDetailState("error");
    }
  }, []);

  const selectStaff = (member: CrmStaffMember) => {
    setSelectedId(member.id);
    loadDetail(member.id);
  };

  const groups = useMemo(() => {
    const byGroup = new Map<string, CrmStaffPermissionCatalogItem[]>();
    catalog.forEach((item) => {
      if (!byGroup.has(item.group)) byGroup.set(item.group, []);
      byGroup.get(item.group)!.push(item);
    });
    return Array.from(byGroup.entries());
  }, [catalog]);

  const filteredStaff = useMemo(() => {
    const q = staffSearch.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter((m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
  }, [staff, staffSearch]);

  const filteredGroups = useMemo(() => {
    const q = permSearch.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map(([name, items]) => [name, items.filter((i) => i.label.toLowerCase().includes(q) || i.name.toLowerCase().includes(q))] as const)
      .filter(([, items]) => items.length > 0);
  }, [groups, permSearch]);

  const permState = useCallback((item: CrmStaffPermissionCatalogItem, roleGranted: boolean): PermState => {
    if (denyDraft.has(item.name)) return "deny";
    if (roleGranted || directDraft.has(item.name)) return "grant";
    return "default";
  }, [denyDraft, directDraft]);

  const directDirty = detail ? symDiffCount(directDraft, new Set(detail.direct_permissions)) > 0 : false;
  const denyDirty = detail ? symDiffCount(denyDraft, new Set(detail.denied_permissions)) > 0 : false;
  const pendingChanges = detail
    ? symDiffCount(directDraft, new Set(detail.direct_permissions)) + symDiffCount(denyDraft, new Set(detail.denied_permissions))
    : 0;

  const applyState = (item: CrmStaffPermissionCatalogItem, roleGranted: boolean, next: PermState) => {
    if (next === "deny") {
      setDenyDraft((prev) => new Set(prev).add(item.name));
      setDirectDraft((prev) => { if (!prev.has(item.name)) return prev; const n = new Set(prev); n.delete(item.name); return n; });
      return;
    }
    if (next === "default") {
      setDenyDraft((prev) => { if (!prev.has(item.name)) return prev; const n = new Set(prev); n.delete(item.name); return n; });
      setDirectDraft((prev) => { if (!prev.has(item.name)) return prev; const n = new Set(prev); n.delete(item.name); return n; });
      return;
    }
    // next === "grant" — unreachable when roleGranted (control hides the option).
    if (roleGranted || !hasPermission(item.name)) return;
    setDenyDraft((prev) => { if (!prev.has(item.name)) return prev; const n = new Set(prev); n.delete(item.name); return n; });
    if (item.sensitive) { setPendingGrant(item); return; }
    setDirectDraft((prev) => new Set(prev).add(item.name));
  };

  const confirmPendingGrant = () => {
    if (!pendingGrant) return;
    setDirectDraft((prev) => new Set(prev).add(pendingGrant.name));
    setPendingGrant(null);
  };

  const bulkGrantAll = (items: CrmStaffPermissionCatalogItem[]) => {
    const grantable = items.filter((i) => !detail?.role_permissions.includes(i.name) && hasPermission(i.name) && !i.sensitive);
    const skippedSensitive = items.filter((i) => !detail?.role_permissions.includes(i.name) && hasPermission(i.name) && i.sensitive).length;
    setDirectDraft((prev) => { const n = new Set(prev); grantable.forEach((i) => n.add(i.name)); return n; });
    setDenyDraft((prev) => { const n = new Set(prev); grantable.forEach((i) => n.delete(i.name)); return n; });
    if (skippedSensitive > 0) toast.success(`تم تخطي ${skippedSensitive} صلاحية حساسة — امنحها يدويًا للتأكيد.`);
  };

  const bulkDenyAll = (items: CrmStaffPermissionCatalogItem[]) => {
    setDenyDraft((prev) => { const n = new Set(prev); items.forEach((i) => n.add(i.name)); return n; });
    setDirectDraft((prev) => { const n = new Set(prev); items.forEach((i) => n.delete(i.name)); return n; });
  };

  const bulkResetAll = (items: CrmStaffPermissionCatalogItem[]) => {
    setDenyDraft((prev) => { const n = new Set(prev); items.forEach((i) => n.delete(i.name)); return n; });
    setDirectDraft((prev) => { const n = new Set(prev); items.forEach((i) => n.delete(i.name)); return n; });
  };

  const toggleCollapsed = (groupName: string) => {
    setCollapsed((prev) => {
      const n = new Set(prev);
      if (n.has(groupName)) n.delete(groupName); else n.add(groupName);
      return n;
    });
  };

  const saveAll = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      let updated = detail;
      if (directDirty) updated = await crmApi.syncStaffDirectPermissions(detail.user.id, [...directDraft]);
      if (denyDirty) updated = await crmApi.syncStaffDeniedPermissions(detail.user.id, [...denyDraft]);
      setDetail(updated);
      setDirectDraft(new Set(updated.direct_permissions));
      setDenyDraft(new Set(updated.denied_permissions));
      setActivity(await crmApi.staffPermissionActivity(detail.user.id));
      loadList();
      toast.success("تم حفظ التغييرات");
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (listState === "loading") {
    return <div className="crmx-root"><CrmState kind="loading" title="جارٍ تحميل فريق CRM..." /></div>;
  }
  if (listState === "error") {
    return <div className="crmx-root"><CrmState kind="error" title="تعذر تحميل الصفحة" detail={listError} retry={loadList} /></div>;
  }

  const financialCount = staff.filter((s) => s.has_financial_access).length;
  const deniedCount = staff.filter((s) => s.denied_count > 0).length;

  // Live per-employee breakdown, computed from the drafts — updates as the
  // manager toggles states, not just after a save.
  const sensitiveGrantedForEmployee = detail
    ? catalog.filter((i) => i.sensitive && permState(i, detail.role_permissions.includes(i.name)) === "grant").length
    : 0;
  const deniedForEmployee = denyDraft.size;
  const grantedForEmployee = detail
    ? catalog.filter((i) => permState(i, detail.role_permissions.includes(i.name)) === "grant").length
    : 0;

  return (
    <div className="crmx-root space-y-6" dir="rtl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <CrmPageHeader
          title={detail ? `صلاحيات: ${detail.user.name}` : "صلاحيات الفريق"}
          description={
            detail
              ? "تحكّم في الصلاحيات الممنوحة والممنوعة بشكل مستقل عن الدور المخصص."
              : "تحكّم بما يستطيع كل موظف في فريق CRM رؤيته والقيام به — إضافةً إلى صلاحيات دوره، أو منعًا صريحًا لصلاحية يملكها دوره."
          }
          breadcrumb={detail ? "صلاحيات الفريق / CRM" : "CRM / الإدارة"}
        />
        {detail && (
          <div className="flex items-center gap-2.5">
            {pendingChanges > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-[var(--crmx-warning-soft)] px-3 py-1.5 text-[12px] font-bold text-[var(--crmx-warning-text)]">
                <AlertTriangle className="h-3.5 w-3.5" /> {pendingChanges} تغييرات غير محفوظة
              </span>
            )}
            <button
              onClick={saveAll}
              disabled={pendingChanges === 0 || saving}
              className="flex items-center gap-2 rounded-xl bg-[var(--crmx-primary)] px-4 py-2.5 text-[13px] font-bold text-white transition-opacity disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              حفظ التغييرات
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {detail ? (
          <>
            <CrmKpiCard icon={<ShieldAlert className="h-5 w-5" />} label="صلاحيات حساسة" value={String(sensitiveGrantedForEmployee)} tone="warning" />
            <CrmKpiCard icon={<Ban className="h-5 w-5" />} label="صلاحيات ممنوعة" value={String(deniedForEmployee)} tone="danger" />
            <CrmKpiCard icon={<ShieldCheck className="h-5 w-5" />} label="صلاحيات ممنوحة" value={String(grantedForEmployee)} tone="success" />
            <CrmKpiCard icon={<Users className="h-5 w-5" />} label="أعضاء الفريق" value={String(staff.length)} tone="navy" />
          </>
        ) : (
          <>
            <CrmKpiCard icon={<Users className="h-5 w-5" />} label="أعضاء فريق CRM" value={String(staff.length)} tone="navy" />
            <CrmKpiCard icon={<ShieldAlert className="h-5 w-5" />} label="لديهم وصول لبيانات مالية" value={String(financialCount)} tone="warning" />
            <CrmKpiCard icon={<Ban className="h-5 w-5" />} label="لديهم صلاحيات ممنوعة" value={String(deniedCount)} tone="danger" />
          </>
        )}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* ── قائمة الفريق ── */}
        <div className="shrink-0 lg:w-80">
          <div className="mb-2 flex items-center gap-2 rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-[var(--crmx-text-muted)]" />
            <input
              value={staffSearch}
              onChange={(e) => setStaffSearch(e.target.value)}
              placeholder="بحث بالاسم أو البريد..."
              className="w-full bg-transparent text-[13px] text-[var(--crmx-text)] outline-none placeholder:text-[var(--crmx-text-muted)]"
            />
          </div>
          <div className="space-y-2 rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-3">
            {filteredStaff.map((member) => {
              const tone = toneFor(Number(member.id) || member.name.length);
              return (
                <button
                  key={member.id}
                  onClick={() => selectStaff(member)}
                  className={`w-full rounded-xl border-2 p-3 text-right transition-colors ${selectedId === member.id
                    ? "border-[var(--crmx-primary)] bg-[var(--crmx-card)] shadow-[var(--crmx-shadow-sm)]"
                    : "border-transparent bg-[var(--crmx-neutral-soft)] hover:border-[var(--crmx-border)]"
                    }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-black ${tone.bg} ${tone.text}`}>
                        {member.name.trim().charAt(0)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-bold text-[var(--crmx-text)]">{member.name}</p>
                        <p className="truncate text-[11.5px] text-[var(--crmx-text-muted)]">{member.email}</p>
                      </div>
                    </div>
                    {member.has_financial_access && (
                      <ShieldAlert className="h-4 w-4 shrink-0 text-[var(--crmx-warning-text)]" aria-label="وصول لبيانات مالية" />
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {member.roles.map((r) => (
                      <span key={r} className="rounded-full bg-[var(--crmx-navy-soft)] px-2 py-0.5 text-[10.5px] font-bold text-[var(--crmx-navy)]">
                        {ROLE_LABELS[r] || r}
                      </span>
                    ))}
                    <span className="rounded-full bg-[var(--crmx-success-soft)] px-2 py-0.5 text-[10.5px] font-bold text-[var(--crmx-success-text)]">
                      {member.permissions_count} ممنوحة
                    </span>
                    {member.denied_count > 0 && (
                      <span className="rounded-full bg-[var(--crmx-danger-soft)] px-2 py-0.5 text-[10.5px] font-bold text-[var(--crmx-danger-text)]">
                        {member.denied_count} ممنوعة
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
            {filteredStaff.length === 0 && (
              <p className="p-4 text-center text-[13px] text-[var(--crmx-text-muted)]">
                {staff.length === 0 ? "لا يوجد أعضاء في فريق CRM بعد." : "لا نتائج مطابقة."}
              </p>
            )}
          </div>
        </div>

        {/* ── لوحة التفاصيل ── */}
        <div className="min-w-0 flex-1">
          {!selectedId && (
            <div className="rounded-2xl border border-dashed border-[var(--crmx-border)] bg-[var(--crmx-card)] p-12 text-center">
              <KeyRound className="mx-auto mb-3 h-9 w-9 text-[var(--crmx-text-muted)]" />
              <p className="font-bold text-[var(--crmx-text-secondary)]">اختر موظفًا من القائمة لعرض وتعديل صلاحياته</p>
            </div>
          )}

          {selectedId && detailState === "loading" && <CrmState kind="loading" title="جارٍ تحميل صلاحيات الموظف..." />}
          {selectedId && detailState === "error" && <CrmState kind="error" title="تعذر تحميل صلاحيات هذا الموظف" retry={() => loadDetail(selectedId)} />}

          {selectedId && detailState === "ready" && detail && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-[16px] font-extrabold text-[var(--crmx-text)]">{detail.user.name}</h2>
                    <p className="text-[13px] text-[var(--crmx-text-muted)]">{detail.user.email}</p>
                  </div>
                  <div className="flex gap-1.5">
                    {detail.user.roles.map((r) => (
                      <span key={r} className="rounded-full bg-[var(--crmx-navy-soft)] px-3 py-1 text-[12px] font-bold text-[var(--crmx-navy)]">
                        {ROLE_LABELS[r] || r}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] px-3 py-2">
                <Search className="h-4 w-4 shrink-0 text-[var(--crmx-text-muted)]" />
                <input
                  value={permSearch}
                  onChange={(e) => setPermSearch(e.target.value)}
                  placeholder={`بحث عن صلاحية بالاسم... (${catalog.length} صلاحية)`}
                  className="w-full bg-transparent text-[13px] text-[var(--crmx-text)] outline-none placeholder:text-[var(--crmx-text-muted)]"
                />
              </div>

              {filteredGroups.map(([groupName, items], idx) => {
                const GroupIcon = GROUP_ICON[groupName] ?? Settings2;
                const tone = GROUP_TONES[idx % GROUP_TONES.length];
                const isCollapsed = collapsed.has(groupName);
                const grantedCount = items.filter((i) => permState(i, detail.role_permissions.includes(i.name)) === "grant").length;
                const deniedInGroup = items.filter((i) => permState(i, detail.role_permissions.includes(i.name)) === "deny").length;

                return (
                  <div key={groupName} className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-4">
                    <div className="flex items-center justify-between gap-3 pb-3">
                      <button onClick={() => toggleCollapsed(groupName)} className="flex flex-1 items-center gap-2.5 text-right">
                        <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--crmx-text-muted)] transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone.bg} ${tone.text}`}>
                          <GroupIcon className="h-4 w-4" />
                        </span>
                        <h3 className="text-[13.5px] font-extrabold text-[var(--crmx-text)]">{groupName}</h3>
                        <span className="text-[11px] font-semibold text-[var(--crmx-text-muted)]">
                          {items.length} صلاحية · {grantedCount} ممنوحة{deniedInGroup > 0 ? ` · ${deniedInGroup} ممنوعة` : ""}
                        </span>
                      </button>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button onClick={() => bulkGrantAll(items)} className="rounded-lg bg-[var(--crmx-success-soft)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--crmx-success-text)] hover:opacity-80">منح الكل</button>
                        <button onClick={() => bulkResetAll(items)} className="flex items-center gap-1 rounded-lg bg-[var(--crmx-neutral-soft)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--crmx-text-secondary)] hover:opacity-80">
                          <RotateCcw className="h-3 w-3" /> إعادة تعيين
                        </button>
                        <button onClick={() => bulkDenyAll(items)} className="rounded-lg bg-[var(--crmx-danger-soft)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--crmx-danger-text)] hover:opacity-80">منع الكل</button>
                      </div>
                    </div>

                    {!isCollapsed && (
                      <div className="divide-y divide-[var(--crmx-border)] border-t border-[var(--crmx-border)]">
                        {items.map((item) => {
                          const roleGranted = detail.role_permissions.includes(item.name);
                          const state = permState(item, roleGranted);
                          const canGrant = hasPermission(item.name);
                          return (
                            <div key={item.name} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                              <div className="min-w-0 flex-1">
                                <p className="flex flex-wrap items-center gap-1.5 text-[13px] font-bold text-[var(--crmx-text)]">
                                  {item.label}
                                  {item.sensitive && (
                                    <span className="rounded-full bg-[var(--crmx-warning-soft)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--crmx-warning-text)]">حساسة</span>
                                  )}
                                </p>
                                <p className="font-mono text-[10.5px] text-[var(--crmx-text-muted)]/80">{item.name}</p>
                              </div>
                              <PermissionStateControl
                                state={state}
                                roleGranted={roleGranted}
                                canGrant={canGrant}
                                onSelect={(next) => applyState(item, roleGranted, next)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredGroups.length === 0 && (
                <p className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-6 text-center text-[13px] text-[var(--crmx-text-muted)]">
                  لا صلاحيات مطابقة لبحثك.
                </p>
              )}

              {activity.length > 0 && (
                <div className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-4">
                  <h3 className="mb-3 text-[13.5px] font-extrabold text-[var(--crmx-text)]">آخر التغييرات</h3>
                  <div className="space-y-2.5">
                    {activity.map((ev) => (
                      <div key={ev.id} className="flex items-start gap-2.5 text-[12.5px]">
                        {ev.kind === "deny" ? (
                          <Ban className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--crmx-danger-text)]" />
                        ) : (
                          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--crmx-success-text)]" />
                        )}
                        <div>
                          <p className="text-[var(--crmx-text)]">
                            <strong>{ev.actor?.name || "—"}</strong> {ev.label}
                          </p>
                          <p className="text-[11px] text-[var(--crmx-text-muted)]">
                            {ev.new.length > 0 ? ev.new.join("، ") : "لا شيء"}
                            {ev.timestamp && ` · ${new Date(ev.timestamp).toLocaleString("ar-EG")}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {catalog.some((c) => c.sensitive) && (
                <p className="flex items-center gap-1.5 text-[11.5px] text-[var(--crmx-text-muted)]">
                  <AlertTriangle className="h-3.5 w-3.5" /> الصلاحيات المميزة بـ"حساسة" تتعلق ببيانات مالية أو حساسة للعميل — كل تغيير عليها مُسجَّل في سجل التدقيق.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <CrmConfirmDialog
        open={pendingGrant !== null}
        title="منح صلاحية حساسة؟"
        description={pendingGrant ? `"${pendingGrant.label}" تتعلق ببيانات مالية أو حساسة للعميل. هذا التغيير سيُسجَّل في سجل التدقيق باسمك.` : undefined}
        confirmLabel="منح الصلاحية"
        danger={false}
        onConfirm={confirmPendingGrant}
        onCancel={() => setPendingGrant(null)}
      />
    </div>
  );
}
