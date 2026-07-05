import fs from 'fs';

const head = `/**
 * axios.ts - Axios for O2 Project
 */
import axios from "axios";
import { clearAuthData } from "../auth/authStorage";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});
`;

const interceptor = `
/* Request Interceptor */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = 'Bearer ' + token;
  }
  return config;
});
`;

const mock = `
/* Mock data for missing API endpoints */
const MOCK_ENDPOINTS = {
  "GET:/customers/aging-report": () => ({
    success: true,
    message: "Mock data (API missing)",
    data: { customers: [], totals: { current: 0, "1_30": 0, "31_60": 0, "61_90": 0, over_90: 0, total: 0 } },
  }),
  "GET:/customers/collection-report": () => ({
    success: true,
    message: "Mock data (API missing)",
    data: { customers: [], total_outstanding: 0, total_customers: 0 },
  }),
  "GET:/suppliers/aging-report": () => ({
    success: true,
    message: "Mock data (API missing)",
    data: { suppliers: [], totals: { current: 0, "1_30": 0, "31_60": 0, "61_90": 0, over_90: 0, total: 0 } },
  }),
  "GET:/discounts/dashboard": () => ({
    data: {
      stats: { total_discounts: 0, active_discounts: 0, expired_discounts: 0, total_usage_count: 0, total_discount_amount: 0, total_revenue: 0, total_usage: 0 },
      recent_usage: [],
    },
  }),
};
`;

const resp = `
/* Response Interceptor - handles 401 and 404 for missing endpoints */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      clearAuthData();
      window.location.href = "/login";
    }
    if (error.response?.status === 404 && error.config) {
      const method = (error.config.method || "get").toUpperCase();
      const url = error.config.url || "";
      const key = method + ":" + url;
      const handler = MOCK_ENDPOINTS[key];
      if (handler) {
        console.warn("[Mock] " + key + " - 404 intercepted, returning mock data");
        return Promise.resolve({ data: handler(error.config) });
      }
    }
    return Promise.reject(error);
  }
);

export default api;
`;

fs.writeFileSync('src/api/axios.ts', head + interceptor + mock + resp, 'utf8');
console.log('axios.ts updated');
