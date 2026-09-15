// src/services/callCenterTeamService.ts
// فريق الكول سنتر — إدارة حسابات موظفي الكول سنتر العاديين (User حقيقي بدور call-center، وليس
// سجل Employee إداري — راجع الملاحظة المعمارية بـ routes/api.php). محصورة بصلاحية
// manage-call-center-employees بالباك اند (دور call-center-manager فقط).

import api from "../api/axios";

/** القائمة المقفلة — يجب أن تطابق CallCenterTeamController::AGENT_PERMISSIONS بالباك اند حرفيًا */
export const CALL_CENTER_AGENT_PERMISSIONS = [
  "call-center.view-active-orders",
  "call-center.create-order",
  "call-center.assign-driver",
  "call-center.change-order-status",
  "call-center.cancel-order",
  "call-center.complete-order",
  "call-center.manual-complete-order",
  "call-center.view-closed-orders",
  "call-center.view-dashboard",
] as const;

export type CallCenterAgentPermission = (typeof CALL_CENTER_AGENT_PERMISSIONS)[number];

export const CALL_CENTER_PERMISSION_LABELS: Record<CallCenterAgentPermission, string> = {
  "call-center.view-active-orders": "عرض الطلبات النشطة",
  "call-center.create-order": "إنشاء طلب جديد",
  "call-center.assign-driver": "تعيين/تغيير سائق التوصيل",
  "call-center.change-order-status": "تغيير حالة الطلب",
  "call-center.cancel-order": "إلغاء الطلب",
  "call-center.complete-order": "إتمام الطلب (بعد تأكيد السائق)",
  "call-center.manual-complete-order": "إتمام يدوي (تجاوز الشروط — حسّاسة)",
  "call-center.view-closed-orders": "عرض الطلبات المغلقة",
  "call-center.view-dashboard": "عرض لوحة العمليات والإحصائيات",
};

export interface CallCenterAgent {
  id: number;
  name: string;
  username: string;
  email: string;
  branch_id: number | null;
  branch_name?: string | null;
  is_active: boolean;
  permissions: CallCenterAgentPermission[];
  created_at?: string;
}

export interface CallCenterAgentPayload {
  name: string;
  username: string;
  email: string;
  password: string;
}

export const callCenterTeamService = {
  getAll: async (): Promise<CallCenterAgent[]> => {
    const { data } = await api.get("/call-center/team");
    return Array.isArray(data.data) ? data.data : [];
  },

  create: async (payload: CallCenterAgentPayload): Promise<CallCenterAgent> => {
    const { data } = await api.post("/call-center/team", payload);
    return data.data;
  },

  toggleStatus: async (userId: number): Promise<CallCenterAgent> => {
    const { data } = await api.post(`/call-center/team/${userId}/toggle-status`);
    return data.data;
  },

  updatePermissions: async (userId: number, permissions: CallCenterAgentPermission[]): Promise<CallCenterAgent> => {
    const { data } = await api.put(`/call-center/team/${userId}/permissions`, { permissions });
    return data.data;
  },
};
