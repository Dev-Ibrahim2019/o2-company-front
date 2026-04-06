import React, { useState } from 'react';
import { useApp } from '../../../store';
import DashboardPage from '../administration/DashboardPage';
import DepartmentsPage from '../administration/DepartmentsPage';
import OrdersPage from '../administration/OrdersPage';
import CustomerManagement from '../administration/CustomerManagement';
import EmployeeManagement from '../administration/EmployeeManagement';
import ReportsPage from '../administration/ReportsPage';
import AuditLogPage from '../administration/AuditLogPage';
import AccountingPage from '../administration/AccountingPage';
import ArchivePage from '../administration/ArchivePage';
import SettingsPage from '../administration/SettingsPage';
import MenuPage from '../administration/MenuPage';
import renderModal from '../administration/renderModal';

import { Calendar } from 'lucide-react';
import { CustomerType } from '../../../types';


interface FinancePortalProps {
  initialView?: 'DASHBOARD' | 'DEPARTMENTS' | 'MENU' | 'ORDERS' | 'CUSTOMERS' | 'SUPPLIERS' | 'EMPLOYEES' | 'ACCOUNTING' | 'REPORTS' | 'SETTINGS' | 'AUDIT_LOG' | 'ARCHIVE';
}
  
export const FinancePortal: React.FC<FinancePortalProps> = ({ initialView = 'DASHBOARD' }) => {
  const { currentUser } = useApp();
  const canAudit = currentUser?.role === 'ADMIN' || currentUser?.role === 'BRANCH_MANAGER';
  const canManageFinance = currentUser?.role === 'ADMIN' || currentUser?.role === 'FINANCE' || currentUser?.role === 'BRANCH_MANAGER';
  const canEditSettings = currentUser?.role === 'ADMIN';
  
  const renderCustomers = () => <CustomerManagement initialType={CustomerType.REGULAR} />;

  const renderSuppliers = () => <CustomerManagement initialType={CustomerType.SUPPLIER} />;
    const [view, setView] = useState(initialView);
    console.log('currentUser', currentUser);
    return (
    <div className="h-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">بوابة الإدارة المالية</h1>
          <p className="text-slate-500 text-sm font-medium">إدارة العمليات، الموظفين، والتقارير المالية</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 border border-white/5 rounded-xl px-4 py-2 flex items-center gap-3">
            <Calendar size={18} className="text-red-500" />
            <span className="text-sm font-bold text-white">{new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        {view === 'DASHBOARD' && <DashboardPage />}
        {view === 'DEPARTMENTS' && <DepartmentsPage />}
        {view === 'MENU' && <MenuPage />}
        {view === 'ORDERS' && <OrdersPage />}
        {view === 'CUSTOMERS' && renderCustomers()}
        {view === 'SUPPLIERS' && renderSuppliers()}
        {view === 'EMPLOYEES' && <EmployeeManagement />}
        {view === 'ACCOUNTING' && <AccountingPage />}
        {view === 'REPORTS' && <ReportsPage />}
        {view === 'AUDIT_LOG' && (canAudit ? <AuditLogPage /> : <div className="p-20 text-center text-slate-500">ليس لديك صلاحية للوصول إلى سجل التدقيق</div>)}
        {view === 'ARCHIVE' && (canManageFinance ? <ArchivePage /> : <div className="p-20 text-center text-slate-500">ليس لديك صلاحية للوصول إلى الأرشيف</div>)}
        {view === 'SETTINGS' && (canEditSettings ? <SettingsPage /> : <div className="p-20 text-center text-slate-500">ليس لديك صلاحية للوصول إلى الإعدادات</div>)}
      </div>

      {renderModal()}
    </div>
  );
};