// src/auth/callCenterAccess.ts
// يطابق ApiController::agentCan() بالباك اند حرفيًا — الأدوار دي عندها وصول كامل لكل صلاحيات
// الكول سنتر بغض النظر عن المنح الفردي، وأي مستخدم تاني (موظف كول سنتر عادي) لازم يملك
// الصلاحية الدقيقة الممنوحة له صراحة من شاشة "الفريق" (call-center.*).
// أي إضافة/تعديل هون يجب أن تُطابَق بنفس التعديل بـ app/Http/Controllers/ApiController.php.

import { ROLES } from "./permissions";

const FULL_ACCESS_ROLES = [
  ROLES.CALL_CENTER_MANAGER,
  ROLES.SUPER_ADMIN,
  ROLES.BRANCH_MANAGER,
  ROLES.ACCOUNTANT,
] as const;

export function agentCan(
  permission: string,
  hasRole: (role: string) => boolean,
  hasPermission: (permission: string) => boolean
): boolean {
  if (FULL_ACCESS_ROLES.some((role) => hasRole(role))) return true;
  return hasPermission(permission);
}
