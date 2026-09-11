import { AlertOctagon, BellRing, BookOpen, Building2, CalendarDays, ChevronLeft, Inbox, Loader2, Megaphone, Plus, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { crmApi } from "./api";
import { ComplaintFormDrawer } from "./ComplaintFormDrawer";
import { useAuth } from "../../auth";
import { CRM_PERMISSIONS } from "../../auth/permissions";
import { toast } from "../../components/shared/Toast";
import { CrmState, getCrmError } from "./components";
import {
  COMPLAINT_CHANNEL_LABELS, COMPLAINT_DEPARTMENT_LABELS, COMPLAINT_PILL,
  COMPLAINT_PRIORITY_TONE, COMPLAINT_STATUS_TONE,
  CrmKpiCard, CrmPageHeader, CrmPagination, CrmSearchBar,
} from "./customers-ui";
import { date as fmtDate } from "./format";
import type {
  CrmComplaintChannel, CrmComplaintDepartment, CrmComplaintPriority,
  CrmComplaintCreateInput, CrmGeneralComplaintCreateInput, CrmComplaintRow, CrmComplaintStatus, CrmComplaintSummary, CrmId,
} from "./types";

type Filters = {
  status: string; priority: string; channel: string; department: string;
  // A user id, or the literals "mine" / "none". Maps to assigned_user_id
  // on Crm\ComplaintController.
  assigned_user_id: string;
  date_from: string; date_to: string; search: string;
};

const EMPTY: Filters = {
  status: "", priority: "", channel: "", department: "", assigned_user_id: "",
  date_from: "", date_to: "", search: "",
};

// Lifted from DashboardPage's filter bar so every CRM control is the same
// object: 44px tall, 14px text, the same focus ring. The complaints screen
// had been drawing its own 40px/13px variant, which is what made it read as
// a different product sitting next to the dashboard.
const selectCls =
  "h-11 rounded-xl border border-[var(--crmx-border)] bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none focus:border-[var(--crmx-primary)] focus:ring-2 focus:ring-[var(--crmx-primary)]/10";
const fieldLabelCls = "flex flex-col gap-1 text-[13px] font-semibold text-[var(--crmx-text-secondary)]";
const cardCls = "rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)]";

// Same fixed series palette the dashboard donut uses, so a CRM chart is
// recognisably the same family wherever it appears.
const SERIES_COLORS = ["var(--crmx-primary)", "var(--crmx-navy)", "var(--crmx-accent)", "var(--crmx-warning)", "var(--crmx-info)", "var(--crmx-success)", "var(--crmx-text-muted)"];

/** Mirrors DashboardPage's ChartCard so both screens frame charts identically. */
function ChartCard({ title, children, empty }: { title: string; children?: React.ReactNode; empty?: boolean }) {
  return (
    <div className={`${cardCls} p-5`}>
      <h3 className="mb-4 text-[15px] font-bold text-[var(--crmx-text)]">{title}</h3>
      {empty ? (
        <div className="flex h-[220px] items-center justify-center text-[13px] text-[var(--crmx-text-muted)]">
          لا توجد بيانات كافية بعد
        </div>
      ) : (
        children
      )}
    </div>
  );
}

/**
 * CRM-wide complaints queue.
 *
 * Every control here maps to a query parameter on Crm\ComplaintController —
 * nothing is filtered in the browser, so the paginator's totals describe the
 * whole filtered set rather than the page in hand. Sensitive complaints are
 * excluded server-side for readers without clearance, so this screen simply
 * shows what it is given: there is no client-side confidentiality logic to
 * get wrong.
 */
const PAGE_TITLES: Record<"all" | "open", { title: string; description: string; empty: string }> = {
  all: {
    title: "الشكاوى",
    description: "كل شكاوى العملاء عبر القنوات في مكان واحد — للمتابعة وقياس تركّز الشكاوى حسب القسم.",
    empty: "لا توجد شكاوى مسجلة",
  },
  open: {
    title: "الشكاوى المفتوحة",
    description: "الشكاوى الجديدة أو التي ما زالت قيد المعالجة فقط — جديدة، مفتوحة، قيد المعالجة، أو بانتظار العميل.",
    empty: "لا توجد شكاوى مفتوحة حالياً",
  },
};

// The open view's status filter offers only the statuses it contains —
// mirrors CustomerComplaint::scopeOpen() exactly, so the dropdown can never
// offer a value the page itself would never show.
const OPEN_STATUSES: CrmComplaintStatus[] = ["new", "open", "in_progress", "waiting_customer"];

export function ComplaintsPage({ mode = "all" }: { mode?: "all" | "open" }) {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission(CRM_PERMISSIONS.COMPLAINTS_CREATE);
  const [filters, setFilters] = useState<Filters>(EMPTY);
  // Applied separately from `filters` so typing in the search box does not
  // fire a request per keystroke; the toolbar commits it.
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const [rows, setRows] = useState<CrmComplaintRow[]>([]);
  const [meta, setMeta] = useState({ currentPage: 1, lastPage: 1, total: 0 });
  const [summary, setSummary] = useState<CrmComplaintSummary | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [users, setUsers] = useState<Array<{ id: CrmId; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status?: number; message: string } | null>(null);

  const params = useMemo(() => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(applied)) if (v) out[k] = v;
    // Not a user-editable filter — the route itself decides this page shows
    // only the open lifecycle statuses.
    if (mode === "open") out.view = "open";
    return out;
  }, [applied, mode]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // The summary is scoped and filtered by the same parameters, so the
      // cards always describe the list underneath them rather than a
      // different, unfiltered population.
      const [listResult, summaryResult] = await Promise.all([
        crmApi.complaints({ ...params, page: String(page), per_page: String(perPage) }),
        crmApi.complaintsSummary(params),
      ]);
      setRows(listResult.items);
      setMeta({ currentPage: listResult.currentPage, lastPage: listResult.lastPage, total: listResult.total });
      setSummary(summaryResult);
    } catch (e) {
      setError(getCrmError(e));
    } finally {
      setLoading(false);
    }
  }, [params, page, perPage]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    // The login accounts that may work a complaint — the same set the detail
    // page assigns from. A failure leaves the filter's name list empty rather
    // than breaking the toolbar.
    void crmApi.assignableUsers().then(setUsers).catch(() => setUsers([]));
  }, []);

  const createComplaint = async (customerId: CrmId | null, data: CrmComplaintCreateInput) => {
    setCreating(true);
    try {
      if (customerId === null) {
        await crmApi.createGeneralComplaint(data as CrmGeneralComplaintCreateInput);
      } else {
        await crmApi.createComplaint(customerId, data);
      }
      toast.success("تمت إضافة الشكوى");
      setCreateOpen(false);
      await load();
    } catch (e) {
      toast.error("تعذّر حفظ الشكوى", getCrmError(e).message);
    } finally {
      setCreating(false);
    }
  };

  // from > to is the one combination the backend rejects with a 422; catch it
  // here so the button explains itself instead of the whole screen turning
  // into an error state.
  const dateRangeInvalid =
    filters.date_from !== "" && filters.date_to !== "" && filters.date_from > filters.date_to;
  const dirty = JSON.stringify(filters) !== JSON.stringify(applied);
  const apply = () => { if (dateRangeInvalid) return; setPage(1); setApplied(filters); };
  const reset = () => { setPage(1); setFilters(EMPTY); setApplied(EMPTY); };
  const activeCount = Object.values(applied).filter(Boolean).length;

  const priorityCount = (p: CrmComplaintPriority) => summary?.by_priority?.[p] ?? 0;

  // Both series come from the summary this screen already fetches, and that
  // summary is scoped and filtered exactly like the list — so the charts
  // always describe the same population as the table below them.
  const departmentSeries = Object.entries(summary?.by_department ?? {})
    .map(([key, count]) => ({
      key,
      label: key === "" ? "غير مصنَّف" : COMPLAINT_DEPARTMENT_LABELS[key as CrmComplaintDepartment] ?? key,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const statusSeries = Object.entries(summary?.by_status ?? {})
    .map(([key, count]) => ({
      key,
      label: COMPLAINT_STATUS_TONE[key as CrmComplaintStatus]?.label ?? key,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const statusTotal = statusSeries.reduce((sum, x) => sum + x.count, 0);

  return (
    <div className="crmx-root space-y-6 p-4 sm:p-6">
      <CrmPageHeader
        title={PAGE_TITLES[mode].title}
        description={PAGE_TITLES[mode].description}
        actions={
          <>
          {canCreate && (
            <button
              onClick={() => setCreateOpen(true)}
              className="flex h-11 items-center gap-2 rounded-xl bg-[var(--crmx-primary)] px-4 text-[14px] font-bold text-white transition hover:bg-[var(--crmx-primary-hover)]"
            >
              <Plus className="h-4 w-4" /> إنشاء شكوى
            </button>
          )}
          <Link
            to="/admin/crm/complaints/guide"
            className="flex h-11 items-center gap-2 rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] px-4 text-[14px] font-bold text-[var(--crmx-navy)] transition hover:bg-[var(--crmx-neutral-soft)]"
          >
            <BookOpen className="h-4 w-4" /> دليل الحالات
          </Link>
          <button
            onClick={() => void load()}
            className="flex h-11 items-center gap-2 rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] px-4 text-[14px] font-bold text-[var(--crmx-navy)] transition hover:bg-[var(--crmx-neutral-soft)]"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} تحديث
          </button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <CrmKpiCard icon={<Inbox className="h-5 w-5" />} label="شكاوى مفتوحة" value={String(summary?.open ?? 0)} hint={`من إجمالي ${summary?.total ?? 0}`} tone="navy" trendInverse loading={loading} />
        <CrmKpiCard icon={<AlertOctagon className="h-5 w-5" />} label="أولوية حرجة" value={String(priorityCount("critical"))} tone="danger" trendInverse loading={loading} />
        <CrmKpiCard icon={<BellRing className="h-5 w-5" />} label="أولوية مرتفعة" value={String(priorityCount("high"))} tone="warning" trendInverse loading={loading} />
        <CrmKpiCard
          icon={<Building2 className="h-5 w-5" />}
          label="أكثر قسم شكاوى"
          value={topDepartment(summary)}
          hint={summary ? departmentHint(summary) : undefined}
          tone="navy"
          loading={loading}
        />
      </div>

      <div className={`${cardCls} p-4`}>
        <div className="mb-3">
          {/* The bar debounces internally, so search commits on its own
              rather than waiting for the تطبيق button beside the selects. */}
          <CrmSearchBar
            value={filters.search}
            onChange={(v: string) => {
              setFilters((f) => ({ ...f, search: v }));
              setPage(1);
              setApplied((a) => ({ ...a, search: v }));
            }}
            placeholder="ابحث بعنوان الشكوى أو اسم العميل أو رقمه…"
          />
        </div>

        <div className="flex flex-wrap items-end gap-x-3 gap-y-3">
          {/* Classification cluster */}
          <label className={fieldLabelCls}>
            الحالة
            <select className={selectCls} value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
              <option value="">{mode === "open" ? "كل الحالات المفتوحة" : "كل الحالات"}</option>
              {(mode === "open" ? OPEN_STATUSES : (Object.keys(COMPLAINT_STATUS_TONE) as CrmComplaintStatus[])).map((s) => (
                <option key={s} value={s}>{COMPLAINT_STATUS_TONE[s].label}</option>
              ))}
            </select>
          </label>
          <label className={fieldLabelCls}>
            الأولوية
            <select className={selectCls} value={filters.priority} onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}>
              <option value="">كل الأولويات</option>
              {(Object.keys(COMPLAINT_PRIORITY_TONE) as CrmComplaintPriority[]).map((p) => (
                <option key={p} value={p}>{COMPLAINT_PRIORITY_TONE[p].label}</option>
              ))}
            </select>
          </label>
          <label className={fieldLabelCls}>
            القناة
            <select className={selectCls} value={filters.channel} onChange={(e) => setFilters((f) => ({ ...f, channel: e.target.value }))}>
              <option value="">كل القنوات</option>
              {/* website is omitted: the enum reserves it but no endpoint writes it yet. */}
              {(["call_center", "crm"] as CrmComplaintChannel[]).map((c) => (
                <option key={c} value={c}>{COMPLAINT_CHANNEL_LABELS[c]}</option>
              ))}
            </select>
          </label>
          <label className={fieldLabelCls}>
            القسم
            <select className={selectCls} value={filters.department} onChange={(e) => setFilters((f) => ({ ...f, department: e.target.value }))}>
              <option value="">كل الأقسام</option>
              {(Object.keys(COMPLAINT_DEPARTMENT_LABELS) as CrmComplaintDepartment[]).map((d) => (
                <option key={d} value={d}>{COMPLAINT_DEPARTMENT_LABELS[d]}</option>
              ))}
            </select>
          </label>
          {/* Time cluster, split off by a hairline so the eye reads two
              groups rather than six equal controls in a row. */}
          <span aria-hidden className="mx-1 hidden h-11 w-px self-end bg-[var(--crmx-border)] lg:block" />
          <label className={fieldLabelCls}>
            المسؤول
            <select className={selectCls} value={filters.assigned_user_id} onChange={(e) => setFilters((f) => ({ ...f, assigned_user_id: e.target.value }))}>
              <option value="">كل الشكاوى</option>
              <option value="mine">المُسندة إليّ</option>
              <option value="none">غير المُسندة</option>
              {users.length > 0 && <option disabled>──────────</option>}
              {users.map((u) => (
                <option key={String(u.id)} value={String(u.id)}>{u.name}</option>
              ))}
            </select>
          </label>

          {/* The two dates wrap as one unit — split across lines they stop
              reading as a range. */}
          <div className="flex items-end gap-3">
            <label className={fieldLabelCls}>
              <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> من تاريخ</span>
              <input type="date" className={selectCls} value={filters.date_from} onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value }))} />
            </label>
            <label className={fieldLabelCls}>
              إلى تاريخ
              <input type="date" className={selectCls} value={filters.date_to} onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value }))} />
            </label>
          </div>

          <div className="flex items-end gap-2">
          <button
            onClick={apply}
            disabled={dateRangeInvalid || !dirty}
            className="h-11 rounded-xl bg-[var(--crmx-primary)] px-4 text-[14px] font-bold text-white transition hover:bg-[var(--crmx-primary-hover)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {dirty ? "تطبيق الفلاتر" : "مُطبَّقة"}
          </button>
          {activeCount > 0 && (
            <button onClick={reset} className="h-11 rounded-xl border border-[var(--crmx-border)] px-4 text-[14px] font-semibold text-[var(--crmx-text-secondary)] transition hover:bg-[var(--crmx-neutral-soft)]">
              مسح ({activeCount})
            </button>
          )}
          </div>
        </div>
        {dateRangeInvalid && (
          <p className="mt-2 text-[12px] font-semibold text-[var(--crmx-danger-text)]">
            «من تاريخ» يجب أن يسبق «إلى تاريخ».
          </p>
        )}
        {dirty && !dateRangeInvalid && (
          <p className="mt-2 text-[12px] text-[var(--crmx-text-muted)]">
            غيّرت الفلاتر — اضغط «تطبيق الفلاتر» لتحديث القائمة (البحث يُطبَّق تلقائياً).
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="تركّز الشكاوى حسب القسم" empty={!loading && departmentSeries.length === 0}>
          {loading ? (
            <div className="crmx-skeleton h-[220px] w-full rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={departmentSeries} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--crmx-border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--crmx-text-muted)" interval={0} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--crmx-text-muted)" width={28} />
                <Tooltip cursor={{ fill: "var(--crmx-neutral-soft)" }} formatter={(v) => `${String(v)} شكوى`} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {departmentSeries.map((d, i) => (
                    <Cell key={d.key} fill={d.key === "" ? "var(--crmx-text-muted)" : SERIES_COLORS[i % SERIES_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="توزيع الشكاوى حسب الحالة" empty={!loading && statusTotal === 0}>
          {loading ? (
            <div className="crmx-skeleton h-[220px] w-full rounded-xl" />
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-[45%] shrink-0">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={statusSeries} dataKey="count" nameKey="label" innerRadius={55} outerRadius={85} paddingAngle={3}>
                      {statusSeries.map((d, i) => <Cell key={d.key} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => `${String(v)} شكوى`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="flex-1 space-y-2">
                {statusSeries.map((d, i) => (
                  <li key={d.key} className="flex items-center justify-between text-[12.5px]">
                    <span className="flex items-center gap-2 text-[var(--crmx-text-secondary)]">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }} />
                      {d.label}
                    </span>
                    <span className="font-bold text-[var(--crmx-text)]">
                      {statusTotal ? Math.round((d.count / statusTotal) * 100) : 0}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </ChartCard>
      </div>

      {loading ? (
        <CrmState kind="loading" title="جارٍ تحميل الشكاوى" />
      ) : error ? (
        <CrmState kind={error.status === 403 ? "forbidden" : "error"} title={error.message} retry={load} />
      ) : rows.length === 0 ? (
        <CrmState
          kind="empty"
          title={activeCount > 0 ? "لا توجد شكاوى مطابقة للفلاتر" : PAGE_TITLES[mode].empty}
        />
      ) : (
        <div className={cardCls}>
          <div className="crmx-scrollbar overflow-x-auto">
            <table className="w-full min-w-[1080px] border-collapse text-right">
              <thead>
                <tr className="border-b border-[var(--crmx-border)] bg-[#FAFBFC]">
                  {["رقم", "الموضوع", "العميل", "المسؤول", "القناة", "القسم", "الأولوية", "الحالة", "تاريخ التسجيل", ""].map((h, i) => (
                    <th key={h || `sp-${i}`} className="whitespace-nowrap px-4 py-3.5 text-[12.5px] font-bold text-[var(--crmx-text-secondary)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const status = COMPLAINT_STATUS_TONE[c.status];
                  const priority = COMPLAINT_PRIORITY_TONE[c.priority];
                  return (
                    <tr
                      key={String(c.id)}
                      onClick={() => navigate(`/admin/crm/complaints/${c.id}`)}
                      tabIndex={0}
                      role="button"
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(`/admin/crm/complaints/${c.id}`); } }}
                      // The whole row is the target, so it has to look like one:
                      // a tinted ground, a start-edge accent, and the chevron in
                      // the last cell all say "this opens".
                      className="crmx-table-row group cursor-pointer border-b border-[var(--crmx-border)] transition-colors last:border-0 hover:bg-[var(--crmx-neutral-soft)]/70 focus:bg-[var(--crmx-neutral-soft)]/70 focus:outline-none"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-[13px] font-bold text-[var(--crmx-text-muted)]">{c.id}</td>
                      <td className="px-4 py-3 text-[13px] text-[var(--crmx-text)]">{c.title || "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13px]">
                        {c.customer ? (
                          <Link to={`/admin/crm/customers/${c.customer.id}/overview`} className="font-semibold text-[var(--crmx-primary)] hover:underline">
                            {c.customer.name}
                          </Link>
                        ) : (
                          <span className={`${COMPLAINT_PILL} gap-1 bg-[var(--crmx-navy-soft)] text-[var(--crmx-navy)]`}>
                            <Megaphone className="h-3 w-3" /> شكوى عامة
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13px]">
                        {c.assigned_user && typeof c.assigned_user === "object" ? (
                          <span className="font-semibold text-[var(--crmx-text)]">{c.assigned_user.name}</span>
                        ) : (
                          <span className="text-[12px] font-semibold text-[var(--crmx-warning-text)]">غير مُسندة</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={`${COMPLAINT_PILL} bg-[var(--crmx-neutral-soft)] text-[var(--crmx-text-secondary)]`}>
                          {c.channel ? COMPLAINT_CHANNEL_LABELS[c.channel] : "—"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13px] text-[var(--crmx-text-secondary)]">
                        {c.department ? COMPLAINT_DEPARTMENT_LABELS[c.department] : "غير مصنَّف"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {priority ? <span className={`${COMPLAINT_PILL} ${priority.tone}`}>{priority.label}</span> : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {status ? <span className={`${COMPLAINT_PILL} ${status.tone}`}>{status.label}</span> : c.status}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13px] text-[var(--crmx-text-secondary)]">{fmtDate(c.created_at ?? null)}</td>
                      <td className="w-8 px-3 py-3 text-[var(--crmx-text-muted)]">
                        <ChevronLeft className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <CrmPagination
            currentPage={meta.currentPage}
            lastPage={meta.lastPage}
            total={meta.total}
            perPage={perPage}
            onPageChange={setPage}
            onPerPageChange={(n: number) => { setPerPage(n); setPage(1); }}
            itemLabel="شكوى"
          />
        </div>
      )}

      {createOpen && (
        // The CRM-wide screen has no customer in context, so the shared drawer
        // opens on its search step first.
        <ComplaintFormDrawer
          saving={creating}
          onClose={() => setCreateOpen(false)}
          onSubmit={createComplaint}
        />
      )}

    </div>
  );
}

/** The busiest classified department, ignoring the untagged ("") bucket. */
function topDepartment(summary: CrmComplaintSummary | null): string {
  const entries = Object.entries(summary?.by_department ?? {}).filter(([k]) => k !== "");
  if (entries.length === 0) return "—";
  const [key] = entries.sort((a, b) => b[1] - a[1])[0];
  return COMPLAINT_DEPARTMENT_LABELS[key as CrmComplaintDepartment] ?? key;
}

function departmentHint(summary: CrmComplaintSummary): string | undefined {
  const entries = Object.entries(summary.by_department).filter(([k]) => k !== "");
  if (entries.length === 0) return "لا توجد شكاوى مصنَّفة بعد";
  const [, count] = entries.sort((a, b) => b[1] - a[1])[0];
  const untagged = summary.by_department[""] ?? 0;
  return untagged > 0 ? `${count} شكوى · ${untagged} غير مصنَّفة` : `${count} شكوى`;
}
