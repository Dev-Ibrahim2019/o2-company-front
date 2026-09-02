import {
  Building2, CalendarDays, CalendarHeart, ChevronLeft, ChevronRight,
  LayoutList, Repeat, User,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { crmApi } from "./api";
import { CrmState, getCrmError } from "./components";
import { CrmKpiCard, CrmPageHeader } from "./customers-ui";
import "./customers-ui/crmx.css";
import { date as fmtDate, num } from "./format";
import { OccasionContactActions } from "./OccasionContactActions";
import { OccasionDetailDrawer } from "./OccasionDetailDrawer";
import { OCCASION_TYPE_LABELS } from "./occasionLabels";
import type { CrmId, CrmOccasionListRow, CrmOccasionsSummary } from "./types";

type View = "list" | "calendar";
type Range = "today" | "week" | "month" | "upcoming";

const RANGE_LABELS: Record<Range, string> = {
  today: "اليوم",
  week: "هذا الأسبوع",
  month: "هذا الشهر",
  upcoming: "القادمة",
};

const fieldLabelCls = "flex flex-col gap-1 text-[13px] font-semibold text-[var(--crmx-text-secondary)]";
const controlCls =
  "h-11 rounded-xl border border-[var(--crmx-border)] bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none transition focus:border-[var(--crmx-primary)] focus:ring-2 focus:ring-[var(--crmx-primary)]/10";
const cardCls = "rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)]";
const pill = "inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-bold whitespace-nowrap";

const MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];
// Saturday-first, the working week these branches run on.
const WEEKDAYS = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];

/** Local YYYY-MM-DD. toISOString() would shift the day across the UTC boundary. */
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * The month grid, always six rows so the page does not jump height when a
 * month starts on a different weekday.
 *
 * Days come from the server: the page requests the displayed month through
 * from/to and each row comes back with its `next_occurrence` resolved for
 * that month by CustomerOccasion::nextOccurrence(). Re-deriving the recurrence
 * here would be a second implementation of the one rule the backend spent a
 * migration unifying — and it would disagree the moment a rule changes.
 */
function MonthGrid({
  month,
  rows,
  selected,
  onSelect,
}: {
  month: Date;
  rows: CrmOccasionListRow[];
  selected: string | null;
  onSelect: (day: string) => void;
}) {
  const byDay = useMemo(() => {
    const map = new Map<string, CrmOccasionListRow[]>();
    rows.forEach((r) => {
      if (!r.next_occurrence) return;
      const key = r.next_occurrence.slice(0, 10);
      map.set(key, [...(map.get(key) ?? []), r]);
    });
    return map;
  }, [rows]);

  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  // getDay() is Sunday-first; shift so Saturday sits in column 0.
  const lead = (first.getDay() + 1) % 7;
  const todayKey = iso(new Date());

  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(month.getFullYear(), month.getMonth(), i - lead + 1);
    return { date: d, inMonth: d.getMonth() === month.getMonth(), key: iso(d) };
  });

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 pb-2">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-[12px] font-bold text-[var(--crmx-text-muted)]">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map(({ date, inMonth, key }) => {
          const dayRows = byDay.get(key) ?? [];
          const isSelected = selected === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              aria-label={`${date.getDate()} ${MONTHS[date.getMonth()]} — ${dayRows.length} مناسبة`}
              aria-pressed={isSelected}
              className={`flex h-[74px] flex-col items-start gap-1 rounded-xl border p-2 text-right transition ${
                isSelected
                  ? "border-[var(--crmx-primary)] bg-[var(--crmx-primary-soft)]"
                  : dayRows.length
                    ? "border-[var(--crmx-border)] bg-[var(--crmx-card)] hover:border-[var(--crmx-primary)]"
                    : "border-transparent bg-[var(--crmx-neutral-soft)]/40 hover:border-[var(--crmx-border)]"
              } ${inMonth ? "" : "opacity-40"}`}
            >
              <span
                className={`text-[13px] font-bold ${
                  key === todayKey
                    ? "flex h-6 w-6 items-center justify-center rounded-full bg-[var(--crmx-primary)] text-white"
                    : "text-[var(--crmx-text)]"
                }`}
              >
                {date.getDate()}
              </span>
              {dayRows.length > 0 && (
                <span className={`${pill} gap-1 bg-[var(--crmx-accent-soft)] px-2 py-0.5 text-[var(--crmx-accent)]`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--crmx-accent)]" />
                  {num(dayRows.length)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function OwnerBadge({ row }: { row: CrmOccasionListRow }) {
  const isCustomer = row.owner_type === "customer";
  const Icon = isCustomer ? User : Building2;
  const href = isCustomer
    ? `/admin/crm/customers/${row.owner_id}`
    : `/admin/crm/groups/${row.owner_id}`;

  return (
    <Link
      to={href}
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--crmx-navy)] hover:underline"
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--crmx-text-muted)]" />
      <span className="truncate">{row.owner_name ?? "—"}</span>
    </Link>
  );
}

