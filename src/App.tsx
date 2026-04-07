
import { FinancePortal } from './components/administration/FinancePortal'

function App() {
  return (
    <div>
      <FinancePortal />
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
