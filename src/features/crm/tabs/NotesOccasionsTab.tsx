import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../../auth";
import { CRM_PERMISSIONS } from "../../../auth/permissions";
import { toast } from "../../../components/shared/Toast";
import { crmApi } from "../api";
import { CrmState, getCrmError } from "../components";
import type { CrmNote, CrmNoteImportance, CrmNoteInput, CrmNoteType } from "../types";
import { DomainTable, SectionFrame, date, text, unwrapRows, useCrmSection } from "./shared";

const NOTE_TYPE_LABELS: Record<CrmNoteType, string> = {
  general: "عامة", delivery: "توصيل", warning: "تنبيه",
  preference: "تفضيل", service: "خدمة", sensitive: "حساسة",
};
const NOTE_IMPORTANCE_LABELS: Record<CrmNoteImportance, string> = {
  low: "منخفضة", normal: "عادية", high: "مرتفعة", urgent: "عاجلة",
};
const IMPORTANCE_TONE: Record<CrmNoteImportance, string> = {
  low: "bg-[var(--crmx-neutral-soft)] text-[var(--crmx-text-secondary)]",
  normal: "bg-[var(--crmx-info-soft)] text-[var(--crmx-info-text)]",
  high: "bg-[var(--crmx-warning-soft)] text-[var(--crmx-warning-text)]",
  urgent: "bg-[var(--crmx-danger-soft)] text-[var(--crmx-danger-text)]",
};

const inputCls =
  "h-11 w-full rounded-xl border border-[var(--crmx-border)] bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none transition focus:border-[var(--crmx-navy)] focus:ring-2 focus:ring-[var(--crmx-navy)]/10";
const labelCls = "mb-1.5 block text-[13px] font-semibold text-[var(--crmx-text-secondary)]";

const EMPTY_FORM: CrmNoteInput = { content: "", type: "general", importance: "normal", show_during_order: false };

