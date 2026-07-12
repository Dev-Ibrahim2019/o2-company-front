import api from "../api/axios";

export type OperationsStage = "PREPARATION" | "READY_FOR_DELIVERY" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED";
export type OperationalRole = "call_center_agent" | "cashier" | "assembler" | "delivery_driver";
export type AlertSeverity = "info" | "warning" | "critical";

export interface OperationsOrder {
  id: number; order_number: string; status: string; stage?: OperationsStage;
  customer_name?: string | null; branch_name?: string | null; branch?: { id: number; name: string } | null;
  total?: number | string; items_count?: number; created_at?: string; assembled_at?: string | null;
  assembly_started_at?: string | null; assembler_id?: number | null; assembly_duration_seconds?: number | null;
  assembler?: { id: number; name: string } | null; assembled_by_employee?: { id: number; name: string } | null;
  delivery_started_at?: string | null; delivered_at?: string | null; cancelled_at?: string | null;
  driver?: { id: number; name: string; vehicle_type?: string | null } | null;
  items?: Array<{ id?: number; item_name?: string; item_name_ar?: string; quantity?: number }>;
}
export interface OperationsStaff {
  id: number; name: string; operational_role: OperationalRole; status?: string;
  branch?: { id: number; name: string } | null; is_operations_enabled?: boolean;
  vehicle_type?: string | null; active_orders_count?: number; completed_today?: number; completed_orders_count?: number;
  average_minutes?: number | null; started_today?: number | null; has_alert?: boolean; current_order?: { id: number; order_number: string; assembly_started_at?: string } | null;
}
export interface OperationsAlert {
  id: number | string; severity: AlertSeverity; title: string; message?: string;
  created_at?: string; order_id?: number | null; order_number?: string | null; employee_id?: number | null; employee_name?: string | null;
}
export interface OperationsKpis {
  active_orders?: number; late_orders?: number; waiting_assembly?: number; ready_delivery?: number; ready_for_delivery?: number;
  out_for_delivery?: number; available_drivers?: number; busy_drivers?: number; average_delivery_minutes?: number | null;
}
export interface OperationsDashboardResponse {
  kpis?: OperationsKpis; orders?: OperationsOrder[]; staff_summary?: OperationsStaff[];
  fleet_summary?: OperationsStaff[]; alerts?: OperationsAlert[]; branches?: Array<{ id: number; name: string }>;
}
export interface OperationsDashboardFilters { branch_id?: number; date: string }

const unwrap = (payload: unknown): OperationsDashboardResponse => {
  const first = (payload as { data?: unknown } | null)?.data ?? payload;
  const second = (first as { data?: unknown } | null)?.data ?? first;
  return (second && typeof second === "object" ? second : {}) as OperationsDashboardResponse;
};

export const operationsService = {
  getDashboard: async (filters: OperationsDashboardFilters) => {
    const { data } = await api.get("/operations/dashboard", { params: filters });
    return unwrap(data);
  },
};
