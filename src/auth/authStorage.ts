/**
 * authStorage.ts
 * ──────────────
 * وظائف مساعدة لحفظ واسترجاع بيانات المصادقة من localStorage
 * Token + Roles + Permissions
 */

const KEYS = {
  TOKEN: "token",
  ROLES: "roles",
  PERMISSIONS: "permissions",
} as const;

/** ── حفظ بيانات المصادقة بعد نجاح الـ Login ── */
export function saveAuthData(data: {
  token: string;
  roles: string[];
  permissions: string[];
}): void {
  localStorage.setItem(KEYS.TOKEN, data.token);
  localStorage.setItem(KEYS.ROLES, JSON.stringify(data.roles));
  localStorage.setItem(KEYS.PERMISSIONS, JSON.stringify(data.permissions));
}

/** ── استرجاع التوكن ── */
export function getToken(): string | null {
  return localStorage.getItem(KEYS.TOKEN);
}

/** ── استرجاع الأدوار (كـ مصفوفة نصوص) ── */
export function getRoles(): string[] {
  const raw = localStorage.getItem(KEYS.ROLES);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

/** ── استرجاع الصلاحيات (كـ مصفوفة نصوص) ── */
export function getPermissions(): string[] {
  const raw = localStorage.getItem(KEYS.PERMISSIONS);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

/** ── التحقق: هل المستخدم مسجّل دخول؟ ── */
export function isLoggedIn(): boolean {
  return !!getToken();
}

/** ── التحقق: هل المستخدم يملك دور معين؟ ── */
export function hasRole(role: string): boolean {
  return getRoles().includes(role);
}

/** ── التحقق: هل المستخدم يملك صلاحية معينة؟ ── */
export function hasPermission(permission: string): boolean {
  return getPermissions().includes(permission);
}

/** ── حذف جميع بيانات المصادقة (تسجيل خروج) ── */
export function clearAuthData(): void {
  localStorage.removeItem(KEYS.TOKEN);
  localStorage.removeItem(KEYS.ROLES);
  localStorage.removeItem(KEYS.PERMISSIONS);
}