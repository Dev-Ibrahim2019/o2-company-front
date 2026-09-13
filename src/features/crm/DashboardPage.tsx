import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, RefreshCw, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { crmApi } from "./api";
import { CrmState, getCrmError } from "./components";
import type { CrmDashboard } from "./types";

export function CrmDashboardPage() {
  const [data, setData] = useState<CrmDashboard>();
  const [error, setError] = useState<{ status?: number; message: string }>();
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ branch_id: "", from: "", to: "" });
  const load = useCallback(async () => { setLoading(true); setError(undefined); try { setData(await crmApi.dashboard(filters)); } catch (e) { setError(getCrmError(e)); } finally { setLoading(false); } }, [filters]);
  useEffect(() => { void load(); }, [load]);
  if (loading) return <CrmState kind="loading" title="جارٍ تجهيز لوحة العملاء" detail="نجمع المؤشرات التشغيلية الأحدث." />;
  if (error) return <CrmState kind={error.status === 403 ? "forbidden" : "error"} title={error.message} retry={load} />;
  const metrics = [
    ["إجمالي العملاء", data?.customers_count], ["العملاء النشطون", data?.active_customers_count],
    ["عملاء جدد", data?.new_customers_count], ["شكاوى مفتوحة", data?.open_complaints_count],
    ["الطلبات", data?.orders_count],
  ];
  return <section className="crm-page">
    <div className="crm-toolbar">
      <label>الفرع<select value={filters.branch_id} onChange={e => setFilters(v => ({ ...v, branch_id: e.target.value }))}><option value="">جميع الفروع</option>{data?.branches?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      <label><CalendarDays />من<input type="date" value={filters.from} onChange={e => setFilters(v => ({ ...v, from: e.target.value }))} /></label>
      <label>إلى<input type="date" value={filters.to} onChange={e => setFilters(v => ({ ...v, to: e.target.value }))} /></label>
      <button className="crm-icon-button" onClick={load} aria-label="تحديث"><RefreshCw /></button>
    </div>
    <div className="crm-kpis">{metrics.map(([label, value]) => <div key={label as string}><span>{label}</span><strong>{Number(value ?? 0).toLocaleString("ar")}</strong></div>)}</div>
    <div className="crm-panel">
      <div className="crm-panel-title"><div><h2>آخر العملاء</h2><p>أحدث السجلات التي وصلت إلى مساحة CRM.</p></div><Link to="/admin/crm/customers">عرض الدليل <ArrowLeft /></Link></div>
      {!data?.recent_customers?.length ? <CrmState kind="empty" title="لا توجد بيانات ضمن النطاق المحدد" /> :
      <div className="crm-table-wrap"><table><thead><tr><th>العميل</th><th>رقم العميل</th><th>الهاتف</th><th>الفرع</th></tr></thead><tbody>{data.recent_customers.map(c => <tr key={c.id}><td><Link to={`/admin/crm/customers/${c.id}`}>{c.name}</Link></td><td>{c.code || "—"}</td><td dir="ltr">{c.mobile || c.phone || "—"}</td><td>{c.branch?.name || "—"}</td></tr>)}</tbody></table></div>}
    </div>
  </section>;
}
