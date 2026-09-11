import { ChevronLeft, MessageSquarePlus, Megaphone, User2, X } from "lucide-react";
import { useState } from "react";
import { CustomerPicker } from "./CustomerPicker";
import {
  COMPLAINT_DEPARTMENT_LABELS, COMPLAINT_PRIORITY_TONE, COMPLAINT_SEVERITY_LABELS,
} from "./customers-ui";
import type {
  CrmComplaintCreateInput, CrmComplaintDepartment, CrmComplaintPriority,
  CrmComplaintSeverity, CrmGeneralComplaintCreateInput, CrmId,
} from "./types";

// Same field language the rest of CRM's forms use.
const inputCls =
  "h-11 w-full rounded-xl border border-[var(--crmx-border)] bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none focus:border-[var(--crmx-primary)] focus:ring-2 focus:ring-[var(--crmx-primary)]/10";
const labelCls = "mb-1 block text-[13px] font-semibold text-[var(--crmx-text-secondary)]";

const EMPTY_FORM: CrmComplaintCreateInput = {
  title: "", description: "", priority: "normal", severity: "info", department: null,
};

function SecHead({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2.5 flex items-center gap-2 text-[13px] font-extrabold text-[var(--crmx-text)]">
      <span className="h-3.5 w-1 rounded-full bg-[var(--crmx-primary)]" />
      {children}
    </h3>
  );
}

/**
 * The one complaint-creation form — a centered dialog, matching the rest of
 * the CRM's action dialogs (resolve-a-complaint, etc.) rather than a side
 * drawer, so a form this short does not stretch across a whole viewport
 * edge.
 *
 * The customer-profile tab already knows whose complaint this is and passes
 * `customer`, so it skips straight to the form; the CRM-wide screen does
 * not, so it opens on a subject step — two cards, "عميل محدد" or "شكوى
 * عامة" — before the form itself, rather than always assuming a customer
 * search is the only way in. A general complaint additionally requires a
 * department, since with no customer to imply who should see it, that is
 * the only routing signal it carries.
 *
 * There is no channel field in any case: the server stamps it from the
 * route the request arrives on.
 */
