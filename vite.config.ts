import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      // 👇 أضف هذا الجزء لزيادة الحد المسموح به لحجم الملفات في الكاش
      // كان محدداً بـ 4 ميغابايت بالضبط، فتخطّاه الحزمة الرئيسية (~4.2MB) وأفشل
      // البناء بالكامل — لا علاقة لحجم الكاش بصحة الكود، فرُفع الحد بهامش أوسع
      // (8 ميغابايت) بدل ملاحقته كل مرة تكبر فيها الحزمة بضع كيلوبايتات.
      workbox: {
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
      manifest: {
        name: 'نظام الفخامة لإدارة المطاعم',
        short_name: 'Fakhama POS',
        description: 'نظام مبيعات ونقاط بيع متكامل ومحلي',
        theme_color: '#2196f3',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});