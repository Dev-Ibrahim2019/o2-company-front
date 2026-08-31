import { CalendarHeart, Pencil, Plus, Repeat, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../auth";
import { CRM_PERMISSIONS } from "../../auth/permissions";
import { toast } from "../../components/shared/Toast";
import { crmApi } from "./api";
import { CrmState, getCrmError } from "./components";
import { date as fmtDate } from "./format";
import type { CrmContactMethod, CrmId, CrmOccasion, CrmOccasionInput, CrmOccasionType } from "./types";

/** Mirrors the customer_occasions enum constrained in 2027_01_18_000001. */
export const OCCASION_TYPE_LABELS: Record<CrmOccasionType, string> = {
  birthday: "عيد ميلاد",
  anniversary: "ذكرى سنوية",
  graduation: "تخرّج",
  company_founding: "تأسيس",
  contract_renewal: "تجديد عقد",
  other: "أخرى",
};

export const CONTACT_METHOD_LABELS: Record<CrmContactMethod, string> = {
  call: "اتصال",
  sms: "رسالة نصية",
  email: "بريد إلكتروني",
  whatsapp: "واتساب",
};

const pill = "inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-bold whitespace-nowrap";
const inputCls =
  "h-11 w-full rounded-xl border border-[var(--crmx-border)] bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none focus:border-[var(--crmx-primary)] focus:ring-2 focus:ring-[var(--crmx-primary)]/10";
const labelCls = "mb-1 block text-[13px] font-semibold text-[var(--crmx-text-secondary)]";

const EMPTY: CrmOccasionInput = {
  occasion_type: "anniversary", title: "", date: "", repeats_annually: true,
  notes: "", preferred_contact_method: null, is_active: true,
};

/**
 * Mounted only while open, so the form reads `initial` fresh each time —
 * the lesson the notes drawer had to learn after a closed-but-mounted form
 * carried the previous record's values into the next one.
 */
function OccasionFormDrawer({
  initial, saving, onClose, onSubmit,
}: {
  initial: CrmOccasionInput;
  saving: boolean;
  onClose: () => void;
  onSubmit: (data: CrmOccasionInput) => void;
}) {
  const [form, setForm] = useState(initial);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="مناسبة">
      <button aria-label="إغلاق" className="absolute inset-0 bg-[#0B1220]/25 backdrop-blur-[2px]" onClick={onClose} />
      <div dir="rtl" className="crmx-drawer-panel crmx-root relative flex h-full w-full max-w-sm flex-col bg-[var(--crmx-card)] shadow-2xl">
        <header className="flex items-center justify-between border-b border-[var(--crmx-border)] px-5 py-4">
          <h2 className="text-[17px] font-bold text-[var(--crmx-text)]">
            {initial.title ? "تعديل مناسبة" : "إضافة مناسبة"}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--crmx-text-muted)] hover:bg-[var(--crmx-neutral-soft)]" aria-label="إغلاق">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="crmx-scrollbar flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div>
            <label className={labelCls}>النوع</label>
            <select
              className={inputCls}
              value={form.occasion_type}
              onChange={(e) => setForm((f) => ({ ...f, occasion_type: e.target.value as CrmOccasionType }))}
            >
              {(Object.keys(OCCASION_TYPE_LABELS) as CrmOccasionType[]).map((v) => (
                <option key={v} value={v}>{OCCASION_TYPE_LABELS[v]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>العنوان</label>
            <input
              className={inputCls}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="مثال: ذكرى تأسيس الشركة"
              maxLength={255}
              autoFocus
            />
          </div>

          <div>
            <label className={labelCls}>التاريخ</label>
            <input
              type="date"
              className={inputCls}
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>

          <label className="flex items-center gap-2.5 text-[14px] font-semibold text-[var(--crmx-text)]">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-[var(--crmx-border)]"
              checked={!!form.repeats_annually}
              onChange={(e) => setForm((f) => ({ ...f, repeats_annually: e.target.checked }))}
            />
            تتكرر سنوياً
          </label>

          <div>
            <label className={labelCls}>وسيلة التواصل المفضّلة</label>
            <select
              className={inputCls}
              value={form.preferred_contact_method ?? ""}
              onChange={(e) => setForm((f) => ({
                ...f,
                preferred_contact_method: e.target.value === "" ? null : (e.target.value as CrmContactMethod),
              }))}
            >
              <option value="">غير محددة</option>
              {(Object.keys(CONTACT_METHOD_LABELS) as CrmContactMethod[]).map((v) => (
                <option key={v} value={v}>{CONTACT_METHOD_LABELS[v]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>ملاحظات</label>
            <textarea
              className={`${inputCls} h-24 resize-none py-2.5`}
              value={form.notes ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>

        <footer className="flex items-center gap-2.5 border-t border-[var(--crmx-border)] px-5 py-4">
          <button
            disabled={saving || !form.title.trim() || !form.date}
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
 * Occasions for any owner.
 *
 * customer_occasions became polymorphic, so one panel serves both a customer
 * profile and a group profile — `owner` only decides which URL segment the
 * requests use. Building a second, group-shaped copy is exactly what the
 * polymorphic migration existed to avoid.
 */
export function OccasionsPanel({ owner, ownerId }: { owner: "customers" | "groups"; ownerId: CrmId }) {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission(CRM_PERMISSIONS.OCCASIONS_CREATE);
  const canUpdate = hasPermission(CRM_PERMISSIONS.OCCASIONS_UPDATE);
  const canDelete = hasPermission(CRM_PERMISSIONS.OCCASIONS_DELETE);

  const [rows, setRows] = useState<CrmOccasion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status?: number; message: string } | null>(null);
  const [drawer, setDrawer] = useState<{ mode: "add" } | { mode: "edit"; occasion: CrmOccasion } | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingId, setPendingId] = useState<CrmId | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await crmApi.occasions(owner, ownerId));
    } catch (e) {
      setError(getCrmError(e));
    } finally {
      setLoading(false);
    }
  }, [owner, ownerId]);

  useEffect(() => { void load(); }, [load]);

  const submit = async (data: CrmOccasionInput) => {
    setSaving(true);
    try {
      if (drawer?.mode === "edit") {
        await crmApi.updateOccasion(owner, ownerId, drawer.occasion.id, data);
        toast.success("تم تحديث المناسبة");
      } else {
        await crmApi.createOccasion(owner, ownerId, data);
        toast.success("تمت إضافة المناسبة");
      }
      setDrawer(null);
      await load();
    } catch (e) {
      toast.error("تعذّر حفظ المناسبة", getCrmError(e).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (occasion: CrmOccasion) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه المناسبة؟")) return;
    setPendingId(occasion.id);
    try {
      await crmApi.deleteOccasion(owner, ownerId, occasion.id);
      toast.success("تم حذف المناسبة");
      await load();
    } catch (e) {
      toast.error("تعذّر حذف المناسبة", getCrmError(e).message);
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="space-y-3">
      {canCreate && (
        <button
          onClick={() => setDrawer({ mode: "add" })}
          className="flex h-11 items-center gap-2 rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] px-4 text-[14px] font-bold text-[var(--crmx-navy)] transition hover:bg-[var(--crmx-neutral-soft)]"
        >
          <Plus className="h-4 w-4" /> إضافة مناسبة
        </button>
      )}

      {loading ? (
        <CrmState kind="loading" title="جارٍ تحميل المناسبات" />
      ) : error ? (
        <CrmState kind={error.status === 403 ? "forbidden" : "error"} title={error.message} retry={load} />
      ) : rows.length === 0 ? (
        <CrmState kind="empty" title="لا توجد مناسبات" />
      ) : (
        <div className="crmx-root space-y-2.5">
          {rows.map((o) => (
            <div key={String(o.id)} className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-[14px] font-bold text-[var(--crmx-text)]">
                    <CalendarHeart className="h-4 w-4 shrink-0 text-[var(--crmx-text-muted)]" />
                    {o.title}
                  </p>
                  {o.notes ? (
                    <p className="mt-1 text-[13px] text-[var(--crmx-text-secondary)]">{o.notes}</p>
                  ) : null}
                </div>
                {(canUpdate || canDelete) && (
                  <div className="flex shrink-0 items-center gap-1">
                    {canUpdate && (
                      <button
                        onClick={() => setDrawer({ mode: "edit", occasion: o })}
                        title="تعديل"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--crmx-text-muted)] hover:bg-[var(--crmx-neutral-soft)] hover:text-[var(--crmx-navy)]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => void remove(o)}
                        disabled={pendingId === o.id}
                        title="حذف"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--crmx-text-muted)] hover:bg-[var(--crmx-danger-soft)] hover:text-[var(--crmx-danger-text)] disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[12px]">
                <span className={`${pill} bg-[var(--crmx-info-soft)] text-[var(--crmx-info-text)]`}>
                  {OCCASION_TYPE_LABELS[o.occasion_type] ?? o.occasion_type}
                </span>
                <span className={`${pill} bg-[var(--crmx-neutral-soft)] text-[var(--crmx-text-secondary)]`}>
                  {fmtDate(o.date)}
                </span>
                {o.repeats_annually && (
                  <span className={`${pill} gap-1 bg-[var(--crmx-success-soft)] text-[var(--crmx-success-text)]`}>
                    <Repeat className="h-3 w-3" /> سنوياً
                  </span>
                )}
                {o.preferred_contact_method && (
                  <span className="text-[var(--crmx-text-muted)]">
                    {CONTACT_METHOD_LABELS[o.preferred_contact_method]}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {drawer && (
        <OccasionFormDrawer
          initial={drawer.mode === "edit"
            ? {
                occasion_type: drawer.occasion.occasion_type,
                title: drawer.occasion.title,
                date: (drawer.occasion.date ?? "").slice(0, 10),
                repeats_annually: drawer.occasion.repeats_annually,
                notes: drawer.occasion.notes ?? "",
                preferred_contact_method: drawer.occasion.preferred_contact_method ?? null,
                is_active: drawer.occasion.is_active,
              }
            : EMPTY}
          saving={saving}
          onClose={() => setDrawer(null)}
          onSubmit={submit}
        />
      )}
    </div>
  );
}
