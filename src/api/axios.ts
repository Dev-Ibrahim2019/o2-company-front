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

  // 2️⃣ 🛡️ حقن معرّف الجهاز (device_uuid) في الهيدر — دعم مزدوج (POS + ضيافة)
  // ي优先 يرسل hospitality_device_uuid إذا كان موجوداً (لأنه أكثر تحديداً)
  // وإلا يرسل pos_device_uuid
  const hospitalityUuid = localStorage.getItem("hospitality_device_uuid");
  const posUuid = localStorage.getItem("pos_device_uuid");

  if (hospitalityUuid) {
    config.headers["X-Device-UUID"] = hospitalityUuid;
  } else if (posUuid) {
    config.headers["X-Device-UUID"] = posUuid;
  }

  return config;
});

/* ══════════════════════════════════════════════════════════════
 * Response Interceptor — معالجة أخطاء 401 و 403 الذكية
 * ══════════════════════════════════════════════════════════════ */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 1️⃣ إذا انتهت جلسة التوكن (401) → نظّف البيانات فقط
    //    التحويل لـ /login يُدار من React (ProtectedRoute / RoleGuard)
    if (error.response?.status === 401) {
      clearAuthData();
      // نسمح للمكونات React أن تتعامل مع الحالة
      // بدلاً من window.location.href الذي يسبب reload loop
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

      // 🟢 تحديد نوع الجهاز من الـ UUID المرسل
      const hospitalityUuid = localStorage.getItem("hospitality_device_uuid");
      const posUuid = localStorage.getItem("pos_device_uuid");

      // نستخدم الـ UUID الذي كان مُرسلاً في الطلب الأصلي
      const sentUuid = error.config.headers?.["X-Device-UUID"];

      if (sentUuid && hospitalityUuid && sentUuid === hospitalityUuid) {
        // جهاز ضيافة — مسح مفاتيح الضيافة والتحويل لصفحة الضيافة
        localStorage.removeItem("hospitality_device_uuid");
        localStorage.removeItem("hospitality_register_info");
        window.location.href = "/Hospitality";
      } else {
        // جهاز POS — مسح مفاتيح POS والتحويل لصفحة التفعيل
        localStorage.removeItem("pos_device_uuid");
        localStorage.removeItem("pos_register_info");
        window.location.href = "/activate";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
