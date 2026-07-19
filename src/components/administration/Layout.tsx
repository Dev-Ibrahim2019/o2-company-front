/**
 * administration/Layout.tsx — النسخة المُحدّثة مع react-router-dom
 * يستخدم NavLink للتنقل و Outlet لعرض المحتوى
 */

import React, { useState, useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useApp } from "../../../store";
import { useAuth, Can } from "../../auth";
import { PERMISSIONS } from "../../auth/permissions";
import { ThemeToggle } from "../shared/ThemeToggle";
import { motion, AnimatePresence } from "framer-motion";
import {
  Power,
  Building2,
  LayoutDashboard,
  ChevronRight,
  ChevronLeft,
  Menu,
  Settings,
  FileText,
  Package,
  Layers,
  ListTree,
  Table2,
  Users2,
  Archive,
  BookOpen,
  Receipt,
  ReceiptText,
  Wallet,
  Banknote,
  ChevronDown,
  Shield,
  Percent,
  Monitor,
  HeartHandshake,
  Grid3X3,
  Puzzle,
  Radio,
  Phone,
  FileAudio,
  Printer,
} from "lucide-react";

/* ── روابط التنقل ── */
const NAV = [
  {
    to: "/admin/dashboard",
    icon: LayoutDashboard,
    label: "لوحة المعلومات",
    exact: true,
  },
  {
    to: "/admin/branches",
    icon: Building2,
    label: "إدارة الأفرع",
    permission: PERMISSIONS.MANAGE_BRANCHES,
  },
  {
    to: "/admin/departments",
    icon: Layers,
    label: "إدارة الأقسام",
    permission: PERMISSIONS.MANAGE_DEPARTMENTS,
  },
  {
    to: "/admin/item-tree",
    icon: ListTree,
    label: "شجرة الأصناف",
    permission: PERMISSIONS.MANAGE_ITEMS,
    indent: true,
  },
  {
    to: "/admin/items-index",
    icon: Table2,
    label: "فهرس الأصناف",
    permission: PERMISSIONS.MANAGE_ITEMS,
    indent: true,
    group: "items",
  },
  {
    to: "/admin/employees",
    icon: Users2,
    label: "إدارة الموظفين",
    permission: PERMISSIONS.MANAGE_EMPLOYEES,
  },
  {
    to: "/admin/accounting/dashboard",
    icon: LayoutDashboard,
    label: "الرئيسية المالية",
    permission: PERMISSIONS.VIEW_ACCOUNTING,
    indent: true,
    group: "accounting",
  },
  {
    to: "/admin/accounting/gl",
    icon: BookOpen,
    label: "المحاسبة العامة",
    permission: PERMISSIONS.MANAGE_ACCOUNTING,
    indent: true,
    group: "accounting",
  },
  {
    to: "/admin/sales-invoices",
    icon: ReceiptText,
    label: "فواتير المبيعات",
    permission: PERMISSIONS.MANAGE_INVOICES,
    indent: true,
    group: "accounting",
  },
  {
    to: "/admin/customers",
    icon: Receipt,
    label: "حسابات العملاء",
    permission: PERMISSIONS.MANAGE_CUSTOMERS,
    indent: true,
    group: "accounting",
  },
  {
    to: "/admin/suppliers",
    icon: Wallet,
    label: "حسابات الموردين",
    permission: PERMISSIONS.MANAGE_SUPPLIERS,
    indent: true,
    group: "accounting",
  },
  {
    to: "/admin/quotes",
    icon: FileText,
    label: "عروض الأسعار",
    permission: PERMISSIONS.MANAGE_INVOICES,
    indent: true,
    group: "accounting",
  },
  {
    to: "/admin/vouchers",
    icon: Banknote,
    label: "السندات المحاسبية",
    permission: PERMISSIONS.VIEW_ACCOUNTING,
    indent: true,
    group: "accounting",
  },
  {
    to: "/admin/purchase-bills",
    icon: ReceiptText,
    label: "فواتير المشتريات",
    permission: PERMISSIONS.MANAGE_INVOICES,
    indent: true,
    group: "accounting",
  },
  {
    to: "/admin/reports",
    icon: FileText,
    label: "مركز التقارير",
    permission: PERMISSIONS.VIEW_REPORTS,
  },
  {
    to: "/admin/audit",
    icon: FileText,
    label: "سجل التدقيق",
    permission: PERMISSIONS.VIEW_AUDIT_LOG,
  },
  {
    to: "/admin/archive",
    icon: Archive,
    label: "أرشيف العمليات",
    permission: PERMISSIONS.VIEW_ARCHIVE,
  },
  {
    to: "/admin/settings",
    icon: Settings,
    label: "الإعدادات العامة",
    permission: PERMISSIONS.MANAGE_SETTINGS,
  },
  {
    to: "/admin/orgstructure",
    icon: Building2,
    label: "الهيكل التنظيمي",
    permission: PERMISSIONS.MANAGE_EMPLOYEES,
  },
  {
    to: "/admin/pos-registers",
    icon: Monitor,
    label: "نقاط البيع",
    permission: PERMISSIONS.MANAGE_POS_REGISTERS,
  },
  {
    to: "/admin/hospitality-devices",
    icon: HeartHandshake,
    label: "أجهزة الضيافة",
    permission: PERMISSIONS.MANAGE_HOSPITALITY_DEVICES,
  },
  {
    to: "/admin/dining-zones",
    icon: Grid3X3,
    label: "القاعات والطاولات",
    permission: PERMISSIONS.MANAGE_DINING_ZONES,
  },
  {
    to: "/admin/pos",
    icon: Monitor,
    label: "واجهة الكاشير",
    permission: PERMISSIONS.ACCESS_POS_INTERFACE,
  },
  {
    to: "/admin/extensions-test",
    icon: Puzzle,
    label: "اختبار الإضافات",
    permission: PERMISSIONS.MANAGE_SETTINGS,
  },
];

