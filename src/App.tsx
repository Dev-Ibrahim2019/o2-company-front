/**
 * App.tsx — النسخة المُصحّحة
 * 1. تحويل تلقائي بعد Login حسب الدور
 * 2. حماية مسارات Admin بالدور (role)
 * 3. تحديث المحتوى عند تغيير الرابط (key prop)
 */

import React, { useEffect, useState } from "react";
import { sound } from "./services/soundService";
import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import {
  AuthProvider,
  useAuth,
  ProtectedRoute,
  UnauthorizedPage,
} from "./auth";
import { ROLES } from "./auth/permissions";

// ── المكونات ──
import { Login } from "./components/Login";
import { AdminLayout } from "./components/administration/Layout";
import { FinancePortal } from "./components/administration/FinancePortal";
import { AccountingPortal } from "./components/administration/GL/AccountingPortal";
import { POSLayout } from "./components/POS/Layout";
import { POS } from "./components/POS/pos";
import AdminPOSWrapper from "./components/POS/AdminPOSWrapper";
import { TablesView } from "./components/POS/Tables";
import DeferredTables from "./components/POS/DeferredTables";
import { OrdersView } from "./components/POS/Orders";
import { ShiftView } from "./components/POS/Shift";
import { HospitalityLayout } from "./components/Hospitality/Layout";
import { HospitalityPOS } from "./components/Hospitality/HospitalityPOS";
import { HospitalityOrders } from "./components/Hospitality/HospitalityOrders";
import { HospitalityTables } from "./components/Hospitality/Tables";
import { FinancialInvoicesPage } from "./components/financial/FinancialInvoicesPage";
import { FinancialInvoiceForm } from "./components/financial/FinancialInvoiceForm";
import {
  SalesInvoiceListPage,
  SalesInvoiceFormPage,
} from "./components/sales-invoices";
import { ToastContainer } from "./components/shared/Toast";
import UsersManagementPage from "./pages/UsersManagementPage";
import PosRegistersPage from "./pages/PosRegistersPage";
import { PrintersManagement } from "./components/administration/printers-management";
import HospitalityDevicesPage from "./pages/HospitalityDevicesPage";
import DiningZonesPage from "./pages/DiningZonesPage";
import DiningTablesDashboard from "./components/administration/DiningTablesDashboard";
import MenuPage from "./pages/customer/MenuPage";
import { CartProvider } from "./components/customer/cart-provider";
import CartPage from "./pages/customer/CartPage";
import TablePage from "./pages/customer/TablePage";
import { CustomerTableProvider } from "./components/customer/CustomerTableProvider";
import RolesPermissionsPage from "./pages/RolesPermissionsPage";
import DepartmentsPage from "./components/administration/DepartmentsPage";
import { ThemeProvider } from "./theme";
import { DayClosePage } from "./components/administration/DayClosePage";
import { ReconciliationBoard } from "./components/administration/ReconciliationBoard";
import { ShiftClosingsPage } from "./components/administration/ShiftClosingsPage";
import { BusinessDayClosingPage } from "./components/administration/BusinessDayClosingPage";
import { QuotesView } from "./components/quotes/QuotesView";
import { VouchersView } from "./components/administration/VouchersView";
import { CustomerVouchersView } from "./components/administration/CustomerVouchersView";
import { SupplierVouchersView } from "./components/administration/SupplierVouchersView";
import { SupplierPaymentVouchersView } from "./components/administration/SupplierPaymentVouchersView";
import { PurchaseBillsView } from "./components/administration/PurchaseBillsView";
import { ExtensionsTestView } from "./components/administration/ExtensionsTestView";
import { PbxExtensionsTestView } from "./components/administration/PbxExtensionsTestView";
import { PbxRecordingsView } from "./components/administration/PbxRecordingsView";
import FreePBXTestPage from "./pages/FreePBXTestPage";

/* ══════════════════════════════════════════════════════════════
 *  حماية الأدوار — تمنع الوصول لمن لا يملك الدور المطلوب
 * ══════════════════════════════════════════════════════════════ */

/** الأدوار المسموح بها في مسارات /admin/* */
const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT, ROLES.BRANCH_MANAGER];

/** الأدوار المسموح بها في مسارات /pos/* */
const POS_ROLES = [
  ROLES.CASHIER,
  ROLES.HOSPITALITY,
  ROLES.DEPT_STAFF,
  ROLES.SUPER_ADMIN,
  ROLES.ACCOUNTANT,
  ROLES.BRANCH_MANAGER,
];

/** الأدوار المسموح بها في مسارات /Hospitality/* */
const HOSPITALITY_ROLES = [
  ROLES.HOSPITALITY,
  ROLES.SUPER_ADMIN,
  ROLES.ACCOUNTANT,
  ROLES.BRANCH_MANAGER,
];

/**
 * RoleGuard — layout route يفحص الدور ثم يعرض المحتوى عبر Outlet
 * لا يلف المحتوى بـ children بل يستخدم Outlet (النمط الصحيح في React Router)
 */
