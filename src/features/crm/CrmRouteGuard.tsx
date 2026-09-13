import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../auth";
import { CRM_PERMISSIONS } from "../../auth/permissions";
import { CrmState } from "./components";

export function CrmRouteGuard({ children }: { children: ReactNode }) {
  const { loading, hasPermission } = useAuth();
  if (loading) return <CrmState kind="loading" title="جارٍ التحقق من الصلاحيات" />;
  if (!hasPermission(CRM_PERMISSIONS.ACCESS)) return <Navigate to="/unauthorized" replace />;
  return <>{children}</>;
}
