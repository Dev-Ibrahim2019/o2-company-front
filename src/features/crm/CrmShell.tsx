import { Bell, ChevronDown, ChevronLeft, Menu, X } from "lucide-react";
import { createContext, useContext, useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../auth";
import { crmApi } from "./api";
import { CRM_NAVIGATION } from "./crmNavigation";
import "./customers-ui/crmx.css";

// Shared operational counts (active/delayed orders), fetched once per CRM
// session at the shell level rather than separately by the Dashboard KPI
// cards and the sidebar badge — both consume this via useCrmOperational()
// instead of each issuing their own request for the same numbers. Fetched
// once on mount; no polling (per explicit "no new real-time infrastructure"
// instruction) — a fresh count is one page reload away.
interface CrmOperationalCounts {
  activeCount: number | null;
  delayedCount: number | null;
  loading: boolean;
  error: boolean;
}
const CrmOperationalContext = createContext<CrmOperationalCounts>({
  activeCount: null, delayedCount: null, loading: true, error: false,
});
export function useCrmOperational(): CrmOperationalCounts {
  return useContext(CrmOperationalContext);
}

// Note: no theme toggle in this header — the CRM design system (crmx.css)
// only defines light-theme tokens today, so wiring the app's global
// dark/light toggle in here would flip other modules while visibly doing
// nothing to CRM. Add one only once CRM actually has dark tokens to switch to.

// CrmShell is the CRM module's own, fully independent shell — sidebar +
// header + content — with no AdminLayout ancestor. It owns its layout only;
// routing/permissions stay exactly as wired in App.tsx/CrmRouteGuard.

const ROLE_LABELS: Record<string, string> = {
  "crm-manager": "مدير CRM",
  "super-admin": "مدير النظام",
  "accountant": "محاسب",
  "branch-manager": "مدير فرع",
};

function isChildActive(pathname: string, search: string, to: string): boolean {
  const [toPath, toQuery = ""] = to.split("?");
  if (pathname !== toPath) return false;
  return search.replace(/^\?/, "") === toQuery;
}

function CrmSidebar({ mobileOpen, onClose, delayedCount }: { mobileOpen: boolean; onClose: () => void; delayedCount: number | null }) {
  const location = useLocation();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const comingSoonItems = CRM_NAVIGATION.filter((item) => item.comingSoon);

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="إغلاق القائمة"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-[var(--crmx-navy)]/40 lg:hidden"
        />
      )}
      <aside
        className={`crmx-sidebar-scroll fixed inset-y-0 start-0 z-40 flex w-[252px] shrink-0 flex-col overflow-y-auto bg-[var(--crmx-navy)] px-3.5 py-5 transition-transform duration-200 lg:static lg:h-screen lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="mb-6 flex items-center gap-2.5 px-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--crmx-primary)] text-[13px] font-black text-white">
            O2
          </span>
          <div className="min-w-0 flex-1">
            <strong className="block truncate text-[14px] font-extrabold text-white">O2 CRM</strong>
            <p className="truncate text-[11px] text-white/45">إدارة علاقات العملاء</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق القائمة"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/60 hover:bg-white/8 hover:text-white lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

      <nav aria-label="أقسام إدارة علاقات العملاء" className="flex flex-1 flex-col gap-1">
        {CRM_NAVIGATION.filter((item) => !item.comingSoon).map((item) => {
          const Icon = item.icon;

          if (item.children?.length) {
            const groupActive = Boolean(item.to && location.pathname.startsWith(item.to));
            const expanded = openGroup === item.key || (openGroup === null && groupActive);
            return (
              <div key={item.key}>
                <button
                  type="button"
                  onClick={() => setOpenGroup(expanded ? null : item.key)}
                  aria-expanded={expanded}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-bold transition-colors ${
                    groupActive ? "bg-[var(--crmx-primary)] text-white" : "text-white/70 hover:bg-white/8 hover:text-white"
                  }`}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  <span className="flex-1 truncate text-right">{item.label}</span>
                  <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
                </button>
                {expanded && (
                  <div className="mt-1 ms-[22px] flex flex-col gap-0.5 border-s border-white/12 ps-3.5">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      const active = isChildActive(location.pathname, location.search, child.to);
                      const showBadge = child.key === "orders-delayed" && delayedCount != null && delayedCount > 0;
                      return (
                        <Link
                          key={child.key}
                          to={child.to}
                          className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] font-semibold transition-colors ${
                            active ? "bg-white/14 text-white" : "text-white/55 hover:bg-white/8 hover:text-white"
                          }`}
                        >
                          {ChildIcon && <ChildIcon className="h-3.5 w-3.5 shrink-0" />}
                          <span className="flex-1 truncate">{child.label}</span>
                          {showBadge && (
                            <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-[var(--crmx-danger)] px-1 text-[10px] font-bold text-white">
                              {delayedCount!.toLocaleString("ar")}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const active = item.end ? location.pathname === item.to : location.pathname.startsWith(item.to!);
          return (
            <Link
              key={item.key}
              to={item.to!}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-bold transition-colors ${
                active ? "bg-[var(--crmx-primary)] text-white" : "text-white/70 hover:bg-white/8 hover:text-white"
              }`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {comingSoonItems.length > 0 && (
        <div className="mt-3 border-t border-white/10 pt-3">
          <p className="mb-1 px-3 text-[10.5px] font-bold uppercase tracking-wide text-white/30">قريبًا</p>
          <div className="flex flex-col gap-0.5">
            {comingSoonItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.key}
                  aria-disabled="true"
                  className="flex cursor-default items-center gap-3 rounded-lg px-3 py-2 text-[12.5px] font-semibold text-white/30"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-4 border-t border-white/10 pt-3.5">
        <Link
          to="/admin/dashboard"
          className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[12.5px] font-bold text-white/55 transition-colors hover:bg-white/8 hover:text-white"
        >
          <ChevronLeft className="h-4 w-4 shrink-0" />
          العودة إلى لوحة الإدارة
        </Link>
      </div>
      </aside>
    </>
  );
}

function CrmHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const { user } = useAuth();
  const primaryRole = user?.roles?.[0];
  const roleLabel = (primaryRole && ROLE_LABELS[primaryRole]) || "مستخدم CRM";
  const initial = (user?.name || "؟").trim().charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-[var(--crmx-border)] bg-[var(--crmx-card)] px-4 sm:px-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="فتح القائمة"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--crmx-text-muted)] transition-colors hover:bg-[var(--crmx-neutral-soft)] hover:text-[var(--crmx-navy)] lg:hidden"
        >
          <Menu className="h-[18px] w-[18px]" />
        </button>
        <span className="hidden text-[13px] font-semibold text-[var(--crmx-text-muted)] sm:inline">O2 CRM</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          title="الإشعارات"
          aria-label="الإشعارات"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--crmx-text-muted)] transition-colors hover:bg-[var(--crmx-neutral-soft)] hover:text-[var(--crmx-navy)]"
        >
          <Bell className="h-[18px] w-[18px]" />
        </button>

        <div className="ms-1 flex items-center gap-2.5 border-s border-[var(--crmx-border)] ps-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--crmx-navy-soft)] text-[13px] font-black text-[var(--crmx-navy)]">
            {initial}
          </span>
          <div className="hidden text-right sm:block">
            <p className="text-[13px] font-bold leading-tight text-[var(--crmx-text)]">{user?.name || "—"}</p>
            <p className="text-[11px] leading-tight text-[var(--crmx-text-muted)]">{roleLabel}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