function NoteFormDrawer({
  open, initial, saving, onClose, onSubmit,
}: {
  open: boolean;
  initial: CrmNoteInput;
  saving: boolean;
  onClose: () => void;
  onSubmit: (data: CrmNoteInput) => void;
}) {
  const [form, setForm] = useState(initial);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="ملاحظة العميل">
      <button aria-label="إغلاق" className="absolute inset-0 bg-[#0B1220]/40" onClick={onClose} />
      <div dir="rtl" className="crmx-drawer-panel relative flex h-full w-full max-w-sm flex-col bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-[var(--crmx-border)] px-5 py-4">
          <h2 className="text-[17px] font-bold text-[var(--crmx-text)]">{initial.content ? "تعديل ملاحظة" : "إضافة ملاحظة"}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--crmx-text-muted)] hover:bg-[var(--crmx-neutral-soft)]" aria-label="إغلاق">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div>
            <label className={labelCls}>الملاحظة</label>
            <textarea
              className={`${inputCls} h-28 resize-none py-2.5`}
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              placeholder="اكتب الملاحظة هنا..."
              maxLength={2000}
              autoFocus
            />
          </div>

          <div>
            <label className={labelCls}>النوع</label>
            <select
              className={inputCls}
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as CrmNoteType }))}
            >
              {Object.entries(NOTE_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>الأهمية</label>
            <select
              className={inputCls}
              value={form.importance}
              onChange={(e) => setForm((f) => ({ ...f, importance: e.target.value as CrmNoteImportance }))}
            >
              {Object.entries(NOTE_IMPORTANCE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2.5 text-[14px] font-semibold text-[var(--crmx-text)]">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-[var(--crmx-border)]"
              checked={!!form.show_during_order}
              onChange={(e) => setForm((f) => ({ ...f, show_during_order: e.target.checked }))}
            />
            إظهار هذه الملاحظة عند إنشاء طلب جديد
          </label>
        </div>

        <footer className="flex items-center gap-2.5 border-t border-[var(--crmx-border)] px-5 py-4">
          <button
            disabled={saving || !form.content.trim()}
            onClick={() => onSubmit(form)}
            className="h-11 flex-1 rounded-xl bg-[var(--crmx-navy)] text-[14px] font-bold text-white transition hover:bg-[var(--crmx-navy-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "جارٍ الحفظ..." : "حفظ"}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="h-11 rounded-xl border border-[var(--crmx-border)] px-4 text-[14px] font-semibold text-[var(--crmx-text-secondary)] hover:bg-[var(--crmx-neutral-soft)]"
          >
            إلغاء
          </button>
        </footer>
      </div>
    </div>
  );
}

function Notes() {
  const { customerId = "" } = useParams();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission(CRM_PERMISSIONS.NOTES_CREATE);
  const canUpdate = hasPermission(CRM_PERMISSIONS.NOTES_UPDATE);
  const canDelete = hasPermission(CRM_PERMISSIONS.NOTES_DELETE);

  const s = useCrmSection("notes");
  const [drawer, setDrawer] = useState<{ mode: "add" } | { mode: "edit"; note: CrmNote } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  const submit = async (data: CrmNoteInput) => {
    if (!drawer) return;
    setSaving(true);
    try {
      if (drawer.mode === "add") {
        await crmApi.createNote(customerId, data);
        toast.success("تمت إضافة الملاحظة");
      } else {
        await crmApi.updateNote(customerId, drawer.note.id, data);
        toast.success("تم تحديث الملاحظة");
      }
      setDrawer(null);
      await s.load();
    } catch (e) {
      toast.error("تعذّر حفظ الملاحظة", getCrmError(e).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (note: CrmNote) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه الملاحظة؟")) return;
    setDeletingId(note.id);
    try {
      await crmApi.deleteNote(customerId, note.id);
      toast.success("تم حذف الملاحظة");
      await s.load();
    } catch (e) {
      toast.error("تعذّر حذف الملاحظة", getCrmError(e).message);
    } finally {
      setDeletingId(null);
    }
  };

  const rows = unwrapRows(s.data, ["notes"]) as unknown as CrmNote[];

  return (
    <div className="space-y-3">
      {canCreate && (
        <button
          onClick={() => setDrawer({ mode: "add" })}
          className="flex h-10 items-center gap-1.5 rounded-xl border border-[var(--crmx-border)] bg-white px-3.5 text-[13px] font-bold text-[var(--crmx-navy)] hover:bg-[var(--crmx-neutral-soft)]"
        >
          <Plus className="h-4 w-4" /> إضافة ملاحظة
        </button>
      )}

      <SectionFrame state={s} empty="لا توجد ملاحظات">
        {() =>
          rows.length === 0 ? (
            <CrmState kind="empty" title="لا توجد ملاحظات" />
          ) : (
            <div className="crmx-root space-y-2.5">
              {rows.map((note) => (
                <div key={String(note.id)} className="rounded-2xl border border-[var(--crmx-border)] bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[14px] text-[var(--crmx-text)]">{text(note.content)}</p>
                    {(canUpdate || canDelete) && (
                      <div className="flex shrink-0 items-center gap-1">
                        {canUpdate && (
                          <button
                            onClick={() => setDrawer({ mode: "edit", note })}
                            title="تعديل"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--crmx-text-muted)] hover:bg-[var(--crmx-neutral-soft)] hover:text-[var(--crmx-navy)]"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => remove(note)}
                            disabled={deletingId === note.id}
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
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 font-bold ${IMPORTANCE_TONE[note.importance] ?? IMPORTANCE_TONE.normal}`}>
                      {NOTE_IMPORTANCE_LABELS[note.importance] ?? note.importance}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-[var(--crmx-neutral-soft)] px-2.5 py-1 font-bold text-[var(--crmx-text-secondary)]">
                      {NOTE_TYPE_LABELS[note.type] ?? note.type}
                    </span>
                    <span className="text-[var(--crmx-text-muted)]">
                      {note.created_by?.name ? `أضافها ${note.created_by.name} · ` : ""}{date(note.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </SectionFrame>

      <NoteFormDrawer
        open={drawer !== null}
        initial={drawer?.mode === "edit"
          ? { content: drawer.note.content, type: drawer.note.type, importance: drawer.note.importance, show_during_order: drawer.note.show_during_order }
          : EMPTY_FORM}
        saving={saving}
        onClose={() => setDrawer(null)}
        onSubmit={submit}
      />
    </div>
  );
}
function Occasions(){const s=useCrmSection("occasions");return <SectionFrame state={s}>{d=><DomainTable empty="لا توجد مناسبات" rows={unwrapRows(d,["occasions"])} columns={[{key:"title",label:"المناسبة",render:(v,r)=>text(v??r.name??r.type)},{key:"date",label:"التاريخ",render:(v,r)=>date(v??r.occasion_date)},{key:"notes",label:"التفاصيل"}]}/>}</SectionFrame>}
const sectionTitle = "mb-3 text-[15px] font-bold text-[var(--crmx-text)]";
export default function NotesOccasionsTab(){return <div className="crmx-root grid grid-cols-1 gap-5 lg:grid-cols-2"><section><h3 className={sectionTitle}>الملاحظات</h3><Notes/></section><section><h3 className={sectionTitle}>المناسبات</h3><Occasions/></section></div>}
