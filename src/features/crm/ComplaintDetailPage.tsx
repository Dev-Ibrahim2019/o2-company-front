import {
  ArrowRightLeft, BadgeCheck, CheckCircle2, ChevronLeft, ClipboardList, Hand,
  History, Info, Loader2, Lock, Megaphone, MessageSquarePlus, Send,
  ShieldAlert, ShieldOff, User2, UserCog, X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../auth";
import { CRM_PERMISSIONS } from "../../auth/permissions";
import { toast } from "../../components/shared/Toast";
import { branchService, type Branch } from "../../services/branchService";
import { crmApi } from "./api";
import { CrmState, getCrmError } from "./components";
import {
  COMPLAINT_CHANNEL_LABELS, COMPLAINT_DEPARTMENT_LABELS, COMPLAINT_PILL,
  COMPLAINT_PRIORITY_TONE, COMPLAINT_SEVERITY_TONE, COMPLAINT_STATUS_DESCRIPTIONS,
  COMPLAINT_STATUS_STEPS, COMPLAINT_STATUS_TONE, COMPLAINT_TRANSITIONS,
} from "./customers-ui";
import { dateTime as fmtDateTime } from "./format";
import type {
  CrmComplaintFollowup, CrmComplaintRow, CrmComplaintSeverity, CrmComplaintStatus, CrmId,
} from "./types";

/**
 * Full-page detail for one complaint — where a complaint is actually worked.
 *
 * The lifecycle as a visible track, a plain statement of who owns the ticket,
 * and the follow-up log. Assignment follows the backend rule: any agent may
 * TAKE an unassigned complaint; only a manager may hand one to someone else or
 * lift it off its owner. Starting work (open / in_progress) auto-claims an
 * unassigned complaint for the actor.
 *
 * Every write returns the full { data, followups } envelope, so the page
 * patches its own state from the response and never flashes a reload.
 */

const serverMessage = (error: unknown): string => {
  const body = (error as { response?: { data?: { message?: unknown } } })?.response?.data;
  return typeof body?.message === "string" && body.message.trim() !== ""
    ? body.message
    : getCrmError(error).message;
};

/** The CRM assignee (a user), whichever shape the endpoint sent. */
const assigneeId = (c: CrmComplaintRow): number | null => {
  if (c.assigned_user && typeof c.assigned_user === "object") return Number(c.assigned_user.id);
  return c.assigned_user_id == null ? null : Number(c.assigned_user_id);
};
const assigneeName = (c: CrmComplaintRow): string | null =>
  c.assigned_user && typeof c.assigned_user === "object" ? c.assigned_user.name : null;
/** The assignee's own branch — a cross-branch assignment does not move the
 *  complaint's own origin branch, so these two can legitimately differ. */
const assigneeBranchId = (c: CrmComplaintRow): CrmId | null =>
  c.assigned_user && typeof c.assigned_user === "object" ? (c.assigned_user.branch_id ?? null) : null;

const createdByName = (c: CrmComplaintRow): string | null => {
  if (c.createdBy?.name) return c.createdBy.name;
  if (c.created_by && typeof c.created_by === "object") return c.created_by.name;
  return null;
};

/** Button label for a transition, given where the complaint is now. */
const transitionLabel = (from: CrmComplaintStatus, to: CrmComplaintStatus): string => {
  if (to === "open" && (from === "resolved" || from === "closed" || from === "cancelled")) return "إعادة فتح";
  if (to === "in_progress" && from === "waiting_customer") return "استئناف المعالجة";
  return {
    new: "إرجاع إلى «جديدة»",
    open: "فتح الشكوى",
    in_progress: "بدء المعالجة",
    waiting_customer: "بانتظار رد العميل",
    resolved: "تعليم كمحلولة",
    closed: "إغلاق الشكوى",
    cancelled: "إلغاء الشكوى",
  }[to];
};

const transitionTone = (to: CrmComplaintStatus): string => {
  switch (to) {
    case "resolved":
      return "bg-[var(--crmx-success)] text-white hover:brightness-95";
    case "cancelled":
      return "border border-[var(--crmx-danger-soft)] bg-[var(--crmx-danger-soft)] text-[var(--crmx-danger-text)] hover:brightness-95";
    case "closed":
      return "border border-[var(--crmx-border)] bg-[var(--crmx-card)] text-[var(--crmx-text-secondary)] hover:bg-[var(--crmx-neutral-soft)]";
    case "in_progress":
    case "open":
      return "bg-[var(--crmx-primary)] text-white hover:bg-[var(--crmx-primary-hover)]";
    default:
      return "border border-[var(--crmx-border)] bg-[var(--crmx-card)] text-[var(--crmx-navy)] hover:bg-[var(--crmx-neutral-soft)]";
  }
};

/** Quick-log presets — clicking one seeds the note box for the agent to
 *  finish the sentence, rather than posting a bare canned line. */
const QUICK_FOLLOWUPS = [
  "تم التواصل مع العميل",
  "تم تحويلها للمشرف",
  "تم تعويض العميل",
];

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <span className="shrink-0 text-[12px] font-bold text-[var(--crmx-text-muted)]">{label}</span>
      <span className="min-w-0 text-left text-[13px] font-semibold text-[var(--crmx-text)]">{children}</span>
    </div>
  );
}

