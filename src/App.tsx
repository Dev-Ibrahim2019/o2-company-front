import React, { useState, useEffect } from "react";
import { AuthProvider, useAuthContext } from "./contexts/AuthContext";
import LoginPage from "./components/auth/LoginPage";

// استيراد المكونات من ملفك الأصلي
import { POSLayout } from "./components/POS/Layout";
import { FinancePortal } from './components/administration/FinancePortal';
import { AppProvider, useApp } from "../store";
import { POS } from "./components/POS/pos";
import { TablesView } from "./components/POS/Tables";
import { OrdersView } from "./components/POS/Orders";
import { ShiftView } from "./components/POS/Shift";
import { AdminLayout } from "../src/components/administration/Layout"; // افتراض وجود هذا المكون

// ── Shell الداخلي (يُرنَّد بعد التحقق من المصادقة) ──────────────────────────
const AppShell: React.FC = () => {
  const { user, loading, isAuthenticated, logout } = useAuthContext();

  // شاشة تحميل أولية
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 font-bold text-sm">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // إذا لم يكن مسجلاً → صفحة الدخول
  if (!isAuthenticated || !user) {
    return <LoginPage />;
  }

  // ✅ المستخدم مسجل دخول — نمرر بياناته للتطبيق الرئيسي
  // نستخدم AppProvider من ملفك الأصلي لتوفير السياق اللازم للمكونات الداخلية
  // ونمرر بيانات المستخدم من AuthContext إلى AppProvider إذا كان يدعم ذلك.
  // هنا نفترض أن AppProvider يمكنه استخدام `user` مباشرة أو أن `useApp` سيقوم بجلب البيانات بناءً على حالة المصادقة.
  return (
    <AppProvider initialUser={user} onLogout={logout}> {/* افتراض أن AppProvider يقبل initialUser و onLogout */}
      <Main />
    </AppProvider>
  );
};

// ── المكون الرئيسي للتطبيق بعد الدخول (من ملفك الأصلي) ─────────────────────
const Main: React.FC = () => {
  const { currentUser, currentShift, userRole, editingOrderId } = useApp();
  const [activeView, setActiveView] = useState('finance_dashboard');

  // لا نحتاج إلى فحص !currentUser هنا لأن AppShell يتعامل مع المصادقة
  // if (!currentUser) return <Login />;

  const showContent = () => {
    const isAdmin = userRole === 'ADMIN';
    const isBranchManager = userRole === 'BRANCH_MANAGER';
    const isHospitality = userRole === 'HOSPITALITY';
    const isDeptStaff = userRole === 'DEPARTMENT_STAFF';
    const isAggregator = userRole === 'ORDER_AGGREGATOR';

    // Branch Managers, Super Admins, Hospitality, and Dept Staff bypass shift check
    if (!currentShift && !isAdmin && !isBranchManager && !isHospitality && !isDeptStaff && !isAggregator && activeView !== 'shift' && userRole !== 'CUSTOMER' && userRole !== 'EMPLOYEE') {
      return (
        <div className="h-full flex flex-col items-center justify-center space-y-6 bg-white rounded-[3rem] shadow-sm">
          <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 shadow-inner">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div className="text-center max-w-sm px-6">
            <h3 className="text-3xl font-black text-slate-800">تنبيه: الشفت مغلق</h3>
            <p className="text-slate-500 mt-2 font-medium">يجب فتح شفت جديد وتسجيل الرصيد الافتتاحي لبدء استقبال الطلبات.</p>
          </div>
          <button
            onClick={() => setActiveView('shift')}
            className="px-12 py-4 bg-orange-500 text-white rounded-2xl font-black hover:bg-orange-600 transition-all shadow-xl shadow-orange-100"
          >
            فتح شفت العمل الآن
          </button>
        </div>
      );
    }

    switch (activeView) {
      case 'pos': return <POS onViewTables={() => setActiveView('tables')} />;
      case 'tables': return <TablesView onSelect={() => setActiveView('pos')} />;
      case 'orders': return <OrdersView />;
      case 'shift':
        return (
          <ShiftView
            currentShift={currentShift}
            summary={null} // مؤقت
            shiftLoading={false} // مؤقت
            currentUserName={currentUser?.name || ''}
            onOpen={async (balance) => {
              console.log("فتح شفت:", balance);
              // TODO: اربطها مع API
            }}
            onClose={async (balance) => {
              console.log("إغلاق شفت:", balance);
            }}
            onFetchSummary={async () => {
              console.log("fetch summary");
            }}
          />
        );
      case 'finance_dashboard': return <FinancePortal key="f_dash" initialView="DASHBOARD" />;
      case 'finance_branches': return <FinancePortal key="f_branches" initialView="BRANCHES" />;
      case 'finance_departments': return <FinancePortal key="f_depts" initialView="DEPARTMENTS" />;
      case 'finance_menu': return <FinancePortal key="f_menu" initialView="MENU" />;
      case 'finance_orders': return <FinancePortal key="f_orders" initialView="ORDERS" />;
      case 'finance_customers': return <FinancePortal key="f_cust" initialView="CUSTOMERS" />;
      case 'finance_suppliers': return <FinancePortal key="f_supp" initialView="SUPPLIERS" />;
      case 'finance_employees': return <FinancePortal key="f_emp" initialView="EMPLOYEES" />;
      case 'finance_accounting': return <FinancePortal key="f_acc" initialView="ACCOUNTING" />;
      case 'finance_reports': return <FinancePortal key="f_rep" initialView="REPORTS" />;
      case 'finance_audit': return <FinancePortal key="f_audit" initialView="AUDIT_LOG" />;
      case 'finance_archive': return <FinancePortal key="f_arch" initialView="ARCHIVE" />;
      case 'finance_settings': return <FinancePortal key="f_sett" initialView="SETTINGS" />;
      case 'finance_orgstructure': return <FinancePortal key="f_org" initialView="ORGSTRUCTURE" />;
      default: return <div className="p-10 text-center text-slate-400 font-bold">هذه الخاصية قيد التطوير</div>;
    }
  };

  if (userRole === 'ADMIN' || userRole === 'FINANCE') {
    return (
      <AdminLayout activeView={activeView} setActiveView={setActiveView}>
        {showContent()}
      </AdminLayout>
    );
  }

  return (
    <POSLayout activeView={activeView} setActiveView={setActiveView}>
      {showContent()}
    </POSLayout>
  );
};

// ── Root Export ───────────────────────────────────────────────────────────────
const App: React.FC = () => (
  <AuthProvider>
    <AppShell />
  </AuthProvider>
);

export default App;
