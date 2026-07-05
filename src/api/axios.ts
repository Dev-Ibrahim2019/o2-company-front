/**
 * axios.ts - Axios for O2 Project
 */
import axios from "axios";
import { clearAuthData } from "../auth/authStorage";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

/* Request Interceptor */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = "Bearer " + token;
  }
  return config;
});

/* Response Interceptor - handles 401 and 404 for missing endpoints */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      clearAuthData();
      window.location.href = "/login";
    }
    const shouldMock =
      error.response?.status === 404 ||
      error.response?.status === 405 ||
      !error.response; // network error (Laravel offline)
    if (shouldMock && error.config) {
      const method = (error.config.method || "get").toUpperCase();
      const url = error.config.url || "";
      const handler = getDiscountMockHandler(method, url, error.config);
      if (handler) {
        const status = error.response?.status ?? "NETWORK";
        console.warn(
          "[Mock] " +
            method +
            " " +
            url +
            " - " +
            status +
            " intercepted, returning mock data",
        );
        return Promise.resolve({ data: handler });
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

  // GET /discounts (list)
  if (method === "GET" && u === "/discounts") {
    return discountApi.getAll(config.params);
  }
  // GET /discounts/dashboard
  if (method === "GET" && u === "/discounts/dashboard") {
    return discountApi.dashboard();
  }
  // GET /discounts/entities (for entity dropdowns)
  if (method === "GET" && u === "/discounts/entities") {
    return discountApi.getEntities(config.params?.type);
  }
  // POST /discounts/calculate
  if (method === "POST" && u === "/discounts/calculate") {
    return discountApi.calculate(config.data ? JSON.parse(config.data) : {});
  }
  // GET /discounts/:id
  const singleMatch = u.match(/^\/discounts\/(\d+)$/);
  if (method === "GET" && singleMatch) {
    return discountApi.getById(parseInt(singleMatch[1]));
  }
  // POST /discounts
  if (method === "POST" && u === "/discounts") {
    return discountApi.create(config.data ? JSON.parse(config.data) : {});
  }
  // POST /discounts/calculate-cart
  if (method === "POST" && u === "/discounts/calculate-cart") {
    return discountApi.calculateCart(
      config.data ? JSON.parse(config.data) : {},
    );
  }
  // POST /discounts/debug
  if (method === "POST" && u === "/discounts/debug") {
    return discountApi.debug(config.data ? JSON.parse(config.data) : {});
  }
  // POST /discounts/validate-target
  if (method === "POST" && u === "/discounts/validate-target") {
    return discountApi.validateTarget(
      config.data ? JSON.parse(config.data) : {},
    );
  }
  // PUT /discounts/:id
  if (method === "PUT" && singleMatch) {
    return discountApi.update(
      parseInt(singleMatch[1]),
      config.data ? JSON.parse(config.data) : {},
    );
  }
  // DELETE /discounts/:id
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
