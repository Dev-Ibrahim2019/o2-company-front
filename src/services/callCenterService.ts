import api from "../api/axios";

export interface CustomerSearchResult {
  id: number;
  name: string;
  phone: string | null;
  mobile: string | null;
  code: string;
  status: "active" | "inactive" | "blocked";
  category: string | null;
  city: string | null;
  address: string | null;
  branch_id: number | null;
  loyalty_points?: number;
  branch?: { id: number; name: string } | null;
  lastOrder?: OrderDetail;
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
  order_number: string;
  status: string;
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
}

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
  last_ordered_at: string;
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

export const callCenterService = {
  searchCustomers: async (q: string, limit = 20): Promise<ApiResponse<CustomerSearchResult[]>> => {
    const res = await api.get("/call-center/customers/search", { params: { q, limit } });
    return res.data;
  },

  getCustomerProfile: async (customerId: number): Promise<ApiResponse<CustomerProfile>> => {
    const res = await api.get(`/call-center/customers/${customerId}/profile`);
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
    phone?: string;
    mobile?: string;
    address?: string;
    city?: string;
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
    const res = await api.post("/call-center/customers/quick-create", data);
    return res.data;
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
    phone?: string;
    is_default?: boolean;
  }): Promise<ApiResponse<CustomerAddress>> => {
    const res = await api.post(`/call-center/customers/${customerId}/addresses`, data);
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
    phone: string;
    is_default: boolean;
    is_active: boolean;
  }>): Promise<ApiResponse<CustomerAddress>> => {
    const res = await api.patch(`/call-center/customer-addresses/${addressId}`, data);
    return res.data;
  },

  markAddressUsed: async (addressId: number): Promise<ApiResponse<void>> => {
    const res = await api.post(`/call-center/customer-addresses/${addressId}/use`);
    return res.data;
  },
};