function SecHead({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h3 className="mb-3 flex items-center gap-2 text-[14px] font-extrabold text-[var(--crmx-text)]">
      <span className="text-[var(--crmx-primary)]">{icon}</span>
      {children}
    </h3>
  );
}

export function ComplaintDetailPage() {
  const { complaintId = "" } = useParams();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const myId = user?.id ?? null;
  const canUpdate = hasPermission(CRM_PERMISSIONS.COMPLAINTS_UPDATE);
  const canAssign = hasPermission(CRM_PERMISSIONS.COMPLAINTS_ASSIGN);
  const canReclassify = canUpdate && hasPermission(CRM_PERMISSIONS.VIEW_SENSITIVE_NOTES);

  const [complaint, setComplaint] = useState<CrmComplaintRow | null>(null);
  const [followups, setFollowups] = useState<CrmComplaintFollowup[]>([]);
  const [users, setUsers] = useState<Array<{ id: CrmId; name: string; branch?: { id: CrmId; name: string } | null }>>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status?: number; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [posting, setPosting] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolveNotes, setResolveNotes] = useState("");
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const envelope = await crmApi.complaint(complaintId);
      setComplaint(envelope.data);
      setFollowups(envelope.followups ?? []);
    } catch (e) {
      setError(getCrmError(e));
    } finally {
      setLoading(false);
    }
  }, [complaintId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => { void branchService.getAll().then(setBranches).catch(() => setBranches([])); }, []);
  const branchName = useCallback(
    (id: CrmId | null | undefined) => {
      if (id == null) return null;
      return branches.find((b) => String(b.id) === String(id))?.name ?? `فرع #${id}`;
    },
    [branches],
  );

  useEffect(() => {
    if (!canAssign) return;
    void crmApi.assignableUsers().then(setUsers).catch(() => setUsers([]));
  }, [canAssign]);

  // Every write returns the same envelope show() does — patch state in place,
  // no spinner, no refetch.
  const patch = async (data: Record<string, unknown>, successText: string) => {
    setSaving(true);
    try {
      const resp = await crmApi.updateComplaint(complaintId, data);
      setComplaint(resp.data);
      setFollowups(resp.followups ?? []);
      toast.success(successText);
    } catch (e) {
      toast.error("تعذّر حفظ التغيير", serverMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const addFollowup = async (text: string) => {
    const value = text.trim();
    if (value === "") return;
    setPosting(true);
    try {
      const created = await crmApi.addComplaintFollowup(complaintId, value);
      setFollowups((prev) => [created, ...prev]);
      setNote("");
      toast.success("تمت إضافة المتابعة");
    } catch (e) {
      toast.error("تعذّر إضافة المتابعة", serverMessage(e));
    } finally {
      setPosting(false);
    }
  };

  const seedNote = (preset: string) => {
    setNote((cur) => (cur.trim() === "" ? `${preset} — ` : `${cur}\n${preset} — `));
    requestAnimationFrame(() => {
      const el = noteRef.current;
      if (el) { el.focus(); el.selectionStart = el.selectionEnd = el.value.length; }
    });
  };

  const status = complaint?.status ?? null;
  const statusTone = status ? COMPLAINT_STATUS_TONE[status] : null;
  const priorityTone = complaint ? COMPLAINT_PRIORITY_TONE[complaint.priority] : null;
  const severity = (complaint?.severity ?? "info") as CrmComplaintSeverity;
  const severityTone = COMPLAINT_SEVERITY_TONE[severity] ?? COMPLAINT_SEVERITY_TONE.info;
  const transitions = status ? COMPLAINT_TRANSITIONS[status] ?? [] : [];

  const ownerId = complaint ? assigneeId(complaint) : null;
  const ownerName = complaint ? assigneeName(complaint) : null;
  const ownedByMe = ownerId != null && myId != null && ownerId === myId;
  const unassigned = ownerId == null;

  const stepIndex = useMemo(() => {
    if (!status) return -1;
    if (status === "waiting_customer") return COMPLAINT_STATUS_STEPS.indexOf("in_progress");
    return COMPLAINT_STATUS_STEPS.indexOf(status);
  }, [status]);

  return (
    <div className="crmx-root space-y-4 p-4 sm:p-6">
      {/* ── Breadcrumb + title ──────────────────────────────────────── */}
      <div className="min-w-0">
        <button
          onClick={() => navigate("/admin/crm/complaints")}
          className="mb-1 flex items-center gap-1 text-[12px] font-bold text-[var(--crmx-text-muted)] transition hover:text-[var(--crmx-primary)]"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> الشكاوى
        </button>
        <h1 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[22px] font-extrabold text-[var(--crmx-text)] md:text-[26px]">
          <span dir="ltr" className="rounded-lg bg-[var(--crmx-neutral-soft)] px-2 py-0.5 text-[16px] font-bold text-[var(--crmx-text-muted)]">
            #{String(complaintId)}
          </span>
          <span className="min-w-0 break-words">{complaint?.title || "—"}</span>
        </h1>
        {complaint && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {statusTone && <span className={`${COMPLAINT_PILL} ${statusTone.tone}`}>{statusTone.label}</span>}
            {priorityTone && <span className={`${COMPLAINT_PILL} ${priorityTone.tone}`}>{priorityTone.label}</span>}
            <span className={`${COMPLAINT_PILL} ${severityTone.tone}`}>خطورة: {severityTone.label}</span>
            {complaint.is_sensitive && (
              <span className={`${COMPLAINT_PILL} gap-1 bg-[var(--crmx-danger-soft)] text-[var(--crmx-danger-text)]`}>
                <ShieldAlert className="h-3 w-3" /> حساسة
              </span>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <CrmState kind="loading" title="جارٍ تحميل الشكوى" />
      ) : error ? (
        <CrmState kind={error.status === 403 ? "forbidden" : "error"} title={error.message} retry={load} />
      ) : !complaint || !status ? null : (
        <>
          {/* ── مسار المعالجة ──────────────────────────────────────── */}
          <div className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-4 shadow-[var(--crmx-shadow-sm)] sm:p-5">
            <SecHead icon={<ClipboardList className="h-4 w-4" />}>مسار المعالجة</SecHead>
            {status === "cancelled" ? (
              <div className="flex items-center gap-2 rounded-xl border border-[var(--crmx-danger-soft)] bg-[var(--crmx-danger-soft)] px-4 py-3 text-[13px] font-bold text-[var(--crmx-danger-text)]">
                <X className="h-4 w-4" /> أُلغيت هذه الشكوى دون معالجة. يمكن إعادة فتحها إذا لزم.
              </div>
            ) : (
              <ol className="flex items-center gap-1 overflow-x-auto pb-1">
                {COMPLAINT_STATUS_STEPS.map((step, i) => {
                  const done = i < stepIndex;
                  const current = i === stepIndex;
                  const label = status === "waiting_customer" && step === "in_progress"
                    ? COMPLAINT_STATUS_TONE.waiting_customer.label
                    : COMPLAINT_STATUS_TONE[step].label;
                  return (
                    <li key={step} className="flex shrink-0 items-center gap-1">
                      <div className="flex flex-col items-center gap-1.5">
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-extrabold transition ${
                            done
                              ? "bg-[var(--crmx-success-soft)] text-[var(--crmx-success-text)]"
                              : current
                                ? "bg-[var(--crmx-primary)] text-white shadow-[var(--crmx-shadow-sm)]"
                                : "bg-[var(--crmx-neutral-soft)] text-[var(--crmx-text-muted)]"
                          }`}
                        >
                          {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                        </span>
                        <span
                          className={`whitespace-nowrap text-[11.5px] font-bold ${
                            current ? "text-[var(--crmx-primary-text)]" : done ? "text-[var(--crmx-text-secondary)]" : "text-[var(--crmx-text-muted)]"
                          }`}
                        >
                          {label}
                        </span>
                      </div>
                      {i < COMPLAINT_STATUS_STEPS.length - 1 && (
                        <span className={`mx-1 h-0.5 w-9 rounded-full sm:w-14 ${i < stepIndex ? "bg-[var(--crmx-success)]" : "bg-[var(--crmx-border)]"}`} />
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
            <p className="mt-3 rounded-lg bg-[var(--crmx-neutral-soft)] px-3 py-2 text-[12.5px] leading-6 text-[var(--crmx-text-secondary)]">
              {COMPLAINT_STATUS_DESCRIPTIONS[status]}
            </p>

            {canUpdate && transitions.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--crmx-border)] pt-4">
                {transitions.map((to) => (
                  <button
                    key={to}
                    disabled={saving}
                    onClick={() => {
                      if (to === "resolved") { setResolveNotes(""); setResolveOpen(true); return; }
                      const willClaim = (to === "open" || to === "in_progress") && unassigned;
                      void patch(
                        { status: to },
                        willClaim
                          ? `تم نقل الشكوى إلى «${COMPLAINT_STATUS_TONE[to].label}» وأصبحت مُسندة إليك`
                          : `تم نقل الشكوى إلى «${COMPLAINT_STATUS_TONE[to].label}»`,
                      );
                    }}
                    className={`h-10 rounded-xl px-4 text-[13px] font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${transitionTone(to)}`}
                  >
                    {transitionLabel(status, to)}
                  </button>
                ))}
                {saving && <span className="flex items-center gap-1.5 text-[12px] text-[var(--crmx-text-muted)]"><Loader2 className="h-3.5 w-3.5 animate-spin" /> جارٍ الحفظ…</span>}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            {/* ── Main column ──────────────────────────────────────── */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-4 shadow-[var(--crmx-shadow-sm)] sm:p-5">
                <SecHead icon={<Info className="h-4 w-4" />}>تفاصيل الشكوى</SecHead>
                {complaint.description?.trim() ? (
                  <p className="whitespace-pre-wrap text-[13.5px] leading-7 text-[var(--crmx-text-secondary)]">{complaint.description}</p>
                ) : (
                  <p className="text-[13px] text-[var(--crmx-text-muted)]">لا يوجد وصف مُسجَّل لهذه الشكوى.</p>
                )}
              </div>

              {complaint.resolution_notes?.trim() && (
                <div className="rounded-2xl border border-[var(--crmx-success-soft)] bg-[var(--crmx-success-soft)]/40 p-4 sm:p-5">
                  <SecHead icon={<BadgeCheck className="h-4 w-4" />}>الحل المُنفَّذ</SecHead>
                  <p className="whitespace-pre-wrap text-[13.5px] leading-7 text-[var(--crmx-text-secondary)]">{complaint.resolution_notes}</p>
                </div>
              )}

              <div className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-4 shadow-[var(--crmx-shadow-sm)] sm:p-5">
                <SecHead icon={<History className="h-4 w-4" />}>سجل المتابعة</SecHead>

                {canUpdate && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {QUICK_FOLLOWUPS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => seedNote(preset)}
                        className="flex items-center gap-1.5 rounded-full border border-[var(--crmx-primary)]/25 bg-[var(--crmx-primary-soft)] px-3 py-1.5 text-[12px] font-bold text-[var(--crmx-primary-text)] transition hover:brightness-95"
                      >
                        <MessageSquarePlus className="h-3.5 w-3.5" /> {preset}
                      </button>
                    ))}
                  </div>
                )}

                {followups.length === 0 ? (
                  <p className="text-[12.5px] text-[var(--crmx-text-muted)]">لا توجد متابعات مُسجَّلة بعد.</p>
                ) : (
                  <ol className="space-y-3 border-s-2 border-[var(--crmx-border)] ps-4">
                    {followups.map((f) => (
                      <li key={String(f.id)} className="relative">
                        <span className="absolute -start-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--crmx-card)] bg-[var(--crmx-primary)]" />
                        <p className="whitespace-pre-wrap text-[13px] font-semibold text-[var(--crmx-text)]">{f.notes || f.action || "—"}</p>
                        <p className="mt-0.5 text-[11px] text-[var(--crmx-text-muted)]">
                          {f.user?.name ? `${f.user.name} · ` : ""}{fmtDateTime(f.created_at ?? null)}
                          {f.old_status && f.new_status
                            ? ` · ${COMPLAINT_STATUS_TONE[f.old_status]?.label ?? f.old_status} ← ${COMPLAINT_STATUS_TONE[f.new_status]?.label ?? f.new_status}`
                            : ""}
                        </p>
                      </li>
                    ))}
                  </ol>
                )}

                {canUpdate && (
                  <div className="mt-4 border-t border-[var(--crmx-border)] pt-4">
                    <textarea
                      ref={noteRef}
                      className="h-20 w-full resize-none rounded-xl border border-[var(--crmx-border)] bg-white px-3 py-2.5 text-[14px] text-[var(--crmx-text)] outline-none focus:border-[var(--crmx-primary)] focus:ring-2 focus:ring-[var(--crmx-primary)]/10"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="اكتب بالتفصيل ما تم فعله في هذه المتابعة…"
                      maxLength={2000}
                    />
                    <button
                      onClick={() => void addFollowup(note)}
                      disabled={posting || note.trim() === ""}
                      className="mt-2 flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--crmx-primary)] px-5 text-[14px] font-bold text-white transition hover:bg-[var(--crmx-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" /> {posting ? "جارٍ الإضافة…" : "إضافة متابعة"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ── Sidebar ──────────────────────────────────────────── */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-4 shadow-[var(--crmx-shadow-sm)] sm:p-5">
                <SecHead icon={<Info className="h-4 w-4" />}>معلومات الشكوى</SecHead>
                <div className="divide-y divide-[var(--crmx-border)]">
                  <InfoRow label="العميل">
                    {complaint.customer ? (
                      <Link
                        to={`/admin/crm/customers/${complaint.customer.id}/overview`}
                        className="inline-flex items-center gap-1 font-bold text-[var(--crmx-primary)] hover:underline"
                      >
                        {complaint.customer.name} <ChevronLeft className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <span className={`${COMPLAINT_PILL} gap-1 bg-[var(--crmx-navy-soft)] text-[var(--crmx-navy)]`}>
                        <Megaphone className="h-3 w-3" /> شكوى عامة
                      </span>
                    )}
                  </InfoRow>
                  {complaint.customer?.phone && (
                    <InfoRow label="جوال العميل"><span dir="ltr">{complaint.customer.phone}</span></InfoRow>
                  )}
                  <InfoRow label="القسم">
                    {complaint.department ? COMPLAINT_DEPARTMENT_LABELS[complaint.department] : "غير مصنَّف"}
                  </InfoRow>
                  <InfoRow label="القناة">
                    {complaint.channel ? COMPLAINT_CHANNEL_LABELS[complaint.channel] : "—"}
                  </InfoRow>
                  <InfoRow label="الخطورة">
                    <span className={`${COMPLAINT_PILL} ${severityTone.tone}`}>{severityTone.label}</span>
                  </InfoRow>
                  {(complaint.order?.order_number || complaint.order_id) && (
                    <InfoRow label="رقم الطلب المرتبط">
                      <span dir="ltr" className="font-bold">
                        #{complaint.order?.order_number ?? String(complaint.order_id)}
                      </span>
                    </InfoRow>
                  )}
                  <InfoRow label="الفرع الأصلي">
                    {complaint.branch_id != null ? (
                      <span className={`${COMPLAINT_PILL} bg-[var(--crmx-navy-soft)] text-[var(--crmx-navy)]`}>
                        {branchName(complaint.branch_id)}
                      </span>
                    ) : (
                      <span className="text-[var(--crmx-text-muted)]">غير محدَّد</span>
                    )}
                  </InfoRow>
                  {assigneeBranchId(complaint) != null && (
                    <InfoRow label="فرع الموظف المسؤول">
                      <span
                        className={`${COMPLAINT_PILL} ${
                          String(assigneeBranchId(complaint)) === String(complaint.branch_id)
                            ? "bg-[var(--crmx-success-soft)] text-[var(--crmx-success-text)]"
                            : "bg-[var(--crmx-warning-soft)] text-[var(--crmx-warning-text)]"
                        }`}
                      >
                        {branchName(assigneeBranchId(complaint))}
                        {String(assigneeBranchId(complaint)) !== String(complaint.branch_id) && " — عبر الفروع"}
                      </span>
                    </InfoRow>
                  )}
                  {createdByName(complaint) && <InfoRow label="سجّلها">{createdByName(complaint)}</InfoRow>}
                  <InfoRow label="تاريخ التسجيل">{fmtDateTime(complaint.created_at ?? null)}</InfoRow>
                </div>
              </div>

              {/* المسؤول عن المتابعة */}
              <div className="rounded-2xl border border-[var(--crmx-navy)]/15 bg-[var(--crmx-navy-soft)] p-4 sm:p-5">
                <SecHead icon={<UserCog className="h-4 w-4" />}>المسؤول عن المتابعة</SecHead>

                <div className="flex items-center gap-3 rounded-xl bg-[var(--crmx-card)] p-3 shadow-[var(--crmx-shadow-sm)]">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    unassigned ? "bg-[var(--crmx-neutral-soft)] text-[var(--crmx-text-muted)]" : "bg-[var(--crmx-primary-soft)] text-[var(--crmx-primary-text)]"
                  }`}>
                    <User2 className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-extrabold text-[var(--crmx-text)]">
                      {ownedByMe ? `${ownerName ?? "أنت"} (أنت)` : ownerName ?? "بلا إسناد"}
                    </p>
                    <p className="text-[11.5px] font-semibold text-[var(--crmx-text-muted)]">
                      {unassigned ? "لم يمسك أحد هذه الشكوى بعد" : "الشكوى مُسندة إليه حتى إغلاقها"}
                    </p>
                  </div>
                </div>

                {/* Take it — any agent, only while unassigned */}
                {unassigned && canUpdate && !canAssign && (
                  <button
                    disabled={saving}
                    onClick={() => void patch({ assigned_user_id: myId }, "أصبحت الشكوى مُسندة إليك")}
                    className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[var(--crmx-primary)] text-[13px] font-bold text-white transition hover:bg-[var(--crmx-primary-hover)] disabled:opacity-50"
                  >
                    <Hand className="h-4 w-4" /> مسك الشكوى (تُسنَد إليّ)
                  </button>
                )}

                {/* Manager: take, hand over, or lift */}
                {canAssign ? (
                  <div className="mt-3 space-y-2">
                    {unassigned && myId != null && (
                      <button
                        disabled={saving}
                        onClick={() => void patch({ assigned_user_id: myId }, "أصبحت الشكوى مُسندة إليك")}
                        className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[var(--crmx-primary)] text-[13px] font-bold text-white transition hover:bg-[var(--crmx-primary-hover)] disabled:opacity-50"
                      >
                        <Hand className="h-4 w-4" /> مسك الشكوى بنفسي
                      </button>
                    )}
                    {!assignOpen ? (
                      <button
                        onClick={() => setAssignOpen(true)}
                        className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[var(--crmx-navy)]/20 bg-[var(--crmx-card)] text-[13px] font-bold text-[var(--crmx-navy)] transition hover:bg-[var(--crmx-neutral-soft)]"
                      >
                        <ArrowRightLeft className="h-4 w-4" /> {unassigned ? "إسناد لموظف" : "تحويل لموظف آخر"}
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <select
                          autoFocus
                          disabled={saving}
                          defaultValue={ownerId != null ? String(ownerId) : ""}
                          onChange={(e) => {
                            const next = e.target.value === "" ? null : Number(e.target.value);
                            setAssignOpen(false);
                            if (next === ownerId) return;
                            void patch(
                              { assigned_user_id: next },
                              next == null ? "تم رفع الإسناد عن الشكوى" : "تم تحويل الشكوى",
                            );
                          }}
                          className="h-11 w-full rounded-xl border border-[var(--crmx-border)] bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none focus:border-[var(--crmx-primary)] focus:ring-2 focus:ring-[var(--crmx-primary)]/10 disabled:opacity-50"
                        >
                          <option value="">— بلا إسناد —</option>
                          {users.map((u) => (
                            <option key={String(u.id)} value={String(u.id)}>
                              {u.name}{u.branch?.name ? ` — ${u.branch.name}` : ""}
                            </option>
                          ))}
                        </select>
                        <button onClick={() => setAssignOpen(false)} className="text-[12px] font-semibold text-[var(--crmx-text-muted)] hover:text-[var(--crmx-text)]">
                          إلغاء
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  !unassigned && (
                    <p className="mt-3 flex items-start gap-2 rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] px-3 py-2.5 text-[12px] font-semibold text-[var(--crmx-text-secondary)]">
                      <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--crmx-text-muted)]" />
                      {ownedByMe
                        ? "لا يمكنك رفع الشكوى عن نفسك — تحويلها من صلاحية مدير قسم CRM وحده."
                        : "تحويل الشكوى لموظف آخر من صلاحية مدير قسم CRM وحده."}
                    </p>
                  )
                )}
              </div>

              {canReclassify && (
                <button
                  disabled={saving}
                  onClick={() => void patch(
                    { is_sensitive: !complaint.is_sensitive },
                    complaint.is_sensitive ? "تم إلغاء تصنيف الحساسية" : "تم تصنيف الشكوى كحساسة",
                  )}
                  className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl border text-[13px] font-bold transition disabled:opacity-50 ${
                    complaint.is_sensitive
                      ? "border-[var(--crmx-border)] bg-[var(--crmx-card)] text-[var(--crmx-text-secondary)] hover:bg-[var(--crmx-neutral-soft)]"
                      : "border-[var(--crmx-danger-soft)] bg-[var(--crmx-danger-soft)]/50 text-[var(--crmx-danger-text)] hover:brightness-95"
                  }`}
                >
                  {complaint.is_sensitive ? <ShieldOff className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                  {complaint.is_sensitive ? "إلغاء تصنيف الحساسية" : "تصنيف كحساسة"}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {resolveOpen && createPortal(
        <div className="crmx-root fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="تسجيل الحل">
          <button aria-label="إلغاء" className="absolute inset-0 bg-[#0B1220]/25 backdrop-blur-[2px]" onClick={() => setResolveOpen(false)} />
          <div dir="rtl" className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] shadow-2xl">
            <header className="flex items-start justify-between gap-3 border-b border-[var(--crmx-border)] px-5 py-4">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--crmx-success-soft)] text-[var(--crmx-success)]">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-[16px] font-bold text-[var(--crmx-text)]">تسجيل الحل</h3>
                  <p className="mt-0.5 text-[12.5px] text-[var(--crmx-text-secondary)]">اكتب ما تم فعله قبل تحويل الشكوى إلى «محلولة».</p>
                </div>
              </div>
              <button onClick={() => setResolveOpen(false)} className="shrink-0 rounded-lg p-1.5 text-[var(--crmx-text-muted)] transition hover:bg-[var(--crmx-neutral-soft)]" aria-label="إغلاق">
                <X className="h-5 w-5" />
              </button>
            </header>
            <div className="px-5 py-4">
              <textarea
                autoFocus
                className="h-28 w-full resize-none rounded-xl border border-[var(--crmx-border)] bg-white px-3 py-2.5 text-[14px] text-[var(--crmx-text)] outline-none focus:border-[var(--crmx-primary)] focus:ring-2 focus:ring-[var(--crmx-primary)]/10"
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                placeholder="مثال: تم استبدال الطلب وتعويض العميل بقسيمة."
                maxLength={2000}
              />
            </div>
            <footer className="flex items-center justify-end gap-2.5 border-t border-[var(--crmx-border)] bg-[var(--crmx-bg)] px-5 py-4">
              <button
                onClick={() => setResolveOpen(false)}
                className="h-11 rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] px-4 text-[14px] font-semibold text-[var(--crmx-text-secondary)] transition hover:bg-[var(--crmx-neutral-soft)]"
              >
                إلغاء
              </button>
              <button
                disabled={resolveNotes.trim() === ""}
                onClick={() => {
                  setResolveOpen(false);
                  void patch({ status: "resolved", resolution_notes: resolveNotes.trim() }, "تم نقل الشكوى إلى «محلولة»");
                }}
                className="h-11 rounded-xl bg-[var(--crmx-success)] px-4 text-[14px] font-bold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                تحويل إلى محلولة
              </button>
            </footer>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
