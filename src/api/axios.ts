/**
 * axios.ts — Axios المُخصص للمشروع
 * ───────────────────────────────────
 * - يُرسل التوكن تلقائياً مع كل طلب
 * - يُنظف جميع البيانات ويُحوّل إلى /login عند الخطأ 401
 */

import axios from "axios";
import { clearAuthData } from "../auth/authStorage";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

/* ══════════════════════════════════════════════════════════════
 *  Request Interceptor — حقن التوكن تلقائياً
 * ══════════════════════════════════════════════════════════════ */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ══════════════════════════════════════════════════════════════
 *  Response Interceptor — معالجة أخطاء 401
 *  يُنظف token + roles + permissions ثم يُحوّل إلى /login
 * ══════════════════════════════════════════════════════════════ */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // تنظيف كامل: token + roles + permissions
      clearAuthData();
      // توجيه فوري إلى صفحة تسجيل الدخول
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
