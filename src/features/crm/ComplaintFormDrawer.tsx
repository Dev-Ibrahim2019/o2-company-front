import { User2, X } from "lucide-react";
import { useState } from "react";
import { CustomerPicker } from "./CustomerPicker";
import {
  COMPLAINT_PRIORITY_TONE, COMPLAINT_SEVERITY_LABELS,
} from "./customers-ui";
import type {
  CrmComplaintCreateInput, CrmComplaintPriority, CrmComplaintSeverity, CrmId,
} from "./types";

// Same control language as the dashboard filter bar, so a CRM input is the
// same object wherever it appears.
const inputCls =
  "h-11 w-full rounded-xl border border-[var(--crmx-border)] bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none focus:border-[var(--crmx-primary)] focus:ring-2 focus:ring-[var(--crmx-primary)]/10";
const labelCls = "mb-1 block text-[13px] font-semibold text-[var(--crmx-text-secondary)]";

const EMPTY_FORM: CrmComplaintCreateInput = {
  title: "", description: "", priority: "normal", severity: "info",
};

/**
 * The one complaint-creation form.
 *
 * The customer-profile tab already knows whose complaint this is and passes
 * `customer`; the CRM-wide screen does not, so it omits it and the drawer
 * opens on a search step first. Everything after that step is identical —
 * one form, one set of defaults, one place to change them.
 *
 * There is no channel field in either case: the server stamps it from the
 * route the request arrives on.
 */
export function ComplaintFormDrawer({
  customer, saving, onClose, onSubmit,
}: {
  customer?: { id: CrmId; name: string } | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (customerId: CrmId, data: CrmComplaintCreateInput) => void;
}) {
  const [picked, setPicked] = useState<{ id: CrmId; name: string } | null>(customer ?? null);
  const [form, setForm] = useState(EMPTY_FORM);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="شكوى العميل">
      <button aria-label="إغلاق" className="absolute inset-0 bg-[#0B1220]/25 backdrop-blur-[2px]" onClick={onClose} />
      <div dir="rtl" className="crmx-drawer-panel crmx-root relative flex h-full w-full max-w-sm flex-col bg-[var(--crmx-card)] shadow-2xl">
        <header className="flex items-center justify-between border-b border-[var(--crmx-border)] px-5 py-4">
          <h2 className="text-[17px] font-bold text-[var(--crmx-text)]">
            {picked ? "إضافة شكوى" : "اختيار العميل"}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--crmx-text-muted)] hover:bg-[var(--crmx-neutral-soft)]" aria-label="إغلاق">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="crmx-scrollbar flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {!picked ? (
            <CustomerPicker onPick={(c) => setPicked({ id: c.id, name: c.name })} />
          ) : (
            <>
              <div className="flex items-center justify-between rounded-xl border border-[var(--crmx-border)] px-3 py-2.5">
                <span className="flex items-center gap-2 text-[14px] font-bold text-[var(--crmx-text)]">
                  <User2 className="h-4 w-4 text-[var(--crmx-text-muted)]" />
                  {picked.name}
                </span>
                {/* Only offered when the drawer opened without a customer —
                    inside a customer's profile the subject is not a choice. */}
                {!customer && (
                  <button
                    onClick={() => setPicked(null)}
                    className="text-[12px] font-semibold text-[var(--crmx-primary)] hover:underline"
                  >
                    تغيير
                  </button>
                )}
              </div>

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
                  className={`${inputCls} h-28 resize-none py-2.5`}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="تفاصيل ما حدث..."
                />
              </div>

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

              <p className="rounded-xl bg-[var(--crmx-neutral-soft)] px-3 py-2.5 text-[12px] text-[var(--crmx-text-secondary)]">
                تُسجَّل الشكوى تلقائياً على قناة CRM، وتبدأ بحالة «جديدة».
              </p>
            </>
          )}
        </div>

        {picked && (
          <footer className="flex items-center gap-2.5 border-t border-[var(--crmx-border)] px-5 py-4">
            <button
              disabled={saving || !form.title.trim()}
              onClick={() => onSubmit(picked.id, form)}
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
        )}
      </div>
    </div>
  );
}
