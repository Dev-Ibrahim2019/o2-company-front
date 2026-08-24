import api from "../../api/axios";
import type {
  CrmActivityEvent, CrmCustomer, CrmDashboard, CrmFavoriteProduct, CrmId, CrmNote, CrmNoteInput,
  CrmOrderDetails, CrmOrderFeedbackInput, CrmOrderRow, CrmOrderTimeline, CrmPage, CrmPurchaseHistory,
  CrmSection,
} from "./types";

const payload = <T,>(raw: unknown): T => {
  const value = raw as { data?: unknown };
  const first = value?.data ?? raw;
  const nested = first as { data?: unknown };
  return (nested?.data ?? first) as T;
};
// Unwraps exactly one level ({ data: <paginator> } -> <paginator>), unlike
// payload() which unwraps two — a Laravel paginator's own JSON already has
// `data` (the items) as a sibling of `total`/`current_page`/`last_page`, so
// going one level deeper (like payload() does) throws the meta away and
// silently left this defaulting to "page 1 of 1, total = items on this page".
const list = <T,>(raw: unknown): CrmPage<T> => {
  const outer = raw as { data?: unknown };
  const paginator = (outer?.data ?? raw) as Record<string, unknown>;
  const items = (Array.isArray(paginator) ? paginator : (paginator.data as T[]) ?? (paginator.items as T[]) ?? (paginator.customers as T[]) ?? []) as T[];
  return {
    items, currentPage: Number(paginator.current_page ?? 1), lastPage: Number(paginator.last_page ?? 1),
    total: Number(paginator.total ?? items.length),
  };
};
export const crmApi = {
  dashboard: async (params: Record<string, string>) => payload<CrmDashboard>((await api.get("/crm/dashboard", { params })).data),
  customers: async (params: URLSearchParams) => list<CrmCustomer>((await api.get("/crm/customers", { params })).data),
  customer: async <T = CrmCustomer>(id: CrmId) => payload<T>((await api.get(`/crm/customers/${id}`)).data),
  section: async <T = unknown>(id: CrmId, section: CrmSection) => payload<T>((await api.get(`/crm/customers/${id}/${section}`)).data),
  // CRM's own create path — identity fields only, no financial defaults.
  // See POST /crm/customers -> CrmController@store.
  createCustomer: async <T = CrmCustomer>(data: Record<string, unknown>): Promise<T> =>
    payload<T>((await api.post("/crm/customers", data)).data),
  // Mirrors createCustomer — CRM's own update path (CrmController@update),
  // so title/gender/birth_date/work_address writes go through the same
  // identity-only pipeline instead of the Financial controller.
  updateCustomer: async <T = CrmCustomer>(id: CrmId, data: Record<string, unknown>): Promise<T> =>
    payload<T>((await api.put(`/crm/customers/${id}`, data)).data),
  // CRM-scoped reuses of existing Call Center logic — see CrmController.
  activity: async (id: CrmId) => payload<CrmActivityEvent[]>((await api.get(`/crm/customers/${id}/activity`)).data),
  favorites: async (id: CrmId) => payload<CrmFavoriteProduct[]>((await api.get(`/crm/customers/${id}/favorites`)).data),
  purchaseHistory: async (id: CrmId) => payload<CrmPurchaseHistory>((await api.get(`/crm/customers/${id}/purchase-history`)).data),
  orderDetails: async (orderId: CrmId) => payload<CrmOrderDetails>((await api.get(`/crm/orders/${orderId}`)).data),
  orderTimeline: async (orderId: CrmId) => payload<CrmOrderTimeline>((await api.get(`/crm/orders/${orderId}/timeline`)).data),
  // Read-only order monitoring — CRM never creates/edits orders, see CrmController::ordersIndex()/ordersDelayed().
  orders: async (params: URLSearchParams) => list<CrmOrderRow>((await api.get("/crm/orders", { params })).data),
  delayedOrders: async (params: URLSearchParams) => list<CrmOrderRow>((await api.get("/crm/orders/delayed", { params })).data),
  // Reuses OrderFeedbackController's existing GET/PUT — same contract the
  // Call Center already uses, just under the CRM route.
  saveOrderFeedback: async (customerId: CrmId, orderId: CrmId, data: CrmOrderFeedbackInput) =>
    payload<unknown>((await api.put(`/crm/customers/${customerId}/orders/${orderId}/feedback`, data)).data),
  // Notes CRUD — CrmController::createNote()/updateNote()/deleteNote().
  createNote: async (customerId: CrmId, data: CrmNoteInput) =>
    payload<CrmNote>((await api.post(`/crm/customers/${customerId}/notes`, data)).data),
  updateNote: async (customerId: CrmId, noteId: CrmId, data: CrmNoteInput) =>
    payload<CrmNote>((await api.put(`/crm/customers/${customerId}/notes/${noteId}`, data)).data),
  deleteNote: async (customerId: CrmId, noteId: CrmId) =>
    payload<{ deleted: boolean }>((await api.delete(`/crm/customers/${customerId}/notes/${noteId}`)).data),
};
