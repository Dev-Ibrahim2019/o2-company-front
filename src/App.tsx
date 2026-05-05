
import { AdminLayout } from "./components/administration/Layout";
import { POSLayout } from "./components/POS/Layout";
import { FinancePortal } from './components/administration/FinancePortal'
import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from '../store';
import { POS } from "./components/POS/pos";
import { TablesView } from "./components/POS/Tables";
import { OrdersView } from "./components/POS/Orders";
import { Login } from "./components/Login";
import { ShiftView } from "./components/POS/Shift";
// import api from "./api/axios";

const Main: React.FC = () => {
  const { currentUser, currentShift, userRole, editingOrderId } = useApp();
  const [activeView, setActiveView] = useState('finance_dashboard');
  // useEffect(() => {
  //   if (userRole === 'ADMIN' || userRole === 'FINANCE') {
  //     setActiveView('finance_dashboard');
  //   } else if (userRole === 'BRANCH_MANAGER') {
  //     setActiveView('branch_dashboard');
  //   } else if (userRole === 'HOSPITALITY') {
  //     setActiveView('hospitality_tables');
  //   } else if (userRole === 'DEPARTMENT_STAFF') {
  //     setActiveView('dept_dashboard');
  //   } else if (userRole === 'ORDER_AGGREGATOR') {
  //     setActiveView('aggregator_dashboard');
  //   } else if (userRole === 'EMPLOYEE') {
  //     setActiveView('employee_dashboard');
  //   } else if (userRole === 'CUSTOMER') {
  //     setActiveView('customer_home');
  //   } else if (editingOrderId) {
  //     setActiveView('pos');
  //   }
  // }, [userRole, editingOrderId]);

  if (!currentUser) return <Login />;
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
      // case 'hospitality_tables': return <HospitalityView key="h_tables" initialTab="tables" setActiveView={setActiveView} />;
      // case 'hospitality_pos': return <POS onViewTables={() => setActiveView('hospitality_tables')} />;
      // case 'hospitality_new_orders': return <HospitalityView key="h_new" initialTab="new_orders" setActiveView={setActiveView} />;
      // case 'hospitality_tracking': return <HospitalityView key="h_track" initialTab="tracking" setActiveView={setActiveView} />;
      // case 'hospitality_feedback': return <HospitalityView key="h_feed" initialTab="feedback" setActiveView={setActiveView} />;
      // case 'hospitality_tasks': return <HospitalityView key="h_tasks" initialTab="tasks" setActiveView={setActiveView} />;
      // case 'dept_dashboard': return <DepartmentView key="d_dash" />;
      // case 'dept_orders': return <DepartmentView key="d_orders" initialView="ORDERS" />;
      // case 'departments': return <DepartmentView key="d_main" />;
      // case 'aggregator_dashboard': return <OrderAggregatorDashboard />;
      // case 'aggregator_shelves': return <ShelfGridView />;
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
      // case 'finance': return <FinanceReports />;
      // case 'org': return <OrgStructure />;
      // case 'branch_dashboard': return <BranchManagerPortal />;
      // case 'branch_live': return <BranchManagerPortal />; // Shared for now
      // case 'branch_orders': return <OrdersView />; // Reusable component
      // case 'customer_home': return <CustomerPortal key="c_home" initialTab="home" />;
      // case 'customer_menu': return <CustomerPortal key="c_menu" initialTab="menu" />;
      // case 'customer_orders': return <CustomerPortal key="c_orders" initialTab="orders" />;
      // case 'customer_wallet': return <CustomerPortal key="c_wallet" initialTab="wallet" />;
      // case 'customer_profile': return <CustomerPortal key="c_profile" initialTab="profile" />;
      // case 'employee_dashboard': return <EmployeeDashboard key="e_dash" initialTab="DASHBOARD" />;
      // case 'employee_personal': return <EmployeeDashboard key="e_pers" initialTab="PERSONAL" />;
      // case 'employee_shift': return <EmployeeDashboard key="e_shift" initialTab="SHIFT" />;
      // case 'employee_timesheet': return <EmployeeDashboard key="e_time" initialTab="TIMESHEET" />;
      // case 'employee_finance': return <EmployeeDashboard key="e_fin" initialTab="FINANCE" />;
      // case 'employee_policies': return <EmployeeDashboard key="e_pol" initialTab="POLICIES" />;
      // default: return <div className="p-10 text-center text-slate-400 font-bold">هذه الخاصية قيد التطوير</div>;
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

function App() {
  const [activeView, setActiveView] = useState("finance_dashboard");

  return (
    <div>
      <Main />
    </div>
  )
}

export default App;

// import { useState, useEffect } from "react";
// import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// import './App.css';
// import api from "./api/axios";
// import LoginForm from "./components/LoginForm";
// import RegisterForm from "./components/RegisterForm";
// import Dashboard from "./components/Dashboard";

// function AppRoutes() {
//   const [user, setUser]   = useState<any>(null);
//   const [ready, setReady] = useState(false);

//   // Helper to refresh user from API after login/register
//   const refreshUser = async () => {
//     const token = localStorage.getItem("token");
//     if (token) {
//       try {
//         const { data } = await api.get("/auth/me");
//         setUser(data.user);
//       } catch {
//         setUser(null);
//         localStorage.removeItem("token");
//       }
//     } else {
//       setUser(null);
//     }
//   };

//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     if (token) {
//       api.get("/auth/me")
//         .then(({ data }) => setUser(data.user))
//         .catch(() => {
//           setUser(null);
//           localStorage.removeItem("token");
//         })
//         .finally(() => setReady(true));
//     } else {
//       setReady(true);
//     }
//   }, []);

//   if (!ready) return (
//     <div className="root">
//       <div className="loader-wrap"><span className="spinner dark" /></div>
//     </div>
//   );

//   return (
//     <div className="root">
//       <div className="bg-grid" />
//       <div className="bg-blob b1" />
//       <div className="bg-blob b2" />
//       <div className={`card ${user ? "wide" : ""}`}>
//         {!user && (
//           <div className="card-side">
//             <div className="side-text">
//               <div className="logo">◈ AUTH</div>
//               <p>A clean, secure authentication experience built with React + Axios.</p>
//             </div>
//             <div className="side-shapes">
//               <div className="shape s1" />
//               <div className="shape s2" />
//               <div className="shape s3" />
//             </div>
//           </div>
//         )}
//         <div className="card-body">
//           <Routes>
//             <Route
//               path="/login"
//               element={
//                 user
//                   ? <Navigate to="/dashboard" replace />
//                   : <LoginForm onLogin={refreshUser} />
//               }
//             />
//             <Route
//               path="/register"
//               element={
//                 user
//                   ? <Navigate to="/dashboard" replace />
//                   : <RegisterForm onLogin={refreshUser} />
//               }
//             />
//             <Route
//               path="/dashboard"
//               element={
//                 user
//                   ? <Dashboard user={user} onLogout={() => { setUser(null); localStorage.removeItem("token"); }} />
//                   : <Navigate to="/login" replace />
//               }
//             />
//             <Route
//               path="*"
//               element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
//             />
//           </Routes>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default function AuthApp() {
//   return (
//     <BrowserRouter>
//       <AppRoutes />
//     </BrowserRouter>
//   );
// }