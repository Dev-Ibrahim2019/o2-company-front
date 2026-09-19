import api from "../../../../api/axios";

// ============================================================================
// SIP ACCOUNTS API
// ============================================================================

export interface SipAccount {
  id: number;
  account_name: string;
  username: string;
  sip_server: string;
  domain: string | null;
  transport: "udp" | "tcp" | "tls";
  register_refresh: number;
  keep_alive: number;
  is_active: boolean;
  is_registered: boolean;
  created_at: string;
  updated_at: string;
}

export interface SipAccountFormData {
  account_name: string;
  username: string;
  password?: string;
  sip_server: string;
  domain?: string;
  transport?: "udp" | "tcp" | "tls";
  register_refresh?: number;
  keep_alive?: number;
}

export const sipAccountService = {
  list: async () => {
    const res = await api.get("/call-center/sip-accounts");
    return res.data.data as SipAccount[];
  },

  create: async (data: SipAccountFormData) => {
    const res = await api.post("/call-center/sip-accounts", data);
    return res.data.data as SipAccount;
  },

  update: async (id: number, data: Partial<SipAccountFormData>) => {
    const res = await api.put(`/call-center/sip-accounts/${id}`, data);
    return res.data.data as SipAccount;
  },

  delete: async (id: number) => {
    await api.delete(`/call-center/sip-accounts/${id}`);
  },

  markRegistered: async (id: number) => {
    await api.post(`/call-center/sip-accounts/${id}/registered`);
  },

  markUnregistered: async (id: number) => {
    await api.post(`/call-center/sip-accounts/${id}/unregistered`);
  },
};

// ============================================================================
// CALL CENTER DASHBOARD API
// ============================================================================

export interface DashboardStats {
  activeCalls: number;
  waitingCalls: number;
  todayCalls: number;
  avgCallDuration: number;
  activeAgents: number;
  totalAgents: number;
  todayOrders: number;
  todayRevenue: number;
  conversionRate: number;
  customerSatisfaction: number;
}

export interface RecentActivity {
  id: string;
  type: "call" | "order" | "missed" | "customer" | "complaint";
  message: string;
  time: string;
  details?: any;
}

export const dashboardService = {
  getStats: async (branchId?: number) => {
    const res = await api.get("/call-center/customers/analytics", { params: branchId ? { branch_id: branchId } : undefined });
    return res.data;
  },

  getRecentActivity: async (branchId?: number) => {
    // This would be a real API endpoint in production
    return [] as RecentActivity[];
  },
};

// ============================================================================
// CUSTOMER RESOLUTION API
// ============================================================================

export interface CustomerResolution {
  status: "found" | "multiple" | "not_found" | "error";
  normalized_phone: string;
  customer?: any;
  candidates?: any[];
  error?: string;
}

export const customerResolutionService = {
  resolveByPhone: async (phone: string, signal?: AbortSignal) => {
    const res = await api.get("/call-center/customers/resolve-by-phone", { params: { phone }, signal });
    return res.data as CustomerResolution;
  },

  getFullProfile: async (customerId: number) => {
    const res = await api.get(`/call-center/customers/${customerId}/full-profile`);
    return res.data;
  },

  getAddresses: async (customerId: number) => {
    const res = await api.get(`/call-center/customers/${customerId}/addresses`);
    return res.data;
  },

  getFavorites: async (customerId: number) => {
    const res = await api.get(`/call-center/customers/${customerId}/favorites`);
    return res.data;
  },

  getInsights: async (customerId: number) => {
    const res = await api.get(`/call-center/customers/${customerId}/ordering-insights`);
    return res.data;
  },

  createQuick: async (data: { name: string; phone: string; normalized_phone?: string; city?: string; area?: string; street?: string }) => {
    const res = await api.post("/call-center/customers/quick-create", data);
    return res.data;
  },

  createAddress: async (customerId: number, data: any) => {
    const res = await api.post(`/call-center/customers/${customerId}/addresses`, data);
    return res.data;
  },

  search: async (query: string, limit = 10) => {
    const res = await api.get("/call-center/customers/search", { params: { q: query, limit } });
    return res.data;
  },
};

// ============================================================================
// ORDER API
// ============================================================================

