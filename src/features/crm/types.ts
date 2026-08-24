export type CrmId = string | number;
export interface CrmBranch { id: CrmId; name: string }
export interface CrmCustomer {
  id: CrmId; code?: string; name: string; phone?: string | null; mobile?: string | null;
  primary_phone?: string | null;
  email?: string | null; status?: string; category?: string | null; branch?: CrmBranch | null;
  branch_id?: CrmId | null; city?: string | null; created_at?: string;
  // customers.title — free-text nickname (e.g. "أبو خالد"), not an honorific enum.
  title?: string | null;
  // customers.gender — only 'male'/'female' are accepted, null = unset.
  gender?: CrmGender | null;
  // How this customer was acquired — see CrmController::SOURCE_LABELS
  // (website/fawri/families/call_center/walk_in). Null until set.
  source?: CrmCustomerSource | null;
  orders_count?: number; open_complaints_count?: number; complaints_count?: number; addresses_count?: number;
  // SUM(orders.total) for this customer, computed as a single directory-query
  // aggregate (withSum) — not a per-row correlated query.
  total_purchases?: number;
  loyalty_points?: number | null; last_order_at?: string | null;
  occasion_type?: string | null; occasion_label?: string | null;
  balance?: number;
}
export interface CrmPage<T> { items: T[]; currentPage: number; lastPage: number; total: number }
export interface CrmMonthPoint { month: string; count: number }
export interface CrmOccasionSlice { type: string; label: string; count: number; percent: number }
// customer_sources dashboard aggregate — Customer Source, not Order Source.
export interface CrmSourceSlice { source: CrmCustomerSource; label: string; count: number; percent: number }
export interface CrmLoyaltyLeader { id: CrmId; name: string; code?: string; loyalty_points: number }
export interface CrmDashboard {
  customers_count?: number; active_customers_count?: number; new_customers_count?: number;
  open_complaints_count?: number; orders_count?: number; loyalty_points_total?: number;
  branches?: CrmBranch[];
  trends?: { customers_count?: number | null; active_customers_count?: number | null; open_complaints_count?: number | null };
  monthly_new_customers?: CrmMonthPoint[];
  monthly_active_customers?: CrmMonthPoint[];
  occasion_distribution?: CrmOccasionSlice[];
  customer_sources?: CrmSourceSlice[];
  top_customers_by_loyalty?: CrmLoyaltyLeader[];
  recent_customers?: CrmCustomer[]; [key: string]: unknown;
}
export type CrmSection = "overview" | "orders" | "addresses" | "complaints" | "notes" | "occasions" | "financial-summary" | "statement" | "aging";

// Customer Source — which channel a customer first registered through.
// Deliberately a SEPARATE concept and type from OrderSource below — a
// customer with source="website" can freely have orders with
// source="pos" or source="call_center"; that's expected, not a conflict.
// See CrmController::CUSTOMER_SOURCE_VALUES on the backend.
export type CrmCustomerSource = "website" | "fawri" | "families" | "call_center" | "walk_in";

// Order Source — which channel a specific order was created through.
// Only "pos" (default) and "call_center" are actually produced by the
// backend today (see OrderController::store()/CallCenterOrderCreationService);
// kept as a plain string (not a closed union) since the underlying
// StoreOrderRequest validation doesn't restrict it to a fixed list.
export type OrderSource = string;

// GET /crm/customers/{id} — Customer360QueryService::profile()
export interface CrmCustomerPhone { id?: CrmId; phone?: string; type?: string; is_primary?: boolean }
export type CrmGender = "male" | "female";
// Mirrors customer_addresses columns — the work address is a real
// CustomerAddress row (label=CustomerIdentityService::WORK_ADDRESS_LABEL),
// not a flat string, so it keeps the full address structure.
export interface CrmWorkAddress {
  id?: CrmId; label?: string | null; city?: string | null; area?: string | null;
  district?: string | null; street?: string | null; landmark?: string | null;
  building_no?: string | null; floor?: string | null; apartment?: string | null;
  phone?: string | null;
}
export interface CrmCustomerProfile {
  id: CrmId;
  identity: {
    name: string; code?: string | null; status?: string | null; category?: string | null;
    primary_phone?: string | null; phones?: CrmCustomerPhone[]; email?: string | null;
    branch?: CrmBranch | null;
    // customers.address is a plain text column (not a related object) —
    // Customer360QueryService::profile() returns it as-is.
    default_address?: string | null;
    loyalty_points?: number | null;
    // How this customer was acquired — see CrmController::SOURCE_LABELS
    // (website/fawri/families/call_center/walk_in). Null until set.
    source?: CrmCustomerSource | null;
    // customers.created_at — the customer's registration date.
    created_at?: string | null;
    // customers.title — a free-text nickname/label (e.g. "أبو خالد"), not
    // an honorific enum. Wired to CRM via CrmController::store()/update().
    title?: string | null;
    // customers.gender — only 'male'/'female' are accepted, null = unset.
    gender?: CrmGender | null;
    // Modeled as a CustomerOccasion (occasion_type='birthday'), not a
    // customers column — see CustomerIdentityService::syncBirthdayOccasion().
    birth_date?: string | null;
    // Modeled as a CustomerAddress row, not a customers column — see
    // CustomerIdentityService::syncWorkAddress()/WORK_ADDRESS_LABEL.
    work_address?: CrmWorkAddress | null;
  };
  summary: {
    orders_count?: number; completed_orders_count?: number; average_order_value?: number;
    total_purchases?: number; last_order_at?: string | null; open_complaints_count?: number;
  };
  permissions: { can_edit?: boolean; can_view_financial?: boolean; can_view_sensitive_notes?: boolean };
}

