/**
 * IsRole.tsx
 * ───────────
 * مكوّن حماية يعرض محتواه فقط إذا كان المستخدم يحمل دوراً (role) معيناً.
 *
 * Usage:
 *   <IsRole role="admin">
 *     <button>لوحة التحكم</button>
 *   </IsRole>
 *
 *   <IsRole role="admin|manager" fallback={<span>غير مصرح</span>}>
 *     <button>إدارة</button>
 *   </IsRole>
 */

import React from "react";
import { useAuth } from "./AuthContext";

interface IsRoleProps {
  /**
   * الدور المطلوب. يُقبل:
   * - دور واحد:  role="admin"
   * - عدة أدوار (أي واحدة):  role="admin|manager" أو role="admin,manager"
   */
  role: string;
  /** المحتوى البديل إذا لم يتطابق الدور */
  fallback?: React.ReactNode;
  /** العناصر الفرعية */
  children: React.ReactNode;
}

export const IsRole: React.FC<IsRoleProps> = ({ role, fallback = null, children }) => {
  const { hasRole } = useAuth();

  // دعم الأدوار المتعددة: "admin|manager" أو "admin,manager"
  const roles = role.includes("|")
    ? role.split("|")
    : role.includes(",")
      ? role.split(",").map((r) => r.trim())
      : [role];

  const match = roles.some((r) => hasRole(r.trim()));

  if (match) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

/**
 * نسخة إضافية كـ Hook للتحقق من الدور في أي مكان
 *
 * Usage:
 *   const isAdmin = useIsRole("admin");
 *   if (isAdmin) { ... }
 */
export function useIsRole(role: string): boolean {
  const { hasRole } = useAuth();
  return hasRole(role);
}