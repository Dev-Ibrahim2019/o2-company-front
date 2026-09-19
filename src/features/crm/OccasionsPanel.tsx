import { CalendarHeart, Pencil, Plus, Repeat, Trash2, User, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../auth";
import { CRM_PERMISSIONS } from "../../auth/permissions";
import { toast } from "../../components/shared/Toast";
import { crmApi } from "./api";
import { CrmState, getCrmError } from "./components";
import { CrmConfirmDialog } from "./customers-ui/CrmConfirmDialog";
import { date as fmtDate } from "./format";
import { CONTACT_METHOD_LABELS, OCCASION_TYPE_LABELS } from "./occasionLabels";
import { OccasionContactActions, type OccasionContact } from "./OccasionContactActions";
import { OccasionDetailDrawer } from "./OccasionDetailDrawer";
import type { CrmContactMethod, CrmId, CrmOccasion, CrmOccasionInput, CrmOccasionType } from "./types";

// Re-exported, not redefined: the maps live in occasionLabels.ts so the
// detail drawer can read them without importing this panel back.
export { CONTACT_METHOD_LABELS, OCCASION_TYPE_LABELS };

const pill = "inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-bold whitespace-nowrap";
const inputCls =
  "h-11 w-full rounded-xl border border-[var(--crmx-border)] bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none focus:border-[var(--crmx-primary)] focus:ring-2 focus:ring-[var(--crmx-primary)]/10";
const labelCls = "mb-1 block text-[13px] font-semibold text-[var(--crmx-text-secondary)]";

const EMPTY: CrmOccasionInput = {
  occasion_type: "anniversary", title: "", date: "", repeats_annually: true,
  notes: "", preferred_contact_method: null, is_active: true, assigned_user_id: null,
};

/** GET /crm/occasions/assignable-users — real login accounts holding crm.occasions.update. */
function useAssignableUsers() {
  const [users, setUsers] = useState<Array<{ id: CrmId; name: string; branch?: { name: string } | null }>>([]);
  useEffect(() => {
    let alive = true;
    void crmApi.occasionAssignableUsers()
      .then((rows) => { if (alive) setUsers(rows); })
      .catch(() => { if (alive) setUsers([]); });
    return () => { alive = false; };
  }, []);
  return users;
}

/**
 * Mounted only while open, so the form reads `initial` fresh each time —
 * the lesson the notes drawer had to learn after a closed-but-mounted form
 * carried the previous record's values into the next one.
 *
 * A centered popup, not a side drawer — a real visual review rejected the
 * drawer here: it read as "a form hiding at the edge of the screen" rather
 * than the focused, deliberate action this is. Fields are grouped into two
 * short rows (type+date, contact method+assignee) instead of stacked one
 * per line, so the eye scans two rows, not six.
 */
function OccasionFormModal({
  initial, saving, onClose, onSubmit,
}: {
  initial: CrmOccasionInput;
  saving: boolean;
  onClose: () => void;
  onSubmit: (data: CrmOccasionInput) => void;
}) {
  const [form, setForm] = useState(initial);
  const assignableUsers = useAssignableUsers();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="crmx-root fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="مناسبة">
      <button aria-label="إغلاق" className="absolute inset-0 bg-[#0B1220]/40" onClick={onClose} />
      <div dir="rtl" className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] shadow-[var(--crmx-shadow-md)]">
        <header className="flex items-center justify-between border-b border-[var(--crmx-border)] px-5 py-4">
          <span className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--crmx-primary-soft)] text-[var(--crmx-primary-text)]">
              <CalendarHeart className="h-4.5 w-4.5" />
            </span>
            <h2 className="text-[16px] font-bold text-[var(--crmx-text)]">
              {initial.title ? "تعديل مناسبة" : "إضافة مناسبة"}
            </h2>
          </span>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--crmx-text-muted)] hover:bg-[var(--crmx-neutral-soft)]" aria-label="إغلاق">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="crmx-scrollbar flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                <label className={labelCls}>التاريخ</label>
                <input
                  type="date"
                  className={inputCls}
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
            </div>

            <div className="mt-4">
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

            <label className="mt-4 flex items-center gap-2.5 text-[14px] font-semibold text-[var(--crmx-text)]">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-[var(--crmx-border)]"
                checked={!!form.repeats_annually}
                onChange={(e) => setForm((f) => ({ ...f, repeats_annually: e.target.checked }))}
              />
              تتكرر سنوياً
            </label>
          </div>

          <div className="border-t border-[var(--crmx-border)] pt-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                <label className={labelCls}>
                  <span className="inline-flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> الموظف المسؤول</span>
                </label>
                <select
                  className={inputCls}
                  value={form.assigned_user_id != null ? String(form.assigned_user_id) : ""}
                  onChange={(e) => setForm((f) => ({ ...f, assigned_user_id: e.target.value === "" ? null : Number(e.target.value) }))}
                >
                  <option value="">— بلا إسناد —</option>
                  {assignableUsers.map((u) => (
                    <option key={String(u.id)} value={String(u.id)}>
                      {u.name}{u.branch?.name ? ` — ${u.branch.name}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className={labelCls}>ملاحظات</label>
              <textarea
                className={`${inputCls} h-20 resize-none py-2.5`}
                value={form.notes ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
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
export function OccasionsPanel({
  owner,
  ownerId,
  contact,
}: {
  owner: "customers" | "groups";
  ownerId: CrmId;
  /**
   * The owner's phone, for the quick call/WhatsApp actions. Supplied by the
   * customer profile only — a group has no single number, so a group profile
   * passes nothing and no contact button is rendered anywhere in this panel.
   */
  contact?: OccasionContact;
}) {
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
  const [openId, setOpenId] = useState<CrmId | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CrmOccasion | null>(null);

  // Contact actions belong to a person, never to a group. Guarded on `owner`
  // as well as on `contact` being present, so a caller that passed one by
  // mistake still cannot put a phone button on a group's occasion.
  const contactActions = owner === "customers" && contact ? contact : null;

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
    setPendingId(occasion.id);
    try {
      await crmApi.deleteOccasion(owner, ownerId, occasion.id);
      toast.success("تم حذف المناسبة");
      setConfirmDelete(null);
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
            <div
              key={String(o.id)}
              role="button"
              tabIndex={0}
              onClick={() => setOpenId(o.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setOpenId(o.id);
                }
              }}
              className="cursor-pointer rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-4 transition hover:border-[var(--crmx-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crmx-primary)]/20"
            >
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
                        onClick={(e) => { e.stopPropagation(); setDrawer({ mode: "edit", occasion: o }); }}
                        title="تعديل"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--crmx-text-muted)] hover:bg-[var(--crmx-neutral-soft)] hover:text-[var(--crmx-navy)]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(o); }}
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

              {contactActions && (
                <div className="mt-3 border-t border-[var(--crmx-border)] pt-3">
                  <OccasionContactActions contact={contactActions} occasionType={o.occasion_type} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {openId !== null && (
        <OccasionDetailDrawer
          occasionId={openId}
          contact={contactActions ?? undefined}
          onClose={() => setOpenId(null)}
          // A followup does not change the row, but reloading keeps this list
          // and the drawer reading from the same server response.
          onChanged={() => void load()}
        />
      )}

      {drawer && (
        <OccasionFormModal
          initial={drawer.mode === "edit"
            ? {
                occasion_type: drawer.occasion.occasion_type,
                title: drawer.occasion.title,
                date: (drawer.occasion.date ?? "").slice(0, 10),
                repeats_annually: drawer.occasion.repeats_annually,
                notes: drawer.occasion.notes ?? "",
                preferred_contact_method: drawer.occasion.preferred_contact_method ?? null,
                is_active: drawer.occasion.is_active,
                assigned_user_id: drawer.occasion.assigned_user_id ?? null,
              }
            : EMPTY}
          saving={saving}
          onClose={() => setDrawer(null)}
          onSubmit={submit}
        />
      )}

      <CrmConfirmDialog
        open={confirmDelete !== null}
        title="حذف المناسبة؟"
        description={confirmDelete ? `سيتم حذف "${confirmDelete.title}" نهائياً. لا يمكن التراجع عن هذا الإجراء.` : undefined}
        confirmLabel="حذف نهائياً"
        busy={confirmDelete != null && pendingId === confirmDelete.id}
        onConfirm={() => { if (confirmDelete) void remove(confirmDelete); }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
