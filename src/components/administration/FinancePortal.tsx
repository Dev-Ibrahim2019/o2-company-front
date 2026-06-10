import React from 'react';
import { useApp } from '../../../store';
import DashboardPage from '../administration/DashboardPage';
import DepartmentsPage from './Departments/DepartmentsPage';
import OrdersPage from '../administration/OrdersPage';
import CustomerManagement from '../administration/CustomerManagement';
import EmployeeManagement from "../administration/EmployeeManagement/EmployeeManagement";
import ReportsPage from '../administration/ReportsPage';
import AuditLogPage from '../administration/AuditLogPage';
import ArchivePage from '../administration/ArchivePage';
import SettingsPage from '../administration/SettingsPage';
import MenuPage from '../administration/Items/MenuPage';
import renderModal from '../administration/renderModal';
import BranchesPage from '../administration/BranchesPage/BranchesPage';

import { CustomerType } from '../../../types';
import { OrgStructure } from './OrgStructure/OrgStructure';
import { AccountingPortal } from './GL/AccountingPortal';


interface FinancePortalProps {
  initialView?: 'DASHBOARD' | 'BRANCHES' | 'DEPARTMENTS' | 'ITEM_TREE' | 'ITEMS_INDEX' | 'MENU' | 'ORDERS' | 'CUSTOMERS' | 'SUPPLIERS' | 'EMPLOYEES' | 'ACCOUNTING' | 'REPORTS' | 'SETTINGS' | 'AUDIT_LOG' | 'ARCHIVE' | 'ORGSTRUCTURE';
}

export const FinancePortal: React.FC<FinancePortalProps> = ({ initialView = 'DASHBOARD' }) => {
  const { currentUser } = useApp();
  const canAudit = currentUser?.role === 'ADMIN' || currentUser?.role === 'BRANCH_MANAGER';
  const canManageFinance = currentUser?.role === 'ADMIN' || currentUser?.role === 'FINANCE' || currentUser?.role === 'BRANCH_MANAGER';
  const canEditSettings = currentUser?.role === 'ADMIN';

  const renderCustomers = () => <CustomerManagement initialType={CustomerType.REGULAR} />;

  const renderSuppliers = () => <CustomerManagement initialType={CustomerType.SUPPLIER} />;
  const view = initialView;
  const viewContent: Record<NonNullable<FinancePortalProps['initialView']>, React.ReactNode> = {
    DASHBOARD: <DashboardPage />,
    BRANCHES: <BranchesPage />,
    DEPARTMENTS: <DepartmentsPage />,
    ITEM_TREE: <MenuPage initialMode="tree" />,
    ITEMS_INDEX: <MenuPage initialMode="list" />,
    MENU: <MenuPage initialMode="tree" />,
    ORDERS: <OrdersPage />,
    CUSTOMERS: renderCustomers(),
    SUPPLIERS: renderSuppliers(),
    EMPLOYEES: <EmployeeManagement />,
    ACCOUNTING: <AccountingPortal />,
    REPORTS: <ReportsPage />,
    AUDIT_LOG: canAudit ? <AuditLogPage /> : <div className="p-20 text-center text-slate-500">ليس لديك صلاحية للوصول إلى سجل التدقيق</div>,
    ARCHIVE: canManageFinance ? <ArchivePage /> : <div className="p-20 text-center text-slate-500">ليس لديك صلاحية للوصول إلى الأرشيف</div>,
    SETTINGS: canEditSettings ? <SettingsPage /> : <div className="p-20 text-center text-slate-500">ليس لديك صلاحية للوصول إلى الإعدادات</div>,
    ORGSTRUCTURE: <OrgStructure />,
  };

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Header */}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        {viewContent[view]}
      </div>

      {renderModal()}
    </div>
  );
};
