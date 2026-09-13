/**
 * USAGE_EXAMPLES.tsx
 * ───────────────────
 * أمثلة شاملة لكيفية استخدام نظام المصادقة والصلاحيات في مشروعك.
 * ⚠️  هذا ملف مرجعي فقط — انسخ الكود المناسب إلى ملفاتك الفعلية.
 */

import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
} from "react-router-dom";
import {
  AuthProvider,
  useAuth,
  Can,
  IsRole,
  ProtectedRoute,
  UnauthorizedPage,
} from "./index";

/* ══════════════════════════════════════════════════════════════
 * 1. تغليف التطبيق بـ AuthProvider
 *    ─────────────────────────────────
 *    ضع <AuthProvider> حول جميع مكوناتك في ملف التغليف الرئيسي
 * ══════════════════════════════════════════════════════════════ */

// ── main.tsx أو App.tsx ──
export function AppRoot() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

/* ══════════════════════════════════════════════════════════════
 * 2. تعريف المسارات (Routes) مع الحماية
 * ══════════════════════════════════════════════════════════════ */

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      {/* ── مسارات عامة (لا تحتاج auth) ── */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* ── مسارات محمية بالدور ── */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute role="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* ── مسارات محمية بعدة أدوار ── */}
      <Route
        path="/branches/*"
        element={
          <ProtectedRoute roles={["admin", "manager"]}>
            <BranchManagement />
          </ProtectedRoute>
        }
      />

      {/* ── مسارات محمية بالصلاحية ── */}
      <Route
        path="/accounting/*"
        element={
          <ProtectedRoute permission="view-accounting">
            <AccountingPage />
          </ProtectedRoute>
        }
      />

      {/* ── مسارات محمية بتسجيل الدخول فقط ── */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      {/* ── صفحة غير مصرح ── */}
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* ── التوجيه الافتراضي ── */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

/* ══════════════════════════════════════════════════════════════
 * 3. صفحة تسجيل الدخول (مع useAuth)
 * ══════════════════════════════════════════════════════════════ */

function LoginPage() {
  const { login, isLoggedIn } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  // إذا كان مسجّل دخول بالفعل، وَجهه للرئيسية
  if (isLoggedIn) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      // login() يقوم تلقائياً بحفظ التوكن والأدوار والصلاحيات
    } catch (err: any) {
      setError(err.response?.data?.message || "خطأ في تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4" dir="rtl">
      <div className="max-w-md w-full p-8 bg-slate-900 rounded-3xl border border-white/5 space-y-6">
        <h1 className="text-2xl font-black text-white text-center">تسجيل الدخول</h1>

        {error && (
          <div className="bg-red-600/20 text-red-400 p-3 rounded-xl text-sm font-bold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="البريد الإلكتروني"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-4 bg-slate-800 rounded-xl text-white outline-none focus:ring-2 focus:ring-red-600"
            required
          />
          <input
            type="password"
            placeholder="كلمة المرور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-4 bg-slate-800 rounded-xl text-white outline-none focus:ring-2 focus:ring-red-600"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-red-600 text-white rounded-xl font-black hover:bg-red-700 transition-all disabled:opacity-50"
          >
            {loading ? "جاري الدخول..." : "دخول"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
 * 4. استخدام <Can> لإخفاء/إظهار العناصر بالصلاحية
 * ══════════════════════════════════════════════════════════════ */

function BranchManagement() {
  return (
    <div className="p-8" dir="rtl">
      <h1 className="text-3xl font-black text-white mb-8">إدارة الفروع</h1>

      {/* ── زر الإضافة: يظهر فقط لمن يملك صلاحية "create-branch" ── */}
      <Can permission="create-branch">
        <button className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold mb-4">
          + إضافة فرع جديد
        </button>
      </Can>

      {/* ── زر الحذف مع fallback ── */}
      <Can
        permission="delete-branch"
        fallback={
          <button disabled className="px-6 py-3 bg-slate-700 text-slate-500 rounded-xl font-bold cursor-not-allowed">
            حذف (غير مصرح)
          </button>
        }
      >
        <button className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold">
          حذف الفرع
        </button>
      </Can>

      {/* ── جدول الفروع مع أزرار تعديل مشروطة ── */}
      <table className="w-full text-white">
        <thead>
          <tr className="border-b border-white/10">
            <th className="p-3 text-right">الاسم</th>
            <th className="p-3 text-right">الحالة</th>
            <th className="p-3 text-right">إجراءات</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-white/5">
            <td className="p-3">فرع غزة</td>
            <td className="p-3">نشط</td>
            <td className="p-3 space-x-2 space-x-reverse">
              {/* ── زر التعديل: يظهر فقط لمن يملك "edit-branch" ── */}
              <Can permission="edit-branch">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
                  تعديل
                </button>
              </Can>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
 * 5. استخدام <IsRole> لإخفاء/إظهار العناصر بالدور
 * ══════════════════════════════════════════════════════════════ */

function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="p-8" dir="rtl">
      <h1 className="text-3xl font-black text-white mb-4">
        مرحباً، {user?.name}
      </h1>

      {/* ── معلومات المستخدم ── */}
      <div className="bg-slate-800 p-4 rounded-xl mb-6 text-slate-300 text-sm">
        <p><strong>الأدوار:</strong> {user?.roles.join(", ") || "لا يوجد"}</p>
        <p><strong>الصلاحيات:</strong> {user?.permissions.join(", ") || "لا يوجد"}</p>
      </div>

      {/* ── عناصر تظهر فقط لل-admin ── */}
      <IsRole role="admin">
        <div className="bg-red-600/10 border border-red-600/30 p-4 rounded-xl mb-4">
          <h3 className="text-red-400 font-black">لوحة تحكم المدير</h3>
          <p className="text-slate-400 text-sm mt-1">
            هذه المنطقة متاحة فقط للمديرين.
          </p>
        </div>
      </IsRole>

      {/* ── عناصر تظهر لعدة أدوار ── */}
      <IsRole role="admin|manager">
        <div className="bg-blue-600/10 border border-blue-600/30 p-4 rounded-xl mb-4">
          <h3 className="text-blue-400 font-black">إدارة التقارير</h3>
          <p className="text-slate-400 text-sm mt-1">
            متاحة للمديرين ومديري الفروع.
          </p>
        </div>
      </IsRole>

      {/* ── معلومات الدور الحالية ── */}
      <IsRole role="admin" fallback={
        <p className="text-slate-500 font-bold">أنت تستخدم النظام كـ {user?.roles[0] || "مستخدم"}</p>
      }>
        <p className="text-green-400 font-bold">أنت مسجل كـ مدير (Admin)</p>
      </IsRole>

      <button
        onClick={logout}
        className="mt-8 px-6 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors"
      >
        تسجيل خروج
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
 * 6. استخدام Hooks في أي مكوّن
 * ══════════════════════════════════════════════════════════════ */

function SomeComponent() {
  // ── استخدام useCan كـ Hook ──
  const canDelete = useCanHook("delete-branch");
  const canEdit = useCanHook("edit-branch");

  // ── استخدام useIsRole كـ Hook ──
  const isAdmin = useIsRoleHook("admin");

  return (
    <div>
      {canDelete && <button>حذف</button>}
      {canEdit && <button>تعديل</button>}
      {isAdmin && <span>أنت مدير</span>}
    </div>
  );
}

// ── استيراد الـ Hooks ──
import { useCan as useCanHook, useIsRole as useIsRoleHook } from "./index";

/* ══════════════════════════════════════════════════════════════
 * 7. صفحات placeholder (استبدلها بمكوناتك الحقيقية)
 * ══════════════════════════════════════════════════════════════ */

function AdminDashboard() {
  return (
    <div className="p-8 text-white" dir="rtl">
      <h1 className="text-3xl font-black">لوحة تحكم المدير</h1>
    </div>
  );
}

function AccountingPage() {
  return (
    <div className="p-8 text-white" dir="rtl">
      <h1 className="text-3xl font-black">المحاسبة</h1>
    </div>
  );
}