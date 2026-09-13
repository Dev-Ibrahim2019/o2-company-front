import React, { useState, useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useApp } from "../../../store";
import { useAuth } from "../../auth";
import { ThemeToggle } from "../shared/ThemeToggle";
import { motion, AnimatePresence } from "framer-motion";
import {
  Headphones,
  LayoutDashboard,
  Database,
  Search,
  MessageSquareWarning,
  Gift,
  Users,
  Star,
  ShoppingCart,
  ClipboardList,
  Power,
  ChevronRight,
  ChevronLeft,
  Menu,
} from "lucide-react";

export const CallCenterLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { currentUser, userRole } = useApp();
  const { logout: authLogout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);

  useEffect(() => {
    const handleResize = () => setIsSidebarOpen(window.innerWidth > 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const collapsed = !isSidebarOpen;

  const SidebarLink = ({ to, icon: Icon, label, end = false }: {
    to: string; icon: React.ElementType; label: string; end?: boolean;
  }) => {
    return (
      <NavLink
        to={to}
        end={end}
        onClick={() => { if (window.innerWidth <= 1024) setIsSidebarOpen(false); }}
        className={({ isActive }) =>
          `w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
            ? "bg-[#E20004] text-white shadow-lg shadow-red-950/30"
            : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          } ${collapsed ? "justify-center px-0" : ""}`
        }
      >
        <Icon size={20} />
        {!collapsed && <span className="font-semibold text-sm whitespace-nowrap overflow-hidden">{label}</span>}
      </NavLink>
    );
  };

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden text-slate-100 font-['Tajawal']" dir="rtl">
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden" />
        )}
      </AnimatePresence>

      <aside className={`fixed top-0 right-0 h-full bg-slate-900 border-l border-white/5 flex flex-col p-4 shadow-2xl transition-all duration-300 z-50 ${isSidebarOpen ? "w-64 translate-x-0" : "w-64 translate-x-full lg:w-20 lg:translate-x-0"}`}>
        <div className={`mb-8 flex items-center gap-3 ${!isSidebarOpen ? "justify-center" : "px-4"}`}>
          <div className="w-10 h-10 bg-[#E20004] rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-red-950/20 shrink-0">
            <Headphones size={24} />
          </div>
          {isSidebarOpen && (
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">الكول سنتر</h1>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Call Center</p>
            </div>
          )}
        </div>

        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -left-3 top-20 w-6 h-6 bg-[#E20004] rounded-full hidden lg:flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform z-50">
          {isSidebarOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <nav className="flex-1 space-y-1.5 overflow-y-auto custom-scrollbar">
          <SidebarLink to="/call-center/pos" icon={ShoppingCart} label="إنشاء فاتورة" />
          <SidebarLink to="/call-center/orders" icon={ClipboardList} label="الطلبات النشطة" />
          <SidebarLink to="/call-center" icon={LayoutDashboard} label="لوحة العمليات" end />
          <SidebarLink to="/call-center/crm" icon={Database} label="العملاء" />
          <SidebarLink to="/call-center/search" icon={Search} label="المكالمات والبحث" />
          <SidebarLink to="/call-center/complaints" icon={MessageSquareWarning} label="الشكاوى والمتابعة" />
          <SidebarLink to="/call-center/occasions" icon={Gift} label="المناسبات" />
          <SidebarLink to="/call-center/top-customers" icon={Star} label="الولاء والعملاء المميزون" />
          <SidebarLink to="/call-center/employees" icon={Users} label="الموظفون" />
        </nav>

        <div className="mt-auto border-t border-white/5 pt-4 space-y-2">
          <ThemeToggle compact={collapsed} />
          <div className={`px-4 py-2 transition-all duration-300 ${!isSidebarOpen && "lg:opacity-0 lg:w-0 lg:overflow-hidden"}`}>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate">
              مركز الاتصال
            </p>
            <p className="text-sm font-black text-slate-100 truncate">{currentUser?.name}</p>
          </div>
          <button onClick={() => authLogout()}
            className={`w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors ${!isSidebarOpen ? "lg:justify-center lg:px-0" : ""}`}>
            <Power size={20} />
            <span className={`font-semibold text-sm transition-all duration-300 ${!isSidebarOpen && "lg:opacity-0 lg:w-0 lg:overflow-hidden"}`}>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      <main className={`flex-1 h-full overflow-hidden transition-all duration-300 ${isSidebarOpen ? "lg:mr-64" : "lg:mr-20"}`}>
        <div className="h-full flex flex-col">
          <header className="lg:hidden p-4 flex items-center justify-between border-b border-white/5 bg-slate-900/50">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all">
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#E20004] rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-red-950/20">
                <Headphones size={18} />
              </div>
              <h1 className="text-lg font-black text-white tracking-tight">الكول سنتر</h1>
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