export const AdminLayout: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const { currentUser } = useApp();
  const { logout: authLogout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const handleResize = () => setIsSidebarOpen(window.innerWidth > 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // فتح المجموعات تلقائياً حسب الرابط الحالي
  useEffect(() => {
    const path = window.location.pathname;
    if (
      path.startsWith("/admin/accounting") ||
      path.startsWith("/admin/discounts")
    )
      setOpenGroups((p) => ({ ...p, accounting: true }));
    if (path.includes("item-tree") || path.includes("items-index"))
      setOpenGroups((p) => ({ ...p, items: true }));
  }, []);

  const collapsed = !isSidebarOpen;

  /* ── مكوّن رابط Sidebar ── */
  const SidebarLink = ({
    to,
    icon: Icon,
    label,
    indent,
    exact,
    permission,
  }: {
    to: string;
    icon: React.ElementType;
    label: string;
    indent?: boolean;
    exact?: boolean;
    permission?: string;
  }) => {
    const link = (
      <NavLink
        to={to}
        end={exact}
        onClick={() => {
          if (window.innerWidth <= 1024) setIsSidebarOpen(false);
        }}
        className={({ isActive }) =>
          `w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
            isActive
              ? "bg-red-600 text-white shadow-lg shadow-red-900/30"
              : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          } ${collapsed ? "justify-center px-0" : ""} ${indent && !collapsed ? "pr-7" : ""}`
        }
      >
        <Icon size={indent ? 16 : 20} />
        {!collapsed && (
          <span className="font-semibold text-sm whitespace-nowrap overflow-hidden">
            {label}
          </span>
        )}
      </NavLink>
    );
    return permission ? <Can permission={permission}>{link}</Can> : link;
  };

  /* ── مكوّن مجموعة Sidebar ── */
  const SidebarGroup = ({
    icon: Icon,
    label,
    groupKey,
    permission,
    children: groupChildren,
  }: {
    icon: React.ElementType;
    label: string;
    groupKey: string;
    permission?: string;
    children: React.ReactNode;
  }) => {
    const isOpen = openGroups[groupKey] || false;
    const group = (
      <div className="space-y-1">
        <button
          onClick={() =>
            setOpenGroups((p) => ({ ...p, [groupKey]: !p[groupKey] }))
          }
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
            isOpen
              ? "bg-red-600/20 text-red-300"
              : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          } ${collapsed ? "justify-center px-0" : ""}`}
        >
          <Icon size={20} />
          {!collapsed && (
            <>
              <span className="font-semibold text-sm whitespace-nowrap overflow-hidden flex-1 text-right">
                {label}
              </span>
              <ChevronDown
                size={14}
                className={`transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`}
              />
            </>
          )}
        </button>
        <AnimatePresence>
          {isOpen && !collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden mr-4 pr-3 border-r border-white/5 space-y-1"
            >
              {groupChildren}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
    return permission ? <Can permission={permission}>{group}</Can> : group;
  };

  return (
    <div
      className="flex h-screen bg-slate-950 overflow-hidden text-slate-100 font-['Tajawal']"
      dir="rtl"
    >
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed top-0 right-0 h-full bg-slate-900 border-l border-white/5 flex flex-col p-4 shadow-2xl transition-all duration-300 z-50 ${isSidebarOpen ? "w-64 translate-x-0" : "w-64 translate-x-full lg:w-20 lg:translate-x-0"}`}
      >
        {/* Logo */}
        <div
          className={`mb-8 flex items-center gap-3 ${!isSidebarOpen ? "justify-center" : "px-4"}`}
        >
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-red-900/20 shrink-0">
            R
          </div>
          {isSidebarOpen && (
            <h1 className="text-xl font-black text-white tracking-tight">
              RestoMaster
            </h1>
          )}
        </div>

        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -left-3 top-20 w-6 h-6 bg-red-600 rounded-full hidden lg:flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform z-50"
        >
          {isSidebarOpen ? (
            <ChevronRight size={14} />
          ) : (
            <ChevronLeft size={14} />
          )}
        </button>

        {/* Nav */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto custom-scrollbar">
          {/* لوحة المعلومات */}
          <SidebarLink
            to="/admin/dashboard"
            icon={LayoutDashboard}
            label="لوحة المعلومات"
            exact
          />

          {/* إدارة الأفرع */}
          <SidebarLink
            to="/admin/branches"
            icon={Building2}
            label="إدارة الأفرع"
            permission={PERMISSIONS.MANAGE_BRANCHES}
          />

          {/* إدارة الأقسام */}
          <SidebarLink
            to="/admin/departments"
            icon={Layers}
            label="إدارة الأقسام"
            permission={PERMISSIONS.MANAGE_DEPARTMENTS}
          />

          {/* إدارة الأصناف */}
          <SidebarGroup
            icon={Package}
            label="إدارة الأصناف"
            groupKey="items"
            permission={PERMISSIONS.MANAGE_ITEMS}
          >
            <SidebarLink
              to="/admin/item-tree"
              icon={ListTree}
              label="شجرة الأصناف"
              indent
            />
            <SidebarLink
              to="/admin/items-index"
              icon={Table2}
              label="فهرس الأصناف"
              indent
            />
          </SidebarGroup>

          {/* إدارة الموظفين */}
          <SidebarLink
            to="/admin/employees"
            icon={Users2}
            label="إدارة الموظفين"
            permission={PERMISSIONS.MANAGE_EMPLOYEES}
          />

          {/* المحاسبة والمالية */}
          <SidebarGroup
            icon={BookOpen}
            label="المحاسبة والمالية"
            groupKey="accounting"
            permission={PERMISSIONS.VIEW_ACCOUNTING}
          >
            <SidebarLink
              to="/admin/accounting/dashboard"
              icon={LayoutDashboard}
              label="الرئيسية المالية"
              indent
            />
            <SidebarLink
              to="/admin/accounting/gl"
              icon={BookOpen}
              label="المحاسبة العامة"
              indent
              permission={PERMISSIONS.MANAGE_ACCOUNTING}
            />
            <SidebarLink
              to="/admin/sales-invoices"
              icon={ReceiptText}
              label="فواتير المبيعات"
              indent
              permission={PERMISSIONS.MANAGE_INVOICES}
            />
            <SidebarLink
              to="/admin/customers"
              icon={Receipt}
              label="حسابات العملاء"
              indent
              permission={PERMISSIONS.MANAGE_CUSTOMERS}
            />
            <SidebarLink
              to="/admin/suppliers"
              icon={Wallet}
              label="حسابات الموردين"
              indent
              permission={PERMISSIONS.MANAGE_SUPPLIERS}
            />
            <SidebarLink
              to="/admin/vouchers/customers"
              icon={Receipt}
              label="سندات العملاء"
              indent
              permission={PERMISSIONS.VIEW_ACCOUNTING}
            />
            <SidebarLink
              to="/admin/vouchers/suppliers"
              icon={Banknote}
              label="سندات الموردين"
              indent
              permission={PERMISSIONS.VIEW_ACCOUNTING}
            />
            <SidebarLink
              to="/admin/supplier-payment-vouchers"
              icon={Banknote}
              label="سندات صرف الموردين"
              indent
              permission={PERMISSIONS.VIEW_ACCOUNTING}
            />
            <SidebarLink
              to="/admin/purchase-bills"
              icon={ReceiptText}
              label="فواتير المشتريات"
              indent
              permission={PERMISSIONS.MANAGE_INVOICES}
            />
            <SidebarLink
              to="/admin/discounts"
              icon={Percent}
              label="إدارة الخصومات"
              indent
            />
            <SidebarLink
              to="/admin/accounting/cash"
              icon={Banknote}
              label="النقدية والبنوك"
              indent
            />
            <SidebarLink
              to="/admin/accounting/hr"
              icon={Users2}
              label="الموظفون والمرتبات"
              indent
            />
          </SidebarGroup>

          {/* باقي الروابط */}
          <SidebarLink
            to="/admin/reports"
            icon={FileText}
            label="مركز التقارير"
            permission={PERMISSIONS.VIEW_REPORTS}
          />
          <SidebarLink
            to="/admin/audit"
            icon={FileText}
            label="سجل التدقيق"
            permission={PERMISSIONS.VIEW_AUDIT_LOG}
          />
          <SidebarLink
            to="/admin/archive"
            icon={Archive}
            label="أرشيف العمليات"
            permission={PERMISSIONS.VIEW_ARCHIVE}
          />
          <SidebarLink
            to="/admin/settings"
            icon={Settings}
            label="الإعدادات العامة"
            permission={PERMISSIONS.MANAGE_SETTINGS}
          />
          <SidebarLink
            to="/admin/orgstructure"
            icon={Building2}
            label="الهيكل التنظيمي"
            permission={PERMISSIONS.MANAGE_EMPLOYEES}
          />

          {/* ── إدارة المستخدمين ── */}
          <SidebarLink
            to="/admin/users"
            icon={Users2}
            label="إدارة المستخدمين"
            permission={PERMISSIONS.MANAGE_USERS}
          />
          <SidebarLink
            to="/admin/permissions"
            icon={Shield}
            label="الأدوار والصلاحيات"
            permission={PERMISSIONS.MANAGE_USERS}
          />
          <SidebarLink
            to="/admin/pos-registers"
            icon={Monitor}
            label="نقاط البيع"
            permission={PERMISSIONS.MANAGE_POS_REGISTERS}
          />
          <SidebarLink to="/freepbx/test" icon={Radio} label="اختبار FreePBX" />
          <SidebarLink to="/admin/pbx-extensions" icon={Phone} label="امتدادات PBX" permission={PERMISSIONS.MANAGE_SETTINGS} />
          <SidebarLink to="/admin/pbx-recordings" icon={FileAudio} label="تسجيلات المكالمات" permission={PERMISSIONS.MANAGE_SETTINGS} />
          <SidebarLink
            to="/admin/hospitality-devices"
            icon={HeartHandshake}
            label="أجهزة الضيافة"
            permission={PERMISSIONS.MANAGE_HOSPITALITY_DEVICES}
          />
          <SidebarLink
            to="/admin/dining-zones"
            icon={Grid3X3}
            label="القاعات والطاولات"
            permission={PERMISSIONS.MANAGE_DINING_ZONES}
          />
          <SidebarLink
            to="/admin/pos"
            icon={Monitor}
            label="واجهة الكاشير"
            permission={PERMISSIONS.ACCESS_POS_INTERFACE}
          />
          <SidebarLink
            to="/admin/extensions-test"
            icon={Puzzle}
            label="اختبار الإضافات"
            permission={PERMISSIONS.MANAGE_SETTINGS}
          />
        </nav>

        {/* Footer */}
        <div className="mt-auto border-t border-white/5 pt-4 space-y-2">
          <ThemeToggle compact={collapsed} />
          <div
            className={`px-4 py-2 transition-all duration-300 ${!isSidebarOpen && "lg:opacity-0 lg:w-0 lg:overflow-hidden"}`}
          >
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate">
              الإدارة العامة
            </p>
            <p className="text-sm font-black text-slate-100 truncate">
              {currentUser?.name}
            </p>
          </div>
          <button
            onClick={() => authLogout()}
            className={`w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors ${!isSidebarOpen ? "lg:justify-center lg:px-0" : ""}`}
          >
            <Power size={20} />
            <span
              className={`font-semibold text-sm transition-all duration-300 ${!isSidebarOpen && "lg:opacity-0 lg:w-0 lg:overflow-hidden"}`}
            >
              تسجيل الخروج
            </span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main
        className={`flex-1 h-full overflow-hidden transition-all duration-300 ${isSidebarOpen ? "lg:mr-64" : "lg:mr-20"}`}
      >
        <div className="h-full flex flex-col">
          <header className="lg:hidden p-4 flex items-center justify-between border-b border-white/5 bg-slate-900/50">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-red-900/20">
                R
              </div>
              <h1 className="text-lg font-black text-white tracking-tight">
                RestoMaster
              </h1>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6">
            {children || <Outlet />}
          </div>
        </div>
      </main>
    </div>
  );
};
