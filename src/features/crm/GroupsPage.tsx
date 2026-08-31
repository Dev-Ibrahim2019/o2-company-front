import { Building2, ChevronLeft, Loader2, Plus, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth";
import { CRM_PERMISSIONS } from "../../auth/permissions";
import { toast } from "../../components/shared/Toast";
import { crmApi } from "./api";
import { CrmState, getCrmError } from "./components";
import { CrmPageHeader, CrmSearchBar } from "./customers-ui";
import type { CrmCustomerGroup, CrmCustomerGroupInput, CrmGroupType } from "./types";

/** customer_groups.group_type — a DB enum since the table was created. */
export const GROUP_TYPE_LABELS: Record<CrmGroupType, string> = {
  retail: "تجزئة",
  wholesale: "جملة",
  corporate: "شركات",
  government: "جهات حكومية",
  service: "خدمات",
};

export const GROUP_TYPE_TONE: Record<CrmGroupType, string> = {
  retail: "bg-[var(--crmx-neutral-soft)] text-[var(--crmx-text-secondary)]",
  wholesale: "bg-[var(--crmx-info-soft)] text-[var(--crmx-info-text)]",
  corporate: "bg-[var(--crmx-navy-soft)] text-[var(--crmx-navy)]",
  government: "bg-[var(--crmx-accent-soft)] text-[var(--crmx-accent-text)]",
  service: "bg-[var(--crmx-success-soft)] text-[var(--crmx-success-text)]",
};

export const GROUP_PILL =
  "inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-bold whitespace-nowrap";

const cardCls = "rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)]";
const inputCls =
  "h-11 w-full rounded-xl border border-[var(--crmx-border)] bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none focus:border-[var(--crmx-primary)] focus:ring-2 focus:ring-[var(--crmx-primary)]/10";
const labelCls = "mb-1 block text-[13px] font-semibold text-[var(--crmx-text-secondary)]";

const EMPTY: CrmCustomerGroupInput = { name: "", group_type: "corporate" };

/** Shared by the create button here and the edit action on the group profile. */
export function GroupFormDrawer({
  initial, saving, onClose, onSubmit,
}: {
  initial?: CrmCustomerGroupInput;
  saving: boolean;
  onClose: () => void;
  onSubmit: (data: CrmCustomerGroupInput) => void;
}) {
  const [form, setForm] = useState(initial ?? EMPTY);
  const editing = Boolean(initial);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="مجموعة عملاء">
      <button aria-label="إغلاق" className="absolute inset-0 bg-[#0B1220]/25 backdrop-blur-[2px]" onClick={onClose} />
      <div dir="rtl" className="crmx-drawer-panel crmx-root relative flex h-full w-full max-w-sm flex-col bg-[var(--crmx-card)] shadow-2xl">
        <header className="flex items-center justify-between border-b border-[var(--crmx-border)] px-5 py-4">
          <h2 className="text-[17px] font-bold text-[var(--crmx-text)]">
            {editing ? "تعديل المجموعة" : "إنشاء مجموعة"}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--crmx-text-muted)] hover:bg-[var(--crmx-neutral-soft)]" aria-label="إغلاق">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div>
            <label className={labelCls}>اسم المجموعة</label>
            <input
              className={inputCls}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="مثال: شركة الأفق للتجارة"
              maxLength={255}
              autoFocus
            />
          </div>

          <div>
            <label className={labelCls}>النوع</label>
            <select
              className={inputCls}
              value={form.group_type}
              onChange={(e) => setForm((f) => ({ ...f, group_type: e.target.value as CrmGroupType }))}
            >
              {(Object.keys(GROUP_TYPE_LABELS) as CrmGroupType[]).map((v) => (
                <option key={v} value={v}>{GROUP_TYPE_LABELS[v]}</option>
              ))}
            </select>
          </div>
        </div>

        <footer className="flex items-center gap-2.5 border-t border-[var(--crmx-border)] px-5 py-4">
          <button
            disabled={saving || !form.name.trim()}
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
 * Customer groups directory.
 *
 * Search is client-side here, unlike the complaints screen: the backend list
 * endpoint takes no filters and groups are few by nature, so a request per
 * keystroke would buy nothing. If the list ever outgrows one page this should
 * move server-side rather than paginating a filtered array.
 */
