import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Link, NavLink, Navigate, Route, Routes, useParams } from "react-router-dom";
import { ArrowRight, Building2, Mail, MapPin, Phone, ShoppingBag, TriangleAlert } from "lucide-react";
import { useAuth } from "../../auth";
import { CRM_PERMISSIONS } from "../../auth/permissions";
import { crmApi } from "./api";
import { CrmState, getCrmError, StatusChip } from "./components";
import type { CrmCustomer } from "./types";

const tabs = [
  ["overview", "نظرة عامة"], ["orders", "الطلبات"], ["addresses", "العناوين"],
  ["complaints", "الشكاوى"], ["notes", "الملاحظات والمناسبات"], ["financial", "الملف المالي"],
] as const;

const OverviewTab = lazy(() => import("./tabs/OverviewTab"));
const OrdersTab = lazy(() => import("./tabs/OrdersTab"));
const AddressesTab = lazy(() => import("./tabs/AddressesTab"));
const ComplaintsTab = lazy(() => import("./tabs/ComplaintsTab"));
const NotesOccasionsTab = lazy(() => import("./tabs/NotesOccasionsTab"));
const FinancialTab = lazy(() => import("./tabs/FinancialTab"));
export function Customer360Page() {
  const { customerId = "" } = useParams();
  const { hasPermission } = useAuth();
  const canFinancial = hasPermission(CRM_PERMISSIONS.VIEW_CUSTOMER_FINANCIAL);
  const [customer, setCustomer] = useState<CrmCustomer>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status?: number; message: string }>();
  const load = useCallback(async () => { setLoading(true); setError(undefined); try { setCustomer(await crmApi.customer(customerId)); } catch (e) { setError(getCrmError(e)); } finally { setLoading(false); } }, [customerId]);
  useEffect(() => { void load(); }, [load]);
  if (loading) return <CrmState kind="loading" title="جارٍ فتح ملف العميل" />;
  if (error) return <CrmState kind={error.status === 403 ? "forbidden" : "error"} title={error.message} retry={load} />;
  if (!customer) return <CrmState kind="empty" title="العميل غير موجود" />;
  return <section className="crm-page">
    <Link className="crm-back" to="/admin/crm/customers"><ArrowRight /> العودة إلى دليل العملاء</Link>
    <header className="crm-identity">
      <div className="crm-avatar">{customer.name.slice(0, 2)}</div>
      <div className="crm-identity-main"><div><span>{customer.code || `#${customer.id}`}</span><StatusChip value={customer.status} /></div><h2>{customer.name}</h2><p>{customer.category || "عميل بدون تصنيف"}</p></div>
      <dl>
        <div><dt><Phone />الهاتف الأساسي</dt><dd dir="ltr">{customer.mobile || customer.phone || "غير مسجل"}</dd></div>
        <div><dt><Building2 />الفرع</dt><dd>{customer.branch?.name || "غير محدد"}</dd></div>
        <div><dt><ShoppingBag />الطلبات</dt><dd>{customer.orders_count ?? "—"}</dd></div>
        <div><dt><TriangleAlert />الشكاوى</dt><dd>{customer.complaints_count ?? "—"}</dd></div>
      </dl>
      {(customer.email || customer.city) && <div className="crm-identity-meta">{customer.email && <span><Mail />{customer.email}</span>}{customer.city && <span><MapPin />{customer.city}</span>}</div>}
    </header>
    <nav className="crm-tabs" aria-label="ملف العميل">{tabs.filter(([key]) => key !== "financial" || canFinancial).map(([key, label]) => <NavLink key={key} to={key}>{label}</NavLink>)}</nav>
    <div className="crm-tab-content"><Suspense fallback={<CrmState kind="loading" title="جارٍ تجهيز القسم" />}><Routes>
      <Route index element={<Navigate to="overview" replace />} />
      <Route path="overview" element={<OverviewTab />} />
      <Route path="orders" element={<OrdersTab />} />
      <Route path="addresses" element={<AddressesTab />} />
      <Route path="complaints" element={<ComplaintsTab />} />
      <Route path="notes" element={<NotesOccasionsTab />} />
      {canFinancial && <Route path="financial" element={<FinancialTab />} />}
      <Route path="*" element={<CrmState kind="empty" title="القسم غير موجود" />} />
    </Routes></Suspense></div>
  </section>;
}