export function ComplaintFormDrawer({
  customer, saving, onClose, onSubmit,
}: {
  customer?: { id: CrmId; name: string } | null;
  saving: boolean;
  onClose: () => void;
  /** customerId is null for a "شكوى عامة" — onSubmit routes to
   *  crmApi.createGeneralComplaint() instead of the per-customer endpoint. */
  onSubmit: (customerId: CrmId | null, data: CrmComplaintCreateInput) => void;
}) {
  // "subject" is the three-state choice this dialog opens on when no
  // customer is already known: undecided, searching for one, or general.
  const [subject, setSubject] = useState<"customer" | "general" | null>(customer ? "customer" : null);
  const [picked, setPicked] = useState<{ id: CrmId; name: string } | null>(customer ?? null);
  const [form, setForm] = useState(EMPTY_FORM);

  const inForm = subject === "general" || (subject === "customer" && picked !== null);
  const general = subject === "general";
  const canSubmit = form.title.trim() !== "" && (!general || !!form.department);

  return (
    <div className="crmx-root fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="شكوى العميل">
      <button aria-label="إغلاق" className="absolute inset-0 bg-[#0B1220]/25 backdrop-blur-[2px]" onClick={onClose} />
      <div dir="rtl" className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-[var(--crmx-border)] px-5 py-4">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--crmx-primary-soft)] text-[var(--crmx-primary-text)]">
              <MessageSquarePlus className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-[16px] font-bold text-[var(--crmx-text)]">
                {inForm ? "تفاصيل الشكوى" : "شكوى عن ماذا؟"}
              </h2>
              <p className="mt-0.5 text-[12.5px] text-[var(--crmx-text-secondary)]">
                {inForm
                  ? "تُسجَّل تلقائياً على قناة CRM، وتبدأ بحالة «جديدة»."
                  : "اختر عميلاً محدداً، أو سجّلها كملاحظة عامة."}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="shrink-0 rounded-lg p-1.5 text-[var(--crmx-text-muted)] transition hover:bg-[var(--crmx-neutral-soft)]" aria-label="إغلاق">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="crmx-scrollbar flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {!inForm && subject !== "customer" && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSubject("customer")}
                className="flex flex-col items-center gap-2 rounded-2xl border border-[var(--crmx-border)] px-4 py-5 text-center transition hover:border-[var(--crmx-primary)] hover:bg-[var(--crmx-primary-soft)]/30"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--crmx-primary-soft)] text-[var(--crmx-primary-text)]">
                  <User2 className="h-5 w-5" />
                </span>
                <span className="text-[13.5px] font-bold text-[var(--crmx-text)]">عميل محدد</span>
                <span className="text-[11px] leading-4 text-[var(--crmx-text-muted)]">شكوى تخص عميلاً بعينه</span>
              </button>
              <button
                onClick={() => setSubject("general")}
                className="flex flex-col items-center gap-2 rounded-2xl border border-[var(--crmx-border)] px-4 py-5 text-center transition hover:border-[var(--crmx-navy)] hover:bg-[var(--crmx-navy-soft)]/60"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--crmx-navy-soft)] text-[var(--crmx-navy)]">
                  <Megaphone className="h-5 w-5" />
                </span>
                <span className="text-[13.5px] font-bold text-[var(--crmx-text)]">شكوى عامة</span>
                <span className="text-[11px] leading-4 text-[var(--crmx-text-muted)]">ملاحظة تشغيلية، بلا عميل محدد</span>
              </button>
            </div>
          )}

          {subject === "customer" && picked === null && (
            <>
              <button
                onClick={() => setSubject(null)}
                className="flex items-center gap-1 text-[12px] font-bold text-[var(--crmx-text-muted)] transition hover:text-[var(--crmx-primary)]"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> رجوع
              </button>
              <CustomerPicker onPick={(c) => setPicked({ id: c.id, name: c.name })} />
            </>
          )}

          {inForm && (
            <>
              <div>
                <SecHead>الجهة</SecHead>
                {general ? (
                  <div className="flex items-center justify-between rounded-xl border border-[var(--crmx-navy)]/20 bg-[var(--crmx-navy-soft)] px-3 py-2.5">
                    <span className="flex items-center gap-2 text-[14px] font-bold text-[var(--crmx-navy)]">
                      <Megaphone className="h-4 w-4" /> شكوى عامة (بدون عميل)
                    </span>
                    <button onClick={() => setSubject(null)} className="text-[12px] font-semibold text-[var(--crmx-primary)] hover:underline">
                      تغيير
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-xl border border-[var(--crmx-border)] px-3 py-2.5">
                    <span className="flex items-center gap-2 text-[14px] font-bold text-[var(--crmx-text)]">
                      <User2 className="h-4 w-4 text-[var(--crmx-text-muted)]" />
                      {picked!.name}
                    </span>
                    {/* Only offered when the drawer opened without a customer —
                        inside a customer's profile the subject is not a choice. */}
                    {!customer && (
                      <button
                        onClick={() => { setPicked(null); setSubject(null); }}
                        className="text-[12px] font-semibold text-[var(--crmx-primary)] hover:underline"
                      >
                        تغيير
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <SecHead>تفاصيل الشكوى</SecHead>
                <div className="space-y-3">
                  <div>
                    <label className={labelCls}>عنوان الشكوى</label>
                    <input
                      className={inputCls}
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="مثال: تأخر التوصيل"
                      maxLength={255}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className={labelCls}>الوصف</label>
                    <textarea
                      className={`${inputCls} h-24 resize-none py-2.5`}
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="تفاصيل ما حدث..."
                    />
                  </div>
                </div>
              </div>

              <div>
                <SecHead>التصنيف</SecHead>
                <div className="space-y-3">
                  <div>
                    <label className={labelCls}>
                      القسم المعني{general && <span className="text-[var(--crmx-danger-text)]"> *</span>}
                    </label>
                    <select
                      className={inputCls}
                      value={form.department ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, department: (e.target.value || null) as CrmComplaintDepartment | null }))}
                    >
                      <option value="">{general ? "اختر القسم…" : "غير مصنَّف"}</option>
                      {(Object.keys(COMPLAINT_DEPARTMENT_LABELS) as CrmComplaintDepartment[]).map((d) => (
                        <option key={d} value={d}>{COMPLAINT_DEPARTMENT_LABELS[d]}</option>
                      ))}
                    </select>
                    {general && (
                      <p className="mt-1 text-[11px] text-[var(--crmx-text-muted)]">
                        بلا عميل يحدّد الوجهة، القسم هو ما يوجّه الشكوى لمن يعنيه الأمر.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>الأولوية</label>
                      <select
                        className={inputCls}
                        value={form.priority}
                        onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as CrmComplaintPriority }))}
                      >
                        {(Object.keys(COMPLAINT_PRIORITY_TONE) as CrmComplaintPriority[]).map((v) => (
                          <option key={v} value={v}>{COMPLAINT_PRIORITY_TONE[v].label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>الخطورة</label>
                      <select
                        className={inputCls}
                        value={form.severity}
                        onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value as CrmComplaintSeverity }))}
                      >
                        {(Object.keys(COMPLAINT_SEVERITY_LABELS) as CrmComplaintSeverity[]).map((v) => (
                          <option key={v} value={v}>{COMPLAINT_SEVERITY_LABELS[v]}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {(form.priority === "high" || form.priority === "critical" || form.severity === "critical") && (
                    <p className="rounded-lg bg-[var(--crmx-danger-soft)] px-3 py-2 text-[11.5px] font-semibold text-[var(--crmx-danger-text)]">
                      سيصل إشعار فوري لكل موظفي الشكاوى عند الحفظ — هذا التصنيف يُعامَل كعاجل.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {inForm && (
          <footer className="flex items-center justify-end gap-2.5 border-t border-[var(--crmx-border)] bg-[var(--crmx-bg)] px-5 py-4">
            <button
              onClick={onClose}
              disabled={saving}
              className="h-11 rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] px-4 text-[14px] font-semibold text-[var(--crmx-text-secondary)] transition hover:bg-[var(--crmx-neutral-soft)]"
            >
              إلغاء
            </button>
            <button
              disabled={saving || !canSubmit}
              onClick={() => onSubmit(
                general ? null : picked!.id,
                general ? (form as CrmGeneralComplaintCreateInput) : form,
              )}
              className="h-11 rounded-xl bg-[var(--crmx-primary)] px-5 text-[14px] font-bold text-white transition hover:bg-[var(--crmx-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "جارٍ الحفظ..." : "حفظ الشكوى"}
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
