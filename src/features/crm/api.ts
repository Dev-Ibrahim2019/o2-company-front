import api from "../../api/axios";
import type { CrmCustomer, CrmDashboard, CrmId, CrmPage, CrmSection } from "./types";

const payload = <T,>(raw: unknown): T => {
  const value = raw as { data?: unknown };
  const first = value?.data ?? raw;
  const nested = first as { data?: unknown };
  return (nested?.data ?? first) as T;
};
const list = <T,>(raw: unknown): CrmPage<T> => {
  const value = payload<Record<string, unknown>>(raw);
  const items = (Array.isArray(value) ? value : value.items ?? value.customers ?? value.data ?? []) as T[];
  const meta = (value.meta ?? value) as Record<string, unknown>;
  return {
    items, currentPage: Number(meta.current_page ?? 1), lastPage: Number(meta.last_page ?? 1),
    total: Number(meta.total ?? items.length),
  };
};
export const crmApi = {
  dashboard: async (params: Record<string, string>) => payload<CrmDashboard>((await api.get("/crm/dashboard", { params })).data),
  customers: async (params: URLSearchParams) => list<CrmCustomer>((await api.get("/crm/customers", { params })).data),
  customer: async (id: CrmId) => payload<CrmCustomer>((await api.get(`/crm/customers/${id}`)).data),
  section: async (id: CrmId, section: CrmSection) => payload<unknown>((await api.get(`/crm/customers/${id}/${section}`)).data),
};
