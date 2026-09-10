import { CheckCircle2, ChevronLeft, History, Loader2, Send, ShieldAlert, ShieldOff, User2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth";
import { CRM_PERMISSIONS } from "../../auth/permissions";
import { toast } from "../../components/shared/Toast";
import { crmApi } from "./api";
import { ComplaintStatusControl } from "./ComplaintStatusControl";
import { CrmState, getCrmError } from "./components";
import {
  COMPLAINT_CHANNEL_LABELS, COMPLAINT_DEPARTMENT_LABELS, COMPLAINT_PILL,
  COMPLAINT_PRIORITY_TONE, COMPLAINT_SEVERITY_LABELS, COMPLAINT_STATUS_TONE,
} from "./customers-ui";
import { date as fmtDate } from "./format";
import type {
  CrmComplaintDepartment, CrmComplaintFollowup, CrmComplaintRow,
  CrmComplaintSeverity, CrmId,
} from "./types";

/**
 * Prefer the server's own sentence over a generic one.
 *
 * getCrmError() maps a status code to a fixed phrase and drops the response
 * body, which would turn the lifecycle guard's "لا يمكن نقل الشكوى من «مفتوحة»
 * إلى «مغلقة» مباشرة." into "تحقق من القيم المدخلة" — the one message that
 * tells the reader nothing. Same helper the complaints tab uses.
 */
const serverMessage = (error: unknown): string => {
  const body = (error as { response?: { data?: { message?: unknown } } })?.response?.data;
  return typeof body?.message === "string" && body.message.trim() !== ""
    ? body.message
    : getCrmError(error).message;
};

/**
 * The assignee id, whichever shape the endpoint sent.
 *
 * GET /crm/complaints/{id} eager-loads `assignedTo`, and Laravel serialises
 * that relation under `assigned_to` — clobbering the integer column. Reading
 * the field directly put an object into the select's `value`, which silently
 * fell back to "بلا إسناد" even for an assigned complaint.
 */
const assignedId = (value: CrmComplaintRow["assigned_to"]): string =>
  value == null ? "" : String(typeof value === "object" ? value.id : value);

const fieldCls =
  "h-11 w-full rounded-xl border border-[var(--crmx-border)] bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none focus:border-[var(--crmx-primary)] focus:ring-2 focus:ring-[var(--crmx-primary)]/10 disabled:opacity-50";
const sectionLabel = "mb-1 block text-[13px] font-semibold text-[var(--crmx-text-secondary)]";

function MetaCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] px-3 py-2.5">
      <p className="mb-1 text-[11px] font-bold text-[var(--crmx-text-muted)]">{label}</p>
      <div className="text-[13px] font-semibold text-[var(--crmx-text)]">{children}</div>
    </div>
  );
}

/**
 * Triage panel for one complaint.
 *
 * Every editable field saves on change through the same
 * PUT /crm/complaints/{id} — there is no save button, because a supervisor
 * working a queue changes one field and moves on. The list behind is told to
 * refresh via onChanged so the row can never disagree with the panel.
 */
