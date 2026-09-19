import { Building2, CalendarHeart, User as UserIcon, X } from "lucide-react";
import { useEffect, useState } from "react";
import { crmApi } from "./api";
import { CustomerPicker } from "./CustomerPicker";
import { CONTACT_METHOD_LABELS, OCCASION_TYPE_LABELS } from "./occasionLabels";
import type { CrmContactMethod, CrmCustomerGroup, CrmId, CrmOccasionInput, CrmOccasionType } from "./types";

const inputCls =
  "h-11 w-full rounded-xl border border-[var(--crmx-border)] bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none focus:border-[var(--crmx-primary)] focus:ring-2 focus:ring-[var(--crmx-primary)]/10";
const labelCls = "mb-1.5 block text-[13px] font-semibold text-[var(--crmx-text-secondary)]";

export type OccasionOwnerChoice = { type: "customer" | "group"; id: CrmId; name: string };

/**
 * The CRM-wide "إضافة/تعديل مناسبة" form — a centered popup, not a side
 * drawer (a real visual review rejected the drawer here: it read as "a form
 * hiding at the edge of the screen" rather than the focused, deliberate
 * action this is — creating or changing a real reminder). Grouped into three
 * visual sections — from whom, what/when, follow-up — with a two-column
 * grid for related short fields (type+date, contact method+assignee) so
 * the eye scans two clear rows instead of eight stacked single fields.
 *
 * A superset of OccasionsPanel's own form (which lives inside one
 * already-known customer or group's profile and never needs to ask "for
 * whom?"): this one asks that first, then the rest of the field set is
 * identical (occasion type, date, repeat, contact method, notes,
 * responsible employee).
 */
