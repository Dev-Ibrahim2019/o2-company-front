import React, { useState, useEffect } from "react";
import { useApp } from "../../../store";
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
  Wallet,
  Banknote,
  ChevronDown,
} from "lucide-react";

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  collapsed?: boolean;
  onClick: () => void;
  indent?: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({
  icon: Icon,
  label,
  active,
  collapsed,
  onClick,
  indent = false,
}) => (
  <button
    onClick={onClick}
    title={collapsed ? label : undefined}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${active
        ? "bg-red-600 text-white shadow-lg shadow-red-900/30"
        : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
      } ${collapsed ? "justify-center px-0" : ""} ${indent && !collapsed ? "pr-7" : ""}`}
  >
    <Icon size={indent ? 16 : 20} />
    {!collapsed && (
      <span className="font-semibold text-sm whitespace-nowrap overflow-hidden">
        {label}
      </span>
    )}
  </button>
);

interface SidebarGroupProps {
  icon: React.ElementType;
  label: string;
  collapsed?: boolean;
  active?: boolean;
  children: React.ReactNode;
}

const SidebarGroup: React.FC<SidebarGroupProps> = ({
  icon: Icon,
  label,
  collapsed,
  active,
  children,
}) => {
  const [open, setOpen] = useState(active);

  useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  if (collapsed) {
    return (
      <div className="space-y-1">
        <button
          title={label}
          className={`w-full flex items-center justify-center px-0 py-3 rounded-xl transition-all duration-200 ${active
              ? "bg-red-600/20 text-red-400"
              : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            }`}
          onClick={() => setOpen(!open)}
        >
          <Icon size={20} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${active
            ? "bg-red-600/20 text-red-300"
            : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          }`}
      >
        <Icon size={20} />
        <span className="font-semibold text-sm whitespace-nowrap overflow-hidden flex-1 text-right">
          {label}
        </span>
        <ChevronDown
          size={14}
          className={`transition-transform shrink-0 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mr-4 pr-3 border-r border-white/5 space-y-1"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const AdminLayout: React.FC<{
  children: React.ReactNode;
  activeView: string;
  setActiveView: (view: string) => void;
}> = ({ children, activeView, setActiveView }) => {
  const { currentUser, logout } = useApp();
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth > 1024);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const nav = (view: string) => {
    setActiveView(view);
    if (window.innerWidth <= 1024) setIsSidebarOpen(false);
  };

  const isAccountingActive =
    activeView.startsWith("accounting_") || activeView === "finance_sales";
  const isItemsActive =
    activeView === "finance_menu" ||
    activeView === "finance_item_tree" ||
    activeView === "finance_items_index";

  return (
    <div
      className="flex h-screen bg-slate-950 overflow-hidden text-slate-100 font-['Tajawal']"
      dir="rtl"
    >
      {/* Mobile Sidebar Overlay */}
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
        className={`fixed top-0 right-0 h-full bg-slate-900 border-l border-white/5 flex flex-col p-4 shadow-2xl transition-all duration-300 z-50 ${isSidebarOpen
            ? "w-64 translate-x-0"
            : "w-64 translate-x-full lg:w-20 lg:translate-x-0"
          }`}
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

        {/* Collapse toggle */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -left-3 top-20 w-6 h-6 bg-red-600 rounded-full hidden lg:flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform z-50"
        >
          {isSidebarOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Nav */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto custom-scrollbar">
          <SidebarItem
            icon={LayoutDashboard}
            label="لوحة المعلومات"
            active={activeView === "finance_dashboard"}
            collapsed={!isSidebarOpen}
            onClick={() => nav("finance_dashboard")}
          />
          <SidebarItem
            icon={Building2}
            label="إدارة الأفرع"
            active={activeView === "finance_branches"}
            collapsed={!isSidebarOpen}
            onClick={() => nav("finance_branches")}
          />
          <SidebarItem
            icon={Layers}
            label="إدارة الأقسام"
            active={activeView === "finance_departments"}
            collapsed={!isSidebarOpen}
            onClick={() => nav("finance_departments")}
          />

          {/* Items group */}
          <SidebarGroup
            icon={Package}
            label="إدارة الأصناف"
            collapsed={!isSidebarOpen}
            active={isItemsActive}
          >
            <SidebarItem
              icon={ListTree}
              label="شجرة الأصناف"
              active={
                activeView === "finance_item_tree" ||
                activeView === "finance_menu"
              }
              collapsed={!isSidebarOpen}
              indent
              onClick={() => nav("finance_item_tree")}
            />
            <SidebarItem
              icon={Table2}
              label="فهرس الأصناف"
              active={activeView === "finance_items_index"}
              collapsed={!isSidebarOpen}
              indent
              onClick={() => nav("finance_items_index")}
            />
          </SidebarGroup>

          <SidebarItem
            icon={Users2}
            label="إدارة الموظفين"
            active={activeView === "finance_employees"}
            collapsed={!isSidebarOpen}
            onClick={() => nav("finance_employees")}
          />

          {/* Accounting group */}
          <SidebarGroup
            icon={BookOpen}
            label="المحاسبة والمالية"
            collapsed={!isSidebarOpen}
            active={isAccountingActive}
          >
            <SidebarItem
              icon={LayoutDashboard}
              label="الرئيسية المالية"
              active={activeView === "accounting_dashboard"}
              collapsed={!isSidebarOpen}
              indent
              onClick={() => nav("accounting_dashboard")}
            />
            <SidebarItem
              icon={BookOpen}
              label="المحاسبة العامة"
              active={activeView === "accounting_gl"}
              collapsed={!isSidebarOpen}
              indent
              onClick={() => nav("accounting_gl")}
            />
            <SidebarItem
              icon={Receipt}
              label="فواتير المبيعات"
              active={activeView === "finance_sales"}
              collapsed={!isSidebarOpen}
              indent
              onClick={() => nav("finance_sales")}
            />
            <SidebarItem
              icon={Receipt}
              label="حسابات العملاء"
              active={activeView === "accounting_ar"}
              collapsed={!isSidebarOpen}
              indent
              onClick={() => nav("accounting_ar")}
            />
            <SidebarItem
              icon={Wallet}
              label="حسابات الموردين"
              active={activeView === "accounting_ap"}
              collapsed={!isSidebarOpen}
              indent
              onClick={() => nav("accounting_ap")}
            />
            <SidebarItem
              icon={Banknote}
              label="النقدية والبنوك"
              active={activeView === "accounting_cash"}
              collapsed={!isSidebarOpen}
              indent
              onClick={() => nav("accounting_cash")}
            />
            <SidebarItem
              icon={Users2}
              label="الموظفون والمرتبات"
              active={activeView === "accounting_hr"}
              collapsed={!isSidebarOpen}
              indent
              onClick={() => nav("accounting_hr")}
            />
          </SidebarGroup>

          <SidebarItem
            icon={FileText}
            label="مركز التقارير"
            active={activeView === "finance_reports"}
            collapsed={!isSidebarOpen}
            onClick={() => nav("finance_reports")}
          />
          <SidebarItem
            icon={Archive}
            label="أرشيف العمليات"
            active={activeView === "finance_archive"}
            collapsed={!isSidebarOpen}
            onClick={() => nav("finance_archive")}
          />
          <SidebarItem
            icon={Settings}
            label="الإعدادات العامة"
            active={activeView === "finance_settings"}
            collapsed={!isSidebarOpen}
            onClick={() => nav("finance_settings")}
          />
          <SidebarItem
            icon={Building2}
            label="الهيكل التنظيمي"
            active={activeView === "finance_orgstructure"}
            collapsed={!isSidebarOpen}
            onClick={() => nav("finance_orgstructure")}
          />
        </nav>

        {/* Footer */}
        <div className="mt-auto border-t border-white/5 pt-4 space-y-2">
          <div
            className={`px-4 py-2 transition-all duration-300 ${!isSidebarOpen && "lg:opacity-0 lg:w-0 lg:overflow-hidden"
              }`}
          >
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate">
              الإدارة العامة
            </p>
            <p className="text-sm font-black text-slate-100 truncate">
              {currentUser?.name}
            </p>
          </div>
          <button
            onClick={logout}
            title={!isSidebarOpen ? "تسجيل الخروج" : undefined}
            className={`w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors ${!isSidebarOpen ? "lg:justify-center lg:px-0" : ""
              }`}
          >
            <Power size={20} />
            <span
              className={`font-semibold text-sm transition-all duration-300 ${!isSidebarOpen && "lg:opacity-0 lg:w-0 lg:overflow-hidden"
                }`}
            >
              تسجيل الخروج
            </span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main
        className={`flex-1 h-full overflow-hidden transition-all duration-300 ${isSidebarOpen ? "lg:mr-64" : "lg:mr-20"
          }`}
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
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
