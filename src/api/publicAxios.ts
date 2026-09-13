/**
 * publicAxios.ts — Axios عام بدون تسجيل دخول
 * ─────────────────────────────────────────────
 * يُستخدم للصفحات العامة مثل صفحة الزبون عبر QR Code
 * لا يُرسل أي توكن أو معرّف جهاز
 */
import axios from "axios";

const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: { "Content-Type": "application/json" },
});

export default publicApi;
