/**
 * AuthContext.tsx
 * ───────────────
 * سياق (Context) مخصص لإدارة حالة المصادقة في التطبيق.
 * يربط الـ API بالـ localStorage ويوفر الحالة لكل المكونات.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import api from "../api/axios";
import {
  saveAuthData,
  getToken,
  getRoles,
  getPermissions,
  clearAuthData,
  isLoggedIn as checkIsLoggedIn,
  setBranchId,
} from "./authStorage";

/* ── نوع بيانات المستخدم المُرجّع من الـ API ── */
export interface AuthUser {
  id?: number;
  name: string;
  email: string;
  branch_id?: number | null;
  roles: string[];
  permissions: string[];
}

/* ── نوع السياق ── */
interface AuthContextType {
  /** بيانات المستخدم الحالية (null إذا لم يسجّل دخول) */
  user: AuthUser | null;
  /** التوكن */
  token: string | null;
  /** حالة التحميل الأولية (للحصول على بيانات المستخدم) */
  loading: boolean;
  /** تسجيل الدخول عبر API */
  login: (username: string, password: string) => Promise<void>;
  /** تحديث أدوار المستخدم بعد تسجيل الدخول (لحل timing issue مع Login.tsx) */
  updateRoles: (roles: string[]) => void;
  /** تسجيل الخروج */
  logout: () => Promise<void>;
  /** تحميل بيانات المستخدم من الـ API (يُستخدم عند تحميل التطبيق) */
  fetchUser: () => Promise<void>;
  /** Helpers */
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  isLoggedIn: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/* ── مزوّد السياق ── */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(getToken);
  const [loading, setLoading] = useState(true);

  /* ── جلب بيانات المستخدم من /auth/me ── */
  const fetchUser = useCallback(async () => {
    const currentToken = getToken();
    if (!currentToken) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }

    try {
      const { data } = await api.get("/auth/me");
      const userData = data.user || data.data?.user || data;

      // مزامنة branch_id في localStorage مع القيمة الحقيقية من الخادم — بدون هذا،
      // getBranchId() (المستخدمة في شاشات الكول سنتر لإنشاء الطلبات وعرض تحذير
      // الفرع) تبقى عالقة على قيمة تسجيل الدخول القديمة حتى لو رَبَط المشرف فرعاً
      // للموظف لاحقاً — راجع setBranchId في authStorage.ts للتفاصيل.
      setBranchId(userData.branch_id ?? null);

      setUser({
        id: userData.id,
        name: userData.name,
        email: userData.email,
        branch_id: userData.branch_id ?? null,
        roles: getRoles(),
        permissions: getPermissions(),
      });
      setToken(currentToken);
    } catch (err) {
      // التوكن منتهي الصلاحية أو غير صالح
      clearAuthData();
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── تحميل المستخدم عند بدء التطبيق ── */
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  /* ── تحديث الأدوار يدوياً (يستخدمها Login.tsx بعد تحديد الأدوار البديلة) ── */
  const updateRoles = useCallback((roles: string[]) => {
    setUser((prev) => (prev ? { ...prev, roles } : prev));
  }, []);

  /* ── تسجيل الدخول ── */
  const login = useCallback(async (username: string, password: string) => {
    const { data } = await api.post("/login", { username, password });

    // استخراج البيانات من الاستجابة الموحدة
    const responseData = data.data || data;

    const token: string = responseData.token;
    let roles: string[] = responseData.roles || [];
    const permissions: string[] = responseData.permissions || [];

    // Save to localStorage
    saveAuthData({ token, roles, permissions, branch_id: responseData.user?.branch_id ?? null });

    // 🛡️ If API returned empty roles/permissions, re-read from localStorage
    // (Login.tsx may have filled them from the store role mapping)
    if (roles.length === 0) {
      roles = getRoles();
    }

    // تحديث الحالة
    setToken(token);
    setUser({
      id: responseData.user?.id,
      name: responseData.user?.name || "",
      email: responseData.user?.email || "",
      branch_id: responseData.user?.branch_id ?? null,
      roles,
      permissions,
    });
  }, []);

  /* ── تسجيل الخروج ── */
  const logout = useCallback(async () => {
    try {
      await api.post("/logout");
    } catch {
      // تجاهل الأخطاء - نحذف البيانات无论如何
    } finally {
      clearAuthData();
      setUser(null);
      setToken(null);
    }
  }, []);

  /* ── Helpers ── */
  const hasRole = useCallback(
    (role: string) => user?.roles.includes(role) ?? false,
    [user]
  );

  const hasPermission = useCallback(
    (permission: string) => user?.permissions.includes(permission) ?? false,
    [user]
  );

  const value: AuthContextType = {
    user,
    token,
    loading,
    login,
    updateRoles,
    logout,
    fetchUser,
    hasRole,
    hasPermission,
    isLoggedIn: !!user && !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/* ── Hook لاستخدام السياق ── */
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth يجب أن يُستخدم داخل <AuthProvider>");
  }
  return ctx;
}