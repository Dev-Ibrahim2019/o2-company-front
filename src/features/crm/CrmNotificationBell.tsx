import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { crmApi } from "./api";
import { relativeTime } from "./format";
import type { CrmNotification } from "./types";

/**
 * The CRM shell's notification bell.
 *
 * Backed by Crm\NotificationController — the current user's own feed. There is
 * no realtime layer in this project, so it polls: once on mount, again every
 * 60s, and immediately after the panel is opened. Clicking an item marks it
 * read and jumps to the complaint it is about.
 */

const ACTION_ACCENT: Record<string, string> = {
  created: "bg-[var(--crmx-info-soft)] text-[var(--crmx-info-text)]",
  self_assigned: "bg-[var(--crmx-warning-soft)] text-[var(--crmx-warning-text)]",
  assigned_to_you: "bg-[var(--crmx-primary-soft)] text-[var(--crmx-primary-text)]",
  unassigned_from_you: "bg-[var(--crmx-neutral-soft)] text-[var(--crmx-text-secondary)]",
  followup_added: "bg-[var(--crmx-accent-soft)] text-[var(--crmx-accent-text)]",
  resolved: "bg-[var(--crmx-success-soft)] text-[var(--crmx-success-text)]",
  cancelled: "bg-[var(--crmx-danger-soft)] text-[var(--crmx-danger-text)]",
  // Solid, not soft — this one badge needs to read as more urgent than
  // every other row at a glance.
  urgent: "bg-[var(--crmx-danger)] text-white",
  // OrderDelayedNotification (CrmOrderDelayAlertService) — same tone as the
  // "attention" tier of the Active/Delayed orders screens' own SLA colours.
  order_delayed: "bg-[var(--crmx-warning-soft)] text-[var(--crmx-warning-text)]",
};

const POLL_MS = 60_000;

export function CrmNotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CrmNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await crmApi.notifications();
      setItems(res.data?.data ?? []);
      setUnread(res.unread_count ?? 0);
    } catch {
      /* a failed poll is silent — the bell just keeps its last state */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    void refresh();
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, refresh]);

  const openItem = async (n: CrmNotification) => {
    setOpen(false);
    if (!n.read_at) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
      setUnread((u) => Math.max(0, u - 1));
      try { await crmApi.markNotificationRead(n.id); } catch { /* best effort */ }
    }
    const url = n.data?.url;
    if (url) navigate(url);
  };

  const markAll = async () => {
    setItems((prev) => prev.map((x) => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })));
    setUnread(0);
    try { await crmApi.markAllNotificationsRead(); } catch { /* best effort */ }
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="الإشعارات"
        aria-label={unread > 0 ? `الإشعارات (${unread} غير مقروء)` : "الإشعارات"}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl text-[var(--crmx-text-muted)] transition-colors hover:bg-[var(--crmx-neutral-soft)] hover:text-[var(--crmx-navy)]"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--crmx-primary)] px-1 text-[10px] font-black text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          dir="rtl"
          className="crmx-root absolute end-0 z-50 mt-2 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] shadow-[var(--crmx-shadow-md)]"
        >
          <div className="flex items-center justify-between border-b border-[var(--crmx-border)] px-4 py-3">
            <span className="text-[13px] font-extrabold text-[var(--crmx-text)]">
              الإشعارات {unread > 0 && <span className="text-[var(--crmx-primary-text)]">({unread})</span>}
            </span>
            {unread > 0 && (
              <button
                onClick={() => void markAll()}
                className="flex items-center gap-1 text-[11.5px] font-bold text-[var(--crmx-primary-text)] hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" /> تعليم الكل كمقروء
              </button>
            )}
          </div>

          <div className="crmx-scrollbar max-h-[60vh] overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-8 text-[12.5px] text-[var(--crmx-text-muted)]">
                <Loader2 className="h-4 w-4 animate-spin" /> جارٍ التحميل…
              </div>
            ) : items.length === 0 ? (
              <p className="py-8 text-center text-[12.5px] text-[var(--crmx-text-muted)]">لا توجد إشعارات.</p>
            ) : (
              <ul className="divide-y divide-[var(--crmx-border)]">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => void openItem(n)}
                      className={`flex w-full items-start gap-2.5 px-4 py-3 text-right transition hover:bg-[var(--crmx-neutral-soft)] ${
                        n.data?.action === "urgent"
                          ? "bg-[var(--crmx-danger-soft)]/40"
                          : n.read_at ? "" : "bg-[var(--crmx-primary-soft)]/30"
                      }`}
                    >
                      <span className={`mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-black ${ACTION_ACCENT[n.data?.action ?? ""] ?? "bg-[var(--crmx-neutral-soft)] text-[var(--crmx-text-secondary)]"}`}>
                        {n.data?.action === "urgent" ? "عاجل" : n.data?.action === "order_delayed" ? "تأخير" : !n.read_at ? "جديد" : "•"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12.5px] font-semibold leading-5 text-[var(--crmx-text)]">
                          {n.data?.message ?? "إشعار"}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-[var(--crmx-text-muted)]">
                          {relativeTime(n.created_at ?? null)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
