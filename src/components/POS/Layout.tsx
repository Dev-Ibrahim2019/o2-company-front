
import React, { useState, useEffect } from 'react';
import { useApp } from '../../../store';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart, 
  ClipboardList, 
  Grid2X2, 
  PieChart, 
  Power,
  Clock,
  ChevronRight,
  ChevronLeft,
  Menu,
  Receipt,
  HeartHandshake,
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

export const POSLayout: React.FC<{ 
  children: React.ReactNode; 
  activeView: string; 
  setActiveView: (view: string) => void;
}> = ({ children, activeView, setActiveView }) => {
  const { currentUser, logout, userRole, branches } = useApp();
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth > 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isAdmin = userRole === 'ADMIN';
  const isBranchManager = userRole === 'BRANCH_MANAGER';
  const isHospitality = userRole === 'HOSPITALITY';
  const isDeptStaff = userRole === 'DEPARTMENT_STAFF';
  const isAggregator = userRole === 'ORDER_AGGREGATOR';
  const isFinance = userRole === 'FINANCE';
  const isEmployee = userRole === 'EMPLOYEE';
  const isCustomer = userRole === 'CUSTOMER';

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
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-red-900/20 shrink-0">02</div>
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
                icon={ShoppingCart} label="نقطة البيع (POS)" 
                active={activeView === 'pos'} collapsed={!isSidebarOpen} onClick={() => { setActiveView('pos'); if (window.innerWidth <= 1024) setIsSidebarOpen(false); }} 
              />
              <SidebarItem 
                icon={ClipboardList} label="الطلبات النشطة" 
                active={activeView === 'orders'} collapsed={!isSidebarOpen} onClick={() => { setActiveView('orders'); if (window.innerWidth <= 1024) setIsSidebarOpen(false); }} 
              />
              <SidebarItem 
                icon={Grid2X2} label="إدارة الطاولات" 
                active={activeView === 'tables'} collapsed={!isSidebarOpen} onClick={() => { setActiveView('tables'); if (window.innerWidth <= 1024) setIsSidebarOpen(false); }} 
              />
              <SidebarItem 
                icon={Receipt} label="التقارير المالية" 
                active={activeView === 'finance'} collapsed={!isSidebarOpen} onClick={() => { setActiveView('finance'); if (window.innerWidth <= 1024) setIsSidebarOpen(false); }} 
              />
              <SidebarItem 
                icon={PieChart} label="التقارير" 
                active={activeView === 'reports'} collapsed={!isSidebarOpen} onClick={() => { setActiveView('reports'); if (window.innerWidth <= 1024) setIsSidebarOpen(false); }} 
              />
              <SidebarItem 
                icon={Clock} label="إدارة الشفت" 
                active={activeView === 'shift'} collapsed={!isSidebarOpen} onClick={() => { setActiveView('shift'); if (window.innerWidth <= 1024) setIsSidebarOpen(false); }} 
              />
            </>
        </nav>

        <div className="mt-auto border-t border-white/5 pt-4 space-y-2">
          {isHospitality && isSidebarOpen && (
            <div className="px-4 mb-4 space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-red-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-red-900/10 rotate-3">
                  <HeartHandshake size={12} />
                </div>
                <h2 className="text-sm font-black text-white tracking-tight">قسم الضيافة</h2>
              </div>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">إدارة الخدمة والزبائن</p>
            </div>
          )}
          <div className={`px-4 py-2 transition-all duration-300 ${!isSidebarOpen && 'lg:opacity-0 lg:w-0 lg:overflow-hidden'}`}>
            {!isHospitality && (
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate">
                {isAdmin ? 'الإدارة العامة' : isBranchManager ? `مدير: ${branches.find(b => b.id === currentUser?.branchId)?.name}` : isDeptStaff ? 'موظف قسم' : isAggregator ? 'مجمع طلبات' : isFinance ? 'قسم المالية' : isEmployee ? 'موظف' : isCustomer ? 'عميل' : 'الكاشير'}
              </p>
            )}
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