export function GroupsPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission(CRM_PERMISSIONS.GROUPS_CREATE);
  const navigate = useNavigate();

  const [groups, setGroups] = useState<CrmCustomerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status?: number; message: string } | null>(null);
  const [term, setTerm] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setGroups(await crmApi.customerGroups());
    } catch (e) {
      setError(getCrmError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const create = async (data: CrmCustomerGroupInput) => {
    setSaving(true);
    try {
      await crmApi.createCustomerGroup(data);
      toast.success("تم إنشاء المجموعة");
      setCreateOpen(false);
      await load();
    } catch (e) {
      toast.error("تعذّر إنشاء المجموعة", getCrmError(e).message);
    } finally {
      setSaving(false);
    }
  };

  const needle = term.trim().toLowerCase();
  const visible = needle === ""
    ? groups
    : groups.filter((g) => g.name.toLowerCase().includes(needle));

  return (
    <div className="crmx-root space-y-6 p-4 sm:p-6">
      <CrmPageHeader
        title="المجموعات"
        description="الشركات والعائلات والجهات التي ينتمي إليها عملاؤك — أعضاؤها ومناسباتها في مكان واحد."
        actions={
          <>
            {canCreate && (
              <button
                onClick={() => setCreateOpen(true)}
                className="flex h-11 items-center gap-2 rounded-xl bg-[var(--crmx-primary)] px-4 text-[14px] font-bold text-white transition hover:bg-[var(--crmx-primary-hover)]"
              >
                <Plus className="h-4 w-4" /> إنشاء مجموعة
              </button>
            )}
            <button
              onClick={() => void load()}
              className="flex h-11 items-center gap-2 rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] px-4 text-[14px] font-bold text-[var(--crmx-navy)] transition hover:bg-[var(--crmx-neutral-soft)]"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} تحديث
            </button>
          </>
        }
      />

      <div className={`${cardCls} p-4`}>
        <CrmSearchBar value={term} onChange={setTerm} placeholder="ابحث باسم المجموعة…" />
      </div>

      {loading ? (
        <CrmState kind="loading" title="جارٍ تحميل المجموعات" />
      ) : error ? (
        <CrmState kind={error.status === 403 ? "forbidden" : "error"} title={error.message} retry={load} />
      ) : visible.length === 0 ? (
        <CrmState kind="empty" title={needle ? "لا توجد مجموعة مطابقة" : "لا توجد مجموعات بعد"} />
      ) : (
        <div className={cardCls}>
          <div className="crmx-scrollbar overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-right">
              <thead>
                <tr className="border-b border-[var(--crmx-border)] bg-[#FAFBFC]">
                  {["المجموعة", "النوع", "عدد الأعضاء", ""].map((h, i) => (
                    <th key={h || `sp-${i}`} className="whitespace-nowrap px-4 py-3.5 text-[12.5px] font-bold text-[var(--crmx-text-secondary)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((g) => (
                  <tr
                    key={String(g.id)}
                    onClick={() => navigate(`/admin/crm/groups/${g.id}`)}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(`/admin/crm/groups/${g.id}`); } }}
                    className="crmx-table-row group cursor-pointer border-b border-[var(--crmx-border)] transition-colors last:border-0 hover:bg-[var(--crmx-neutral-soft)]/70 focus:bg-[var(--crmx-neutral-soft)]/70 focus:outline-none"
                  >
                    <td className="px-4 py-3 text-[13px] font-bold text-[var(--crmx-text)]">
                      <span className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-[var(--crmx-text-muted)]" />
                        {g.name}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`${GROUP_PILL} ${GROUP_TYPE_TONE[g.group_type]}`}>
                        {GROUP_TYPE_LABELS[g.group_type] ?? g.group_type}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[13px] text-[var(--crmx-text-secondary)]">
                      {g.customers_count ?? 0}
                    </td>
                    <td className="w-8 px-3 py-3 text-[var(--crmx-text-muted)]">
                      <ChevronLeft className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {createOpen && (
        <GroupFormDrawer saving={saving} onClose={() => setCreateOpen(false)} onSubmit={create} />
      )}
    </div>
  );
}
