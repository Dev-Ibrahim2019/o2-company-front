/**
 * axios.ts — Axios المُخصص للمشروع
 * ───────────────────────────────────
 * - يُرسل التوكن تلقائياً مع كل طلب
 * - يُرسل device_uuid تلقائياً في الهيدر لفحص الـ POS Security
 * - يُنظف جميع البيانات ويُحوّل إلى /login عند الخطأ 401
 * - يُحوّل إلى /activate عند الخطأ 403 من POS Security
 */

import axios from "axios";
import { clearAuthData } from "../auth/authStorage";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

/* ══════════════════════════════════════════════════════════════
 *  Request Interceptor — حقن التوكن + device_uuid تلقائياً
 * ══════════════════════════════════════════════════════════════ */
api.interceptors.request.use((config) => {
  // 1️⃣ حقن توكن تسجيل الدخول
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // 2️⃣ 🛡️ حقن معرّف الجهاز (device_uuid) في الهيدر
  const deviceUuid = localStorage.getItem("pos_device_uuid");
  if (deviceUuid) {
    config.headers["X-Device-UUID"] = deviceUuid;
  }

  return config;
});

/* ══════════════════════════════════════════════════════════════
 * Response Interceptor — معالجة أخطاء 401 و 403 الذكية
 * ══════════════════════════════════════════════════════════════ */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 1️⃣ إذا انتهت جلسة التوكن (401) -> تنظيف التوكن فقط والعودة للـ login
    if (error.response?.status === 401) {
      clearAuthData(); // دالتك القديمة لتنظيف التوكن والـ roles
      window.location.href = "/login";
    }

    // 2️⃣ 🛡️ الحماية الذكية لأخطاء الـ 403 (مهم جداً!)
    if (error.response?.status === 403) {
      
      // الفحص السحري: هل الخطأ قادم من محاولة تسجيل الدخول (Login)؟
      const isLoginRequest = error.config.url?.includes('/login');

      if (isLoginRequest) {
        // ❌ إذا كان خطأ فرع في الـ Login: لا تمسح الـ UUID الفعال للجهاز!
        // اترك الخطأ يمر لتعرضه الواجهة للكاشير كرسالة تنبيه فقط.
        return Promise.reject(error);
      }

      // 🟢 أما إذا كان الخطأ قادماً من أي مسار آخر (الـ Middleware لقط جهاز ملغي أو خارج الـ IP)
      // هنا نقوم بمسح التفعيل الفوري وطرد المستخدم لشاشة التفعيل
      localStorage.removeItem("pos_device_uuid");
      localStorage.removeItem("pos_register_info");
      
      window.location.href = "/activate";
    }

    return Promise.reject(error);
  }
);

export default api;
