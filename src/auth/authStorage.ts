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
  BRANCH_ID: "branch_id",
} as const;

/** ── حفظ بيانات المصادقة بعد نجاح الـ Login ── */
export function saveAuthData(data: {
  token: string;
  roles: string[];
  permissions: string[];
  branch_id?: number | null;
}): void {
  localStorage.setItem(KEYS.TOKEN, data.token);
  localStorage.setItem(KEYS.ROLES, JSON.stringify(data.roles));
  localStorage.setItem(KEYS.PERMISSIONS, JSON.stringify(data.permissions));
  if (data.branch_id != null) {
    localStorage.setItem(KEYS.BRANCH_ID, String(data.branch_id));
  } else {
    localStorage.removeItem(KEYS.BRANCH_ID);
  }
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

/**
 * ── تحديث branch_id بعد تسجيل الدخول (بدون لمس التوكن/الأدوار) ──
 * يُستخدم عند إعادة جلب بيانات المستخدم من /auth/me (مثلاً عند تحميل الصفحة)،
 * بحيث لو رَبَط مشرف فرعاً لموظف بعد أن سجّل دخوله مسبقاً، ينعكس ذلك بمجرد
 * تحديث الصفحة بدل أن يبقى getBranchId() عالقاً على القيمة القديمة حتى تسجيل
 * خروج/دخول جديد بالكامل.
 */
export function setBranchId(branchId: number | null): void {
  if (branchId != null) {
    localStorage.setItem(KEYS.BRANCH_ID, String(branchId));
  } else {
    localStorage.removeItem(KEYS.BRANCH_ID);
  }
}

/** ── استرجاع branch_id ── */
export function getBranchId(): number | null {
  const raw = localStorage.getItem(KEYS.BRANCH_ID);
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return isNaN(n) ? null : n;
}

/** ── حذف جميع بيانات المصادقة (تسجيل خروج) ── */
export function clearAuthData(): void {
  localStorage.removeItem(KEYS.TOKEN);
  localStorage.removeItem(KEYS.ROLES);
  localStorage.removeItem(KEYS.PERMISSIONS);
  localStorage.removeItem(KEYS.BRANCH_ID);
}
