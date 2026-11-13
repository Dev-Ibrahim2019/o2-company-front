/**
 * InventoryLayout.tsx — لوحة المخازن المستقلة (/inventory/*).
 * سايدبار وهيدر للمخازن فقط. الصفحات نفسها من administration/inventory (لا تكرار).
 * زر "لوحة الإدارة" يظهر لأصحاب الأدوار الإدارية فقط؛ أمين المخزن لا يراه.
 *
 * القائمة مرتّبة حسب دورة العمل: الرئيسية ← ① المشتريات ← ② الصرف ← ③ الجرد والهالك ← ④ التقارير
 * ← ⑤ الإعدادات الأساسية (مطويّة افتراضياً). التعريف كله في مصفوفة NAV_GROUPS؛ الصلاحيات كما هي.
 * العنصر النشط = أطول رابط يطابق المسار الحالي، فالشاشات الفرعية (/purchases/12، /balances/report،
 * /movements/new) تُبرز عنصرها الأب، و/items/tree يُبرز "شجرة الأصناف" لا "الأصناف".
 *
 * على سطح المكتب تُطوى القائمة إلى شريط أيقونات (زر الهيدر، ويُحفظ الاختيار). عمود الأيقونات ثابت
 * الموضع في الوضعين، فالطيّ حركة عرض فقط تختفي معها النصوص تدريجياً، والمؤشّر النشط ينزلق بين العناصر.
 */

import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  Boxes,
  ChevronDown,
  ClipboardCheck,
  FolderTree,
  History,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  ListTree,
  LogOut,
  Menu,
  Moon,
  PanelRightClose,
  PanelRightOpen,
  Receipt,
  Ruler,
  Scale,
  Store,
  Sun,
  Trash2,
  Truck,
  Warehouse,
  X,
} from "lucide-react";
import { useAuth } from "../../auth";
import { INVENTORY_PERMISSIONS, ROLES } from "../../auth/permissions";
import { useTheme } from "../../theme";

/** من يرى زر الرجوع للوحة الإدارة (نفس ADMIN_ROLES في App.tsx). */
export const INVENTORY_ADMIN_SWITCH_ROLES: string[] = [ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT, ROLES.BRANCH_MANAGER];

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  /** صلاحية واحدة، أو قائمة يكفي أي منها. */
  permission?: string | string[];
}

interface NavGroup {
  id: string;
  /** رقم المرحلة في دورة العمل. مجموعة بلا عنوان (الرئيسية) لا تُطوى. */
  step?: number;
  title?: string;
  /** مطويّة افتراضياً ما لم يغيّرها المستخدم. */
  defaultCollapsed?: boolean;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: "home",
    items: [{ to: "/inventory/dashboard", icon: LayoutDashboard, label: "الرئيسية" }],
  },
  {
    id: "purchases",
    step: 1,
    title: "المشتريات (التوريد)",
    items: [
      { to: "/inventory/purchases", icon: Receipt, label: "فواتير المشتريات", permission: INVENTORY_PERMISSIONS.PURCHASES_VIEW },
      { to: "/inventory/receipts", icon: Truck, label: "استلام مشتريات" },
    ],
  },
  {
    id: "issue",
    step: 2,
    title: "الصرف",
    items: [{ to: "/inventory/transfers", icon: ArrowLeftRight, label: "صرفيات الأصناف" }],
  },
  {
    id: "counts",
    step: 3,
    title: "الجرد والهالك",
    items: [
      { to: "/inventory/counts", icon: ClipboardCheck, label: "الجرد" },
      { to: "/inventory/waste", icon: Trash2, label: "الهالك" },
    ],
  },
  {
    id: "reports",
    step: 4,
    title: "التقارير",
    items: [
      // يشمل /inventory/balances/report (الأرصدة في تاريخ) — زرّه داخل صفحة الأرصدة.
      { to: "/inventory/balances", icon: Scale, label: "أرصدة المخزون" },
      { to: "/inventory/movements", icon: Activity, label: "الحركات المخزنية" },
      { to: "/inventory/kardex", icon: History, label: "كرت الصنف" },
      { to: "/inventory/layers", icon: Layers, label: "تقارير الدفعات" },
      { to: "/inventory/analytics", icon: BarChart3, label: "التحليلات", permission: INVENTORY_PERMISSIONS.ANALYTICS_VIEW },
    ],
  },
  {
    id: "settings",
    step: 5,
    title: "الإعدادات الأساسية",
    defaultCollapsed: true,
    items: [
      { to: "/inventory/items", icon: Boxes, label: "الأصناف" },
      { to: "/inventory/items/tree", icon: ListTree, label: "شجرة الأصناف" },
      { to: "/inventory/categories", icon: FolderTree, label: "التصنيفات" },
      { to: "/inventory/units", icon: Ruler, label: "الوحدات" },
      { to: "/inventory/recipes", icon: BookOpen, label: "الوصفات" },
      { to: "/inventory/warehouses", icon: Warehouse, label: "المخازن" },
      {
        to: "/inventory/departments",
        icon: Store,
        label: "الأقسام",
        permission: [INVENTORY_PERMISSIONS.ANALYTICS_VIEW, INVENTORY_PERMISSIONS.COUNTS_MANAGE],
      },
    ],
  },
];

