export type CrmId = string | number;
export interface CrmBranch { id: CrmId; name: string }
export interface CrmCustomer {
  id: CrmId; code?: string; name: string; phone?: string | null; mobile?: string | null;
  primary_phone?: string | null;
  email?: string | null; status?: string; branch?: CrmBranch | null;
  // Call Center engagement tag (regular/vip/follow_up/…). The business
  // classification that used to share this field lives on the group now.
  engagement_status?: string | null;
  group_id?: CrmId | null;
  group?: { id: CrmId; name: string; group_type: string } | null;
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
  /**
   * Nearest upcoming occasion — the directory's "مناسبة قادمة" column.
   * Computed per row from the customer's active occasions
   * (Customer360QueryService::nextOccasion): an annual occasion rolls to its
   * next anniversary, a one-off already in the past is skipped. Null when the
   * customer has nothing ahead of them.
   */
  next_occasion?: CrmNextOccasion | null;
  balance?: number;
}
export interface CrmNextOccasion {
  type: string;
  label: string;
  title?: string | null;
  /** ISO date (YYYY-MM-DD) of the next occurrence, not the original date. */
  date: string;
  days_until: number;
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
export interface CrmCustomerPhone {
  id?: CrmId;
  phone?: string;
  /** E.164 as stored — the only form carrying a country code. */
  normalized_phone?: string | null;
  type?: string;
  is_primary?: boolean;
  is_verified?: boolean;
}
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
    name: string; code?: string | null; status?: string | null;
    engagement_status?: string | null;
    group_id?: CrmId | null;
    group?: { id: CrmId; name: string; group_type: string } | null;
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

// customer_complaints — status/priority mirror CustomerComplaint's constants,
// channel mirrors the DB enum added with the column.
export type CrmComplaintStatus =
  | "new" | "open" | "in_progress" | "waiting_customer" | "resolved" | "closed" | "cancelled";
export type CrmComplaintPriority = "low" | "normal" | "high" | "critical";
export type CrmComplaintChannel = "call_center" | "crm" | "website";

// GET /crm/customers/{id}/complaints — CrmController::complaints()
export interface CrmComplaint {
  id: CrmId;
  customer_id: CrmId;
  title?: string | null;
  description?: string | null;
  status: CrmComplaintStatus;
  priority: CrmComplaintPriority;
  severity?: string | null;
  channel?: CrmComplaintChannel | null;
  /** The written outcome. Required by the backend on the resolved transition. */
  resolution_notes?: string | null;
  is_sensitive: boolean;
  assigned_to?: CrmId | null;
  created_at?: string | null;
}

// customer_groups.group_type — a real DB enum since the table was created.
export type CrmGroupType = "retail" | "wholesale" | "corporate" | "government" | "service";

export interface CrmCustomerGroup {
  id: CrmId;
  name: string;
  group_type: CrmGroupType;
  /**
   * Members across every branch — deliberately unscoped on the backend.
   * Never render it above a branch-scoped member list; use the list length.
   */
  customers_count?: number;
  created_at?: string | null;
}

export interface CrmCustomerGroupInput {
  name: string;
  group_type: CrmGroupType;
}

// customer_occasions — the enums constrained at DB level in 2027_01_18_000001.
export type CrmOccasionType =
  | "birthday" | "anniversary" | "graduation" | "company_founding" | "contract_renewal" | "other";
export type CrmContactMethod = "call" | "sms" | "email" | "whatsapp";

export interface CrmOccasion {
  id: CrmId;
  occasion_type: CrmOccasionType;
  title: string;
  date: string;
  repeats_annually: boolean;
  notes?: string | null;
  preferred_contact_method?: CrmContactMethod | null;
  is_active: boolean;
  /** Resolved next occurrence, present on the range endpoint only. */
  next_occurrence?: string | null;
  created_at?: string | null;
}

/** One line of the yearly diary — occasion_followups, newest first. */
export interface CrmOccasionFollowup {
  id: CrmId;
  occasion_id: CrmId;
  notes: string;
  /** The integer column. The relation is serialized separately as `creator`
   *  so that it cannot overwrite this id — see OccasionFollowup::creator(). */
  created_by?: number | null;
  creator?: { id: CrmId; name: string } | null;
  created_at?: string | null;
}

/** GET /crm/occasions/{id} — the occasion plus its diary and rolled date. */
export interface CrmOccasionDetail extends CrmOccasion {
  followups?: CrmOccasionFollowup[];
  creator?: { id: CrmId; name: string } | null;
  /** Derived server-side from CustomerOccasion::nextOccurrence(). */
  next_occurrence?: string | null;
  days_until_next?: number | null;
  occasionable?: { id: CrmId; name?: string | null } | null;
  occasionable_type?: string | null;
}

/**
 * One row of GET /crm/occasions — the cross-owner listing.
 *
 * `next_occurrence` is resolved server-side against the requested window, so
 * the same annual occasion reports a different date depending on the month
 * being asked about. The frontend never rolls a date itself.
 */
export interface CrmOccasionListRow {
  id: CrmId;
  occasion_type: CrmOccasionType;
  title: string;
  date?: string | null;
  repeats_annually: boolean;
  next_occurrence: string | null;
  owner_type: "customer" | "group";
  owner_id: CrmId;
  owner_name?: string | null;
  /** null for a group — it has no single number to dial. */
  owner_phone?: string | null;
}

export interface CrmOccasionListQuery {
  range?: "today" | "week" | "month" | "upcoming";
  from?: string;
  to?: string;
  owner_type?: "customer" | "group";
  occasion_type?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// Loyalty — mirrors app/Models/LoyaltyRule.php, LoyaltyTransaction.php and
// the two controllers behind /crm/loyalty/*. The engine (LoyaltyEngine,
// driven by the OrderPaid event) is the only writer of `earn` rows; every
// type here describes what that already-built, already-tested pipeline
// produces, not a new calculation.
// ═══════════════════════════════════════════════════════════════════════

export type CrmLoyaltyScopeType = "global" | "customer" | "group" | "category" | "product";
export type CrmLoyaltyTxnType = "earn" | "redeem" | "referral_bonus" | "manual_adjustment" | "campaign_reversal";
export type CrmLoyaltyTxnStatus = "pending" | "confirmed" | "reversed";
export type CrmLoyaltyCampaignMetric = "spend" | "points" | "order_count";

export interface CrmLoyaltyRule {
  id: CrmId;
  name: string;
  scope_type: CrmLoyaltyScopeType;
  /** Meaningless for scope_type="global" — no id to point at. */
  scope_id?: number | null;
  /** Present only on the one permanent base rule. */
  points_per_amount?: number | string | null;
  per_amount?: number | string | null;
  multiplier: number | string;
  /** Presence (not value) is what marks a rule invoice-level rather than item-level. */
  min_order_value?: number | string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  priority: number;
  is_campaign: boolean;
  campaign_target?: number | string | null;
  campaign_target_metric?: CrmLoyaltyCampaignMetric | null;
  group_cascade_percent?: number | string | null;
  is_active: boolean;
  /**
   * Computed server-side by LoyaltyRule::isBaseRule() and appended to every
   * API response for a rule. This is the single source of truth for "is
   * this the permanent base rule" — never re-derive the shape (global scope,
   * no min_order_value, no ends_at, a real rate) from the raw fields here.
   */
  is_base_rule: boolean;
  created_by?: number | null;
  creator?: { id: CrmId; name: string } | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CrmLoyaltyRuleInput {
  name: string;
  scope_type: CrmLoyaltyScopeType;
  scope_id?: number | null;
  points_per_amount?: number | null;
  per_amount?: number | null;
  multiplier?: number | null;
  min_order_value?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  priority?: number | null;
  is_campaign?: boolean | null;
  campaign_target?: number | null;
  campaign_target_metric?: CrmLoyaltyCampaignMetric | null;
  group_cascade_percent?: number | null;
  is_active?: boolean | null;
}

export interface CrmLoyaltyRuleExclusion {
  id: CrmId;
  rule_id: CrmId;
  customer_id: CrmId;
  customer?: { id: CrmId; name: string; code?: string | null } | null;
}

export interface CrmLoyaltyTransaction {
  id: CrmId;
  owner_type: "customer" | "group";
  owner_id: CrmId;
  /** Only present on GET /crm/loyalty/transactions — the cross-owner listing. */
  owner_name?: string | null;
  type: CrmLoyaltyTxnType;
  points: number | string;
  status: CrmLoyaltyTxnStatus;
  source_order_id?: CrmId | null;
  order?: { id: CrmId; order_number: string } | null;
  rule_id?: CrmId | null;
  rule?: { id: CrmId; name: string } | null;
  notes?: string | null;
  created_by?: number | null;
  creator?: { id: CrmId; name: string } | null;
  created_at?: string | null;
}

export interface CrmLoyaltyOwnerSummary {
  owner_type: "customer" | "group";
  owner_id: CrmId;
  balance: number;
  total_earned: number;
  total_redeemed: number;
}

export interface CrmLoyaltyGlobalSummary {
  total_points_issued: number;
  total_transactions: number;
  active_rules_count: number;
}

export interface CrmLoyaltyAdjustmentInput {
  owner_type: "customer" | "group";
  owner_id: CrmId;
  points: number;
  notes: string;
}

/** GET /crm/occasions/summary — nested counts, each closed by window_ends. */
export interface CrmOccasionsSummary {
  today: number;
  this_week: number;
  this_month: number;
  window_ends?: { today: string; this_week: string; this_month: string };
}

export interface CrmOccasionInput {
  occasion_type: CrmOccasionType;
  title: string;
  date: string;
  repeats_annually?: boolean;
  notes?: string | null;
  preferred_contact_method?: CrmContactMethod | null;
  is_active?: boolean;
}

export type CrmComplaintSeverity = "info" | "warning" | "critical";
// customer_complaints.department — the analytical tag, unrelated to assigned_to.
export type CrmComplaintDepartment =
  | "hospitality" | "pos" | "call_center" | "kitchen" | "delivery" | "accounting" | "management";

// GET /crm/complaints — Crm\ComplaintController::index(). Carries the customer
// inline so the list can link to a profile without a second request.
export interface CrmComplaintRow extends Omit<CrmComplaint, "assigned_to"> {
  department?: CrmComplaintDepartment | null;
  /**
   * Either the raw column or the eager-loaded relation.
   *
   * Laravel serialises the `assignedTo` relation under the snake_case key
   * `assigned_to`, which overwrites the integer column of the same name — so
   * whether this is a number or an object depends on whether the endpoint
   * eager-loaded it. Read it through `assignedId()` rather than directly.
   */
  assigned_to?: CrmId | { id: CrmId; name: string } | null;
  customer?: { id: CrmId; name: string; code?: string | null; phone?: string | null } | null;
  assigned_to_user?: { id: CrmId; name: string } | null;
}

// One entry of the followup trail returned by GET /crm/complaints/{id}.
// `user` is nullable by design: the User model carries a branch scope, so an
// author outside the reader's branch resolves to null rather than leaking.
export interface CrmComplaintFollowup {
  id: CrmId;
  complaint_id: CrmId;
  user_id?: CrmId | null;
  action?: string | null;
  notes?: string | null;
  old_status?: CrmComplaintStatus | null;
  new_status?: CrmComplaintStatus | null;
  followup_type?: string | null;
  created_at?: string | null;
  user?: { id: CrmId; name: string } | null;
}

// GET /crm/complaints/summary. The distribution maps are keyed by the raw
// enum value; an empty-string key means "not classified" (a NULL column).
export interface CrmComplaintSummary {
  total: number;
  open: number;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
  by_channel: Record<string, number>;
  by_department: Record<string, number>;
}

// POST /crm/customers/{id}/complaints — CrmController::createComplaint().
// `channel` is absent by design: the server derives it from the entry point.
export interface CrmComplaintCreateInput {
  title: string;
  description?: string;
  priority?: CrmComplaintPriority;
  severity?: CrmComplaintSeverity;
}

// PUT /crm/complaints/{id} — CrmController::updateComplaint(). Every field is
// optional: the endpoint applies whichever ones are present.
export interface CrmComplaintInput {
  status?: CrmComplaintStatus;
  priority?: CrmComplaintPriority;
  title?: string;
  description?: string;
  assigned_to?: CrmId | null;
  resolution_notes?: string;
  is_sensitive?: boolean;
  department?: CrmComplaintDepartment | null;
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

/** A recorded clash between an incoming customer name and the stored one. */
export interface CrmIdentityConflict {
  id: CrmId;
  customer_id: CrmId;
  source_channel: "call_center" | "pos_instant" | "pos_family" | "website";
  source_order_id?: CrmId | null;
  incoming_name: string;
  incoming_phone_normalized: string;
  status: "open" | "resolved" | "dismissed";
  resolution?: "kept_original" | "renamed_customer" | "created_new_customer" | "marked_shared_number" | null;
  /** Set only by the two split resolutions — the customer they created. */
  created_customer_id?: number | null;
  created_customer?: { id: CrmId; name: string; code?: string | null } | null;
  resolution_note?: string | null;
  resolved_by?: CrmId | null;
  resolved_at?: string | null;
  created_at?: string;
  customer?: { id: CrmId; name: string; code?: string | null; phone?: string | null } | null;
  resolver?: { id: CrmId; name: string } | null;
  order?: { id: CrmId; order_number?: string | null; created_at?: string } | null;
}

/** An order the reviewer may (or may not) decide belongs to the split-off customer. */
export interface CrmCandidateOrder {
  id: number;
  order_number: string | null;
  created_at: string | null;
  total: string | number | null;
}

/**
 * Ticket responses carry candidate_orders next to `data`, so these endpoints
 * are read whole rather than unwrapped to `data`.
 */
export interface CrmConflictEnvelope {
  data: CrmIdentityConflict;
  candidate_orders?: CrmCandidateOrder[];
  reassigned?: number[];
  left?: number[];
}
