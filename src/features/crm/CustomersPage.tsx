import { useCallback, useEffect, useState } from "react";
import { Search, UserRoundSearch } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { crmApi } from "./api";
import { CrmState, getCrmError, StatusChip } from "./components";
import type { CrmCustomer, CrmPage } from "./types";

export function CrmCustomersPage() {
  const [params, setParams] = useSearchParams();
  const [result, setResult] = useState<CrmPage<CrmCustomer>>();
  const [error, setError] = useState<{ status?: number; message: string }>();
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); setError(undefined); try { setResult(await crmApi.customers(params)); } catch (e) { setError(getCrmError(e)); } finally { setLoading(false); } }, [params]);
  useEffect(() => { void load(); }, [load]);
  const set = (key: string, value: string) => { const next = new URLSearchParams(params); value ? next.set(key, value) : next.delete(key); if (key !== "page") next.delete("page"); setParams(next); };
  return <section className="crm-page">
    <div className="crm-section-heading"><div><span className="crm-section-icon"><UserRoundSearch /></span><div><h2>دليل العملاء</h2><p>{result ? `${result.total.toLocaleString("ar")} سجل متاح` : "ابحث في قاعدة العملاء"}</p></div></div></div>
    <div className="crm-toolbar crm-toolbar--directory">
      <label className="crm-search"><Search /><span className="sr-only">البحث</span><input value={params.get("search") || ""} onChange={e => set("search", e.target.value)} placeholder="الاسم، الكود، أو رقم الهاتف" /></label>
      <label>الحالة<select value={params.get("status") || ""} onChange={e => set("status", e.target.value)}><option value="">الكل</option><option value="active">نشط</option><option value="inactive">غير نشط</option><option value="blocked">محظور</option></select></label>
      <label>التصنيف<input value={params.get("category") || ""} onChange={e => set("category", e.target.value)} placeholder="كل التصنيفات" /></label>
    </div>
    {loading ? <CrmState kind="loading" title="جارٍ تحميل دليل العملاء" /> : error ? <CrmState kind={error.status === 403 ? "forbidden" : "error"} title={error.message} retry={load} /> : !result?.items.length ? <CrmState kind="empty" title="لا توجد نتائج مطابقة" detail="جرّب تعديل البحث أو إزالة أحد المرشحات." /> :
    <div className="crm-panel crm-panel--table"><div className="crm-table-wrap"><table><thead><tr><th>العميل</th><th>الكود</th><th>التواصل</th><th>الفرع</th><th>التصنيف</th><th>الحالة</th></tr></thead><tbody>{result.items.map(c => <tr key={c.id}><td><Link className="crm-customer-link" to={`/admin/crm/customers/${c.id}`}><span>{c.name.slice(0, 1)}</span><strong>{c.name}</strong></Link></td><td>{c.code || "—"}</td><td dir="ltr">{c.mobile || c.phone || "—"}</td><td>{c.branch?.name || "—"}</td><td>{c.category || "—"}</td><td><StatusChip value={c.status} /></td></tr>)}</tbody></table></div>
    <footer className="crm-pagination"><span>صفحة {result.currentPage.toLocaleString("ar")} من {result.lastPage.toLocaleString("ar")}</span><div><button disabled={result.currentPage <= 1} onClick={() => set("page", String(result.currentPage - 1))}>السابق</button><button disabled={result.currentPage >= result.lastPage} onClick={() => set("page", String(result.currentPage + 1))}>التالي</button></div></footer></div>}
  </section>;
}
