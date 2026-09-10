/**
 * ProtectedRoute.tsx
 * ───────────────────
 * مكوّن حماية الصفحات الكاملة باستخدام react-router-dom.
 * يمنع الدخول إذا:
 *   1. المستخدم غير مسجّل دخول → يُحوّل إلى /login
 *   2. لا يملك الـ permission المطلوب → يُحوّل إلى /unauthorized
 *   3. لا يملك الـ role المطلوب → يُحوّل إلى /unauthorized
 *
 * Usage:
 *   <Route
 *     path="/dashboard"
 *     element={
 *       <ProtectedRoute permission="view-dashboard">
 *         <Dashboard />
 *       </ProtectedRoute>
 *     }
 *   />
 *
 *   <Route
 *     path="/admin"
 *     element={
 *       <ProtectedRoute role="admin">
 *         <AdminPanel />
 *       </ProtectedRoute>
 *     }
 *   />
 */

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

interface ProtectedRouteProps {
  /** الصلاحية المطلوبة (اختياري) */
  permission?: string;
  /** الدور المطلوب (اختياري) */
  role?: string;
  /**
   * عدة أدوار مقبولة (أي واحدة منها كافية).
   * مثال: roles={["admin", "manager"]}
   */
  roles?: string[];
  /** المحتوى المراد حمايته */
  children: React.ReactNode;
}

/* ── شاشة التحميل أثناء جلب بيانات المستخدم ── */
const LoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-slate-400 font-bold text-sm">جاري التحقق من الصلاحيات...</p>
    </div>
  </div>
);

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  permission,
  role,
  roles,
  children,
}) => {
  const { user, loading, isLoggedIn, hasPermission, hasRole } = useAuth();
  const location = useLocation();

  /* ── الخطوة 1: انتظار تحميل بيانات المستخدم ── */
  if (loading) {
    return <LoadingScreen />;
  }

  /* ── الخطوة 2: التحقق من تسجيل الدخول ── */
  if (!isLoggedIn || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  /* ── الخطوة 3: التحقق من الصلاحية (permission) ── */
  if (permission && !hasPermission(permission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  /* ── الخطوة 4: التحقق من الدور (role) ── */
  if (role && !hasRole(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  /* ── الخطوة 5: التحقق من عدة أدوار ── */
  if (roles && roles.length > 0) {
    const hasAnyRole = roles.some((r) => hasRole(r));
    if (!hasAnyRole) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  /* ── جميع الفحوصات نجحت → عرض المحتوى ── */
  return <>{children}</>;
};

/**
 * مكوّن صفحة "غير مصرح" - يمكنك تعديله حسب تصميمك
 */
export const UnauthorizedPage: React.FC = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-100" dir="rtl">
    <div className="max-w-md w-full text-center space-y-8">
      <div className="w-24 h-24 bg-red-600/20 rounded-full flex items-center justify-center mx-auto">
        <svg className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      </div>
      <div>
        <h1 className="text-4xl font-black text-white">غير مصرح</h1>
        <p className="text-slate-500 mt-3 font-medium">
          ليس لديك الصلاحيات الكافية للوصول إلى هذه الصفحة.
        </p>
      </div>
      <button
        onClick={() => window.history.back()}
        className="px-8 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors"
      >
        العودة
      </button>
    </div>
  </div>
);