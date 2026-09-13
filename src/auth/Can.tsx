/**
 * Can.tsx
 * ───────
 * مكوّن حماية يعرض محتواه فقط إذا كان المستخدم يملك صلاحية (permission) معينة.
 *
 * Usage:
 *   <Can permission="create-branch">
 *     <button>إضافة فرع</button>
 *   </Can>
 *
 *   <Can permission="delete-branch" fallback={<span>غير مصرح</span>}>
 *     <button>حذف</button>
 *   </Can>
 */

import React from "react";
import { useAuth } from "./AuthContext";

interface CanProps {
  /** اسم الصلاحية المطلوبة (يجب أن تتطابق مع ما في Spatie) */
  permission: string;
  /** المحتوى البديل إذا لم تكن الصلاحية متوفرة */
  fallback?: React.ReactNode;
  /** العناصر الفرعية */
  children: React.ReactNode;
}

export const Can: React.FC<CanProps> = ({ permission, fallback = null, children }) => {
  const { hasPermission } = useAuth();

  if (hasPermission(permission)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

/**
 * نسخة إضافية كـ Hook للتحقق من الصلاحية في أي مكان
 *
 * Usage:
 *   const canCreate = useCan("create-branch");
 *   if (canCreate) { ... }
 */
export function useCan(permission: string): boolean {
  const { hasPermission } = useAuth();
  return hasPermission(permission);
}