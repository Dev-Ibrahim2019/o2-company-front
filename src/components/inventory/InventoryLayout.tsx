/**
 * InventoryLayout.tsx — لوحة المخازن المستقلة (/inventory/*).
 * سايدبار وهيدر للمخازن فقط بنفس تصميم AdminLayout. الصفحات نفسها من administration/inventory
 * (لا تكرار). زر "لوحة الإدارة" يظهر لأصحاب الأدوار الإدارية فقط؛ أمين المخزن لا يراه.
 */

import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  Boxes,
  ClipboardCheck,
  Factory,
  FileText,
  Flame,
  FolderTree,
  History,
  LayoutDashboard,
  Layers,
  LayoutGrid,
  Menu,
  PackagePlus,
  PackageX,
  Power,
  Ruler,
  Scale,
  Scissors,
  Settings2,
  Store,
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
  permission?: string;
}

const NAV: { title: string; items: NavItem[] }[] = [
  {
    title: "",
    items: [{ to: "/inventory/dashboard", icon: LayoutDashboard, label: "الرئيسية" }],
  },
  {
    title: "الأرصدة والحركات",
    items: [
      { to: "/inventory/balances", icon: Scale, label: "أرصدة المخزون" },
      { to: "/inventory/kardex", icon: History, label: "سجل حركة الصنف" },
      { to: "/inventory/receipts", icon: PackagePlus, label: "استلام مشتريات" },
      { to: "/inventory/transfers", icon: ArrowLeftRight, label: "تحويلات مخزنية" },
      { to: "/inventory/waste", icon: PackageX, label: "الهالك" },
      { to: "/inventory/counts", icon: ClipboardCheck, label: "الجرد الفعلي" },
    ],
  },
  {
    title: "الإنتاج والجودة",
    items: [
      { to: "/inventory/productivity", icon: ClipboardCheck, label: "الإنتاجية اليومية" },
      { to: "/inventory/batches", icon: Layers, label: "الدفعات والصلاحية" },
      { to: "/inventory/breakdowns", icon: Scissors, label: "التفريك" },
      { to: "/inventory/shawarma", icon: Flame, label: "قسم الشاورما" },
      { to: "/inventory/skewers", icon: Flame, label: "أسياخ الشاورما" },
      { to: "/inventory/production", icon: Factory, label: "إنتاج المصانع" },
      { to: "/inventory/showroom-sales", icon: Store, label: "مبيعات المعارض" },
    ],
  },
  {
    title: "التقارير",
    items: [
      { to: "/inventory/analytics", icon: BarChart3, label: "تحليلات المخزون", permission: INVENTORY_PERMISSIONS.ANALYTICS_VIEW },
      { to: "/inventory/quality-reports", icon: FileText, label: "تقارير الجودة", permission: INVENTORY_PERMISSIONS.ANALYTICS_VIEW },
    ],
  },
  {
    title: "البيانات الأساسية",
    items: [
      { to: "/inventory/items", icon: Boxes, label: "الأصناف المخزنية" },
      { to: "/inventory/categories", icon: FolderTree, label: "التصنيفات" },
      { to: "/inventory/units", icon: Ruler, label: "وحدات القياس" },
      { to: "/inventory/warehouses", icon: Warehouse, label: "المخازن" },
      { to: "/inventory/recipes", icon: BookOpen, label: "الوصفات" },
      { to: "/inventory/departments", icon: Settings2, label: "قالب الأقسام" },
    ],
  },
];

export const InventoryLayout: React.FC = () => {
  const { user, logout, hasPermission, hasRole } = useAuth();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const canSwitchToAdmin = INVENTORY_ADMIN_SWITCH_ROLES.some((r) => hasRole(r));

  // الدرج على الجوال يُغلق عند التنقل
  useEffect(() => setDrawerOpen(false), [location.pathname]);

  const sections = NAV.map((s) => ({ ...s, items: s.items.filter((i) => !i.permission || hasPermission(i.permission)) })).filter(
    (s) => s.items.length > 0,
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
        className={`fixed top-0 right-0 h-full w-64 bg-slate-900 border-l border-white/5 flex flex-col p-4 shadow-2xl transition-transform duration-300 z-50 ${
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

        <div className="mb-6 flex items-center gap-3 px-4">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-900/20 shrink-0">
            <Warehouse size={20} />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-black text-white tracking-tight leading-tight">RestoMaster</h1>
            <p className="text-[11px] font-bold text-slate-500">لوحة المخازن</p>
          </div>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto custom-scrollbar" aria-label="قائمة المخازن">
          {sections.map((section) => (
            <div key={section.title || "home"} className="space-y-1">
              {section.title && (
                <p className="px-4 pb-1 text-[10px] font-black text-slate-500 uppercase tracking-widest">{section.title}</p>
              )}
              {section.items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                      isActive
                        ? "bg-red-600 text-white shadow-lg shadow-red-900/30"
                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                    }`
                  }
                >
                  <Icon size={18} />
                  <span className="font-semibold text-sm whitespace-nowrap overflow-hidden">{label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="mt-auto border-t border-white/5 pt-4 space-y-2">
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
