import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Ban, BookOpen, CheckCircle2, PenSquare, ShieldAlert, ShieldCheck, UserPlus, X,
} from "lucide-react";
import { useAuth } from "../../auth";
import { CRM_PERMISSIONS } from "../../auth/permissions";
import { crmApi } from "./api";
import { CrmState, getCrmError } from "./components";
import { CrmAvatar, CrmPageHeader, CrmPagination } from "./customers-ui";
import { date as fmtDate, money } from "./format";
import type { CrmCandidateOrder, CrmIdentityConflict } from "./types";

/**
 * The identity-conflict queue.
 *
 * A ticket is opened automatically when an incoming order carries a phone that
 * already belongs to a customer but under a different name. The stored name
 * always wins at order time; this screen is where a human decides what the
 * discrepancy actually meant.
 *
 * Tickets are never created from here — only resolved.
 */

const STATUS_LABELS: Record<string, string> = {
  open: "مفتوحة",
  resolved: "تمت المعالجة",
  dismissed: "مُهمَلة",
};

const CHANNEL_LABELS: Record<string, string> = {
  call_center: "كول سنتر",
  pos_instant: "كاشير فوري",
  pos_family: "كاشير عائلات",
  website: "الموقع",
};

/** Wording mirrors the backend's four resolutions exactly — see CustomerIdentityConflict. */
const RESOLUTION_LABELS: Record<string, string> = {
  kept_original: "إبقاء الاسم الأصلي",
  renamed_customer: "تحديث الاسم الرسمي",
  created_new_customer: "رقم مشترك — عميل منفصل",
  marked_shared_number: "رقم مشترك — موثّق دائمًا",
};

/**
 * The four resolutions, each carrying the colour its action means — not a
 * decoration, the mapping itself: green is "nothing changes", red/primary is
 * "the record is corrected", orange is "a new customer is created", grey is
 * "no action at all". The confirm button in the dialog below borrows the same
 * tone once a card is picked, so the commitment reads consistently from the
 * card to the button that fires it.
 */
const DECISIONS: Array<{
  key: "kept_original" | "renamed_customer" | "created_new_customer" | "dismissed";
  label: string;
  hint: string;
  icon: typeof ShieldCheck;
  tone: "success" | "primary" | "warning" | "neutral";
}> = [
  {
    key: "kept_original",
    label: "إبقاء الاسم الأصلي",
    hint: "الاسمان لشخص واحد — لا تغيير على السجل.",
    icon: ShieldCheck,
    tone: "success",
  },
  {
    key: "renamed_customer",
    label: "تحديث الاسم الرسمي",
    hint: "الاسم الوارد هو الصحيح — يُستبدل به.",
    icon: PenSquare,
    tone: "primary",
  },
  {
    key: "created_new_customer",
    label: "رقم مشترك — عميل منفصل",
    hint: "شخصان يتشاركان الرقم — يُنشأ عميل جديد.",
    icon: UserPlus,
    tone: "warning",
  },
  {
    key: "dismissed",
    label: "تجاهل",
    hint: "تذكرة لا محل لها — بيانات اختبار أو خطأ واضح.",
    icon: Ban,
    tone: "neutral",
  },
];

const TONE_STYLES: Record<string, { badge: string; ring: string; solidBtn: string }> = {
  success: {
    badge: "bg-[var(--crmx-success-soft)] text-[var(--crmx-success-text)]",
    ring: "border-[var(--crmx-success)] bg-[var(--crmx-success-soft)]/40",
    solidBtn: "bg-[var(--crmx-success)] text-white hover:brightness-95",
  },
  primary: {
    badge: "bg-[var(--crmx-primary-soft)] text-[var(--crmx-primary-text)]",
    ring: "border-[var(--crmx-primary)] bg-[var(--crmx-primary-soft)]/40",
    solidBtn: "bg-[var(--crmx-primary)] text-white hover:bg-[var(--crmx-primary-hover)]",
  },
  warning: {
    badge: "bg-[var(--crmx-warning-soft)] text-[var(--crmx-warning-text)]",
    ring: "border-[var(--crmx-warning)] bg-[var(--crmx-warning-soft)]/40",
    solidBtn: "bg-[var(--crmx-warning)] text-white hover:brightness-95",
  },
  neutral: {
    badge: "bg-[var(--crmx-neutral-soft)] text-[var(--crmx-text-secondary)]",
    ring: "border-[var(--crmx-text-muted)] bg-[var(--crmx-neutral-soft)]",
    solidBtn: "border border-[var(--crmx-border)] bg-[var(--crmx-card)] text-[var(--crmx-text)] hover:bg-[var(--crmx-neutral-soft)]",
  },
};