function OccasionCard({ row, onOpen }: { row: CrmOccasionListRow; onOpen: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); }
      }}
      className={`${cardCls} cursor-pointer p-4 transition hover:border-[var(--crmx-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crmx-primary)]/20`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[14px] font-bold text-[var(--crmx-text)]">
            <CalendarHeart className="h-4 w-4 shrink-0 text-[var(--crmx-text-muted)]" />
            <span className="truncate">{row.title}</span>
          </p>
          <div className="mt-1.5"><OwnerBadge row={row} /></div>
        </div>
        <span className={`${pill} shrink-0 bg-[var(--crmx-info-soft)] text-[var(--crmx-info-text)]`}>
          {OCCASION_TYPE_LABELS[row.occasion_type] ?? row.occasion_type}
        </span>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {/* The rolled date, not the stored one — a birthday's 1999 tells the
            reader nothing about when to act. */}
        <span className={`${pill} bg-[var(--crmx-neutral-soft)] text-[var(--crmx-text-secondary)]`}>
          {fmtDate(row.next_occurrence)}
        </span>
        {row.repeats_annually && (
          <span className={`${pill} gap-1 bg-[var(--crmx-success-soft)] text-[var(--crmx-success-text)]`}>
            <Repeat className="h-3 w-3" /> سنوياً
          </span>
        )}
      </div>

      {/* Customer-owned only. The server sends owner_phone as null for a
          group, and OccasionContactActions renders nothing without a number,
          so a group card carries no contact row by construction. */}
      {row.owner_type === "customer" && row.owner_phone && (
        <div className="mt-3 border-t border-[var(--crmx-border)] pt-3">
          <OccasionContactActions
            contact={{ normalizedPhone: row.owner_phone, name: row.owner_name }}
            occasionType={row.occasion_type}
          />
        </div>
      )}
    </div>
  );
}

/**
 * The CRM-wide occasions screen.
 *
 * Two views over one dataset: a list filtered by a named range, and a month
 * calendar. They deliberately fetch differently — the list asks for a range
 * the summary also counts, the calendar asks for the exact month on screen —
 * because the same annual occasion has a different next date in each window,
 * and only the server knows how to roll it.
 */
