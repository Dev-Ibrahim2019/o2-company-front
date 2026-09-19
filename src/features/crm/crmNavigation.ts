import type { LucideIcon } from "lucide-react";
import { CRM_PERMISSIONS } from "../../auth/permissions";
import {
  AlertTriangle, BellRing, Building2, CalendarHeart, FileBarChart2, Gift, KeyRound, LayoutDashboard,
  ListOrdered, MessagesSquare, Settings, ShieldAlert, ShoppingBag, UserPlus, Users, UsersRound, Zap,
} from "lucide-react";

// Single source of truth for CRM navigation — read by both the app-wide
// AdminLayout sidebar (CRM entry point) and CrmShell (in-module sidebar).
// Only sections with real, working routes are clickable. Sections with no
// backend/route yet are listed as `comingSoon` so the module's real shape is
// visible without pretending unbuilt features already work.

export interface CrmNavChild {
  key: string;
  label: string;
  to: string;
  icon?: LucideIcon;
}

export interface CrmNavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  to?: string;
  end?: boolean;
  children?: CrmNavChild[];
  comingSoon?: boolean;
  /**
   * Hide the entry entirely unless the user holds this permission.
   * Hidden, not disabled: a greyed-out "identity conflicts" link still tells
   * an unauthorised viewer that the queue exists.
   */
  permission?: string;
}

export const CRM_NAVIGATION: CrmNavItem[] = [
  {
    key: "dashboard",
    label: "لوحة التحكم",
    icon: LayoutDashboard,
    to: "/admin/crm",
    end: true,
  },
  {
    key: "customers",
    label: "العملاء",
    icon: UsersRound,
    to: "/admin/crm/customers",
    children: [
      { key: "customers-list", label: "عرض العملاء", to: "/admin/crm/customers", icon: Users },
      { key: "customers-add", label: "إضافة عميل", to: "/admin/crm/customers/new", icon: UserPlus },
      { key: "customers-active", label: "العملاء النشطون", to: "/admin/crm/customers?status=active", icon: UsersRound },
    ],
  },
  {
    key: "orders",
    label: "الطلبات",
    icon: ShoppingBag,
    to: "/admin/crm/orders",
    children: [
      { key: "orders-all", label: "جميع الطلبات", to: "/admin/crm/orders", icon: ListOrdered },
      { key: "orders-active", label: "الطلبات النشطة", to: "/admin/crm/orders/active", icon: Zap },
      { key: "orders-delayed", label: "الطلبات المتأخرة", to: "/admin/crm/orders/delayed", icon: AlertTriangle },
    ],
  },
  {
    key: "groups",
    label: "المجموعات",
    icon: Building2,
    to: "/admin/crm/groups",
    permission: CRM_PERMISSIONS.GROUPS_VIEW,
  },
  {
    key: "identity-conflicts",
    label: "تعارضات الهوية",
    icon: ShieldAlert,
    to: "/admin/crm/identity-conflicts",
    permission: CRM_PERMISSIONS.MANAGE_IDENTITY_CONFLICTS,
    children: [
      { key: "identity-conflicts-list", label: "قائمة التعارضات", to: "/admin/crm/identity-conflicts", icon: ShieldAlert },
      { key: "identity-conflicts-guide", label: "دليل التعامل", to: "/admin/crm/identity-conflicts/guide", icon: ListOrdered },
    ],
  },
  {
    key: "complaints",
    label: "الشكاوى",
    icon: BellRing,
    to: "/admin/crm/complaints",
    permission: CRM_PERMISSIONS.COMPLAINTS_VIEW,
    children: [
      { key: "complaints-all", label: "جميع الشكاوى", to: "/admin/crm/complaints", icon: ListOrdered },
      { key: "complaints-open", label: "الشكاوى المفتوحة", to: "/admin/crm/complaints/open", icon: Zap },
      { key: "complaints-guide", label: "دليل الحالات", to: "/admin/crm/complaints/guide", icon: ShieldAlert },
    ],
  },
  {
    key: "loyalty",
    label: "الولاء",
    icon: Gift,
    to: "/admin/crm/loyalty",
    permission: CRM_PERMISSIONS.LOYALTY_VIEW,
  },
  {
    key: "occasions",
    label: "المناسبات",
    icon: CalendarHeart,
    to: "/admin/crm/occasions",
    permission: CRM_PERMISSIONS.OCCASIONS_VIEW,
  },
  { key: "communication", label: "التواصل", icon: MessagesSquare, comingSoon: true },
  // No permission gate here — same convention as "dashboard" above: visible
  // to every crm.access holder in the nav, with crm.dashboard.view enforced
  // for real on the actual /crm/reports/* routes (CrmReportController).
  { key: "reports", label: "التقارير", icon: FileBarChart2, to: "/admin/crm/reports" },
  {
    key: "staff-permissions",
    label: "صلاحيات الفريق",
    icon: KeyRound,
    to: "/admin/crm/staff-permissions",
    permission: CRM_PERMISSIONS.STAFF_MANAGE_PERMISSIONS,
  },
  {
    key: "crm-settings",
    label: "إعدادات CRM",
    icon: Settings,
    to: "/admin/crm/settings",
    permission: CRM_PERMISSIONS.SETTINGS_MANAGE,
  },
];
