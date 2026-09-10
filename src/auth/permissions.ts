/**
 * permissions.ts
 * ───────────────
 * ثوابت الأدوار والصلاحيات لمشروع RestoMaster.
 * استخدم هذه الثوابت بدلاً من النصوص العشوائية في كل مكان بالمشروع.
 *
 * Usage:
 *   import { ROLES, PERMISSIONS } from "@/auth/permissions";
 *
 *   <Can permission={PERMISSIONS.MANAGE_BRANCHES}>
 *   <IsRole role={ROLES.SUPER_ADMIN}>
 */

/* ══════════════════════════════════════════════════════════════
 *  الأدوار (Roles)
 *  ─────────────────
 *  الكود هنا يجب أن يتطابق مع ما في Seeder Laravel
 * ══════════════════════════════════════════════════════════════ */

export const ROLES = {
  /** مدير النظام — صلاحيات كاملة على كل شيء */
  SUPER_ADMIN: "super-admin",

  /** مدير الفرع — إدارة فرعه والموظفين */
  BRANCH_MANAGER: "branch-manager",

  /** المحاسب — المحاسبة والتقارير المالية */
  ACCOUNTANT: "accountant",

  /** الكاشير — نقطة البيع والطلبات */
  CASHIER: "cashier",

  /** موظف الضيافة — إدارة الطاولات والزبائن */
  HOSPITALITY: "hospitality",

  /** موظف القسم — عرض طلبات القسم فقط */
  DEPT_STAFF: "dept-staff",

  /** موظف الكول سنتر — إدارة العملاء والشكاوى والمناسبات */
  CALL_CENTER: "call-center",
} as const;

/** نوع يمثل جميع قيم الأدوار الممكنة */
export type RoleKey = (typeof ROLES)[keyof typeof ROLES];

/* ══════════════════════════════════════════════════════════════
 *  الصلاحيات (Permissions)
 *  ─────────────────────────
 *  الكود هنا يجب أن يتطابق مع ما في Seeder Laravel
 * ══════════════════════════════════════════════════════════════ */

export const PERMISSIONS = {
  // ── الأفرع ──
  MANAGE_BRANCHES: "manage-branches",

  // ── الأقسام ──
  MANAGE_DEPARTMENTS: "manage-departments",

  // ── الأصناف ──
  MANAGE_ITEMS: "manage-items",

  // ── الموظفين ──
  MANAGE_EMPLOYEES: "manage-employees",

  // ── المحاسبة ──
  VIEW_ACCOUNTING: "view-accounting",
  MANAGE_ACCOUNTING: "manage-accounting",

  // ── الطلبات ──
  MANAGE_ORDERS: "manage-orders",
  VIEW_ORDERS: "view-orders",

  // ── التقارير ──
  VIEW_REPORTS: "view-reports",

  // ── الإعدادات ──
  MANAGE_SETTINGS: "manage-settings",

  // ── الأرشيف والتدقيق ──
  VIEW_AUDIT_LOG: "view-audit-log",
  VIEW_ARCHIVE: "view-archive",

  // ── العملاء ──
  MANAGE_CUSTOMERS: "manage-customers",

  // ── الموردين ──
  MANAGE_SUPPLIERS: "manage-suppliers",

  // ── الفواتير ──
  MANAGE_INVOICES: "manage-invoices",

  // ── إدارة المستخدمين ──
  MANAGE_USERS: "manage-users",

  // ── نقاط البيع ──
  MANAGE_POS_REGISTERS: "manage-pos-registers",

  // ── أجهزة الضيافة ──
  MANAGE_HOSPITALITY_DEVICES: "manage-hospitality-devices",

  // ── القاعات والطاولات ──
  MANAGE_DINING_ZONES: "manage-dining-zones",

  // ── واجهة الكاشير ──
  ACCESS_POS_INTERFACE: "access-pos-interface",
  // ── الخصومات ──
  MANAGE_DISCOUNTS: "manage-discounts",

  // ── الكول سنتر ──
  MANAGE_CALL_CENTER: "manage-call-center",
  ACCESS_CALL_CENTER_INTERFACE: "access-call-center-interface",
  MANAGE_CALL_CENTER_DEVICES: "manage-call-center-devices",
} as const;

/** صلاحيات CRM الجديدة، مستقلة عن شاشة حسابات العملاء القديمة. */
export const CRM_PERMISSIONS = {
  ACCESS: "crm.access",
  // The customer record's own edit gate. Also what the address-tab "add
  // address" action rides on — CrmController::storeAddress() enforces the
  // same, since an address is contact data about the customer, not a
  // separately-permissioned concern (mirrors the family-members routes).
  EDIT_CUSTOMERS: "crm.edit-customers",
  VIEW_CUSTOMER_FINANCIAL: "crm.view-customer-financial",
  // CrmController::statement() (routes/api.php) gates specifically on this —
  // separate from crm.view-customer-financial, which only covers the
  // financial-summary and aging endpoints. Was never referenced anywhere in
  // the frontend before this, which is exactly why a viewer with only
  // crm.view-customer-financial saw the statement section's own heading
  // render with nothing underneath it: nothing here checked for the
  // permission the backend actually enforces on that one section.
  VIEW_CUSTOMER_STATEMENT: "crm.view-customer-statement",
  ACCOUNTING_VIEW: "view-accounting",
  ACCOUNTING_MANAGE: "manage-accounting",
  VIEW_SENSITIVE_NOTES: "crm.view-sensitive-notes",
  MANAGE_IDENTITY_CONFLICTS: "crm.manage-identity-conflicts",
  NOTES_CREATE: "crm.notes.create",
  NOTES_UPDATE: "crm.notes.update",
  NOTES_DELETE: "crm.notes.delete",
  COMPLAINTS_VIEW: "crm.complaints.view",
  COMPLAINTS_CREATE: "crm.complaints.create",
  COMPLAINTS_UPDATE: "crm.complaints.update",
  GROUPS_VIEW: "crm.groups.view",
  GROUPS_CREATE: "crm.groups.create",
  GROUPS_UPDATE: "crm.groups.update",
  GROUPS_DELETE: "crm.groups.delete",
  OCCASIONS_VIEW: "crm.occasions.view",
  OCCASIONS_CREATE: "crm.occasions.create",
  OCCASIONS_UPDATE: "crm.occasions.update",
  OCCASIONS_DELETE: "crm.occasions.delete",
  LOYALTY_VIEW: "crm.loyalty.view",
  LOYALTY_MANAGE: "crm.loyalty.manage",
} as const;

