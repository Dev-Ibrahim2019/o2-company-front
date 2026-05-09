// src/services/authService.ts
//
// خدمة المصادقة — تتعامل مع تسجيل الدخول/الخروج وجلب بيانات المستخدم الحالي

import api from "../api/axios";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  // بيانات المستخدم الأساسية
  id: number;
  name: string;
  email: string;

  // بيانات الموظف
  employee_id: number | null;
  employeeId?: string;
  phone?: string;
  image?: string;

  // الصلاحيات
  role: string;
  status: string;
  permissions: string[];

  // الفرع
  branch_id: number | null;
  branchId: number | null; // للتوافق مع الكود القديم
  branch: {
    id: number;
    name: string;
    code: string;
  } | null;

  // القسم
  department_id: number | null;
  department: {
    id: number;
    name: string;
  } | null;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const authService = {
  /**
   * تسجيل الدخول — يحفظ التوكن ويُرجع بيانات المستخدم
   */
  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    const { data } = await api.post("/login", payload);
    const result = data.data as LoginResponse;

    // حفظ التوكن في localStorage
    localStorage.setItem("token", result.token);

    return result;
  },

  /**
   * تسجيل الخروج — يحذف التوكن من الـ API ومن localStorage
   */
  logout: async (): Promise<void> => {
    try {
      await api.post("/logout");
    } catch {
      // حتى لو فشل الـ API، نحذف التوكن محلياً
    } finally {
      localStorage.removeItem("token");
    }
  },

  /**
   * جلب بيانات المستخدم الحالي من الـ API
   */
  getMe: async (): Promise<AuthUser> => {
    const { data } = await api.get("/auth/me");
    return data.data as AuthUser;
  },

  /**
   * هل المستخدم مسجل دخول؟ (توجد توكن محلياً)
   */
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem("token");
  },

  /**
   * جلب التوكن الحالي
   */
  getToken: (): string | null => {
    return localStorage.getItem("token");
  },
};
