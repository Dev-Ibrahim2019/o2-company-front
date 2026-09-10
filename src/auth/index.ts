/**
 * auth/index.ts
 * ──────────────
 * تصديرات موحدة لجميع أدوات المصادقة
 */

// ── localStorage helpers ──
export {
  saveAuthData,
  getToken,
  getRoles,
  getPermissions,
  isLoggedIn,
  hasRole,
  hasPermission,
  clearAuthData,
  getBranchId,
} from "./authStorage";

// ── AuthContext ──
export { AuthProvider, useAuth } from "./AuthContext";
export type { AuthUser } from "./AuthContext";

// ── Permission Guards ──
export { Can, useCan } from "./Can";

// ── Role Guards ──
export { IsRole, useIsRole } from "./IsRole";

// ── Route Protection ──
export { ProtectedRoute, UnauthorizedPage } from "./ProtectedRoute";

// ── Permissions & Roles Constants ──
export { ROLES, PERMISSIONS, ROLE_PERMISSIONS } from "./permissions";
export type { RoleKey, PermissionKey } from "./permissions";
