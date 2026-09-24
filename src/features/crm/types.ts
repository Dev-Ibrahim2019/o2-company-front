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
// order_channel_distribution dashboard aggregate — which cashier/channel took
// the order (families hall / fawri / call center / website). Replaced the
// old separate "customer sources" dashboard card (a distinct concept: who
// first registered the customer, with its own 5-value set including
// "walk_in") — this is now the single, unified channel breakdown for the
// dashboard. "website" has no real data source in this system yet and is
// always 0 — see backend comment.
export type CrmOrderChannel = "families" | "fawri" | "call_center" | "website";
export interface CrmOrderChannelSlice { channel: CrmOrderChannel; label: string; count: number; percent: number }
export interface CrmLoyaltyLeader { id: CrmId; name: string; code?: string; loyalty_points: number }
export interface CrmDashboard {
  customers_count?: number; active_customers_count?: number; new_customers_count?: number;
  open_complaints_count?: number; orders_count?: number; loyalty_points_total?: number;
  branches?: CrmBranch[];
  branch_breakdown?: { branch_id: CrmId; branch_name: string; customers_count: number; orders_count: number; new_customers_count: number }[];
  order_channel_distribution?: CrmOrderChannelSlice[];
  trends?: { customers_count?: number | null; active_customers_count?: number | null; open_complaints_count?: number | null };
  monthly_new_customers?: CrmMonthPoint[];
  monthly_active_customers?: CrmMonthPoint[];
  occasion_distribution?: CrmOccasionSlice[];
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
// A full customer_addresses row as the addresses tab lists it — the work
// address above is just one of these with a fixed label.
export interface CrmAddress extends CrmWorkAddress {
  delivery_notes?: string | null;
  is_default?: boolean | null;
  is_active?: boolean | null;
  last_used_at?: string | null;
}
// The subset CrmController::storeAddress() accepts. `label` is the address
// kind (منزل / عمل / أخرى); at least one locating line is required server-side.
export interface CrmAddressInput {
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
}
export interface CrmCustomerProfile {
  id: CrmId;
  identity: {
    name: string;
    // customers.name_en — was accepted by the form and persisted since this
    // module's first version, but Customer360QueryService::profile() never
    // returned it, so the edit form always reloaded it blank. Fixed on the
    // backend alongside salesperson below.
    name_en?: string | null;
    code?: string | null; status?: string | null;
    engagement_status?: string | null;
    group_id?: CrmId | null;
    group?: { id: CrmId; name: string; group_type: string } | null;
    primary_phone?: string | null; phones?: CrmCustomerPhone[]; email?: string | null;
    branch?: CrmBranch | null;
    // customers.salesperson_id — same missing-from-profile() gap as name_en.
    // salesperson is the resolved employee (id, name) for display; the form
    // still submits/selects by salesperson_id, never by this object.
    salesperson_id?: CrmId | null;
    salesperson?: { id: CrmId; name: string } | null;
    // customers.address is a plain text column (not a related object) —
    // Customer360QueryService::profile() returns it as-is.
    default_address?: string | null;
    // customers.city / customers.country — were saved correctly on both
    // create and update but never returned by profile(), so the edit form
    // always reloaded them blank. Fixed on the backend alongside this.
    city?: string | null;
    country?: string | null;
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
  // Only present from GET /crm/customers/{customer}/orders — the mean of
  // order_feedback's three scores and whether any complaint points at this
  // order. CrmController::orders() layers these on top of the same shape
  // ordersIndex()/ordersDelayed() return; /crm/orders itself never sets them.
  rating?: number | null;
  has_complaint?: boolean;
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
  // Real sums over Order/Customer (CustomerGroupController::totalSpendSubquery()
  // / show()) — every paid order placed by a member of this group. Not an
  // invented/estimated figure; absent (not zero) only if the backend response
  // predates these two columns.
  total_spend?: number;
  orders_count?: number;
  // customer_groups.color — one of CrmGroupColor, purely visual. Null on a
  // group created before this column existed.
  color?: CrmGroupColor | null;
}

// The fixed swatch palette the redesign's colour picker offers — matches
// CustomerGroup::COLORS (backend) exactly, so a value the API accepts is
// always one this list can render.
export const CRM_GROUP_COLORS = ["rose", "orange", "amber", "green", "teal", "blue", "indigo", "purple"] as const;
export type CrmGroupColor = (typeof CRM_GROUP_COLORS)[number];

export interface CrmCustomerGroupInput {
  name: string;
  group_type: CrmGroupType;
  color?: CrmGroupColor | null;
}

// GET /crm/customer-groups/smart-suggestions — CustomerGroupController::
// smartSuggestions(). Rule-based, computed from real Customer/Order data;
// `confidence` is a second, stricter pass of the same rule, not an ML score.
export interface CrmGroupSmartSuggestion {
  key: "vip_spend" | "reactivation" | "frequent";
  title: string;
  description: string;
  matched_count: number;
  confidence: number;
  sample_names: string[];
  suggested_group_type: CrmGroupType;
}

// GET /crm/customer-groups/{group}/analytics and the cross-group
// /crm/customer-groups/analytics — both the same shape, one real point per
// of the last 6 calendar months from the same paid-order definition
// total_spend already uses.
export interface CrmGroupSpendPoint {
  month: string; // "YYYY-MM"
  total: number;
}
export interface CrmGroupAnalytics {
  monthly_spend: CrmGroupSpendPoint[];
}

// GET /crm/customer-groups/{group}/activity — the group's own audit trail
// only (created/updated/deleted); shorter than a customer's because there is
// no per-group call/complaint concept to merge in.
export interface CrmGroupActivityEvent {
  id: string;
  event: "created" | "updated" | "deleted" | string;
  label: string;
  user?: { id: CrmId; name: string } | null;
  timestamp?: string | null;
}

// GET /crm/staff/permissions-catalog — every delegatable crm.* permission,
// labeled and grouped server-side (CrmStaffPermissionController::CATALOG) so
// the frontend never keeps its own translation map that could drift from
// what actually exists. `sensitive` flags the financial/identity-conflict
// permissions the UI gives extra visual weight and a confirm step.
export interface CrmStaffPermissionCatalogItem {
  name: string;
  group: string;
  label: string;
  sensitive: boolean;
}

// GET /crm/staff — CRM staff (anyone holding crm.access), the population
// crm.staff.manage-permissions delegation acts on.
export interface CrmStaffMember {
  id: CrmId;
  name: string;
  email: string;
  roles: string[];
  permissions_count: number;
  denied_count: number;
  has_financial_access: boolean;
}

// GET /crm/staff/{user}/permissions — role vs. direct vs. explicitly-denied,
// and the effective set actually enforced (role ∪ direct) − denied.
export interface CrmStaffPermissionDetail {
  user: { id: CrmId; name: string; email: string; roles: string[] };
  role_permissions: string[];
  direct_permissions: string[];
  denied_permissions: string[];
  effective_permissions: string[];
}

// GET /crm/staff/{user}/activity — only this screen's own writes (direct
// grants / explicit denials), not the customer-group style created/updated/
// deleted trail.
export interface CrmStaffPermissionActivityEvent {
  id: string;
  kind: "direct" | "deny";
  label: string;
  old: string[];
  new: string[];
  actor?: { id: CrmId; name: string } | null;
  timestamp?: string | null;
}

// GET/PUT /crm/settings — CRM settings with real, enforced backend behavior
// (CrmSettingController, EnsureCrmModuleEnabled middleware,
// PosCustomerLinkService::createFromCounter()). Deliberately not a home for
// cosmetic fields — everything else from the original design brief has no
// backend yet and stays out of this shape rather than being faked. The two
// targets are null until an admin sets them — CrmReportController reads
// them for the revenue-vs-target KPI and the cancellation-rate alert, and
// never invents a default.
export interface CrmSettings {
  enabled: boolean;
  auto_register_pos_customers: boolean;
  monthly_revenue_target: number | null;
  max_cancellation_rate_pct: number | null;
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
  // The CRM user who follows up on this occasion — see
  // CustomerOccasion::assignedUser() (backend). The column and the eager-
  // loaded relation serialize under different keys (assigned_user_id vs
  // assigned_user), so both are always present together, never one
  // silently overwriting the other.
  assigned_user_id?: CrmId | null;
  assigned_user?: { id: CrmId; name: string } | null;
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
  assigned_user_id?: CrmId | null;
  /** Flat, unlike CrmOccasion.assigned_user — this row is OccasionController::row()'s
   *  own hand-built shape, not a raw model serialization. */
  assigned_user_name?: string | null;
}

export interface CrmOccasionListQuery {
  range?: "today" | "week" | "month" | "upcoming";
  from?: string;
  to?: string;
  owner_type?: "customer" | "group";
  occasion_type?: string;
  /** Matches the owner's name — a customer or a group. */
  search?: string;
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
  assigned_user_id?: CrmId | null;
}

export type CrmComplaintSeverity = "info" | "warning" | "critical";
// customer_complaints.department — the analytical tag, unrelated to assigned_to.
export type CrmComplaintDepartment =
  | "hospitality" | "pos" | "call_center" | "kitchen" | "delivery" | "accounting" | "management";

// GET /crm/complaints — Crm\ComplaintController::index(). Carries the customer
// inline so the list can link to a profile without a second request.
export interface CrmComplaintRow extends Omit<CrmComplaint, "assigned_to"> {
  /** Origin branch — the order's branch if this complaint is tied to one,
   *  otherwise the filing agent's own branch. Stamped at creation, never
   *  changed by reassignment (assigning to another branch's staff does not
   *  move this). Backend column is a string, not a numeric FK. */
  branch_id?: string | null;
  department?: CrmComplaintDepartment | null;
  /**
   * Either the raw column or the eager-loaded relation.
   *
   * Laravel serialises the `assignedTo` relation under the snake_case key
   * `assigned_to`, which overwrites the integer column of the same name — so
   * whether this is a number or an object depends on whether the endpoint
   * eager-loaded it. Read it through `assignedId()` rather than directly.
   */
  assigned_to?: CrmId | { id: CrmId; name: string; branch_id?: CrmId | null } | null;
  customer?: { id: CrmId; name: string; code?: string | null; phone?: string | null } | null;
  assigned_to_user?: { id: CrmId; name: string } | null;
  /** The CRM assignee — a real login account. The column, always sent. */
  assigned_user_id?: CrmId | null;
  /** The eager-loaded relation (index + show). Laravel serialises `assignedUser`
   *  under this snake_case key. */
  assigned_user?: { id: CrmId; name: string; branch_id?: CrmId | null } | null;
  // Present on GET /crm/complaints/{id} (Crm\ComplaintController::show) only —
  // the list endpoint omits them.
  created_by?: CrmId | { id: CrmId; name: string } | null;
  createdBy?: { id: CrmId; name: string } | null;
  order_id?: CrmId | null;
  order?: { id: CrmId; order_number?: string | null } | null;
  updated_at?: string | null;
  resolved_at?: string | null;
  closed_at?: string | null;
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
  /** Structured transfer record on 'assigned'/'unassigned' rows — who held
   *  it, on which branch, at the time of the change. Snapshotted then, not
   *  looked up live, so a later branch transfer never rewrites this row. */
  metadata?: {
    from_user_id?: CrmId | null; from_branch_id?: CrmId | null;
    to_user_id?: CrmId | null; to_branch_id?: CrmId | null;
    from_employee_id?: CrmId | null; to_employee_id?: CrmId | null;
    complaint_branch_id?: string | null;
  } | null;
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
  department?: CrmComplaintDepartment | null;
}

// POST /crm/complaints — CrmController::createGeneralComplaint(). A "شكوى
// عامة": not about any one customer. Same shape as the per-customer form,
// except department is required — with no customer to imply who should see
// it, the department is the only routing signal the complaint carries.
export interface CrmGeneralComplaintCreateInput extends Omit<CrmComplaintCreateInput, "department"> {
  department: CrmComplaintDepartment;
}

// PUT /crm/complaints/{id} — CrmController::updateComplaint(). Every field is
// optional: the endpoint applies whichever ones are present.
export interface CrmComplaintInput {
  status?: CrmComplaintStatus;
  priority?: CrmComplaintPriority;
  title?: string;
  description?: string;
  assigned_to?: CrmId | null;
  /** The CRM assignee. Any agent may set this to their own id on an
   *  unassigned complaint; every other change needs crm.complaints.assign. */
  assigned_user_id?: CrmId | null;
  resolution_notes?: string;
  is_sensitive?: boolean;
  department?: CrmComplaintDepartment | null;
}

// GET /crm/notifications — the current user's feed for the CRM shell bell.
// One row of Laravel's `notifications` table; `data` is the payload either
// ComplaintActivityNotification::toArray() or OrderDelayedNotification::
// toArray() wrote — both share the same generic action/message/url shape,
// the rest of each field set is specific to its own notification type.
export interface CrmNotification {
  id: string;
  type: string;
  read_at?: string | null;
  created_at?: string | null;
  data: {
    complaint_id?: CrmId;
    complaint_title?: string;
    // OrderDelayedNotification — see CrmOrderDelayAlertService.
    order_id?: CrmId;
    order_number?: string;
    elapsed_minutes?: number;
    threshold_minutes?: number;
    action?: string;
    actor_name?: string;
    message?: string;
    url?: string;
  };
}

// GET/PUT /crm/orders/delay-settings — the persisted, company-wide "after
// how many minutes is an active order considered delayed" threshold behind
// the crm:orders:check-delays scheduled job (CrmOrderDelayAlertService).
// Read by anyone with ORDERS_VIEW; changing it requires ORDERS_MANAGE.
export interface CrmOrderDelaySettings {
  threshold_minutes: number;
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
  // order_item_feedback — a 1–5 rating + optional note, null until someone
  // rates this line from the order pop-up. Written via
  // PUT /crm/orders/{order}/items/{item}/feedback (CrmController::storeItemFeedback).
  // complaint_id is set once the rating is escalated into a complaint
  // (POST .../items/{item}/complaint).
  feedback?: { rating: number; notes?: string | null; complaint_id?: number | null } | null;
}
// PUT /crm/orders/{order}/items/{item}/feedback body.
export interface CrmOrderItemFeedbackInput { rating: number; notes?: string | null }
export interface CrmOrderDetails {
  id: CrmId; order_number: string; status: string; order_type?: string | null; source?: OrderSource | null;
  payment_status?: string | null;
  // Same derived "is this actually paid" signal as CrmOrderRow.is_paid — see
  // that field's comment. status alone reads 'paid' only on the POS path;
  // payment_status alone is null for most historically-paid POS orders. Use
  // this, never the two raw fields, to decide anything payment-conditional.
  is_paid?: boolean;
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

// GET /crm/reports/overview and /crm/reports/revenue — CrmReportController.
// Every field here is a real aggregate over orders/order_items/
// order_item_feedback/customer_complaints; see the controller's own doc
// comments for exactly how each is computed and which candidates from the
// original design brief (revenue "by category", a statistical forecast)
// were left out for having no honest data source.
export type CrmReportPeriod = "today" | "week" | "month" | "quarter" | "year";

export interface CrmReportKpiTrend {
  value: number;
  trend_pct: number | null;
}
export interface CrmReportOverview {
  period: { key: CrmReportPeriod; label: string; from: string; to: string };
  kpis: {
    revenue: { value: number; trend_pct: number | null; target: number | null };
    aov: CrmReportKpiTrend;
    orders: { completed: number; total: number; completion_rate: number; trend_pct: number | null };
    satisfaction: { pct: number | null; high_rated_pct: number | null; rated_count: number };
    cancellation_rate: { pct: number; target: number | null; trend_pct: number | null };
  };
  order_type_distribution: { order_type: string; orders_count: number; revenue: number }[];
  channel_distribution: { source: string; orders_count: number; revenue: number }[];
  daily_revenue: { date: string; revenue: number; trailing_avg: number | null; deviation_pct: number | null; is_anomaly: boolean }[];
  peak_hours: { hour: number; orders: number }[];
  alerts: { level: "urgent" | "attention"; message: string }[];
  decision_support: { priority: "urgent" | "attention" | "opportunity"; message: string }[];
}

export interface CrmReportWeekday {
  dow: number;
  label: string;
  revenue: number;
  orders_count: number;
}
export interface CrmReportWeek {
  label: string;
  from: string;
  to: string;
  revenue: number;
  in_progress: boolean;
  change_pct: number | null;
}
export interface CrmReportRevenue {
  month: string;
  from: string;
  to: string;
  total_revenue: number;
  best_weekday: CrmReportWeekday | null;
  worst_weekday: CrmReportWeekday | null;
  weekday_average: number;
  weeks: CrmReportWeek[];
  top_days: { date: string; revenue: number }[];
  department_revenue: { department: string; revenue: number }[];
  heatmap: { dow: number; label: string; hours: number[] }[];
  projection: { low: number; high: number };
}
