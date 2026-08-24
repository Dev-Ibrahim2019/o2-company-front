import api from "../../../api/axios";

import type { CustomerIdentity } from "../../../types/customer";

export type CustomerCategory = "regular" | "important" | "vip" | "new" | "inactive" | "follow_up" | "complaints";

export const CUSTOMER_CATEGORY_LABELS: Record<CustomerCategory, string> = {
  regular: "عميل عادي", important: "عميل مهم", vip: "VIP", new: "عميل جديد",
  inactive: "عميل غير نشط", follow_up: "عميل يحتاج متابعة", complaints: "عميل لديه شكاوى",
};

/** Automatic classification thresholds are intentionally centralized here. */
export const resolveCustomerCategory = (customer: Pick<CustomerSearchResult, "category"> & { created_at?: string }, monthlyOrders: number) => {
  const stored = customer.category?.toLowerCase() as CustomerCategory | undefined;
  if (stored && stored in CUSTOMER_CATEGORY_LABELS) return { category: stored, source: "manual" as const };
  if (monthlyOrders > 8) return { category: "vip" as const, source: "automatic" as const };
  if (monthlyOrders >= 4) return { category: "important" as const, source: "automatic" as const };
  if (monthlyOrders >= 1) return { category: "regular" as const, source: "automatic" as const };
  const recentlyCreated = customer.created_at && Date.now() - new Date(customer.created_at).getTime() <= 30 * 86400000;
  return { category: recentlyCreated ? "new" as const : "inactive" as const, source: "automatic" as const };
};

const sanitizeCustomerAddress = (data: Record<string, unknown>) => {
  const allowedFields = [
    "label", "city", "area", "district", "street", "landmark",
    "building_no", "floor", "apartment", "delivery_notes",
    "is_default", "is_active",
  ] as const;

  return Object.fromEntries(
    allowedFields
      .filter((field) => data[field] !== undefined)
      .map((field) => [field, data[field]]),
  );
};

export interface CustomerSearchResult extends CustomerIdentity {
  loyalty_points?: number;
  lastOrder?: OrderDetail;
  selectedAddress?: CustomerAddress;
}