const PILL_TONE: Record<string, string> = {
  danger: "bg-[var(--crmx-danger-soft)] text-[var(--crmx-danger-text)]",
  success: "bg-[var(--crmx-success-soft)] text-[var(--crmx-success-text)]",
  info: "bg-[var(--crmx-info-soft)] text-[var(--crmx-info-text)]",
};
function Pill({ tone, children }: { tone: keyof typeof PILL_TONE; children: React.ReactNode }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold ${PILL_TONE[tone]}`}>{children}</span>;
}

/** "فُتحت اليوم" / "فُتحت أمس" / the absolute date beyond that — a relative
 *  label reads faster than a timestamp for "should I be worried this is old". */
function openedLabel(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const dayMs = 86_400_000;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const day = new Date(d); day.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - day.getTime()) / dayMs);
  if (diffDays === 0) return "فُتحت اليوم";
  if (diffDays === 1) return "فُتحت أمس";
  return `فُتحت ${fmtDate(value)}`;
}

/**
 * The stored customer phone and the incoming one are rarely byte-identical —
 * one commonly carries the +970 country code and the other doesn't, which a
 * naive === turns into a false "مختلف" on the very row whose whole point is
 * that the phone is what matched. Compared by trailing digits instead, so a
 * missing prefix on either side doesn't read as a real mismatch.
 */
function phonesEquivalent(stored?: string | null, incoming?: string | null): boolean {
  const digits = (v?: string | null) => (v ?? "").replace(/\D/g, "");
  const a = digits(stored);
  const b = digits(incoming);
  if (!a || !b) return true;
  const len = Math.min(a.length, b.length);
  return a.slice(-len) === b.slice(-len);
}

const selectCls =
  "h-11 rounded-xl border border-[var(--crmx-border)] bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none focus:border-[var(--crmx-primary)] focus:ring-2 focus:ring-[var(--crmx-primary)]/10";

function StatusPill({ value }: { value: string }) {
  const tone =
    value === "open"
      ? "bg-[var(--crmx-warning-soft)] text-[var(--crmx-warning-text)]"
      : value === "resolved"
        ? "bg-[var(--crmx-success-soft)] text-[var(--crmx-success-text)]"
        : "bg-[var(--crmx-neutral-soft)] text-[var(--crmx-text-muted)]";
  return <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${tone}`}>{STATUS_LABELS[value] ?? value}</span>;
}