export interface OrderPayload {
  branch_id: number;
  customer_id?: number;
  customer?: { name: string; phone: string; normalized_phone?: string };
  address?: any;
  order_type: "delivery" | "takeaway";
  items: Array<{ item_id: number; quantity: number; unit_price: number; notes?: string }>;
  discount_value?: number;
  discount_type?: "amount" | "percent";
  notes?: string;
  delivery_zone_id?: number;
  delivery_fee?: number;
  delivery_address_snapshot?: any;
  call_ticket_id?: number;
  external_call_id?: string;
}

export const orderService = {
  createCallCenterOrder: async (payload: OrderPayload) => {
    const res = await api.post("/call-center/orders", payload);
    return res.data;
  },

  saveDraft: async (payload: any, orderId?: number) => {
    if (orderId) {
      const res = await api.put(`/orders/${orderId}`, payload);
      return res.data;
    }
    const res = await api.post("/orders", payload);
    return res.data;
  },

  checkout: async (orderId: number, payments: any[], customer?: any) => {
    const res = await api.post(`/orders/${orderId}/close-with-payments`, {
      payments,
      customer,
    });
    return res.data;
  },

  getActiveOrders: async (branchId?: number) => {
    const res = await api.get("/call-center/active-orders", { params: branchId ? { branch_id: branchId } : undefined });
    return res.data;
  },

  getOrderDetails: async (orderId: number) => {
    const res = await api.get(`/call-center/orders/${orderId}`);
    return res.data;
  },
};

// ============================================================================
// DELIVERY API
// ============================================================================

export interface DeliveryQuote {
  quote_id: number;
  delivery_zone_id: number;
  zone_name: string;
  fee: number;
  eta_minutes: number;
  valid_until: string;
}

export const deliveryService = {
  getQuote: async (customerId: number, addressId: number, branchId: number) => {
    const res = await api.post("/call-center/delivery/quote", {
      customer_id: customerId,
      address_id: addressId,
      branch_id: branchId,
    });
    return res.data as DeliveryQuote;
  },

  getDraftQuote: async (branchId: number, area: string, city: string) => {
    const res = await api.post("/call-center/delivery/quote", {
      branch_id: branchId,
      area,
      city,
    });
    return res.data as DeliveryQuote;
  },
};

// ============================================================================
// COMPLAINTS API
// ============================================================================

export const complaintService = {
  list: async (params?: any) => {
    const res = await api.get("/call-center/complaints", { params });
    return res.data;
  },

  create: async (data: any) => {
    const res = await api.post("/call-center/complaints", data);
    return res.data;
  },

  update: async (id: number, data: any) => {
    const res = await api.patch(`/call-center/complaints/${id}`, data);
    return res.data;
  },

  addFollowup: async (id: number, data: any) => {
    const res = await api.post(`/call-center/complaints/${id}/followups`, data);
    return res.data;
  },

  getTimeline: async (id: number) => {
    const res = await api.get(`/call-center/complaints/${id}/timeline`);
    return res.data;
  },
};

// ============================================================================
// OCCASIONS API
// ============================================================================

export const occasionService = {
  list: async (range?: string, customerId?: number) => {
    const res = await api.get("/call-center/occasions", { params: { range, customer_id: customerId } });
    return res.data;
  },

  create: async (customerId: number, data: any) => {
    const res = await api.post(`/call-center/customers/${customerId}/occasions`, data);
    return res.data;
  },

  update: async (id: number, data: any) => {
    const res = await api.patch(`/call-center/customer-occasions/${id}`, data);
    return res.data;
  },

  delete: async (id: number) => {
    await api.delete(`/call-center/customer-occasions/${id}`);
  },
};

// ============================================================================
// NOTES API
// ============================================================================

export const noteService = {
  list: async (customerId: number) => {
    const res = await api.get(`/call-center/customers/${customerId}/notes`);
    return res.data;
  },

  create: async (customerId: number, data: { content: string; type?: string; importance?: string; show_during_order?: boolean }) => {
    const res = await api.post(`/call-center/customers/${customerId}/notes`, data);
    return res.data;
  },

  getImportant: async (customerId: number) => {
    const res = await api.get(`/call-center/customers/${customerId}/important-notes`);
    return res.data;
  },
};