export function OccasionCrmFormModal({
  title,
  initial,
  initialOwner,
  saving,
  onClose,
  onSubmit,
}: {
  title: string;
  initial: CrmOccasionInput;
  /** Present (and fixed) in edit mode — the owner of an existing occasion never changes here. */
  initialOwner?: OccasionOwnerChoice;
  saving: boolean;
  onClose: () => void;
  onSubmit: (owner: OccasionOwnerChoice, data: CrmOccasionInput) => void;
}) {
  const [owner, setOwner] = useState<OccasionOwnerChoice | null>(initialOwner ?? null);
  const [ownerType, setOwnerType] = useState<"customer" | "group">(initialOwner?.type ?? "customer");
  const [groups, setGroups] = useState<CrmCustomerGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [form, setForm] = useState(initial);
  const [assignableUsers, setAssignableUsers] = useState<Array<{ id: CrmId; name: string; branch?: { name: string } | null }>>([]);

  const ownerIsFixed = initialOwner != null;

  useEffect(() => {
    let alive = true;
    void crmApi.occasionAssignableUsers()
      .then((rows) => { if (alive) setAssignableUsers(rows); })
      .catch(() => { if (alive) setAssignableUsers([]); });
    return () => { alive = false; };
  }, []);

  // Only fetched once the group tab is actually open and no owner is picked
  // yet — an edit already carries its owner and never needs this list.
  useEffect(() => {
    if (ownerType !== "group" || owner) return;
    let alive = true;
    setGroupsLoading(true);
    void crmApi.customerGroups()
      .then((rows) => { if (alive) setGroups(rows); })
      .catch(() => { if (alive) setGroups([]); })
      .finally(() => { if (alive) setGroupsLoading(false); });
    return () => { alive = false; };
  }, [ownerType, owner]);

  // Escape closes the popup, matching every other modal in the CRM.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const canSubmit = owner != null && !!form.date;

  const submit = () => {
    if (!owner) return;
    // "تسمية مخصصة" is optional — the type label itself is always a valid,
    // meaningful title, so the required backend column never has to reject
    // a blank one just because the user didn't bother customizing it.
    onSubmit(owner, { ...form, title: form.title.trim() || OCCASION_TYPE_LABELS[form.occasion_type] });
  };

  return (
    <div className="crmx-root fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="إغلاق" className="absolute inset-0 bg-[#0B1220]/40" onClick={onClose} />
      <div
        dir="rtl"
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] shadow-[var(--crmx-shadow-md)]"
      >
        <header className="flex items-center justify-between border-b border-[var(--crmx-border)] px-5 py-4">
          <span className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--crmx-primary-soft)] text-[var(--crmx-primary-text)]">
              <CalendarHeart className="h-4.5 w-4.5" />
            </span>
            <h2 className="text-[16px] font-bold text-[var(--crmx-text)]">{title}</h2>
          </span>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--crmx-text-muted)] hover:bg-[var(--crmx-neutral-soft)]" aria-label="إغلاق">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="crmx-scrollbar flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {/* ── القسم ١: الجهة صاحبة المناسبة ── */}
          <div>
            <label className={labelCls}>الجهة صاحبة المناسبة</label>

            {owner ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-neutral-soft)] px-3 py-2.5">
                <span className="flex min-w-0 items-center gap-2">
                  {owner.type === "customer"
                    ? <UserIcon className="h-4 w-4 shrink-0 text-[var(--crmx-text-muted)]" />
                    : <Building2 className="h-4 w-4 shrink-0 text-[var(--crmx-text-muted)]" />}
                  <span className="truncate text-[14px] font-bold text-[var(--crmx-text)]">{owner.name}</span>
                </span>
                {!ownerIsFixed && (
                  <button type="button" onClick={() => setOwner(null)} className="shrink-0 text-[12.5px] font-bold text-[var(--crmx-primary-text)] hover:underline">
                    تغيير
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-1 rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-neutral-soft)] p-1">
                  {([["customer", "عميل", UserIcon], ["group", "مجموعة", Building2]] as const).map(([key, label, Icon]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setOwnerType(key)}
                      className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-[13px] font-bold transition ${
                        ownerType === key ? "bg-[var(--crmx-card)] text-[var(--crmx-text)] shadow-sm" : "text-[var(--crmx-text-secondary)]"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" /> {label}
                    </button>
                  ))}
                </div>

                {ownerType === "customer" ? (
                  <CustomerPicker
                    label=""
                    placeholder="ابحث بالاسم أو رقم الجوال..."
                    onPick={(c) => setOwner({ type: "customer", id: c.id, name: c.name })}
                  />
                ) : (
                  <select
                    className={inputCls}
                    disabled={groupsLoading}
                    value=""
                    onChange={(e) => {
                      const g = groups.find((g) => String(g.id) === e.target.value);
                      if (g) setOwner({ type: "group", id: g.id, name: g.name });
                    }}
                  >
                    <option value="">{groupsLoading ? "جارٍ التحميل..." : "اختر المجموعة"}</option>
                    {groups.map((g) => (
                      <option key={String(g.id)} value={String(g.id)}>{g.name}</option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          {owner && (
            <>
              <div className="border-t border-[var(--crmx-border)] pt-5">
                {/* ── القسم ٢: تفاصيل المناسبة — صفّان من حقلين، لا ثمانية حقول مكدّسة ── */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>نوع المناسبة</label>
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
                  <label className={labelCls}>تسمية مخصصة (اختياري)</label>
                  <input
                    className={inputCls}
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder={OCCASION_TYPE_LABELS[form.occasion_type]}
                    maxLength={255}
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
                {/* ── القسم ٣: المتابعة ── */}
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
                      <span className="inline-flex items-center gap-1.5"><UserIcon className="h-3.5 w-3.5" /> الموظف المسؤول</span>
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
            </>
          )}
        </div>

        <footer className="flex items-center gap-2.5 border-t border-[var(--crmx-border)] px-5 py-4">
          <button
            disabled={saving || !canSubmit}
            onClick={submit}
            className="h-11 flex-1 rounded-xl bg-[var(--crmx-primary)] text-[14px] font-bold text-white transition hover:bg-[var(--crmx-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}
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
