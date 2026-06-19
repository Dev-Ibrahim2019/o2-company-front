/**
 * App.tsx — النسخة المُصحّحة
 * 1. تحويل تلقائي بعد Login حسب الدور
 * 2. حماية مسارات Admin بالدور (role)
 * 3. تحديث المحتوى عند تغيير الرابط (key prop)
 */

import React from "react";
import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { AuthProvider, useAuth, ProtectedRoute, UnauthorizedPage } from "./auth";
import { ROLES } from "./auth/permissions";

// ── المكونات ──
import { Login } from "./components/Login";
import { AdminLayout } from "./components/administration/Layout";
import { FinancePortal } from "./components/administration/FinancePortal";
import { AccountingPortal } from "./components/administration/GL/AccountingPortal";
import { POSLayout } from "./components/POS/Layout";
import { POS } from "./components/POS/pos";
import { TablesView } from "./components/POS/Tables";
import { OrdersView } from "./components/POS/Orders";
import { ShiftView } from "./components/POS/Shift";
import UsersManagementPage from "./pages/UsersManagementPage";
import RolesPermissionsPage from "./pages/RolesPermissionsPage";

/* ══════════════════════════════════════════════════════════════
 *  حماية الأدوار — تمنع الوصول لمن لا يملك الدور المطلوب
 * ══════════════════════════════════════════════════════════════ */

/** الأدوار المسموح بها في مسارات /admin/* */
const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT, ROLES.BRANCH_MANAGER];

/** الأدوار المسموح بها في مسارات /pos/* */
const POS_ROLES = [ROLES.CASHIER, ROLES.HOSPITALITY, ROLES.DEPT_STAFF];

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
  return <AccountingPortal key={lastSegment} initialTab={tabMap[lastSegment] as any} />;
}

/** صفحة 404 مخصصة */
function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white" dir="rtl">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-black text-red-600">404</h1>
        <p className="text-slate-400 text-lg">الصفحة غير موجودة</p>
        <a href="/" className="inline-block px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors">
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

      {/* ── مسارات محمية (تحتاج تسجيل دخول فقط) ── */}
      <Route element={<ProtectedRoute><Outlet /></ProtectedRoute>}>

        {/* ═══ مسارات الإدارة العامة ═══
            RoleGuard يفحص الدور → AdminLayout يعرض السايد بار → FinanceView يعرض المحتوى
        */}
        <Route element={<RoleGuard allowedRoles={ADMIN_ROLES} />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin">
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<FinanceView />} />
              <Route path="branches" element={<FinanceView />} />
              <Route path="departments" element={<FinanceView />} />
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

              <Route path="accounting">
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path=":tab" element={<AccountingView />} />
              </Route>
              <Route path="users" element={<UsersManagementPage />} />
              <Route path="permissions" element={<RolesPermissionsPage />} />
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
            </Route>
          </Route>
        </Route>

        {/* ── إدارة الشفت ── */}
        <Route
          path="/shift"
          element={
            React.createElement(ShiftView as any, {
              currentShift: null,
              summary: null,
              shiftLoading: false,
              currentUserName: "",
              onOpen: async () => {},
              onClose: async () => {},
              onFetchSummary: async () => {},
            })
          }
        />

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
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;