export interface CustomerAddress {
  id: number;
  customer_id: number;
  label: string;
  city: string | null;
  area: string | null;
  district: string | null;
  street: string | null;
  landmark: string | null;
  building_no: string | null;
  floor: string | null;
  apartment: string | null;
  delivery_notes: string | null;
  phone: string | null;
  map_url: string | null;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerOccasion {
  id: number;
  customer_id: number;
  occasion_type: string;
  title: string;
  date: string;
  repeats_annually: boolean;
  notes: string | null;
  preferred_contact_method: string | null;
  is_active: boolean;
  created_by: number | null;
  created_at: string;
  customer?: { id: number; name: string; phone: string; mobile: string };
}

export interface CustomerNote {
  id: number;
  customer_id: number;
  order_id: number | null;
  content: string;
  type: string;
  importance: string;
  show_during_order: boolean;
  created_by: number | null;
  created_at: string;
  createdBy?: { id: number; name: string };
}

export interface CustomerProfile {
  customer: CustomerSearchResult & {
    credit_limit: number;
    notes: string | null;
    created_at: string;
    updated_at: string;
  };
  balance: number;
  available_credit: number;
  is_over_limit: boolean;
  total_orders: number;
  monthly_orders_count: number;
  total_spent: number;
  avg_order_value: number;
  first_order_at: string | null;
  last_order_at: string | null;
  cancelled_orders_count: number;
  open_complaints_count: number;
  latest_note: string | null;
  loyalty_points?: number;
}

export interface CustomerOrder {
  id: number;
  order_number: string;
  status: string;
  order_type?: string | null;
  total: number;
  subtotal: number;
  discount_amount: number;
  discount_value: number;
  note: string | null;
  branch: { id: number; name: string } | null;
  cashier: { id: number; name: string } | null;
  created_at: string;
  customer_name: string | null;
  customer_phone: string | null;
}

export interface CustomerFullProfile {
  profile: CustomerProfile;
  addresses: CustomerAddress[];
  orders: OrderDetail[];
  permanent_notes: CustomerNote[];
}

export interface OrderDetail {
  id: number;
  customer_id: number | null;
  order_number: string;
  status: string;
  order_type?: string | null;
  source?: string | null;
  customer_address_id?: number | null;
  delivery_address_snapshot?: Record<string, unknown> | null;
  subtotal: number;
  discount_value: number;
  discount_type: string | null;
  discount_amount: number;
  engine_discount_amount: number;
  total: number;
  note: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  branch: { id: number; name: string } | null;
  cashier: { id: number; name: string } | null;
  created_at: string;
  items: OrderDetailItem[];
  invoice: { id: number; number: string; status: string } | null;
  feedback?: OrderFeedback | null;
}

export interface OrderFeedback {
  id: number;
  order_id: number;
  customer_id: number;
  food_quality: number;
  service_quality: number;
  delivery_speed: number | null;
  notes: string | null;
  recorded_by: number;
  recorder?: { id: number; name: string };
  created_at: string;
  updated_at: string;
}

export interface OrderFeedbackPayload {
  food_quality: number;
  service_quality: number;
  delivery_speed?: number | null;
  notes?: string;
}

export type ActiveOrderScope = "operational_active" | "awaiting_payment" | "kitchen_active" | "delivery_active";
export interface ActiveCallCenterOrder {
  id: number;
  order_number: string;
  status: string;
  order_type: string;
  customer_id: number | null;
  customer_name: string | null;
  customer_phone: string | null;
  total: number;
  branch: { id: number; name: string } | null;
  created_at: string;
  scopes: ActiveOrderScope[];
}
export type ActiveOrderGroups = Record<ActiveOrderScope, ActiveCallCenterOrder[]>;

export interface OrderDetailItem {
  id: number;
  item_id: number | null;
  item_name: string | null;
  item_name_ar: string | null;
  quantity: number;
  price: number;
  total: number;
  notes: string | null;
}

export interface FavoriteItem {
  item_id: number;
  item_name: string;
  item_name_ar: string | null;
  total_quantity: number;
  order_count: number;
  quantity_sum: number;
  orders_count: number;
  total_spent: number;
  last_ordered_at: string;
}

export interface OrderingInsights {
  orders_90_days: number;
  spend_90_days: number;
  average_order_value: number;
  preferred_order_type: string | null;
  preferred_day: number | null;
  preferred_hour: number | null;
}

export interface DeliveryQuote {
  quote_id: string;
  valid_until: string;
  delivery_zone_id: number;
  zone_name: string;
  fee: number;
  eta_minutes: number;
}

export interface CustomerComplaint {
  id: number;
  customer_id: number;
  order_id: number | null;
  invoice_id: number | null;
  assigned_to: number | null;
  created_by: number | null;
  title: string;
  description: string;
  type: string;
  priority: string;
  status: string;
  resolved_at: string | null;
  closed_at: string | null;
  resolution_notes: string | null;
  resolution_result: string | null;
  severity: string;
  is_sensitive: boolean;
  show_alert: boolean;
  branch_id: string | null;
  created_at: string;
  updated_at: string;
  customer?: { id: number; name: string; phone: string };
  order?: { id: number; order_number: string };
  assigned_to_employee?: { id: number; name: string };
  created_by_user?: { id: number; name: string };
}

export interface ComplaintFollowup {
  id: number;
  complaint_id: number;
  user_id: number | null;
  action: string;
  notes: string | null;
  old_status: string | null;
  new_status: string | null;
  followup_type: string;
  metadata: any;
  created_at: string;
  user?: { id: number; name: string };
}

export interface CustomerAlert {
  type: string;
  severity: "info" | "warning" | "critical";
  message: string;
  complaint_id: number;
  created_at: string;
}

export type TimelineEntryType = "call" | "complaint" | "order";
export interface CustomerTimelineEntry {
  type: TimelineEntryType;
  id: number;
  occurred_at: string;
  status: string;
  // call
  call_type?: string | null;
  disposition?: string | null;
  duration_seconds?: number | null;
  satisfaction_rating?: number | null;
  agent?: { id: number; name: string } | null;
  linked_order_id?: number | null;
  // complaint
  title?: string;
  priority?: string;
  // order
  order_number?: string;
  order_type?: string | null;
  total?: number;
}

export interface AgentPerformanceRow {
  agent_id: number;
  agent_name: string;
  total_calls: number;
  completed_calls: number;
  average_handle_time_minutes: number | null;
  complaint_calls: number;
  complaint_rate: number;
  avg_satisfaction: number | null;
}
export interface AgentPerformanceReport {
  period: { from: string; to: string };
  missed_calls_total: number;
  agents: AgentPerformanceRow[];
}

export interface CannedResponse {
  id: number;
  title: string;
  category: string | null;
  body: string;
  branch_id: number | null;
  is_active: boolean;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardAnalytics {
  total_customers: number;
  active_customers: number;
  new_this_week: number;
  new_this_month: number;
  ordered_last_7_days: number;
  ordered_last_30_days: number;
  open_complaints: number;
  inactive_customers: number;
  avg_order_value: number;
  total_order_value_month: number;
}

export interface TopCustomerRow {
  id: number;
  name: string;
  phone: string | null;
  code: string;
  status: string;
  orders_count: number;
  total_spent: number;
  avg_order_value: number;
  open_complaints_count: number;
  last_order_at: string;
  cancelled_count: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}
export type CustomerResolutionStatus = "found" | "multiple" | "not_found";
export interface CustomerResolution {
  status: CustomerResolutionStatus;
  normalized_phone: string;
  customer: CustomerSearchResult | null;
  candidates: Array<CustomerSearchResult & { orders_max_created_at?: string | null }>;
}
export interface NewCallerDraftPayload {
  call_ticket_id?: number;
  external_call_id?: string;
  branch_id: number;
  order_type: "delivery" | "takeaway";
  customer_id?: number;
  customer?: { name: string; phone: string; normalized_phone?: string };
  address?: {
    customer_address_id?: number;
    label?: string;
    city?: string;
    area?: string;
    street?: string;
    landmark?: string;
    delivery_notes?: string;
  };
  delivery_zone_id?: number;
  delivery_fee?: number;
  delivery_address_snapshot?: Record<string, unknown>;
  items: Array<{ item_id: number; quantity: number; unit_price?: number; notes?: string }>;
  discount_value?: number;
  discount_type?: "amount" | "percent";
  notes?: string;
}
export interface CallCenterOrderTransaction {
  customer: CustomerSearchResult;
  address: CustomerAddress | null;
  order: { id: number; order_number: string; total: number; status: string };
  call_ticket: { id: number; customer_id: number; linked_order_id: number } | null;
}
export interface CustomerDirectoryPage { data: Array<Omit<CustomerSearchResult,'address'> & {orders_count:number;open_complaints_count:number;orders_max_created_at?:string|null;address?:CustomerAddress|null}>; current_page:number;last_page:number;per_page:number;total:number; }

export const callCenterService = {
  getActiveOrders: async (branchId?: number): Promise<ApiResponse<ActiveOrderGroups>> => {
    const res = await api.get("/call-center/active-orders", { params: branchId ? { branch_id: branchId } : undefined });
    return res.data;
  },
  resolveCustomerByPhone: async (phone: string, signal?: AbortSignal): Promise<ApiResponse<CustomerResolution>> => {
    const res = await api.get("/call-center/customers/resolve-by-phone", { params: { phone }, signal });
    return res.data;
  },
  createCallCenterOrder: async (payload: NewCallerDraftPayload): Promise<ApiResponse<CallCenterOrderTransaction>> => {
    const res = await api.post("/call-center/orders", payload);
    return res.data;
  },
  searchCustomers: async (q: string, limit = 20): Promise<ApiResponse<CustomerSearchResult[]>> => {
    const res = await api.get("/call-center/customers/search", { params: { q, limit } });
    return res.data;
  },
  getCustomerDirectory: async (params: Record<string, unknown>): Promise<ApiResponse<CustomerDirectoryPage>> => {
    const res = await api.get('/call-center/customers/directory', { params }); return res.data;
  },

  getCustomerProfile: async (customerId: number): Promise<ApiResponse<CustomerProfile>> => {
    const res = await api.get(`/call-center/customers/${customerId}/profile`);
    return res.data;
  },

  updateCustomerClassification: async (customerId: number, category: CustomerCategory): Promise<ApiResponse<{ id: number; category: CustomerCategory }>> => {
    const res = await api.patch(`/call-center/customers/${customerId}/classification`, { category });
    return res.data;
  },

  getCustomerFullProfile: async (customerId: number): Promise<ApiResponse<CustomerFullProfile>> => {
    const res = await api.get(`/call-center/customers/${customerId}/full-profile`);
    return res.data;
  },

  getCustomerOrders: async (customerId: number, cursor?: number): Promise<ApiResponse<{ data: CustomerOrder[]; next_cursor: number | null; has_more: boolean }>> => {
    const res = await api.get(`/call-center/customers/${customerId}/orders`, { params: { cursor, per_page: 20 } });
    return res.data;
  },

  getOrderDetails: async (orderId: number): Promise<ApiResponse<OrderDetail>> => {
    const res = await api.get(`/call-center/orders/${orderId}`);
    return res.data;
  },

  getCustomerFavorites: async (customerId: number): Promise<ApiResponse<FavoriteItem[]>> => {
    const res = await api.get(`/call-center/customers/${customerId}/favorites`);
    return res.data;
  },

  getOrderFeedback: async (customerId: number, orderId: number): Promise<ApiResponse<OrderFeedback | null>> => {
    const res = await api.get(`/call-center/customers/${customerId}/orders/${orderId}/feedback`);
    return res.data;
  },

  saveOrderFeedback: async (customerId: number, orderId: number, payload: OrderFeedbackPayload): Promise<ApiResponse<OrderFeedback>> => {
    const res = await api.put(`/call-center/customers/${customerId}/orders/${orderId}/feedback`, payload);
    return res.data;
  },

  getOrderingInsights: async (customerId: number): Promise<ApiResponse<OrderingInsights>> => {
    const res = await api.get(`/call-center/customers/${customerId}/ordering-insights`);
    return res.data;
  },

  getDeliveryQuote: async (customerId: number, addressId: number, branchId: number): Promise<ApiResponse<DeliveryQuote>> => {
    const res = await api.post("/call-center/delivery/quote", {
      customer_id: customerId,
      customer_address_id: addressId,
      branch_id: branchId,
    });
    return res.data;
  },
  getDraftDeliveryQuote: async (branchId: number, area: string, city?: string): Promise<ApiResponse<DeliveryQuote>> => {
    const res = await api.post("/call-center/delivery/quote", { branch_id: branchId, area, city });
    return res.data;
  },

  getCustomerAddresses: async (customerId: number): Promise<ApiResponse<any[]>> => {
    const res = await api.get(`/call-center/customers/${customerId}/addresses`);
    return res.data;
  },

  getCustomerComplaints: async (customerId: number): Promise<ApiResponse<{ data: CustomerComplaint[] }>> => {
    const res = await api.get(`/call-center/customers/${customerId}/complaints`);
    return res.data;
  },

  getCustomerAlerts: async (customerId: number): Promise<ApiResponse<CustomerAlert[]>> => {
    const res = await api.get(`/call-center/customers/${customerId}/alerts`);
    return res.data;
  },

  getCustomerTimeline: async (customerId: number, limit = 30): Promise<ApiResponse<CustomerTimelineEntry[]>> => {
    const res = await api.get(`/call-center/customers/${customerId}/timeline`, { params: { limit } });
    return res.data;
  },

  getAgentPerformance: async (params?: { branch_id?: number; from?: string; to?: string }): Promise<ApiResponse<AgentPerformanceReport>> => {
    const res = await api.get("/call-center/reports/performance", { params });
    return res.data;
  },

  getCannedResponses: async (params?: { search?: string; category?: string }): Promise<ApiResponse<CannedResponse[]>> => {
    const res = await api.get("/call-center/canned-responses", { params });
    return res.data;
  },

  createCannedResponse: async (data: { title: string; category?: string; body: string; branch_id?: number }): Promise<ApiResponse<CannedResponse>> => {
    const res = await api.post("/call-center/canned-responses", data);
    return res.data;
  },

  updateCannedResponse: async (id: number, data: Partial<{ title: string; category: string; body: string; is_active: boolean }>): Promise<ApiResponse<CannedResponse>> => {
    const res = await api.patch(`/call-center/canned-responses/${id}`, data);
    return res.data;
  },

  deleteCannedResponse: async (id: number): Promise<ApiResponse<void>> => {
    const res = await api.delete(`/call-center/canned-responses/${id}`);
    return res.data;
  },

  getAnalytics: async (): Promise<ApiResponse<DashboardAnalytics>> => {
    const res = await api.get("/call-center/customers/analytics");
    return res.data;
  },

  getTopCustomers: async (params: {
    period?: string;
    from?: string;
    to?: string;
    sort_by?: string;
    sort_dir?: string;
    per_page?: number;
    branch_id?: number;
  }): Promise<ApiResponse<any>> => {
    const res = await api.get("/call-center/customers/top", { params });
    return res.data;
  },

  createCustomer: async (data: {
    name: string;
    phone: string;
    mobile?: string;
    email?: string;
    address?: string;
    city?: string;
    area?: string;
    category?: CustomerCategory;
    notes?: string;
    branch_id?: number;
  }): Promise<ApiResponse<CustomerSearchResult>> => {
    const res = await api.post("/call-center/customers", data);
    return res.data;
  },

  getComplaints: async (params?: {
    status?: string;
    priority?: string;
    type?: string;
    customer_id?: number;
    assigned_to?: number;
    search?: string;
    per_page?: number;
  }): Promise<ApiResponse<{ data: CustomerComplaint[] }>> => {
    const res = await api.get("/call-center/complaints", { params });
    return res.data;
  },

  createComplaint: async (data: {
    customer_id: number;
    order_id?: number;
    invoice_id?: number;
    assigned_to?: number;
    title: string;
    description?: string;
    type?: string;
    priority?: string;
    severity?: string;
    is_sensitive?: boolean;
  }): Promise<ApiResponse<CustomerComplaint>> => {
    const res = await api.post("/call-center/complaints", data);
    return res.data;
  },

  getComplaint: async (complaintId: number): Promise<ApiResponse<CustomerComplaint>> => {
    const res = await api.get(`/call-center/complaints/${complaintId}`);
    return res.data;
  },

  updateComplaint: async (complaintId: number, data: Partial<{
    status: string;
    assigned_to: number;
    priority: string;
    title: string;
    description: string;
    resolution_notes: string;
    resolution_result: string;
    type: string;
    is_sensitive: boolean;
  }>): Promise<ApiResponse<CustomerComplaint>> => {
    const res = await api.patch(`/call-center/complaints/${complaintId}`, data);
    return res.data;
  },

  addFollowup: async (complaintId: number, data: {
    notes: string;
    action?: string;
    followup_type?: string;
  }): Promise<ApiResponse<ComplaintFollowup>> => {
    const res = await api.post(`/call-center/complaints/${complaintId}/followups`, data);
    return res.data;
  },

  getComplaintTimeline: async (complaintId: number): Promise<ApiResponse<{ complaint: CustomerComplaint; followups: ComplaintFollowup[] }>> => {
    const res = await api.get(`/call-center/complaints/${complaintId}/timeline`);
    return res.data;
  },

  quickCreateCustomer: async (data: {
    name: string;
    phone?: string;
    mobile?: string;
    email?: string;
    category?: string;
    notes?: string;
    birth_date?: string;
    address_label?: string;
    address?: string;
    city?: string;
    area?: string;
    district?: string;
    street?: string;
    landmark?: string;
    building_no?: string;
    floor?: string;
    apartment?: string;
    delivery_notes?: string;
    branch_id?: number;
  }): Promise<ApiResponse<CustomerSearchResult & { addresses?: CustomerAddress[] }>> => {
    try {
      const res = await api.post("/call-center/customers/quick-create", data);
      return res.data;
    } catch (error: any) {
      const message = String(error?.response?.data?.message || "");
      if (!message.includes("42S22") || !message.includes("customer_addresses") || !message.includes("phone")) {
        throw error;
      }

      const customerResponse = await api.post("/call-center/customers", {
        name: data.name,
        phone: data.phone,
        mobile: data.mobile,
        email: data.email,
        category: data.category,
        notes: data.notes,
        birth_date: data.birth_date,
        address: data.address,
        city: data.city,
        branch_id: data.branch_id,
      });
      const customer = customerResponse.data.data as CustomerSearchResult;
      const hasAddress = Boolean(data.address || data.city || data.area || data.district || data.street);
      let addresses: CustomerAddress[] = [];

      if (hasAddress) {
        const addressResponse = await api.post(
          `/call-center/customers/${customer.id}/addresses`,
          sanitizeCustomerAddress({
            label: data.address_label || "المنزل",
            city: data.city || data.area || data.district || "غير محدد",
            area: data.area,
            district: data.district,
            street: data.street || data.address,
            landmark: data.landmark,
            building_no: data.building_no,
            floor: data.floor,
            apartment: data.apartment,
            delivery_notes: data.delivery_notes,
            is_default: true,
          }),
        );
        addresses = [addressResponse.data.data];
      }

      return { data: { ...customer, addresses } };
    }
  },

  getCustomerOccasions: async (customerId: number): Promise<ApiResponse<CustomerOccasion[]>> => {
    const res = await api.get(`/call-center/customers/${customerId}/occasions`);
    return res.data;
  },

  createCustomerOccasion: async (customerId: number, data: {
    occasion_type: string;
    title: string;
    date: string;
    repeats_annually?: boolean;
    notes?: string;
    preferred_contact_method?: string;
  }): Promise<ApiResponse<CustomerOccasion>> => {
    const res = await api.post(`/call-center/customers/${customerId}/occasions`, data);
    return res.data;
  },

  updateCustomerOccasion: async (occasionId: number, data: Partial<{
    occasion_type: string;
    title: string;
    date: string;
    repeats_annually: boolean;
    notes: string;
    preferred_contact_method: string;
    is_active: boolean;
  }>): Promise<ApiResponse<CustomerOccasion>> => {
    const res = await api.patch(`/call-center/customer-occasions/${occasionId}`, data);
    return res.data;
  },

  deleteCustomerOccasion: async (occasionId: number): Promise<ApiResponse<void>> => {
    const res = await api.delete(`/call-center/customer-occasions/${occasionId}`);
    return res.data;
  },

  getOccasionsByRange: async (range: string = 'today', customerId?: number): Promise<ApiResponse<CustomerOccasion[]>> => {
    const res = await api.get("/call-center/occasions", { params: { range, customer_id: customerId } });
    return res.data;
  },

  getCustomerNotes: async (customerId: number): Promise<ApiResponse<CustomerNote[]>> => {
    const res = await api.get(`/call-center/customers/${customerId}/notes`);
    return res.data;
  },

  createCustomerNote: async (customerId: number, data: {
    content: string;
    type?: string;
    importance?: string;
    show_during_order?: boolean;
    order_id?: number;
  }): Promise<ApiResponse<CustomerNote>> => {
    const res = await api.post(`/call-center/customers/${customerId}/notes`, data);
    return res.data;
  },

  getCustomerImportantNotes: async (customerId: number): Promise<ApiResponse<CustomerNote[]>> => {
    const res = await api.get(`/call-center/customers/${customerId}/important-notes`);
    return res.data;
  },

  createCustomerAddress: async (customerId: number, data: {
    label?: string;
    city?: string;
    area?: string;
    district?: string;
    street?: string;
    landmark?: string;
    building_no?: string;
    floor?: string;
    apartment?: string;
    delivery_notes?: string;
    is_default?: boolean;
  }): Promise<ApiResponse<CustomerAddress>> => {
    const res = await api.post(`/call-center/customers/${customerId}/addresses`, sanitizeCustomerAddress(data));
    return res.data;
  },

  updateCustomerAddress: async (addressId: number, data: Partial<{
    label: string;
    city: string;
    area: string;
    district: string;
    street: string;
    landmark: string;
    building_no: string;
    floor: string;
    apartment: string;
    delivery_notes: string;
    is_default: boolean;
    is_active: boolean;
  }>): Promise<ApiResponse<CustomerAddress>> => {
    const res = await api.patch(`/call-center/customer-addresses/${addressId}`, sanitizeCustomerAddress(data));
    return res.data;
  },

  markAddressUsed: async (addressId: number): Promise<ApiResponse<void>> => {
    const res = await api.post(`/call-center/customer-addresses/${addressId}/use`);
    return res.data;
  },
};
