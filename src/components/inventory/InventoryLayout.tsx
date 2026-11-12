/**
 * InventoryLayout.tsx — لوحة المخازن المستقلة (/inventory/*).
 * سايدبار وهيدر للمخازن فقط. الصفحات نفسها من administration/inventory (لا تكرار).
 * زر "لوحة الإدارة" يظهر لأصحاب الأدوار الإدارية فقط؛ أمين المخزن لا يراه.
 *
 * القائمة مرتّبة حسب دورة العمل: الرئيسية ← ① المشتريات ← ② الصرف ← ③ الجرد والهالك ← ④ التقارير
 * ← ⑤ الإعدادات الأساسية (مطويّة افتراضياً). التعريف كله في مصفوفة NAV_GROUPS؛ الصلاحيات كما هي.
 * العنصر النشط = أطول رابط يطابق المسار الحالي، فالشاشات الفرعية (/purchases/12، /balances/report،
 * /movements/new) تُبرز عنصرها الأب، و/items/tree يُبرز "شجرة الأصناف" لا "الأصناف".
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
  Menu,
  Power,
  Receipt,
  Ruler,
  Scale,
  Store,
  Trash2,
  Truck,
  Warehouse,
  X,
} from "lucide-react";
import { useAuth } from "../../auth";
import { INVENTORY_PERMISSIONS, ROLES } from "../../auth/permissions";
import { ThemeToggle } from "../shared/ThemeToggle";

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

const readCollapsed = (): Record<string, boolean> => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(NAV_STORAGE_KEY) ?? "null");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, boolean>) : {};
  } catch {
    return {};
  }
};

const writeCollapsed = (value: Record<string, boolean>) => {
  try {
    localStorage.setItem(NAV_STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* التخزين غير متاح (وضع خاص مثلاً): يبقى الطيّ لهذه الجلسة فقط */
  }
};

const NavRow: React.FC<{ item: NavItem; active: boolean }> = ({ item: { to, icon: Icon, label }, active }) => (
  <li>
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={`relative flex items-center gap-3 h-[42px] pr-4 pl-3 rounded-xl text-sm outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--o2-brand) ${
        active ? "bg-red-600/10 text-white font-black" : "text-slate-400 font-semibold hover:bg-white/5 hover:text-white"
      }`}
    >
      {active && <span aria-hidden="true" className="absolute right-0 top-2 bottom-2 w-1 rounded-l-full bg-red-600" />}
      <Icon size={18} className={`shrink-0 ${active ? "text-red-400" : ""}`} />
      <span className="truncate">{label}</span>
    </Link>
  </li>
);

export const InventoryLayout: React.FC = () => {
  const { user, logout, hasPermission, hasRole } = useAuth();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(readCollapsed);
  /** مجموعة الصفحة الحالية تُفتح تلقائياً؛ إن طواها المستخدم بنفسه نحترم ذلك حتى ينتقل لمجموعة أخرى. */
  const [dismissed, setDismissed] = useState<string | null>(null);
  const canSwitchToAdmin = INVENTORY_ADMIN_SWITCH_ROLES.some((r) => hasRole(r));

  // الدرج على الجوال يُغلق عند التنقل
  useEffect(() => setDrawerOpen(false), [location.pathname]);

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
    writeCollapsed(next);
    setDismissed(!willOpen && g.id === activeGroupId ? g.id : null);
  };

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
        className={`fixed top-0 right-0 h-full w-64 bg-slate-900 border-l border-white/5 flex flex-col shadow-2xl transition-transform duration-300 z-50 ${
          drawerOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        }`}
      >
        <button
          onClick={() => setDrawerOpen(false)}
          className="lg:hidden absolute left-3 top-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          aria-label="إغلاق القائمة"
        >
          <X size={18} />
        </button>

        <div className="shrink-0 flex items-center gap-3 px-6 pt-5 pb-4">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-900/20 shrink-0">
            <Warehouse size={20} />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-black text-white tracking-tight leading-tight">RestoMaster</h1>
            <p className="text-[11px] font-bold text-slate-500">لوحة المخازن</p>
          </div>
        </div>

        <nav ref={navRef} className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-3 pb-3" aria-label="قائمة المخازن">
          {groups.map((g, idx) => {
            if (!g.title) {
              return (
                <ul key={g.id} className="space-y-1">
                  {g.items.map((item) => (
                    <NavRow key={item.to} item={item} active={item.to === active?.to} />
                  ))}
                </ul>
              );
            }
            const open = isOpen(g);
            const holdsActive = g.id === activeGroupId;
            const panelId = `inventory-nav-${g.id}`;
            return (
              <div key={g.id} className={idx > 0 ? "mt-3 pt-3 border-t border-white/5" : ""}>
                <button
                  type="button"
                  onClick={() => toggleGroup(g)}
                  aria-expanded={open}
                  aria-controls={panelId}
                  className="w-full flex items-center gap-2.5 h-8 px-2 rounded-lg text-slate-500 hover:text-white outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--o2-brand)"
                >
                  <span
                    className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black tabular-nums shrink-0 ${
                      holdsActive ? "bg-red-600 text-white" : "bg-white/5 text-slate-400"
                    }`}
                  >
                    {g.step}
                  </span>
                  <span className="flex-1 min-w-0 text-start text-[11px] font-bold tracking-wide truncate">{g.title}</span>
                  {!open && <span className="text-[10px] font-bold tabular-nums text-slate-500">{g.items.length}</span>}
                  <ChevronDown
                    size={14}
                    aria-hidden="true"
                    className={`shrink-0 transition-transform duration-200 motion-reduce:transition-none ${open ? "" : "rotate-90"}`}
                  />
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
                      transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
                      className="overflow-hidden space-y-1 pt-1"
                    >
                      {g.items.map((item) => (
                        <NavRow key={item.to} item={item} active={item.to === active?.to} />
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-white/5 p-4 space-y-2">
          <ThemeToggle />
          <div className="px-4 py-1">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              {canSwitchToAdmin ? "الإدارة العامة" : "أمين مخزن"}
            </p>
            <p className="text-sm font-black text-slate-100 truncate">{user?.name}</p>
          </div>
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
          >
            <Power size={20} />
            <span className="font-semibold text-sm">تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 h-full overflow-hidden lg:mr-64">
        <div className="h-full flex flex-col">
          <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/5 bg-slate-900/50">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setDrawerOpen(true)}
                className="lg:hidden p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all"
                aria-label="فتح القائمة"
              >
                <Menu size={20} />
              </button>
              <div className="flex items-center gap-2 min-w-0">
                <Warehouse size={18} className="text-amber-400 shrink-0" />
                <span className="text-sm font-black text-white truncate">لوحة المخازن</span>
              </div>
            </div>
            {canSwitchToAdmin && (
              <NavLink
                to="/admin/dashboard"
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-sm font-bold transition-colors shrink-0"
              >
                <LayoutGrid size={16} />
                <span>لوحة الإدارة</span>
              </NavLink>
            )}
          </header>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};