/** نوع يمثل جميع قيم الصلاحيات الممكنة */
export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/* ══════════════════════════════════════════════════════════════
 *  خريطة الأدوار → الصلاحيات (للمراجعة السريعة)
 *  ─────────────────────────────────────────────
 *  هذا الكائن للمرجع فقط، الربط الحقيقي يتم في Seeder
 * ══════════════════════════════════════════════════════════════ */

export const ROLE_PERMISSIONS: Record<RoleKey, PermissionKey[]> = {
  [ROLES.SUPER_ADMIN]: [
    // يملك كل شيء
    PERMISSIONS.MANAGE_POS_REGISTERS,
    PERMISSIONS.MANAGE_HOSPITALITY_DEVICES,
    PERMISSIONS.MANAGE_DINING_ZONES,
    PERMISSIONS.MANAGE_BRANCHES,
    PERMISSIONS.MANAGE_DEPARTMENTS,
    PERMISSIONS.MANAGE_ITEMS,
    PERMISSIONS.MANAGE_EMPLOYEES,
    PERMISSIONS.VIEW_ACCOUNTING,
    PERMISSIONS.MANAGE_ACCOUNTING,
    PERMISSIONS.MANAGE_ORDERS,
    PERMISSIONS.VIEW_ORDERS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.MANAGE_SETTINGS,
    PERMISSIONS.VIEW_AUDIT_LOG,
    PERMISSIONS.VIEW_ARCHIVE,
    PERMISSIONS.MANAGE_CUSTOMERS,
    PERMISSIONS.MANAGE_SUPPLIERS,
    PERMISSIONS.MANAGE_INVOICES,
    PERMISSIONS.MANAGE_DISCOUNTS,
    PERMISSIONS.MANAGE_CALL_CENTER,
    PERMISSIONS.ACCESS_CALL_CENTER_INTERFACE,
    PERMISSIONS.MANAGE_CALL_CENTER_DEVICES,
  ],

  [ROLES.BRANCH_MANAGER]: [
    PERMISSIONS.MANAGE_DEPARTMENTS,
    PERMISSIONS.MANAGE_ITEMS,
    PERMISSIONS.MANAGE_EMPLOYEES,
    PERMISSIONS.VIEW_ORDERS,
    PERMISSIONS.MANAGE_ORDERS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.VIEW_ACCOUNTING,
    PERMISSIONS.MANAGE_CUSTOMERS,
    PERMISSIONS.MANAGE_DISCOUNTS,
    PERMISSIONS.MANAGE_DINING_ZONES,
    PERMISSIONS.MANAGE_INVOICES,
  ],

  [ROLES.ACCOUNTANT]: [
    PERMISSIONS.VIEW_ACCOUNTING,
    PERMISSIONS.MANAGE_ACCOUNTING,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.VIEW_AUDIT_LOG,
    PERMISSIONS.MANAGE_INVOICES,
    PERMISSIONS.MANAGE_CUSTOMERS,
    PERMISSIONS.MANAGE_SUPPLIERS,
    PERMISSIONS.MANAGE_DISCOUNTS,
  ],

  [ROLES.CASHIER]: [
    PERMISSIONS.VIEW_ORDERS,
    PERMISSIONS.MANAGE_ORDERS,
    PERMISSIONS.MANAGE_CUSTOMERS,
    PERMISSIONS.MANAGE_INVOICES,
  ],

  [ROLES.HOSPITALITY]: [
    PERMISSIONS.VIEW_ORDERS,
    PERMISSIONS.MANAGE_ORDERS,
    PERMISSIONS.MANAGE_CUSTOMERS,
  ],

  [ROLES.DEPT_STAFF]: [PERMISSIONS.VIEW_ORDERS],

  [ROLES.CALL_CENTER]: [
    PERMISSIONS.ACCESS_CALL_CENTER_INTERFACE,
    PERMISSIONS.MANAGE_CUSTOMERS,
    PERMISSIONS.VIEW_ORDERS,
    PERMISSIONS.MANAGE_CALL_CENTER,
  ],
};

/**
 * Permissions that grant sight of a customer's receivables data.
 *
 * Mirrors CustomerFinancialProfileService::READ_PERMISSIONS on the backend.
 * Three, not one, because two separate domains legitimately need this data and
 * are governed differently: CRM uses the granular crm.* permission, while the
 * Accounting module is gated on view-accounting / manage-accounting. Checking
 * only the CRM one would hide the financial tab from Accounting's own users.
 */
export const CUSTOMER_FINANCIAL_READ_PERMISSIONS: string[] = [
  CRM_PERMISSIONS.VIEW_CUSTOMER_FINANCIAL,
  CRM_PERMISSIONS.ACCOUNTING_VIEW,
  CRM_PERMISSIONS.ACCOUNTING_MANAGE,
];
