
import React, { useState, useEffect } from 'react';
import { useApp } from '../../../store';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ClipboardList, 
  Users, 
  Power,
  Building2,
  LayoutDashboard,
  ChevronRight,
  ChevronLeft,
  Menu,
  Activity,
  Settings,
  FileText,
  Wallet,
  Package,
  Layers,
  Users2,
  Truck,
  Archive,
} from 'lucide-react';

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  collapsed?: boolean;
  onClick: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon: Icon, label, active, collapsed, onClick }) => (
  <button
    onClick={onClick}
    title={collapsed ? label : undefined}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
      active 
        ? 'bg-red-600 text-white shadow-lg shadow-red-900/30' 
        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
    } ${collapsed ? 'justify-center px-0' : ''}`}
  >
    <Icon size={20} />
    {!collapsed && <span className="font-semibold text-sm whitespace-nowrap overflow-hidden">{label}</span>}
  </button>
);

export const AppLayout: React.FC<{ 
  children: React.ReactNode; 
  activeView: string; 
  setActiveView: (view: string) => void;
}> = ({ children, activeView, setActiveView }) => {
  const { currentUser, logout} = useApp();
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth > 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden text-slate-100 font-['Tajawal']" dir="rtl">
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

      <aside className={`fixed top-0 right-0 h-full bg-slate-900 border-l border-white/5 flex flex-col p-4 shadow-2xl transition-all duration-300 z-50 ${
          isSidebarOpen 
            ? 'w-64 translate-x-0' 
            : 'w-64 translate-x-full lg:w-20 lg:translate-x-0'
        }`}>
        <div className={`mb-8 flex items-center gap-3 ${!isSidebarOpen ? 'justify-center' : 'px-4'}`}>
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-red-900/20 shrink-0">R</div>
          {isSidebarOpen && <h1 className="text-xl font-black text-white tracking-tight">RestoMaster</h1>}
        </div>

        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -left-3 top-20 w-6 h-6 bg-red-600 rounded-full hidden lg:flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform z-50"
        >
          {isSidebarOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <nav className="flex-1 space-y-1.5 overflow-y-auto custom-scrollbar">
          
            <>
              <SidebarItem 
                icon={LayoutDashboard} label="لوحة المعلومات" 
                active={activeView === 'finance_dashboard'} collapsed={!isSidebarOpen} onClick={() => { setActiveView('finance_dashboard'); if (window.innerWidth <= 1024) setIsSidebarOpen(false); }} 
              />
              <SidebarItem 
                icon={Building2} label="إدارة الأفرع" 
                active={activeView === 'finance_branches'} collapsed={!isSidebarOpen} onClick={() => { setActiveView('finance_branches'); if (window.innerWidth <= 1024) setIsSidebarOpen(false); }} 
              />
              <SidebarItem 
                icon={Layers} label="إدارة الأقسام" 
                active={activeView === 'finance_departments'} collapsed={!isSidebarOpen} onClick={() => { setActiveView('finance_departments'); if (window.innerWidth <= 1024) setIsSidebarOpen(false); }} 
              />
              <SidebarItem 
                icon={Package} label="إدارة الأصناف" 
                active={activeView === 'finance_menu'} collapsed={!isSidebarOpen} onClick={() => { setActiveView('finance_menu'); if (window.innerWidth <= 1024) setIsSidebarOpen(false); }} 
              />
              <SidebarItem 
                icon={ClipboardList} label="إدارة الطلبات" 
                active={activeView === 'finance_orders'} collapsed={!isSidebarOpen} onClick={() => { setActiveView('finance_orders'); if (window.innerWidth <= 1024) setIsSidebarOpen(false); }} 
              />
              <SidebarItem 
                icon={Users2} label="إدارة الموظفين" 
                active={activeView === 'finance_employees'} collapsed={!isSidebarOpen} onClick={() => { setActiveView('finance_employees'); if (window.innerWidth <= 1024) setIsSidebarOpen(false); }} 
              />
              <SidebarItem 
                icon={Users} label="إدارة العملاء" 
                active={activeView === 'finance_customers'} collapsed={!isSidebarOpen} onClick={() => { setActiveView('finance_customers'); if (window.innerWidth <= 1024) setIsSidebarOpen(false); }} 
              />
              <SidebarItem 
                icon={Truck} label="إدارة الموردين" 
                active={activeView === 'finance_suppliers'} collapsed={!isSidebarOpen} onClick={() => { setActiveView('finance_suppliers'); if (window.innerWidth <= 1024) setIsSidebarOpen(false); }} 
              />
              <SidebarItem 
                icon={Wallet} label="المحاسبة والمالية" 
                active={activeView === 'finance_accounting'} collapsed={!isSidebarOpen} onClick={() => { setActiveView('finance_accounting'); if (window.innerWidth <= 1024) setIsSidebarOpen(false); }} 
              />
              <SidebarItem 
                icon={FileText} label="مركز التقارير" 
                active={activeView === 'finance_reports'} collapsed={!isSidebarOpen} onClick={() => { setActiveView('finance_reports'); if (window.innerWidth <= 1024) setIsSidebarOpen(false); }} 
              />
              <SidebarItem 
                icon={Activity} label="سجل التدقيق" 
                active={activeView === 'finance_audit'} collapsed={!isSidebarOpen} onClick={() => { setActiveView('finance_audit'); if (window.innerWidth <= 1024) setIsSidebarOpen(false); }} 
              />
              <SidebarItem 
                icon={Archive} label="أرشيف العمليات" 
                active={activeView === 'finance_archive'} collapsed={!isSidebarOpen} onClick={() => { setActiveView('finance_archive'); if (window.innerWidth <= 1024) setIsSidebarOpen(false); }} 
              />
              <SidebarItem 
                icon={Settings} label="الإعدادات العامة" 
                active={activeView === 'finance_settings'} collapsed={!isSidebarOpen} onClick={() => { setActiveView('finance_settings'); if (window.innerWidth <= 1024) setIsSidebarOpen(false); }} 
              />
                <SidebarItem 
                  icon={Building2} label="الهيكل التنظيمي" 
                  active={activeView === 'org'} collapsed={!isSidebarOpen} onClick={() => { setActiveView('org'); if (window.innerWidth <= 1024) setIsSidebarOpen(false); }} 
                />
            </>
        </nav>

        <div className="mt-auto border-t border-white/5 pt-4 space-y-2">
          <div className={`px-4 py-2 transition-all duration-300 ${!isSidebarOpen && 'lg:opacity-0 lg:w-0 lg:overflow-hidden'}`}>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate">
                {'الإدارة العامة'}
              </p>
            <p className="text-sm font-black text-slate-100 truncate">{currentUser?.name}</p>
          </div>
          <button 
            onClick={logout}
            title={!isSidebarOpen ? "تسجيل الخروج" : undefined}
            className={`w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors ${!isSidebarOpen ? 'lg:justify-center lg:px-0' : ''}`}
          >
            <Power size={20} />
            <span className={`font-semibold text-sm transition-all duration-300 ${!isSidebarOpen && 'lg:opacity-0 lg:w-0 lg:overflow-hidden'}`}>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      <main className={`flex-1 h-full overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'lg:mr-64' : 'lg:mr-20'}`}>
        <div className="h-full flex flex-col">
          <header className="lg:hidden p-4 flex items-center justify-between border-b border-white/5 bg-slate-900/50">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-red-900/20">R</div>
              <h1 className="text-lg font-black text-white tracking-tight">RestoMaster</h1>
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
