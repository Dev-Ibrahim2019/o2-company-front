// src/hooks/useAuth.ts
//
// Hook مركزي لإدارة حالة المصادقة في التطبيق
// يُستخدم في App.tsx أو في AuthContext

import { useState, useEffect, useCallback } from "react";
import {
  authService,
  type AuthUser,
  type LoginPayload,
} from "../services/authService";

interface UseAuthReturn {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ── جلب بيانات المستخدم الحالي ───────────────────────────────────────────
  const refetchUser = useCallback(async () => {
    if (!authService.isAuthenticated()) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const userData = await authService.getMe();
      setUser(userData);
    } catch {
      // التوكن منتهي أو غير صالح
      localStorage.removeItem("token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // عند تحميل التطبيق: حاول جلب بيانات المستخدم إذا كان هناك توكن
  useEffect(() => {
    refetchUser();
  }, [refetchUser]);

  // ── تسجيل الدخول ─────────────────────────────────────────────────────────
  const login = useCallback(async (payload: LoginPayload) => {
    try {
      setLoading(true);
      setError(null);
      const result = await authService.login(payload);
      setUser(result.user);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ?? "فشل تسجيل الدخول، يرجى المحاولة مجدداً";
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── تسجيل الخروج ─────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
    }
  }, []);

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    logout,
    refetchUser,
  };
};
