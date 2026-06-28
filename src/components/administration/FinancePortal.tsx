import React, { useState } from 'react';
import { useApp } from '../../../store';
import DashboardPage from '../administration/DashboardPage';
import DepartmentsPage from './Departments/DepartmentsPage';
import OrdersPage from '../administration/OrdersPage';
import CustomerPortal from './customers/CustomerPortal';
import EmployeeManagement from "../administration/EmployeeManagement/EmployeeManagement";
import ReportsPage from '../administration/ReportsPage';
import AuditLogPage from '../administration/AuditLogPage';
import ArchivePage from '../administration/ArchivePage';
import SettingsPage from '../administration/SettingsPage';
import MenuPage from '../administration/Items/MenuPage';
import renderModal from '../administration/renderModal';
import BranchesPage from '../administration/BranchesPage/BranchesPage';
import SupplierPortal from './suppliers/SupplierPortal';
import { FinancialInvoicesPage } from '../financial/FinancialInvoicesPage';
import { FinancialInvoiceForm } from '../financial/FinancialInvoiceForm';

import { OrgStructure } from './OrgStructure/OrgStructure';
import { AccountingPortal } from './GL/AccountingPortal';


interface FinancePortalProps {
  initialView?: 'DASHBOARD' | 'BRANCHES' | 'DEPARTMENTS' | 'ITEM_TREE' | 'ITEMS_INDEX' | 'MENU' | 'ORDERS' | 'SALES' | 'CUSTOMERS' | 'SUPPLIERS' | 'EMPLOYEES' | 'ACCOUNTING' | 'REPORTS' | 'SETTINGS' | 'AUDIT_LOG' | 'ARCHIVE' | 'ORGSTRUCTURE' | 'FINANCIAL_INVOICES';
}

export const FinancePortal: React.FC<FinancePortalProps> = ({ initialView = 'DASHBOARD' }) => {
  const { currentUser } = useApp();
  const canAudit = currentUser?.role === 'ADMIN' || currentUser?.role === 'BRANCH_MANAGER';
  const canManageFinance = currentUser?.role === 'ADMIN' || currentUser?.role === 'FINANCE' || currentUser?.role === 'BRANCH_MANAGER';
  const canEditSettings = currentUser?.role === 'ADMIN';

  const [financialView, setFinancialView] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<number | undefined>(undefined);

  const renderCustomers = () => <CustomerPortal />;
  const renderSuppliers = () => <SupplierPortal />;

  const handleOpenForm = (id?: number) => {
    setEditingId(id);
    setFinancialView('form');
  };

  const handleFormBack = () => {
    setFinancialView('list');
    setEditingId(undefined);
  };

  const handleFormSaved = () => {
    setFinancialView('list');
    setEditingId(undefined);
  };

  // Financial invoices page — manages its own sub-views
  if (initialView === 'FINANCIAL_INVOICES' || initialView === 'SALES') {
    if (financialView === 'form') {
      return (
        <div className="h-full overflow-y-auto custom-scrollbar">
          <FinancialInvoiceForm invoiceId={editingId} onBack={handleFormBack} onSaved={handleFormSaved} />
        </div>
      );
    }
    return (
      <div className="h-full overflow-y-auto custom-scrollbar">
        <FinancialInvoicesPage onOpenForm={handleOpenForm} />
      </div>
    );
  }

  const viewContent: Record<string, React.ReactNode> = {
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
    <div className="h-full flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0">
        {viewContent[initialView]}
      </div>
      {renderModal()}
    </div>
  );
};