export function OccasionsPage() {
  const [params, setParams] = useSearchParams();
  const rangeParam = (params.get("range") as Range | null) ?? "upcoming";
  const range: Range = ["today", "week", "month", "upcoming"].includes(rangeParam) ? rangeParam : "upcoming";

  const [view, setView] = useState<View>((params.get("view") as View) === "calendar" ? "calendar" : "list");
  const [ownerType, setOwnerType] = useState(params.get("owner_type") ?? "");
  const [occasionType, setOccasionType] = useState(params.get("occasion_type") ?? "");

  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const [rows, setRows] = useState<CrmOccasionListRow[]>([]);
  const [summary, setSummary] = useState<CrmOccasionsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status?: number; message: string } | null>(null);
  const [openId, setOpenId] = useState<CrmId | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const window = view === "calendar"
        ? {
            from: iso(new Date(month.getFullYear(), month.getMonth(), 1)),
            to: iso(new Date(month.getFullYear(), month.getMonth() + 1, 0)),
          }
        : { range };
      setRows(await crmApi.occasionsList({
        ...window,
        owner_type: (ownerType || undefined) as "customer" | "group" | undefined,
        occasion_type: occasionType || undefined,
      }));
    } catch (e) {
      setError(getCrmError(e));
    } finally {
      setLoading(false);
    }
  }, [view, range, month, ownerType, occasionType]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const s = await crmApi.occasionsSummary();
        if (alive) setSummary(s);
      } catch {
        if (alive) setSummary(null);
      }
    })();
    return () => { alive = false; };
  }, []);

  // The URL carries the view state so the dashboard widget can deep-link into
  // a filtered screen and a reload keeps what the reader was looking at.
  const patchParams = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };

  const shiftMonth = (delta: number) => {
    setSelectedDay(null);
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  };

  const dayRows = selectedDay ? rows.filter((r) => (r.next_occurrence ?? "").slice(0, 10) === selectedDay) : [];

  return (
    <div className="crmx-root space-y-6 p-4 sm:p-6">
      <CrmPageHeader
        title="المناسبات"
        description="مناسبات العملاء والمجموعات بتاريخها القادم بعد الدحرجة السنوية — لا بتاريخها المسجّل."
        actions={
          <div className="flex items-center gap-1 rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-1">
            {([["list", "قائمة", LayoutList], ["calendar", "تقويم", CalendarDays]] as const).map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => { setView(key); setSelectedDay(null); patchParams({ view: key }); }}
                className={`flex h-9 items-center gap-1.5 rounded-lg px-3 text-[14px] font-bold transition ${
                  view === key
                    ? "bg-[var(--crmx-primary)] text-white"
                    : "text-[var(--crmx-text-secondary)] hover:bg-[var(--crmx-neutral-soft)]"
                }`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <CrmKpiCard
          icon={<CalendarHeart className="h-5 w-5" />}
          label="مناسبات اليوم"
          tone={summary?.today ? "accent" : "navy"}
          loading={summary == null}
          value={num(summary?.today)}
        />
        <CrmKpiCard
          icon={<CalendarDays className="h-5 w-5" />}
          label="هذا الأسبوع"
          tone="navy"
          loading={summary == null}
          value={num(summary?.this_week)}
          hint={summary?.window_ends ? `حتى ${summary.window_ends.this_week}` : undefined}
        />
        <CrmKpiCard
          icon={<CalendarDays className="h-5 w-5" />}
          label="هذا الشهر"
          tone="navy"
          loading={summary == null}
          value={num(summary?.this_month)}
          hint={summary?.window_ends ? `حتى ${summary.window_ends.this_month}` : undefined}
        />
      </div>

      <div className={`${cardCls} flex flex-wrap items-end gap-3 p-4`}>
        {view === "list" && (
          <label className={fieldLabelCls}>
            المدى
            <select
              className={controlCls}
              value={range}
              onChange={(e) => patchParams({ range: e.target.value })}
            >
              {(Object.keys(RANGE_LABELS) as Range[]).map((r) => (
                <option key={r} value={r}>{RANGE_LABELS[r]}</option>
              ))}
            </select>
          </label>
        )}
        <label className={fieldLabelCls}>
          المالك
          <select
            className={controlCls}
            value={ownerType}
            onChange={(e) => { setOwnerType(e.target.value); patchParams({ owner_type: e.target.value }); }}
          >
            <option value="">الجميع</option>
            <option value="customer">عملاء</option>
            <option value="group">مجموعات</option>
          </select>
        </label>
        <label className={fieldLabelCls}>
          النوع
          <select
            className={controlCls}
            value={occasionType}
            onChange={(e) => { setOccasionType(e.target.value); patchParams({ occasion_type: e.target.value }); }}
          >
            <option value="">كل الأنواع</option>
            {(Object.keys(OCCASION_TYPE_LABELS) as Array<keyof typeof OCCASION_TYPE_LABELS>).map((v) => (
              <option key={v} value={v}>{OCCASION_TYPE_LABELS[v]}</option>
            ))}
          </select>
        </label>
      </div>

      {view === "calendar" && (
        <div className={`${cardCls} p-4 sm:p-5`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <button
              onClick={() => shiftMonth(-1)}
              aria-label="الشهر السابق"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--crmx-border)] text-[var(--crmx-text-secondary)] transition hover:bg-[var(--crmx-neutral-soft)]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <p className="text-[17px] font-bold text-[var(--crmx-text)]">
              {MONTHS[month.getMonth()]} {month.getFullYear()}
            </p>
            <button
              onClick={() => shiftMonth(1)}
              aria-label="الشهر التالي"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--crmx-border)] text-[var(--crmx-text-secondary)] transition hover:bg-[var(--crmx-neutral-soft)]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          {loading ? (
            <div className="crmx-skeleton h-[460px] w-full rounded-xl" />
          ) : error ? (
            <CrmState kind={error.status === 403 ? "forbidden" : "error"} title={error.message} retry={load} />
          ) : (
            <MonthGrid month={month} rows={rows} selected={selectedDay} onSelect={setSelectedDay} />
          )}
        </div>
      )}

      {view === "calendar" ? (
        selectedDay && (
          <div className="space-y-3">
            <h2 className="text-[15px] font-bold text-[var(--crmx-text)]">
              مناسبات {fmtDate(selectedDay)}
              <span className="ms-2 text-[13px] font-semibold text-[var(--crmx-text-muted)]">
                ({num(dayRows.length)})
              </span>
            </h2>
            {dayRows.length === 0 ? (
              <p className={`${cardCls} p-4 text-center text-[13px] text-[var(--crmx-text-muted)]`}>
                لا توجد مناسبات في هذا اليوم
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {dayRows.map((r) => (
                  <OccasionCard key={String(r.id)} row={r} onOpen={() => setOpenId(r.id)} />
                ))}
              </div>
            )}
          </div>
        )
      ) : loading ? (
        <CrmState kind="loading" title="جارٍ تحميل المناسبات" />
      ) : error ? (
        <CrmState kind={error.status === 403 ? "forbidden" : "error"} title={error.message} retry={load} />
      ) : rows.length === 0 ? (
        <CrmState kind="empty" title={`لا توجد مناسبات ضمن «${RANGE_LABELS[range]}»`} />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <OccasionCard key={String(r.id)} row={r} onOpen={() => setOpenId(r.id)} />
          ))}
        </div>
      )}

      {openId !== null && (
        <OccasionDetailDrawer
          occasionId={openId}
          // Only a customer-owned occasion carries a number; the drawer applies
          // the same rule the cards do.
          contact={(() => {
            const row = rows.find((r) => r.id === openId);
            return row?.owner_type === "customer" && row.owner_phone
              ? { normalizedPhone: row.owner_phone, name: row.owner_name }
              : undefined;
          })()}
          onClose={() => setOpenId(null)}
          onChanged={() => void load()}
        />
      )}
    </div>
  );
}