function RoleGuard({ allowedRoles }: { allowedRoles: string[] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const hasAccess = user.roles.some((r) => allowedRoles.includes(r));

  if (!hasAccess) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}

/* ══════════════════════════════════════════════════════════════
 *  صفحات مساعدة (Wrappers) — تمرر المعاملات الصحيحة للمكونات
 * ══════════════════════════════════════════════════════════════ */

/** تحويل مسار URL إلى initialView لـ FinancePortal */
const financeViewMap: Record<string, string> = {
  dashboard: "DASHBOARD",
  branches: "BRANCHES",
  departments: "DEPARTMENTS",
  menu: "MENU",
  "item-tree": "ITEM_TREE",
  "items-index": "ITEMS_INDEX",
  orders: "ORDERS",
  sales: "SALES",
  customers: "CUSTOMERS",
  suppliers: "SUPPLIERS",
  employees: "EMPLOYEES",
  accounting: "ACCOUNTING",
  reports: "REPORTS",
  audit: "AUDIT_LOG",
  archive: "ARCHIVE",
  settings: "SETTINGS",
  orgstructure: "ORGSTRUCTURE",
  "financial-invoices": "FINANCIAL_INVOICES",
  discounts: "DISCOUNTS",
  "shift-day-closing": "SHIFT_DAY_CLOSING",
};

/**
 * FinanceView — يقرأ الـ view مباشرة من الرابط (useLocation)
 * هذا يضمن تحديث المحتوى عند تغيير الرابط
 */
function FinanceView() {
  const location = useLocation();
  // استخراج الجزء الأخير من الرابط: /admin/branches → "branches"
  const pathParts = location.pathname.split("/").filter(Boolean);
  const lastSegment = pathParts[pathParts.length - 1] || "dashboard";
  const mapped = financeViewMap[lastSegment] || "DASHBOARD";
  return <FinancePortal key={lastSegment} initialView={mapped as any} />;
}

/** AccountingView — يقرأ الـ tab مباشرة من الرابط */
function AccountingView() {
  const location = useLocation();
  const pathParts = location.pathname.split("/").filter(Boolean);
  const lastSegment = pathParts[pathParts.length - 1] || "dashboard";
  const tabMap: Record<string, string> = {
    dashboard: "DASHBOARD",
    gl: "GL",
    ar: "AR",
    ap: "AP",
    cash: "CASH",
    hr: "HR",
  };
  return (
    <AccountingPortal
      key={lastSegment}
      initialTab={tabMap[lastSegment] as any}
    />
  );
}

/** SalesInvoicesView — page-based list ↔ form for new sales invoices module */
function SalesInvoicesView() {
  const [view, setView] = useState<"list" | "form">("list");
  const [editId, setEditId] = useState<number | undefined>(undefined);

  const handleOpenForm = (id?: number) => {
    setEditId(id);
    setView("form");
  };

  const handleBack = () => {
    setView("list");
    setEditId(undefined);
  };

  if (view === "form") {
    return (
      <div className="h-full overflow-y-auto custom-scrollbar">
        <SalesInvoiceFormPage
          invoiceId={editId}
          onBack={handleBack}
          onSaved={handleBack}
        />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <SalesInvoiceListPage onOpenForm={handleOpenForm} />
    </div>
  );
}

/** صفحة 404 مخصصة */
function NotFoundPage() {
  return (
    <div
      className="min-h-screen bg-slate-950 flex items-center justify-center text-white"
      dir="rtl"
    >
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-black text-red-600">404</h1>
        <p className="text-slate-400 text-lg">الصفحة غير موجودة</p>
        <a
          href="/"
          className="inline-block px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
        >
          العودة للرئيسية
        </a>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
 *  تعريف المسارات (Routes)
 * ══════════════════════════════════════════════════════════════ */

function AppRoutes() {
  return (
    <Routes>
      {/* ── مسارات عامة ── */}
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* ── مسارات عامة ── */}
      <Route path="/freepbx/test" element={<FreePBXTestPage />} />

     {/* ══════════════════════════════════════════════════════════════
    * مسارات طلبات الطاولات عبر الـ QR Code (عامة للزبائن بدون تسجيل دخول)
    * ══════════════════════════════════════════════════════════════ */}
    <Route 
      path="/customer/:qrCode" 
      element={
        <CustomerTableProvider>
          <Outlet />
        </CustomerTableProvider>
      }
    >
      {/* الصفحة الرئيسية للطاولة عند مسح الـ QR مباشرة */}
      <Route index element={<TablePage />} /> 

      <Route path="menu" element={<MenuPage />} />
      <Route path="cart" element={<CartPage />} />
    </Route>

      {/* ── مسارات محمية (تحتاج تسجيل دخول فقط) ── */}
      <Route
        element={
          <ProtectedRoute>
            <Outlet />
          </ProtectedRoute>
        }
      >
        {/* ═══ مسارات الإدارة العامة ═══
            RoleGuard يفحص الدور → AdminLayout يعرض السايد بار → FinanceView يعرض المحتوى
        */}
        <Route element={<RoleGuard allowedRoles={ADMIN_ROLES} />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin">
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<FinanceView />} />
              <Route path="branches" element={<FinanceView />} />
              <Route path="departments" element={<DepartmentsPage />} />
              <Route path="menu" element={<FinanceView />} />
              <Route path="item-tree" element={<FinanceView />} />
              <Route path="items-index" element={<FinanceView />} />
              <Route path="orders" element={<FinanceView />} />
              <Route path="sales" element={<FinanceView />} />
              <Route path="customers" element={<FinanceView />} />
              <Route path="suppliers" element={<FinanceView />} />
              <Route path="employees" element={<FinanceView />} />
              <Route path="reports" element={<FinanceView />} />
              <Route path="audit" element={<FinanceView />} />
              <Route path="archive" element={<FinanceView />} />
              <Route path="settings" element={<FinanceView />} />
              <Route path="orgstructure" element={<FinanceView />} />
              <Route path="financial-invoices" element={<FinanceView />} />
              <Route path="sales-invoices" element={<SalesInvoicesView />} />
              <Route path="quotes" element={<QuotesView />} />
              <Route path="vouchers" element={<VouchersView />} />
              <Route
                path="vouchers/customers"
                element={<CustomerVouchersView />}
              />
              <Route
                path="vouchers/suppliers"
                element={<SupplierVouchersView />}
              />
              <Route
                path="supplier-payment-vouchers"
                element={<SupplierPaymentVouchersView />}
              />
              <Route path="purchase-bills" element={<PurchaseBillsView />} />
              <Route path="extensions-test" element={<ExtensionsTestView />} />
              <Route path="pbx-extensions" element={<PbxExtensionsTestView />} />
              <Route path="pbx-recordings" element={<PbxRecordingsView />} />
              <Route path="discounts" element={<FinanceView />} /> 
              <Route path="shift-day-closing" element={<FinanceView />} />
              <Route path="shift-closings" element={<ShiftClosingsPage />} />
              <Route path="business-day" element={<BusinessDayClosingPage />} />
              <Route path="printers" element={<PrintersManagement />} />
              <Route path="accounting">
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path=":tab" element={<AccountingView />} />
              </Route>
              <Route path="users" element={<UsersManagementPage />} />
              <Route path="permissions" element={<RolesPermissionsPage />} />
              <Route path="pos-registers" element={<PosRegistersPage />} />
              <Route
                path="hospitality-devices"
                element={<HospitalityDevicesPage />}
              />
              <Route path="dining-zones" element={<DiningZonesPage />} />
              <Route path="dining-dashboard" element={<DiningTablesDashboard />} />
              <Route path="pos" element={<AdminPOSWrapper />} />
            </Route>
          </Route>
        </Route>

        {/* ═══ مسارات نقطة البيع ═══
            RoleGuard يفحص الدور → POSLayout يعرض السايد بار
        */}
        <Route element={<RoleGuard allowedRoles={POS_ROLES} />}>
          <Route element={<POSLayout />}>
            <Route path="/pos">
              <Route index element={<POS onViewTables={() => {}} />} />
              <Route path="orders" element={<OrdersView />} />
              <Route path="tables" element={<TablesView />} />
              <Route path="deferred" element={<DeferredTables />} />
            </Route>
          </Route>
        </Route>

        {/* ═══ مسارات قسم الضيافة ═══
            RoleGuard يفحص الدور → HospitalityLayout يعرض السايد بار الخاص بالضيافة
            يستخدم مكونات خاصة بالضيافة
        */}
        <Route element={<RoleGuard allowedRoles={HOSPITALITY_ROLES} />}>
          <Route element={<HospitalityLayout />}>
            <Route path="/Hospitality">
              <Route index element={<HospitalityPOS />} />
              <Route path="orders" element={<HospitalityOrders />} />
              <Route path="tables" element={<HospitalityTables />} />
            </Route>
          </Route>
        </Route>

        {/* ── إدارة الشفت ── */}
        <Route
          path="/shift"
          element={React.createElement(ShiftView as any, {
            currentShift: null,
            summary: null,
            shiftLoading: false,
            currentUserName: "",
            onOpen: async () => {},
            onClose: async () => {},
            onFetchSummary: async () => {},
          })}
        />

        {/* ── إغلاق اليوم ── */}
        <Route path="/admin/day-close" element={<DayClosePage />} />

        {/* ── لوحة التسوية المالية ── */}
        <Route path="/admin/reconciliation" element={<ReconciliationBoard />} />

        {/* ── الصفحة الافتراضية ── */}
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
      </Route>

      {/* ── 404 ── */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

/* ══════════════════════════════════════════════════════════════
 *  المكون الرئيسي
 * ══════════════════════════════════════════════════════════════ */

function App() {
  useEffect(() => {
    const handler = () => {
      sound.init();
      document.removeEventListener("click", handler);
    };
    document.addEventListener("click", handler, { once: true });
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastContainer />
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
