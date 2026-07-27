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
  baseURL: import.meta.env.VITE_API_URL || "/api",
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

  // 2️⃣ 🛡️ حقن معرّف الجهاز (device_uuid) في الهيدر — دعم ثلاثي (كول سنتر + ضيافة + POS)
  // الأولوية: call_center > hospitality > pos
  const callCenterUuid = localStorage.getItem("call_center_device_uuid");
  const hospitalityUuid = localStorage.getItem("hospitality_device_uuid");
  const posUuid = localStorage.getItem("pos_device_uuid");

  if (callCenterUuid) {
    config.headers["X-Device-UUID"] = callCenterUuid;
  } else if (hospitalityUuid) {
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
      const callCenterUuid = localStorage.getItem("call_center_device_uuid");
      const hospitalityUuid = localStorage.getItem("hospitality_device_uuid");
      const posUuid = localStorage.getItem("pos_device_uuid");

      // نستخدم الـ UUID الذي كان مُرسلاً في الطلب الأصلي
      const sentUuid = error.config.headers?.["X-Device-UUID"];

      if (sentUuid && callCenterUuid && sentUuid === callCenterUuid) {
        localStorage.removeItem("call_center_device_uuid");
        localStorage.removeItem("call_center_register_info");
        window.location.href = "/call-center";
      } else if (sentUuid && hospitalityUuid && sentUuid === hospitalityUuid) {
        localStorage.removeItem("hospitality_device_uuid");
        localStorage.removeItem("hospitality_register_info");
        window.location.href = "/Hospitality";
      } else if (sentUuid) {
        localStorage.removeItem("pos_device_uuid");
        localStorage.removeItem("pos_register_info");
        window.location.href = "/activate";
      }
    }

    return Promise.reject(error);
  },
);

/* ── Discount Mock Engine ────────────────────────────────────────────────────── */
function getDiscountMockHandler(
  method: string,
  url: string,
  config: any,
): unknown {
  const u = url.replace(/^\/api/, "");
  const discountApi = tryGetDiscountApi();
  if (!discountApi) return null;

  // GET /admin/pos-registers/discounts (list)
  if (method === "GET" && u === "/admin/pos-registers/discounts") {
    return discountApi.getAll(config.params);
  }
  // GET /admin/pos-registers/discounts/dashboard
  if (method === "GET" && u === "/admin/pos-registers/discounts/dashboard") {
    return discountApi.dashboard();
  }
  // GET /admin/pos-registers/discounts/entities (for entity dropdowns)
  if (method === "GET" && u === "/admin/pos-registers/discounts/entities") {
    return discountApi.getEntities(config.params?.type);
  }
  // POST /admin/pos-registers/discounts/calculate
  if (method === "POST" && u === "/admin/pos-registers/discounts/calculate") {
    return discountApi.calculate(config.data ? JSON.parse(config.data) : {});
  }
  // GET /admin/pos-registers/discounts/:id
  const singleMatch = u.match(/^\/admin\/pos-registers\/discounts\/(\d+)$/);
  if (method === "GET" && singleMatch) {
    return discountApi.getById(parseInt(singleMatch[1]));
  }
  // POST /admin/pos-registers/discounts
  if (method === "POST" && u === "/admin/pos-registers/discounts") {
    return discountApi.create(config.data ? JSON.parse(config.data) : {});
  }
  // POST /admin/pos-registers/discounts/calculate-cart
  if (method === "POST" && u === "/admin/pos-registers/discounts/calculate-cart") {
    return discountApi.calculateCart(
      config.data ? JSON.parse(config.data) : {},
    );
  }
  // POST /admin/pos-registers/discounts/debug
  if (method === "POST" && u === "/admin/pos-registers/discounts/debug") {
    return discountApi.debug(config.data ? JSON.parse(config.data) : {});
  }
  // POST /admin/pos-registers/discounts/validate-target
  if (method === "POST" && u === "/admin/pos-registers/discounts/validate-target") {
    return discountApi.validateTarget(
      config.data ? JSON.parse(config.data) : {},
    );
  }
  // PUT /admin/pos-registers/discounts/:id
  if (method === "PUT" && singleMatch) {
    return discountApi.update(
      parseInt(singleMatch[1]),
      config.data ? JSON.parse(config.data) : {},
    );
  }
  // DELETE /admin/pos-registers/discounts/:id
  if (method === "DELETE" && singleMatch) {
    return discountApi.delete(parseInt(singleMatch[1]));
  }

  // Legacy mock endpoints
  const LEGACY = {
    "GET:/customers/aging-report": {
      success: true,
      message: "Mock data (API missing)",
      data: {
        customers: [],
        totals: {
          current: 0,
          "1_30": 0,
          "31_60": 0,
          "61_90": 0,
          over_90: 0,
          total: 0,
        },
      },
    },
    "GET:/customers/collection-report": {
      success: true,
      message: "Mock data (API missing)",
      data: { customers: [], total_outstanding: 0, total_customers: 0 },
    },
    "GET:/suppliers/aging-report": {
      success: true,
      message: "Mock data (API missing)",
      data: {
        suppliers: [],
        totals: {
          current: 0,
          "1_30": 0,
          "31_60": 0,
          "61_90": 0,
          over_90: 0,
          total: 0,
        },
      },
    },
  };
  const legacyKey = method + ":" + u;
  return (LEGACY as any)[legacyKey] ?? null;
}

let _discountApi: any = null;
function tryGetDiscountApi(): any {
  if (_discountApi) return _discountApi;
  try {
    // Dynamic import to avoid circular dependency at module level
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("./discountApiMock");
    _discountApi = mod.discountApiMock;
    return _discountApi;
  } catch {
    return null;
  }
}

export default api;