// GET /crm/orders, /crm/orders/delayed — CrmController::ordersIndex()/ordersDelayed().
// Read-only cross-customer order monitoring rows. CRM never creates/edits
// orders — this is strictly a projection over the existing Order domain
// (see the Order Domain Audit). `elapsed_minutes` is measured from
// created_at only; no reliable order-level per-status timestamp exists
// today, so this is "time since placed", not "time in current stage".
export interface CrmOrderRow {
  id: CrmId;
  order_number: string;
  status: string;
  payment_status?: string | null;
  // Derived on the backend as `status === 'paid' || payment_status === 'paid'`
  // — the real "is this paid" signal. `payment_status` alone is written only
  // by the Call Center path and is null for the POS/general settlement path,
  // so it must never be read directly as a payment indicator in the UI.
  is_paid?: boolean;
  order_type: "dine_in" | "takeaway" | "delivery" | string;
  source?: string | null;
  total: number;
  branch?: CrmBranch | null;
  table?: { table_number?: string | null; zone?: string | null } | null;
  customer?: { id: CrmId | null; name: string; code?: string | null } | null;
  customer_phone?: string | null;
  cashier?: { id: CrmId; name: string } | null;
  created_at?: string | null;
  elapsed_minutes: number;
  is_delayed?: boolean | null;
}

// GET /crm/customers/{id}/activity — CrmController::activity(). Two real,
// already-existing sources, merged and sorted by time: AuditLog/Auditable
// (customer created/updated/deleted) and CallTicket rows already linked to
// this customer (customer_id). Not a general cross-domain event system —
// only what's already being collected against/for this customer today.
export interface CrmActivityEvent {
  id: CrmId;
  event: "created" | "updated" | "deleted" | "call" | string;
  label: string;
  user?: { id: CrmId; name: string } | null;
  timestamp?: string | null;
}

// customer_notes.type/importance — matches CrmController::NOTE_TYPE_VALUES/
// NOTE_IMPORTANCE_VALUES exactly (no DB-level enum, application-level list).
export type CrmNoteType = "general" | "delivery" | "warning" | "preference" | "service" | "sensitive";
export type CrmNoteImportance = "low" | "normal" | "high" | "urgent";

// GET /crm/customers/{id}/notes — CrmController::notes()
export interface CrmNote {
  id: CrmId;
  customer_id: CrmId;
  order_id?: CrmId | null;
  content: string;
  type: CrmNoteType;
  importance: CrmNoteImportance;
  show_during_order: boolean;
  created_by?: { id: CrmId; name: string } | null;
  created_at?: string | null;
  updated_at?: string | null;
}

// POST/PUT /crm/customers/{id}/notes[/{note}] — CrmController::createNote()/updateNote()
export interface CrmNoteInput {
  content: string;
  type?: CrmNoteType;
  importance?: CrmNoteImportance;
  show_during_order?: boolean;
}

// GET /crm/customers/{id}/financial-summary — Customer360QueryService::financial()
export interface CrmFinancialSummary {
  balance: number;
  credit_limit: number;
  available_credit: number;
  payment_terms?: string | null;
  credit_days?: number | null;
}

// GET /crm/customers/{id}/favorites — CallCenterService::getCustomerFavorites()
export interface CrmFavoriteProduct {
  item_id: CrmId; item_name: string; item_name_ar?: string | null;
  quantity_sum: number; orders_count: number; total_spent: number; last_ordered_at: string;
}

// GET /crm/customers/{id}/purchase-history
export interface CrmPurchaseHistory { months: CrmMonthAmount[] }
export interface CrmMonthAmount { month: string; amount: number }

// GET /crm/orders/{order} — CallCenterService::getOrderDetails()
export interface CrmOrderItem {
  id: CrmId; item_id: CrmId; item_name: string; item_name_ar?: string | null;
  quantity: number; price: number; total: number; notes?: string | null;
}
export interface CrmOrderDetails {
  id: CrmId; order_number: string; status: string; order_type?: string | null; source?: OrderSource | null;
  customer_id?: CrmId | null; subtotal: number; discount_amount: number; total: number;
  note?: string | null; customer_name?: string | null; customer_phone?: string | null;
  branch?: CrmBranch | null; cashier?: { id: CrmId; name: string } | null;
  created_at: string; items: CrmOrderItem[];
  invoice?: { id: CrmId; number?: string | null; status?: string | null } | null;
  // OrderFeedback model fields — two separate ratings (food/service), plus
  // delivery speed for delivery orders only. Not a single generic "rating".
  feedback?: {
    food_quality?: number | null; service_quality?: number | null;
    delivery_speed?: number | null; notes?: string | null;
    recorder?: { id: CrmId; name: string } | null;
  } | null;
}

// GET /crm/orders/{order}/timeline — OrderTimelineController::timeline() (audit log)
export interface CrmOrderTimelineEvent {
  type: string; label: string;
  user?: { id: CrmId; name: string } | null;
  timestamp?: string | null;
  details?: Record<string, unknown>;
}
export interface CrmOrderTimeline {
  order_id: CrmId; order_number: string; events: CrmOrderTimelineEvent[];
}

// PUT /crm/customers/{customer}/orders/{order}/feedback — OrderFeedbackController::store()
export interface CrmOrderFeedbackInput {
  food_quality: number; service_quality: number; delivery_speed?: number | null; notes?: string | null;
}