export function ComplaintDrawer({
  complaintId, onClose, onChanged,
}: {
  complaintId: CrmId;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission(CRM_PERMISSIONS.COMPLAINTS_UPDATE);
  // "Decide who works it" — a manager-only key, separate from canUpdate
  // ("work the complaint you hold"). The backend rejects an assigned_to
  // change without it (CrmController::updateComplaint), so the picker is
  // hidden rather than left to fail with a 403.
  const canAssign = hasPermission(CRM_PERMISSIONS.COMPLAINTS_ASSIGN);
  // Same two-part rule the notes and complaints tabs apply: the action
  // permission AND clearance for the category.
  const canReclassify = canUpdate && hasPermission(CRM_PERMISSIONS.VIEW_SENSITIVE_NOTES);

  const [complaint, setComplaint] = useState<CrmComplaintRow | null>(null);
  const [followups, setFollowups] = useState<CrmComplaintFollowup[]>([]);
  const [employees, setEmployees] = useState<Array<{ id: CrmId; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status?: number; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [posting, setPosting] = useState(false);

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

  useEffect(() => {
    // Assignment candidates are branch-scoped by the backend, so whatever
    // comes back is already the permitted set. A failure here must not break
    // the panel — the rest of it still works without an assignee picker.
    void crmApi.assignableEmployees().then(setEmployees).catch(() => setEmployees([]));
  }, []);

  const patch = async (data: Record<string, unknown>, successText: string) => {
    setSaving(true);
    try {
      await crmApi.updateComplaint(complaintId, data);
      toast.success(successText);
      await load();
      onChanged();
    } catch (e) {
      toast.error("تعذّر حفظ التغيير", serverMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const addFollowup = async () => {
    const text = note.trim();
    if (text === "") return;
    setPosting(true);
    try {
      await crmApi.addComplaintFollowup(complaintId, text);
      setNote("");
      toast.success("تمت إضافة المتابعة");
      await load();
      onChanged();
    } catch (e) {
      toast.error("تعذّر إضافة المتابعة", serverMessage(e));
    } finally {
      setPosting(false);
    }
  };

  const status = complaint ? COMPLAINT_STATUS_TONE[complaint.status] : null;
  const priority = complaint ? COMPLAINT_PRIORITY_TONE[complaint.priority] : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="تفاصيل الشكوى">
      <button aria-label="إغلاق" className="absolute inset-0 bg-[#0B1220]/25 backdrop-blur-[2px]" onClick={onClose} />
      <div dir="rtl" className="crmx-drawer-panel crmx-root relative flex h-full w-full max-w-md flex-col bg-[var(--crmx-card)] shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-[var(--crmx-border)] px-5 py-4">
          <div className="min-w-0">
            <p className="mb-1 text-[11px] font-bold text-[var(--crmx-text-muted)]">
              شكوى #{String(complaintId)}
            </p>
            <h2 className="truncate text-[17px] font-bold text-[var(--crmx-text)]">
              {complaint?.title || "—"}
            </h2>
            {status && (
              <span className={`${COMPLAINT_PILL} mt-2 ${status.tone}`}>{status.label}</span>
            )}
            {complaint?.is_sensitive && (
              <span className={`${COMPLAINT_PILL} mr-1.5 mt-2 gap-1 bg-[var(--crmx-danger-soft)] text-[var(--crmx-danger-text)]`}>
                <ShieldAlert className="h-3 w-3" /> حساسة
              </span>
            )}
          </div>
          <button onClick={onClose} className="shrink-0 rounded-lg p-1.5 text-[var(--crmx-text-muted)] hover:bg-[var(--crmx-neutral-soft)]" aria-label="إغلاق">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="crmx-scrollbar flex-1 space-y-4 overflow-y-auto bg-[var(--crmx-bg)] px-5 py-4">
          {loading ? (
            <CrmState kind="loading" title="جارٍ تحميل الشكوى" />
          ) : error ? (
            <CrmState kind={error.status === 403 ? "forbidden" : "error"} title={error.message} retry={load} />
          ) : !complaint ? null : (
            <>
              {complaint.customer && (
                <Link
                  to={`/admin/crm/customers/${complaint.customer.id}/overview`}
                  className="flex items-center justify-between rounded-xl border border-[var(--crmx-border)] px-3 py-2.5 transition hover:bg-[var(--crmx-neutral-soft)]"
                >
                  <span className="flex items-center gap-2 text-[13px] font-bold text-[var(--crmx-text)]">
                    <User2 className="h-4 w-4 text-[var(--crmx-text-muted)]" />
                    {complaint.customer.name}
                  </span>
                  <span className="flex items-center gap-1 text-[12px] font-semibold text-[var(--crmx-primary)]">
                    ملف العميل <ChevronLeft className="h-3.5 w-3.5" />
                  </span>
                </Link>
              )}

              {complaint.description?.trim() ? (
                <div className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-4">
                  <h3 className="mb-2 text-[13px] font-bold text-[var(--crmx-text)]">تفاصيل الشكوى</h3>
                  <p className="whitespace-pre-wrap text-[13px] leading-6 text-[var(--crmx-text-secondary)]">
                    {complaint.description}
                  </p>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-2.5">
                <MetaCell label="القناة">
                  {complaint.channel ? COMPLAINT_CHANNEL_LABELS[complaint.channel] : "—"}
                </MetaCell>
                <MetaCell label="تاريخ التسجيل">{fmtDate(complaint.created_at ?? null)}</MetaCell>
                <MetaCell label="الأولوية">
                  {priority ? <span className={`${COMPLAINT_PILL} ${priority.tone}`}>{priority.label}</span> : "—"}
                </MetaCell>
                <MetaCell label="الخطورة">
                  {COMPLAINT_SEVERITY_LABELS[(complaint.severity ?? "info") as CrmComplaintSeverity] ?? "—"}
                </MetaCell>
              </div>

              {canUpdate && (
                <div className="space-y-4 rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-5">
                  <h3 className="text-[15px] font-bold text-[var(--crmx-text)]">إجراءات</h3>

                  <div>
                    <label className={sectionLabel}>القسم المسؤول</label>
                    <select
                      className={fieldCls}
                      disabled={saving}
                      value={complaint.department ?? ""}
                      onChange={(e) => void patch(
                        { department: e.target.value === "" ? null : (e.target.value as CrmComplaintDepartment) },
                        e.target.value === "" ? "تم إلغاء تصنيف القسم" : "تم تحديث القسم",
                      )}
                    >
                      <option value="">غير مصنَّف</option>
                      {(Object.keys(COMPLAINT_DEPARTMENT_LABELS) as CrmComplaintDepartment[]).map((d) => (
                        <option key={d} value={d}>{COMPLAINT_DEPARTMENT_LABELS[d]}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={sectionLabel}>الموظف المسؤول</label>
                    {canAssign ? (
                      <>
                        <select
                          className={fieldCls}
                          disabled={saving || employees.length === 0}
                          value={assignedId(complaint.assigned_to)}
                          onChange={(e) => void patch(
                            { assigned_to: e.target.value === "" ? null : Number(e.target.value) },
                            e.target.value === "" ? "تم إلغاء الإسناد" : "تم إسناد الشكوى",
                          )}
                        >
                          <option value="">بلا إسناد</option>
                          {employees.map((emp) => (
                            <option key={String(emp.id)} value={String(emp.id)}>{emp.name}</option>
                          ))}
                        </select>
                        {employees.length === 0 && (
                          <p className="mt-1.5 text-[11px] text-[var(--crmx-text-muted)]">
                            لا يوجد موظفون متاحون في فرعك للإسناد.
                          </p>
                        )}
                      </>
                    ) : (
                      <div className="flex h-11 items-center rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-neutral-soft)] px-3 text-[13px] font-semibold text-[var(--crmx-text-secondary)]">
                        {typeof complaint.assigned_to === "object" && complaint.assigned_to
                          ? complaint.assigned_to.name
                          : "بلا إسناد"}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className={sectionLabel}>نقل الحالة</label>
                    <ComplaintStatusControl
                      status={complaint.status}
                      disabled={saving}
                      onChange={(next, resolutionNotes) => void patch(
                        resolutionNotes ? { status: next, resolution_notes: resolutionNotes } : { status: next },
                        `تم نقل الشكوى إلى «${COMPLAINT_STATUS_TONE[next].label}»`,
                      )}
                    />
                  </div>

                  {canReclassify && (
                    <button
                      disabled={saving}
                      onClick={() => void patch(
                        { is_sensitive: !complaint.is_sensitive },
                        complaint.is_sensitive ? "تم إلغاء تصنيف الشكوى" : "تم تصنيف الشكوى كحساسة",
                      )}
                      className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl border text-[14px] font-bold transition disabled:opacity-50 ${
                        complaint.is_sensitive
                          ? "border-[var(--crmx-border)] text-[var(--crmx-text-secondary)] hover:bg-[var(--crmx-neutral-soft)]"
                          : "border-[var(--crmx-danger-soft)] text-[var(--crmx-danger-text)] hover:bg-[var(--crmx-danger-soft)]"
                      }`}
                    >
                      {complaint.is_sensitive ? <ShieldOff className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                      {complaint.is_sensitive ? "إلغاء تصنيف الحساسية" : "تصنيف كحساسة"}
                    </button>
                  )}

                  {saving && (
                    <p className="flex items-center gap-1.5 text-[12px] text-[var(--crmx-text-muted)]">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> جارٍ الحفظ…
                    </p>
                  )}
                </div>
              )}

              {complaint.resolution_notes?.trim() ? (
                <div className="rounded-2xl border border-[var(--crmx-success-soft)] bg-[var(--crmx-card)] p-5">
                  <h3 className="mb-2 flex items-center gap-1.5 text-[15px] font-bold text-[var(--crmx-success-text)]">
                    <CheckCircle2 className="h-4 w-4" /> الحل
                  </h3>
                  <p className="whitespace-pre-wrap text-[13px] leading-6 text-[var(--crmx-text-secondary)]">
                    {complaint.resolution_notes}
                  </p>
                </div>
              ) : null}

              <div className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-5">
                <h3 className="mb-3 flex items-center gap-1.5 text-[15px] font-bold text-[var(--crmx-text)]">
                  <History className="h-4 w-4 text-[var(--crmx-text-muted)]" /> السجل الزمني
                </h3>
                {followups.length === 0 ? (
                  <p className="text-[12px] text-[var(--crmx-text-muted)]">لا توجد متابعات.</p>
                ) : (
                  <ol className="space-y-2.5 border-s-2 border-[var(--crmx-border)] ps-3.5">
                    {followups.map((f) => (
                      <li key={String(f.id)}>
                        <p className="text-[13px] font-semibold text-[var(--crmx-text)]">
                          {f.notes || f.action || "—"}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[var(--crmx-text-muted)]">
                          {/* Null when the author sits outside the reader's
                              branch — the User model is branch-scoped. */}
                          {f.user?.name ? `${f.user.name} · ` : ""}{fmtDate(f.created_at ?? null)}
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
                    <label className="mb-1 block text-[13px] font-semibold text-[var(--crmx-text-secondary)]">
                      إضافة متابعة
                    </label>
                    <textarea
                      className="h-20 w-full resize-none rounded-xl border border-[var(--crmx-border)] bg-white px-3 py-2.5 text-[14px] text-[var(--crmx-text)] outline-none focus:border-[var(--crmx-primary)] focus:ring-2 focus:ring-[var(--crmx-primary)]/10"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="اكتب ما جرى في هذه المتابعة..."
                      maxLength={2000}
                    />
                    <button
                      onClick={() => void addFollowup()}
                      disabled={posting || note.trim() === ""}
                      className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--crmx-primary)] text-[14px] font-bold text-white transition hover:bg-[var(--crmx-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" /> {posting ? "جارٍ الإضافة..." : "إضافة"}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
