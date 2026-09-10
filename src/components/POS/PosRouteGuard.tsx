/**
 * PosRouteGuard.tsx — Route Guard لشاشات الكاشير/POS
 * ────────────────────────────────────────────────────
 * عند تحميل أي مسار يبدأ بـ /pos أو /cashier، يقوم هذا المكوّن بـ:
 *   1. التحقق من وجود device_uuid في localStorage
 *   2. إذا لم يكن موجود → توجيه إلى /activate
 *   3. إذا كان موجود → إرسال طلب /api/pos/check-status للباك إند
 *   4. إذا رجع 403 (ملغي أو خارج الشبكة) → مسح البيانات والتوجيه إلى /activate
 *   5. إذا رجع 200 → السماح بالدخول (render children)
 */

import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import api from "../../api/axios";
import { Loader2 } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

const PosRouteGuard: React.FC<Props> = ({ children }) => {
  const [status, setStatus] = useState<"loading" | "valid" | "invalid">("loading");

  useEffect(() => {
    let cancelled = false;

    const checkDevice = async () => {
      try {
        // 1. هل يوجد device_uuid مخزن؟ (نفس مفتاح posSecurity / axios interceptor)
        const deviceUuid = localStorage.getItem("pos_device_uuid");
        if (!deviceUuid) {
          if (!cancelled) setStatus("invalid");
          return;
        }

        // 2. فحص الحالة مع الباك إند
        await api.post("/pos/check-status");

        // 3. الجهاز سليم
        if (!cancelled) setStatus("valid");
      } catch (err: any) {
        // 4. الباك إند رفض الطلب (403 أو أي خطأ) → الجهاز ملغي أو خارج الشبكة
        localStorage.removeItem("pos_device_uuid");
        localStorage.removeItem("pos_register_info");
        if (!cancelled) setStatus("invalid");
      }
    };

    checkDevice();

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-4">
          <Loader2 size={40} className="text-red-500 animate-spin mx-auto" />
          <p className="text-slate-400 font-semibold text-sm">جاري التحقق من حالة الجهاز...</p>
        </div>
      </div>
    );
  }

  if (status === "invalid") {
    return <Navigate to="/activate" replace />;
  }

  // status === "valid"
  return <>{children}</>;
};

export default PosRouteGuard;