export function IdentityConflictsPage() {
  const { hasPermission } = useAuth();
  const canResolve = hasPermission(CRM_PERMISSIONS.MANAGE_IDENTITY_CONFLICTS);

  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "open";
  const channel = params.get("channel") ?? "";
  const page = Number(params.get("page") ?? 1);

  const [rows, setRows] = useState<CrmIdentityConflict[]>([]);
  const [meta, setMeta] = useState({ currentPage: 1, lastPage: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status?: number; message: string }>();
  const [selected, setSelected] = useState<CrmIdentityConflict | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const q = new URLSearchParams({ page: String(page), per_page: "20" });
      if (status) q.set("status", status);
      if (channel) q.set("source_channel", channel);
      const res = await crmApi.identityConflicts(q);
      setRows(res.items);
      setMeta({ currentPage: res.currentPage, lastPage: res.lastPage, total: res.total });
    } catch (e) {
      setError(getCrmError(e));
    } finally {
      setLoading(false);
    }
  }, [status, channel, page]);

  useEffect(() => { void load(); }, [load]);

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    next.delete("page");
    setParams(next, { replace: true });
  };

  return (
    <div className="crmx-root space-y-5 p-4 sm:p-6">
      <CrmPageHeader
        title="تعارضات الهوية"
        description="أسماء وردت مع رقم يخص عميلًا مسجّلًا باسم مختلف. الاسم المحفوظ هو الذي اعتُمد وقت الطلب — القرار هنا يوثّق ما يعنيه الاختلاف."
        actions={
          <Link
            to="/admin/crm/identity-conflicts/guide"
            className="flex h-11 items-center gap-2 rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] px-4 text-[14px] font-bold text-[var(--crmx-navy)] transition hover:bg-[var(--crmx-neutral-soft)]"
          >
            <BookOpen className="h-4 w-4" /> دليل التعامل
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <select className={selectCls} value={status} onChange={(e) => set("status", e.target.value)} aria-label="الحالة">
          <option value="">كل الحالات</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className={selectCls} value={channel} onChange={(e) => set("channel", e.target.value)} aria-label="القناة">
          <option value="">كل القنوات</option>
          {Object.entries(CHANNEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <span className="text-[13px] text-[var(--crmx-text-muted)]">{meta.total} تذكرة</span>
      </div>

      {loading ? (
        <CrmState kind="loading" title="جارٍ تحميل التذاكر" />
      ) : error ? (
        // A 403 here means the queue itself is not visible to this user. Say
        // nothing about what it contains.
        error.status === 403 ? null : <CrmState kind="error" title={error.message} retry={load} />
      ) : !rows.length ? (
        <CrmState kind="empty" title="لا توجد تعارضات مطابقة" detail="تُفتح التذاكر تلقائيًا عند ورود اسم مختلف على رقم مسجّل." />
      ) : (
        <>
          <div className="crmx-scrollbar overflow-x-auto rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)]">
            <table className="w-full min-w-[860px] border-collapse text-right">
              <thead>
                <tr className="border-b border-[var(--crmx-border)] bg-[#FAFBFC]">
                  {["العميل المسجّل", "الاسم الوارد", "الرقم", "القناة", "الحالة", "التاريخ", ""].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-[12px] font-bold text-[var(--crmx-text-secondary)] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={String(c.id)} className="crmx-table-row border-b border-[var(--crmx-border)] last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <CrmAvatar name={c.customer?.name ?? "?"} size={32} />
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-[var(--crmx-text)]">{c.customer?.name ?? "—"}</p>
                          <p className="text-[11.5px] text-[var(--crmx-text-muted)]">{c.customer?.code ?? ""}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[13px] font-semibold text-[var(--crmx-warning-text)]">{c.incoming_name}</td>
                    <td className="px-4 py-3 text-[13px] text-[var(--crmx-text-secondary)]" dir="ltr">{c.incoming_phone_normalized}</td>
                    <td className="px-4 py-3 text-[13px] text-[var(--crmx-text-secondary)]">{CHANNEL_LABELS[c.source_channel] ?? c.source_channel}</td>
                    <td className="px-4 py-3"><StatusPill value={c.status} /></td>
                    <td className="px-4 py-3 text-[13px] text-[var(--crmx-text-secondary)]">{fmtDate(c.created_at)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelected(c)}
                        className="rounded-[var(--crmx-radius-control)] border border-[var(--crmx-border)] px-3 py-1.5 text-[12.5px] font-semibold text-[var(--crmx-text)] hover:bg-[var(--crmx-neutral-soft)]"
                      >
                        {c.status === "open" ? "مراجعة" : "التفاصيل"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <CrmPagination
            currentPage={meta.currentPage}
            lastPage={meta.lastPage}
            total={meta.total}
            perPage={20}
            itemLabel="تذكرة"
            onPageChange={(p) => { const n = new URLSearchParams(params); n.set("page", String(p)); setParams(n, { replace: true }); }}
            onPerPageChange={() => {}}
          />
        </>
      )}

      {selected && (
        <ConflictReviewDialog
          conflict={selected}
          canResolve={canResolve}
          onClose={() => setSelected(null)}
          onResolved={() => { setSelected(null); void load(); }}
        />
      )}
    </div>
  );
}

/** Centered "you're done" screen — shared by the direct-decision path (no
 *  candidate orders to review) and the order-reassignment path, which only
 *  differ in the sentence they show. */
function SuccessScreen({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-8 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--crmx-success-soft)] text-[var(--crmx-success)]">
        <CheckCircle2 className="h-7 w-7" />
      </span>
      <h2 className="text-[16px] font-bold text-[var(--crmx-text)]">تم توثيق القرار</h2>
      <p className="max-w-xs text-[13px] leading-6 text-[var(--crmx-text-secondary)]">{message}</p>
      <button
        onClick={onClose}
        className="mt-2 h-11 w-full max-w-[220px] rounded-xl bg-[var(--crmx-primary)] text-[14px] font-bold text-white transition hover:bg-[var(--crmx-primary-hover)]"
      >
        إغلاق
      </button>
    </div>
  );
}

function ConflictReviewDialog({
  conflict,
  canResolve,
  onClose,
  onResolved,
}: {
  conflict: CrmIdentityConflict;
  canResolve: boolean;
  onClose: () => void;
  onResolved: () => void;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string>();
  const [selectedDecision, setSelectedDecision] = useState<typeof DECISIONS[number]["key"] | null>(null);
  const [justResolved, setJustResolved] = useState(false);

  // Candidate-picking step. Only ever populated for the two resolutions that
  // split a customer off; every other path leaves it null and the dialog
  // closes as it always did.
  const [candidates, setCandidates] = useState<CrmCandidateOrder[] | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const [summary, setSummary] = useState<string>();

  const isOpen = conflict.status === "open";

  // A closed split ticket can still have orders nobody has decided about.
  // Surfaced only when something is actually pending.
  const [pending, setPending] = useState<CrmCandidateOrder[]>([]);
  useEffect(() => {
    if (isOpen || !conflict.created_customer_id) return;
    let cancelled = false;
    crmApi.identityConflict(conflict.id)
      .then((env) => !cancelled && setPending(env.candidate_orders ?? []))
      .catch(() => {});
    return () => { cancelled = true; };
  }, [conflict.id, conflict.created_customer_id, isOpen]);

  const act = async (kind: string) => {
    setBusy(kind);
    setErr(undefined);
    try {
      if (kind === "dismissed") {
        await crmApi.dismissIdentityConflict(conflict.id, note || undefined);
        setJustResolved(true);
        return;
      }

      const env = await crmApi.resolveIdentityConflict(conflict.id, kind, note || undefined);
      const found = env.candidate_orders ?? [];

      // Nothing to decide about — the decision is the whole story.
      if (!found.length) {
        setJustResolved(true);
        return;
      }

      setCandidates(found);
      setPicked([]);
    } catch (e) {
      setErr(getCrmError(e).message);
    } finally {
      setBusy(null);
    }
  };

  const submitReassign = async () => {
    setBusy("reassign");
    setErr(undefined);
    try {
      const env = await crmApi.reassignConflictOrders(conflict.id, picked);
      // The summary quotes the backend's own note rather than counting
      // client-side — the server is the record of what actually moved.
      setSummary(env.data.resolution_note ?? "تم تحديث إسناد الطلبات المختارة.");
      setCandidates(null);
    } catch (e) {
      setErr(getCrmError(e).message);
    } finally {
      setBusy(null);
    }
  };

  const toggle = (id: number) =>
    setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const orderLabel = conflict.order?.order_number
    ? conflict.order.order_number
    : conflict.source_order_id
      ? `طلب #${conflict.source_order_id}`
      : "بلا طلب مرتبط";

  const phoneMatches = phonesEquivalent(conflict.customer?.phone, conflict.incoming_phone_normalized);

  const decision = selectedDecision ? DECISIONS.find((d) => d.key === selectedDecision) : null;
  const showDecisionStep = isOpen && canResolve && !candidates && !summary;

  return (
    <div className="crmx-root fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="تعارض في الهوية">
      <button aria-label="إغلاق" className="absolute inset-0 bg-[#0B1220]/40 backdrop-blur-[2px]" onClick={onClose} />
      <div dir="rtl" className="relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] shadow-2xl">
        {justResolved ? (
          <SuccessScreen
            message="أُغلقت التذكرة وأُضيف القرار إلى سجل مراجعة العميل."
            onClose={onResolved}
          />
        ) : (
          <>
            <header className="flex items-start justify-between gap-3 border-b border-[var(--crmx-border)] px-5 py-4">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--crmx-warning-soft)] text-[var(--crmx-warning-text)]">
                  <ShieldAlert className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-[16px] font-bold text-[var(--crmx-text)]">تعارض في الهوية</h2>
                  <p className="mt-0.5 text-[12.5px] text-[var(--crmx-text-secondary)]">
                    {orderLabel} · {openedLabel(conflict.created_at)}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="shrink-0 rounded-lg p-1.5 text-[var(--crmx-text-muted)] transition hover:bg-[var(--crmx-neutral-soft)]" aria-label="إغلاق">
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="crmx-scrollbar flex-1 space-y-5 overflow-y-auto px-5 py-4">
              {/* Top facts strip */}
              <div className="grid grid-cols-3 divide-x divide-x-reverse divide-[var(--crmx-border)] rounded-xl bg-[var(--crmx-neutral-soft)] py-3">
                <div className="px-2 text-center">
                  <p className="text-[11px] font-bold text-[var(--crmx-text-muted)]">الرقم</p>
                  <p className="mt-1 text-[13px] font-bold text-[var(--crmx-text)]" dir="ltr">{conflict.incoming_phone_normalized}</p>
                </div>
                <div className="px-2 text-center">
                  <p className="text-[11px] font-bold text-[var(--crmx-text-muted)]">القناة</p>
                  <p className="mt-1 text-[13px] font-bold text-[var(--crmx-text)]">{CHANNEL_LABELS[conflict.source_channel] ?? conflict.source_channel}</p>
                </div>
                <div className="px-2 text-center">
                  <p className="text-[11px] font-bold text-[var(--crmx-text-muted)]">مصدر الطلب</p>
                  <p className="mt-1 text-[13px] font-bold text-[var(--crmx-primary-text)]">{orderLabel}</p>
                </div>
              </div>

              {/* Field-by-field comparison — the whole point of the screen. */}
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-[13px] font-extrabold text-[var(--crmx-text)]">
                  <span className="h-3.5 w-1 rounded-full bg-[var(--crmx-primary)]" /> مقارنة السجلين حقلاً بحقل
                </h3>
                <div className="overflow-hidden rounded-xl border border-[var(--crmx-border)]">
                  <table className="w-full border-collapse text-right text-[12.5px]">
                    <thead>
                      <tr className="border-b border-[var(--crmx-border)] bg-[#FAFBFC]">
                        <th className="px-3 py-2 font-bold text-[var(--crmx-text-secondary)]">الحقل</th>
                        <th className="px-3 py-2 font-bold text-[var(--crmx-text-secondary)]">السجل الحالي</th>
                        <th className="px-3 py-2 font-bold text-[var(--crmx-text-secondary)]">الوارد في الطلب</th>
                        <th className="px-3 py-2 font-bold text-[var(--crmx-text-secondary)]">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-[var(--crmx-border)]">
                        <td className="px-3 py-2.5 font-semibold text-[var(--crmx-text)]">الاسم</td>
                        <td className="px-3 py-2.5 text-[var(--crmx-text-secondary)]">{conflict.customer?.name ?? "—"}</td>
                        <td className="bg-[var(--crmx-warning-soft)]/50 px-3 py-2.5 font-semibold text-[var(--crmx-text)]">{conflict.incoming_name}</td>
                        <td className="px-3 py-2.5"><Pill tone="danger">مختلف</Pill></td>
                      </tr>
                      <tr className="border-b border-[var(--crmx-border)]">
                        <td className="px-3 py-2.5 font-semibold text-[var(--crmx-text)]">رقم الهاتف</td>
                        <td className="px-3 py-2.5 text-[var(--crmx-text-secondary)]" dir="ltr">{conflict.customer?.phone ?? "—"}</td>
                        <td className="px-3 py-2.5 text-[var(--crmx-text-secondary)]" dir="ltr">{conflict.incoming_phone_normalized}</td>
                        <td className="px-3 py-2.5">{phoneMatches ? <Pill tone="success">متطابق</Pill> : <Pill tone="danger">مختلف</Pill>}</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2.5 font-semibold text-[var(--crmx-text)]">رمز العميل</td>
                        <td className="px-3 py-2.5 text-[var(--crmx-text-secondary)]">{conflict.customer?.code ?? "—"}</td>
                        <td className="px-3 py-2.5 text-[var(--crmx-text-muted)]">— بلا سجل —</td>
                        <td className="px-3 py-2.5"><Pill tone="info">عميل جديد؟</Pill></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 rounded-lg bg-[var(--crmx-neutral-soft)] px-3 py-2 text-[11.5px] leading-5 text-[var(--crmx-text-secondary)]">
                  فُتحت هذه التذكرة لأن الرقم <span dir="ltr">{conflict.incoming_phone_normalized}</span> تطابق مع عميل مسجَّل باسم مختلف — عبر {CHANNEL_LABELS[conflict.source_channel] ?? conflict.source_channel}.
                </p>
              </div>

              {conflict.customer && (
                <Link
                  to={`/admin/crm/customers/${conflict.customer.id}`}
                  className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[var(--crmx-primary)] hover:underline"
                >
                  فتح ملف العميل
                </Link>
              )}

              {/* Closed tickets are a record, not something to re-decide. */}
              {!isOpen && !summary && (
                <div className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-neutral-soft)] p-4">
                  <p className="text-[12px] font-bold text-[var(--crmx-text-muted)]">القرار المتخذ</p>
                  <p className="mt-1 text-[14px] font-bold text-[var(--crmx-text)]">
                    {conflict.resolution ? RESOLUTION_LABELS[conflict.resolution] ?? conflict.resolution : STATUS_LABELS[conflict.status]}
                  </p>
                  {conflict.resolution_note && (
                    <p className="mt-2 text-[13px] text-[var(--crmx-text-secondary)]">{conflict.resolution_note}</p>
                  )}
                  <p className="mt-2 text-[11.5px] text-[var(--crmx-text-muted)]">
                    {conflict.resolver?.name ? `${conflict.resolver.name} · ` : ""}{fmtDate(conflict.resolved_at)}
                  </p>
                </div>
              )}

              {/* Step two: which past orders belonged to the person just split off.
                  Nothing is pre-checked — the whole point is a deliberate choice,
                  and a default selection would quietly become the answer. */}
              {candidates && (
                <div className="rounded-2xl border border-[var(--crmx-warning)] bg-[var(--crmx-warning-soft)] p-4">
                  <h3 className="text-[14px] font-bold text-[var(--crmx-text)]">طلبات قد تخص العميل الجديد</h3>
                  <p className="mt-1 text-[12.5px] text-[var(--crmx-text-secondary)]">
                    طلبات سابقة سُجّلت بالاسم الوارد نفسه على هذا الرقم. اختر ما تتأكد أنه يخص العميل الجديد — ما لا تختاره يبقى كما هو.
                  </p>

                  <button
                    type="button"
                    onClick={() => setPicked(picked.length === candidates.length ? [] : candidates.map((o) => o.id))}
                    className="mt-3 text-[12.5px] font-bold text-[var(--crmx-primary)] hover:underline"
                  >
                    {picked.length === candidates.length ? "إلغاء تحديد الكل" : "تحديد الكل"}
                  </button>

                  <ul className="mt-2 space-y-1.5">
                    {candidates.map((o) => (
                      <li key={o.id}>
                        <label className="flex cursor-pointer items-center gap-2.5 rounded-[var(--crmx-radius-control)] bg-[var(--crmx-card)] px-3 py-2">
                          <input
                            type="checkbox"
                            checked={picked.includes(o.id)}
                            onChange={() => toggle(o.id)}
                            className="h-4 w-4 accent-[var(--crmx-primary)]"
                          />
                          <span className="flex-1 text-[13px] font-semibold text-[var(--crmx-text)]">{o.order_number ?? `#${o.id}`}</span>
                          <span className="text-[12px] text-[var(--crmx-text-muted)]">{fmtDate(o.created_at)}</span>
                          <span className="text-[13px] font-bold text-[var(--crmx-text)]">{money(o.total == null ? null : Number(o.total))}</span>
                        </label>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={submitReassign}
                    className="mt-3 h-11 w-full rounded-xl bg-[var(--crmx-primary)] px-4 text-[14px] font-bold text-white transition hover:bg-[var(--crmx-primary-hover)] disabled:opacity-50"
                  >
                    {busy === "reassign"
                      ? "جارٍ الإسناد…"
                      : picked.length
                        ? `إسناد ${picked.length} طلب للعميل الجديد`
                        : "متابعة بلا إسناد أي طلب"}
                  </button>
                  {err && <p className="mt-2 text-[12.5px] text-[var(--crmx-danger-text)]">{err}</p>}
                </div>
              )}

              {summary && <SuccessScreen message={summary} onClose={onResolved} />}

              {/* A closed split ticket with orders still undecided. Shown only
                  when something is genuinely pending. */}
              {!isOpen && !candidates && !summary && pending.length > 0 && canResolve && (
                <button
                  type="button"
                  onClick={() => { setCandidates(pending); setPicked([]); }}
                  className="h-11 w-full rounded-xl border border-[var(--crmx-warning)] px-4 text-[14px] font-bold text-[var(--crmx-warning-text)] hover:bg-[var(--crmx-warning-soft)]"
                >
                  مراجعة الطلبات المتبقية ({pending.length})
                </button>
              )}

              {showDecisionStep && (
                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-[13px] font-extrabold text-[var(--crmx-text)]">
                    <span className="h-3.5 w-1 rounded-full bg-[var(--crmx-primary)]" /> كيف تفسّر هذا الاختلاف؟
                  </h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    {DECISIONS.map((d) => {
                      const tone = TONE_STYLES[d.tone];
                      const isSelected = selectedDecision === d.key;
                      const Icon = d.icon;
                      return (
                        <button
                          key={d.key}
                          type="button"
                          disabled={busy !== null}
                          onClick={() => setSelectedDecision(d.key)}
                          className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 px-3 py-4 text-center transition disabled:opacity-50 ${
                            isSelected ? tone.ring : "border-[var(--crmx-border)] hover:border-[var(--crmx-text-muted)]/40"
                          }`}
                        >
                          <span className={`flex h-10 w-10 items-center justify-center rounded-full ${tone.badge}`}>
                            <Icon className="h-5 w-5" />
                          </span>
                          <span className="text-[13px] font-bold text-[var(--crmx-text)]">{d.label}</span>
                          <span className="text-[11px] leading-4 text-[var(--crmx-text-muted)]">{d.hint}</span>
                        </button>
                      );
                    })}
                  </div>

                  {selectedDecision && (
                    <div className="mt-3">
                      <label className="mb-1 block text-[12.5px] font-semibold text-[var(--crmx-text-secondary)]">ملاحظة (اختيارية)</label>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={2}
                        className="w-full rounded-xl border border-[var(--crmx-border)] bg-white px-3 py-2.5 text-[14px] text-[var(--crmx-text)] outline-none focus:border-[var(--crmx-primary)] focus:ring-2 focus:ring-[var(--crmx-primary)]/10"
                        placeholder="سبب القرار، لسجل المراجعة."
                      />
                    </div>
                  )}
                  {err && <p className="mt-2 text-[12.5px] text-[var(--crmx-danger-text)]">{err}</p>}
                </div>
              )}

              {isOpen && !canResolve && (
                <p className="rounded-2xl border border-dashed border-[var(--crmx-border)] p-4 text-center text-[13px] text-[var(--crmx-text-muted)]">
                  العرض فقط — البتّ في التعارضات يحتاج صلاحية إضافية.
                </p>
              )}
            </div>

            {showDecisionStep && (
              <footer className="flex items-center justify-end gap-2.5 border-t border-[var(--crmx-border)] bg-[var(--crmx-bg)] px-5 py-4">
                <button
                  onClick={onClose}
                  disabled={busy !== null}
                  className="h-11 rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] px-4 text-[14px] font-semibold text-[var(--crmx-text-secondary)] transition hover:bg-[var(--crmx-neutral-soft)] disabled:opacity-50"
                >
                  إلغاء
                </button>
                <button
                  disabled={!selectedDecision || busy !== null}
                  onClick={() => selectedDecision && void act(selectedDecision)}
                  className={`h-11 rounded-xl px-5 text-[14px] font-bold transition disabled:cursor-not-allowed ${
                    decision ? TONE_STYLES[decision.tone].solidBtn : "bg-[var(--crmx-neutral-soft)] text-[var(--crmx-text-muted)]"
                  }`}
                >
                  {busy ? "جارٍ التنفيذ…" : "تأكيد القرار"}
                </button>
              </footer>
            )}
          </>
        )}
      </div>
    </div>
  );
}
