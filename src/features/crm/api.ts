import api from "../../api/axios";
import type {
  CrmActivityEvent, CrmCustomer, CrmDashboard, CrmFavoriteProduct, CrmId, CrmNote, CrmNoteInput,
  CrmOrderDetails, CrmOrderFeedbackInput, CrmOrderRow, CrmOrderTimeline, CrmPage, CrmPurchaseHistory,
  CrmSection, CrmIdentityConflict, CrmConflictEnvelope, CrmComplaint, CrmComplaintInput, CrmComplaintCreateInput, CrmComplaintRow, CrmComplaintSummary, CrmComplaintFollowup,
  CrmCustomerGroup, CrmCustomerGroupInput, CrmOccasion, CrmOccasionInput,
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
  // ── Customer groups ──
  // The list doubles as the customer form's picker and the management screen's
  // table, which is why it carries customers_count.
  customerGroups: async () => payload<CrmCustomerGroup[]>((await api.get("/crm/customer-groups")).data),
  customerGroup: async (id: CrmId) => payload<CrmCustomerGroup>((await api.get(`/crm/customer-groups/${id}`)).data),
  createCustomerGroup: async (data: CrmCustomerGroupInput) =>
    payload<CrmCustomerGroup>((await api.post("/crm/customer-groups", data)).data),
  updateCustomerGroup: async (id: CrmId, data: Partial<CrmCustomerGroupInput>) =>
    payload<CrmCustomerGroup>((await api.put(`/crm/customer-groups/${id}`, data)).data),
  deleteCustomerGroup: async (id: CrmId) =>
    payload<{ deleted: boolean; detached_customers: number }>((await api.delete(`/crm/customer-groups/${id}`)).data),
  // Membership is customers.group_id — no pivot, so these read and write the
  // same column the customer form edits.
  groupMembers: async (id: CrmId) => payload<CrmCustomer[]>((await api.get(`/crm/customer-groups/${id}/customers`)).data),
  addGroupMember: async (id: CrmId, customerId: CrmId) =>
    payload<CrmCustomer>((await api.post(`/crm/customer-groups/${id}/customers`, { customer_id: customerId })).data),
  removeGroupMember: async (id: CrmId, customerId: CrmId) =>
    payload<{ removed: boolean }>((await api.delete(`/crm/customer-groups/${id}/customers/${customerId}`)).data),

  // ── Occasions ──
  // customer_occasions is polymorphic, so the owner is part of the path. One
  // set of functions covers both owners rather than two parallel sets.
  occasions: async (owner: "customers" | "groups", ownerId: CrmId) =>
    payload<CrmOccasion[]>((await api.get(`/crm/${owner}/${ownerId}/occasions`)).data),
  createOccasion: async (owner: "customers" | "groups", ownerId: CrmId, data: CrmOccasionInput) =>
    payload<CrmOccasion>((await api.post(`/crm/${owner}/${ownerId}/occasions`, data)).data),
  updateOccasion: async (owner: "customers" | "groups", ownerId: CrmId, occasionId: CrmId, data: Partial<CrmOccasionInput>) =>
    payload<CrmOccasion>((await api.put(`/crm/${owner}/${ownerId}/occasions/${occasionId}`, data)).data),
  deleteOccasion: async (owner: "customers" | "groups", ownerId: CrmId, occasionId: CrmId) =>
    payload<{ deleted: boolean }>((await api.delete(`/crm/${owner}/${ownerId}/occasions/${occasionId}`)).data),
  // ── Identity-conflict tickets ──
  // Read rides on crm.view-customers; resolving/dismissing needs
  // crm.manage-identity-conflicts (enforced per-route on the backend).
  identityConflicts: async (params: URLSearchParams) =>
    list<CrmIdentityConflict>((await api.get("/crm/identity-conflicts", { params })).data),
  // These three keep the whole envelope, not just `data`: the backend returns
  // candidate_orders alongside the ticket, and payload() would discard it.
  identityConflict: async (id: CrmId): Promise<CrmConflictEnvelope> =>
    (await api.get(`/crm/identity-conflicts/${id}`)).data,
  resolveIdentityConflict: async (id: CrmId, resolution: string, note?: string): Promise<CrmConflictEnvelope> =>
    (await api.post(`/crm/identity-conflicts/${id}/resolve`, { resolution, note })).data,
  /** Moves only the ids passed. An empty array is a valid "none of these". */
  reassignConflictOrders: async (id: CrmId, orderIds: number[]): Promise<CrmConflictEnvelope> =>
    (await api.post(`/crm/identity-conflicts/${id}/reassign-orders`, { order_ids: orderIds })).data,
  dismissIdentityConflict: async (id: CrmId, note?: string) =>
    payload<CrmIdentityConflict>((await api.post(`/crm/identity-conflicts/${id}/dismiss`, { note })).data),
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
  // Crm\ComplaintController — the cross-customer surface. Every filter is a
  // real query parameter; nothing here is narrowed client-side, and the server
  // already excludes sensitive complaints from readers without clearance.
  complaints: async (params: Record<string, string>) =>
    list<CrmComplaintRow>((await api.get("/crm/complaints", { params })).data),
  complaintsSummary: async (params: Record<string, string>) =>
    payload<CrmComplaintSummary>((await api.get("/crm/complaints/summary", { params })).data),
  // Returns the whole envelope, not payload(): the followup trail rides
  // alongside `data` rather than inside it, and payload() would discard it.
  complaint: async (id: CrmId) =>
    (await api.get(`/crm/complaints/${id}`)).data as { data: CrmComplaintRow; followups: CrmComplaintFollowup[] },
  // Crm\ComplaintController::addFollowup() — CRM's own door onto the same
  // CallCenterService::addFollowup() the Call Center route uses. The payload
  // field is `notes`, matching that service's contract.
  addComplaintFollowup: async (id: CrmId, notes: string) =>
    payload<CrmComplaintFollowup>((await api.post(`/crm/complaints/${id}/followups`, { notes })).data),
  // Deliberately NOT /employees: that endpoint carries Employee's global
  // BranchScope, so it hid call-centre staff sitting at another branch from
  // the assignment picker. This CRM route lifts the scope for assignment only.
  assignableEmployees: async () =>
    payload<Array<{ id: CrmId; name: string; branch_id?: CrmId | null; branch?: { id: CrmId; name: string } | null }>>(
      (await api.get("/crm/complaints/assignable-employees")).data,
    ),
  // CrmController::createComplaint(). No channel field: the server stamps it
  // from the route it arrived on, so there is nothing for the form to send.
  createComplaint: async (customerId: CrmId, data: CrmComplaintCreateInput) =>
    payload<CrmComplaint>((await api.post(`/crm/customers/${customerId}/complaints`, data)).data),
  // CrmController::updateComplaint() — one PUT for every field of a complaint.
  // Reclassifying sensitivity is just another field on it, guarded server-side
  // by crm.view-sensitive-notes in both directions.
  updateComplaint: async (complaintId: CrmId, data: CrmComplaintInput) =>
    payload<CrmComplaint>((await api.put(`/crm/complaints/${complaintId}`, data)).data),
};