/** حالة طيّ المجموعات التي اختارها المستخدم: { [groupId]: collapsed }. */
const NAV_STORAGE_KEY = "o2.inventory.nav.collapsed";
/** وضع شريط الأيقونات على سطح المكتب: "1" مطويّ. */
const RAIL_STORAGE_KEY = "o2.inventory.nav.rail";

const readCollapsed = (): Record<string, boolean> => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(NAV_STORAGE_KEY) ?? "null");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, boolean>) : {};
  } catch {
    return {};
  }
};

const readRail = (): boolean => {
  try {
    return localStorage.getItem(RAIL_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

/** التخزين قد يكون غير متاح (وضع خاص مثلاً): يبقى الاختيار لهذه الجلسة فقط. */
const store = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* تجاهل */
  }
};

const DESKTOP_QUERY = "(min-width: 1024px)";

/** شريط الأيقونات لسطح المكتب فقط؛ درج الجوال يبقى كاملاً دائماً. */
const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(DESKTOP_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isDesktop;
};

/** عرض الشريط المطويّ — يطابق lg:w-16 و lg:mr-16 أدناه؛ التلميح يظهر بجانبه. */
const RAIL_WIDTH = 64;

type HintHandlers = Pick<React.HTMLAttributes<HTMLElement>, "onMouseEnter" | "onMouseLeave" | "onFocus" | "onBlur">;

const NavRow: React.FC<{ item: NavItem; active: boolean; rail: boolean; reduceMotion: boolean; hint: HintHandlers }> = ({
  item: { to, icon: Icon, label },
  active,
  rail,
  reduceMotion,
  hint,
}) => (
  <li>
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      {...hint}
      className={`relative flex items-center gap-3 h-10 lg:h-9.5 pr-3.5 pl-2 rounded-lg overflow-hidden whitespace-nowrap text-[13.5px] outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--o2-brand) ${
        active ? "text-white font-bold" : "text-slate-400 font-medium hover:bg-white/5 hover:text-white"
      }`}
    >
      {active && (
        // مؤشّر واحد مشترك (layoutId) ينزلق من العنصر السابق إلى الجديد عند التنقل
        <motion.span
          layoutId="inventory-nav-active"
          aria-hidden="true"
          // tween محدود المدة (لا spring): المجموعة المطويّة تنتظر انتهاء هذه الحركة قبل أن تختفي
          transition={reduceMotion ? { duration: 0 } : { type: "tween", duration: 0.22, ease: [0.2, 0, 0, 1] }}
          className="absolute inset-0 rounded-lg bg-red-600/10"
        >
          <span className="absolute right-0 top-2 bottom-2 w-[3px] rounded-l-full bg-red-600" />
        </motion.span>
      )}
      <Icon size={18} className={`relative shrink-0 ${active ? "text-red-400" : ""}`} />
      <span className={`relative truncate transition-opacity duration-150 ${rail ? "opacity-0" : "opacity-100"}`}>{label}</span>
    </Link>
  </li>
);

const FooterButton: React.FC<{ label: string; onClick: () => void; danger?: boolean; hint: HintHandlers; children: React.ReactNode }> = ({
  label,
  onClick,
  danger,
  hint,
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    {...hint}
    className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--o2-brand) ${
      danger ? "text-red-400 hover:bg-red-500/10" : "text-slate-400 hover:text-white hover:bg-white/5"
    }`}
  >
    {children}
  </button>
);

export const InventoryLayout: React.FC = () => {
  const { user, logout, hasPermission, hasRole } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const reduceMotion = Boolean(useReducedMotion());
  const isDesktop = useIsDesktop();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [railPref, setRailPref] = useState(readRail);
  const rail = railPref && isDesktop;
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(readCollapsed);
  /** مجموعة الصفحة الحالية تُفتح تلقائياً؛ إن طواها المستخدم بنفسه نحترم ذلك حتى ينتقل لمجموعة أخرى. */
  const [dismissed, setDismissed] = useState<string | null>(null);
  /** تلميح الاسم بجانب الأيقونة في الشريط المطويّ. */
  const [hint, setHint] = useState<{ label: string; top: number } | null>(null);
  const canSwitchToAdmin = INVENTORY_ADMIN_SWITCH_ROLES.some((r) => hasRole(r));
  const roleLabel = canSwitchToAdmin ? "الإدارة العامة" : "أمين مخزن";
  const themeLabel = theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن";

  // الدرج على الجوال يُغلق عند التنقل، والتلميح يختفي
  useEffect(() => {
    setDrawerOpen(false);
    setHint(null);
  }, [location.pathname]);
  useEffect(() => setHint(null), [rail]);

  const allowed = (p: NavItem["permission"]) => !p || (Array.isArray(p) ? p.some((x) => hasPermission(x)) : hasPermission(p));
  const groups = NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => allowed(i.permission)) })).filter(
    (g) => g.items.length > 0,
  );

  // أطول رابط يطابق المسار = العنصر النشط (يغطي الشاشات الفرعية).
  const pathname = location.pathname.replace(/\/+$/, "");
  const active = ((): { to: string; groupId: string } | null => {
    let best: { to: string; groupId: string } | null = null;
    for (const g of groups) {
      for (const i of g.items) {
        if ((pathname === i.to || pathname.startsWith(`${i.to}/`)) && (!best || i.to.length > best.to.length)) {
          best = { to: i.to, groupId: g.id };
        }
      }
    }
    return best;
  })();
  const activeGroupId = active?.groupId ?? null;

  useEffect(() => setDismissed(null), [activeGroupId]);

  // إبقاء العنصر النشط ظاهراً في القائمة (بعد انتهاء حركة فتح المجموعة، وعند فتح الدرج على الجوال).
  const navRef = useRef<HTMLElement>(null);
  const activeTo = active?.to;
  useEffect(() => {
    const t = window.setTimeout(() => {
      // تمرير القائمة نفسها فقط (scrollIntoView قد يحرّك حاويات أخرى والدرج مخفي جانبياً)
      const nav = navRef.current;
      const el = nav?.querySelector<HTMLElement>('[aria-current="page"]');
      if (!nav || !el) return;
      const n = nav.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      if (r.top < n.top) nav.scrollTop -= n.top - r.top + 8;
      else if (r.bottom > n.bottom) nav.scrollTop += r.bottom - n.bottom + 8;
    }, 250);
    return () => window.clearTimeout(t);
  }, [activeTo, drawerOpen]);

  const isOpen = (g: NavGroup) => {
    if (!g.title) return true;
    if (g.id === activeGroupId && dismissed !== g.id) return true;
    return !(collapsed[g.id] ?? g.defaultCollapsed ?? false);
  };

  const toggleGroup = (g: NavGroup) => {
    const willOpen = !isOpen(g);
    const next = { ...collapsed, [g.id]: !willOpen };
    setCollapsed(next);
    store(NAV_STORAGE_KEY, JSON.stringify(next));
    setDismissed(!willOpen && g.id === activeGroupId ? g.id : null);
  };

  const toggleRail = () => {
    const next = !railPref;
    setRailPref(next);
    store(RAIL_STORAGE_KEY, next ? "1" : "0");
  };

  const hideHint = () => setHint(null);
  const hintProps = (label: string): HintHandlers => {
    if (!rail) return {};
    const show = (e: React.SyntheticEvent<HTMLElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      setHint({ label, top: r.top + r.height / 2 });
    };
    return { onMouseEnter: show, onFocus: show, onMouseLeave: hideHint, onBlur: hideHint };
  };

  const fade = `transition-opacity duration-150 ${rail ? "opacity-0" : "opacity-100"}`;
  const avatar = (
    <span className="w-8 h-8 shrink-0 rounded-full bg-red-600/10 text-red-400 text-[12px] font-black flex items-center justify-center uppercase">
      {user?.name?.trim().charAt(0) || "؟"}
    </span>
  );

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden text-slate-100 font-['Tajawal']" dir="rtl">
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed top-0 right-0 h-full w-64 ${rail ? "lg:w-16" : "lg:w-60"} bg-slate-900 border-l border-white/5 flex flex-col shadow-2xl lg:shadow-none transition-[width,translate] duration-200 ease-out motion-reduce:transition-none z-50 ${
          drawerOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        }`}
      >
        {/* الشعار بارتفاع الهيدر (44px) — خط علوي واحد عبر الشاشة */}
        <div className="shrink-0 h-11 flex items-center gap-2.5 pr-4 pl-2 border-b border-white/5 overflow-hidden whitespace-nowrap">
          <div className="w-8 h-8 shrink-0 bg-red-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-red-900/30">
            <Warehouse size={16} />
          </div>
          <div className={`min-w-0 flex-1 leading-tight ${fade}`}>
            <p className="text-[14px] font-black text-white tracking-tight">RestoMaster</p>
            <p className="text-[10.5px] font-bold text-slate-500">لوحة المخازن</p>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="lg:hidden w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
            aria-label="إغلاق القائمة"
          >
            <X size={16} />
          </button>
        </div>

        <motion.nav
          ref={navRef}
          layoutScroll
          onScroll={hideHint}
          className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 py-2 ${rail ? "scrollbar-hide" : "custom-scrollbar"}`}
          aria-label="قائمة المخازن"
        >
          {groups.map((g, idx) => {
            if (!g.title) {
              return (
                <ul key={g.id} className="space-y-0.5">
                  {g.items.map((item) => (
                    <NavRow key={item.to} item={item} active={item.to === active?.to} rail={rail} reduceMotion={reduceMotion} hint={hintProps(item.label)} />
                  ))}
                </ul>
              );
            }
            const open = isOpen(g);
            const holdsActive = g.id === activeGroupId;
            const panelId = `inventory-nav-${g.id}`;
            return (
              <div key={g.id} className={idx > 0 ? "mt-2 pt-2 border-t border-white/5" : ""}>
                <button
                  type="button"
                  onClick={() => toggleGroup(g)}
                  aria-expanded={open}
                  aria-controls={panelId}
                  aria-label={rail ? g.title : undefined}
                  {...hintProps(g.title)}
                  className="w-full flex items-center gap-3 h-8 pr-3.5 pl-2 rounded-md overflow-hidden whitespace-nowrap text-slate-500 hover:text-white outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--o2-brand)"
                >
                  <span
                    className={`w-[18px] h-[18px] shrink-0 rounded flex items-center justify-center text-[10px] font-black tabular-nums transition-colors ${
                      holdsActive ? "bg-red-600 text-white" : "bg-white/10 text-slate-400"
                    }`}
                  >
                    {g.step}
                  </span>
                  <span className={`flex-1 min-w-0 flex items-center gap-2 ${fade}`}>
                    <span className="flex-1 min-w-0 text-start text-[11px] font-bold tracking-wide truncate">{g.title}</span>
                    {!open && <span className="text-[10.5px] font-bold tabular-nums">{g.items.length}</span>}
                    <ChevronDown
                      size={13}
                      aria-hidden="true"
                      className={`shrink-0 transition-transform duration-200 motion-reduce:transition-none ${open ? "" : "rotate-90"}`}
                    />
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.ul
                      key="items"
                      id={panelId}
                      aria-label={g.title}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.2, 0, 0, 1] }}
                      className="overflow-hidden space-y-0.5 pt-0.5"
                    >
                      {g.items.map((item) => (
                        <NavRow key={item.to} item={item} active={item.to === active?.to} rail={rail} reduceMotion={reduceMotion} hint={hintProps(item.label)} />
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </motion.nav>

        <div className="shrink-0 border-t border-white/5 p-2">
          {rail ? (
            <div className="flex flex-col items-center gap-1">
              <span {...hintProps(`${user?.name ?? ""} · ${roleLabel}`)}>{avatar}</span>
              <FooterButton label={themeLabel} onClick={toggleTheme} hint={hintProps(themeLabel)}>
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </FooterButton>
              <FooterButton label="تسجيل الخروج" danger onClick={() => logout()} hint={hintProps("تسجيل الخروج")}>
                <LogOut size={16} />
              </FooterButton>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 pr-1">
              {avatar}
              <div className="min-w-0 flex-1 leading-tight">
                <p className="text-[12.5px] font-bold text-slate-100 truncate">{user?.name}</p>
                <p className="text-[10.5px] font-semibold text-slate-500 truncate">{roleLabel}</p>
              </div>
              <FooterButton label={themeLabel} onClick={toggleTheme} hint={{}}>
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </FooterButton>
              <FooterButton label="تسجيل الخروج" danger onClick={() => logout()} hint={{}}>
                <LogOut size={16} />
              </FooterButton>
            </div>
          )}
        </div>
      </aside>

      {rail && hint && (
        <div
          role="tooltip"
          className="fixed z-[60] pointer-events-none -translate-y-1/2 px-2.5 py-1 rounded-md bg-slate-800 border border-white/10 text-[12.5px] font-bold text-white shadow-lg whitespace-nowrap"
          style={{ top: hint.top, right: RAIL_WIDTH + 8 }}
        >
          {hint.label}
        </div>
      )}

      {/* o2-compact: كثافة واجهات الإدارة (خطوط ومسافات من سلّم index.css) على المحتوى فقط؛ السايدبار له مقاساته. */}
      <main
        className={`o2-compact flex-1 h-full overflow-hidden transition-[margin] duration-200 ease-out motion-reduce:transition-none ${
          rail ? "lg:mr-16" : "lg:mr-60"
        }`}
      >
        <div className="h-full flex flex-col">
          <header className="shrink-0 h-11 flex items-center justify-between gap-3 px-3 border-b border-white/5 bg-slate-900/50">
            <div className="flex items-center gap-2 min-w-0">
              {isDesktop ? (
                <button
                  onClick={toggleRail}
                  aria-label={rail ? "توسيع القائمة الجانبية" : "طيّ القائمة الجانبية"}
                  title={rail ? "توسيع القائمة الجانبية" : "طيّ القائمة الجانبية"}
                  aria-expanded={!rail}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  {rail ? <PanelRightOpen size={17} /> : <PanelRightClose size={17} />}
                </button>
              ) : (
                <button
                  onClick={() => setDrawerOpen(true)}
                  aria-label="فتح القائمة"
                  aria-expanded={drawerOpen}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <Menu size={18} />
                </button>
              )}
              <div className="flex items-center gap-2 min-w-0">
                <Warehouse size={16} className="text-amber-400 shrink-0" />
                <span className="text-sm font-black text-white truncate">لوحة المخازن</span>
              </div>
            </div>
            {canSwitchToAdmin && (
              <NavLink
                to="/admin/dashboard"
                className="o2-btn bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <LayoutGrid size={15} />
                <span>لوحة الإدارة</span>
              </NavLink>
            )}
          </header>
          <div className="o2-page flex-1 overflow-y-auto custom-scrollbar">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};