export function CrmShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();
  const [operational, setOperational] = useState<CrmOperationalCounts>({
    activeCount: null, delayedCount: null, loading: true, error: false,
  });

  // Close the mobile overlay automatically on navigation.
  useEffect(() => setMobileNavOpen(false), [location.pathname, location.search]);

  // Fetched once for the whole CRM session — reuses the exact endpoints the
  // Orders pages already call, just with per_page=1 since only the real
  // pagination total is needed here, not the rows themselves.
  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      crmApi.orders(new URLSearchParams({ active: "1", per_page: "1" })),
      crmApi.delayedOrders(new URLSearchParams({ per_page: "1" })),
    ]).then(([active, delayed]) => {
      if (cancelled) return;
      setOperational({
        activeCount: active.status === "fulfilled" ? active.value.total : null,
        delayedCount: delayed.status === "fulfilled" ? delayed.value.total : null,
        loading: false,
        error: active.status === "rejected" || delayed.status === "rejected",
      });
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <CrmOperationalContext.Provider value={operational}>
      <div className="crmx-root flex" dir="rtl">
        <CrmSidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} delayedCount={operational.delayedCount} />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <CrmHeader onMenuClick={() => setMobileNavOpen(true)} />
          <main className="flex-1 bg-[var(--crmx-bg)]">
            <Outlet />
          </main>
        </div>
      </div>
    </CrmOperationalContext.Provider>
  );
}
