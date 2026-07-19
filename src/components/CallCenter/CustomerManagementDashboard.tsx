import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Filter, Loader2, MapPin, Search, ShieldCheck, Sparkles, UserRound, Users, X } from "lucide-react";
import type { CustomerCategory, CustomerSearchResult, DashboardAnalytics, TopCustomerRow } from "../../services/callCenterService";
import { callCenterService, CUSTOMER_CATEGORY_LABELS, resolveCustomerCategory } from "../../services/callCenterService";
import { CustomerProfileDrawer } from "./CustomerProfileDrawer";

type CustomerRow = CustomerSearchResult & {
  orders_count?: number;
  open_complaints_count?: number;
  last_order_at?: string | null;
};

const classificationOptions: Array<{ value: "all" | CustomerCategory; label: string }> = [
  { value: "all", label: "كل التصنيفات" },
  ...Object.entries(CUSTOMER_CATEGORY_LABELS).map(([value, label]) => ({ value: value as CustomerCategory, label })),
];

const fromTopCustomer = (customer: TopCustomerRow): CustomerRow => ({
  id: customer.id,
  name: customer.name,
  phone: customer.phone,
  mobile: null,
  code: customer.code,
  status: "active",
  category: null,
  city: null,
  address: null,
  branch_id: null,
  orders_count: Number(customer.orders_count),
  open_complaints_count: Number(customer.open_complaints_count),
  last_order_at: customer.last_order_at,
});

export const CustomerManagementDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [query, setQuery] = useState("");
  const [classification, setClassification] = useState<"all" | CustomerCategory>("all");
  const [complaintsOnly, setComplaintsOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      callCenterService.getAnalytics(),
      callCenterService.getTopCustomers({ period: "year", sort_by: "orders_count", sort_dir: "desc", per_page: 100 }),
    ]).then(([analyticsResponse, customersResponse]) => {
      if (!active) return;
      setAnalytics(analyticsResponse.data);
      setCustomers((customersResponse.data?.data ?? []).map(fromTopCustomer));
    }).catch(() => active && setError("تعذر تحميل قائمة العملاء. تحقق من الاتصال ثم أعد المحاولة."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 2) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setSearching(true);
      setError(null);
      callCenterService.searchCustomers(normalized, 100)
        .then((response) => active && setCustomers(response.data ?? []))
        .catch(() => active && setError("تعذر تنفيذ البحث الآن."))
        .finally(() => active && setSearching(false));
    }, 350);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query]);

  const filteredCustomers = useMemo(() => customers.filter((customer) => {
    const category = resolveCustomerCategory(customer, customer.orders_count ?? 0).category;
    if (classification !== "all" && category !== classification) return false;
    if (complaintsOnly && !(customer.open_complaints_count && customer.open_complaints_count > 0)) return false;
    return true;
  }), [classification, complaintsOnly, customers]);

  if (loading) return <div className="flex min-h-[420px] items-center justify-center gap-3 text-sm text-slate-400"><Loader2 className="animate-spin text-red-500" /> جارٍ تجهيز مساحة CRM…</div>;

  return (
    <main className="space-y-5" dir="rtl">
      <header className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
        <div className="flex flex-col gap-4 border-b border-white/5 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold text-red-400"><ShieldCheck size={15} /> مساحة خدمة ورعاية العملاء</div>
            <h1 className="text-2xl font-black text-white">إدارة العملاء CRM</h1>
            <p className="mt-1 text-xs leading-5 text-slate-400">ابحث عن العميل وافتح ملف 360 للعناوين والطلبات والشكاوى والمناسبات، دون إجراء أي معاملات مالية.</p>
          </div>
          <div className="grid grid-cols-3 divide-x divide-x-reverse divide-white/10 rounded-xl border border-white/10 bg-slate-900 px-2 py-3">
            <Metric label="العملاء" value={analytics?.total_customers ?? 0} />
            <Metric label="النشطون" value={analytics?.active_customers ?? 0} accent="text-emerald-400" />
            <Metric label="شكاوى مفتوحة" value={analytics?.open_complaints ?? 0} accent="text-amber-400" />
          </div>
        </div>

        <div className="grid gap-3 p-4 lg:grid-cols-[minmax(260px,1fr)_220px_auto]">
          <label className="relative block">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث بالاسم أو رقم الهاتف…" className="h-11 w-full rounded-xl border border-white/10 bg-slate-900 pr-10 pl-10 text-sm text-white outline-none placeholder:text-slate-600 focus:border-red-500/60 focus:ring-2 focus:ring-red-500/10" />
            {searching ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 animate-spin text-red-400" size={16} /> : query && <button onClick={() => setQuery("")} className="absolute left-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-white" aria-label="مسح البحث"><X size={15} /></button>}
          </label>
          <label className="relative">
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
            <select value={classification} onChange={(event) => setClassification(event.target.value as typeof classification)} className="h-11 w-full appearance-none rounded-xl border border-white/10 bg-slate-900 pr-9 pl-3 text-xs font-bold text-white outline-none focus:border-red-500/60">
              {classificationOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-slate-900 px-4 text-xs font-bold text-slate-300 hover:border-amber-500/30">
            <input type="checkbox" checked={complaintsOnly} onChange={(event) => setComplaintsOnly(event.target.checked)} className="accent-red-600" /> لديه شكوى مفتوحة
          </label>
        </div>
      </header>

      {error && <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200"><AlertTriangle size={17} />{error}</div>}

      <section className="grid overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-l from-amber-500/10 via-slate-950 to-slate-950 lg:grid-cols-[260px_1fr]" aria-label="طابور العناية">
        <div className="border-b border-amber-500/10 p-4 lg:border-b-0 lg:border-l">
          <div className="flex items-center gap-2 text-sm font-black text-amber-300"><AlertTriangle size={16}/>طابور العناية</div>
          <p className="mt-1 text-[11px] leading-5 text-slate-400">إشارات تحتاج انتباه الفريق قبل التواصل أو أثناءه.</p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-x-reverse divide-white/5">
          <CareSignal label="شكاوى مفتوحة" value={customers.filter(c => (c.open_complaints_count ?? 0) > 0).length} color="text-amber-300" />
          <CareSignal label="عملاء VIP" value={customers.filter(c => resolveCustomerCategory(c, c.orders_count ?? 0).category === "vip").length} color="text-violet-300" />
          <CareSignal label="غير نشط" value={customers.filter(c => c.status === "inactive").length} color="text-slate-300" />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950" aria-label="قائمة عملاء CRM">
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-black text-white"><Users size={16} className="text-red-400" /> دليل العملاء</h2>
          <span className="text-[11px] font-bold text-slate-500">{filteredCustomers.length} نتيجة</span>
        </div>
        {filteredCustomers.length === 0 ? <div className="flex min-h-56 flex-col items-center justify-center text-slate-500"><UserRound size={36} className="mb-3" /><p className="text-sm font-bold">لا توجد نتائج مطابقة</p><p className="mt-1 text-xs">جرّب الاسم أو رقم الهاتف أو غيّر الفلاتر.</p></div> : <>
          <div className="space-y-2 p-3 md:hidden">{filteredCustomers.map((customer) => {
            const resolved = resolveCustomerCategory(customer, customer.orders_count ?? 0);
            return <article key={customer.id} className="rounded-xl border border-white/10 bg-slate-900 p-3">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-sm font-black text-white">{customer.name}</h3><p className="mt-1 text-[11px] text-slate-400">{customer.phone || customer.mobile || "لا يوجد هاتف"}</p></div><span className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold ${resolved.category === "vip" ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-violet-500/20 bg-violet-500/10 text-violet-200"}`}>{CUSTOMER_CATEGORY_LABELS[resolved.category]}</span></div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]"><MobileFact label="الحالة" value={customer.status === "blocked" ? "محظور" : customer.status === "inactive" ? "غير نشط" : "نشط"}/><MobileFact label="الشكاوى" value={String(customer.open_complaints_count ?? 0)}/><MobileFact label="آخر طلب" value={customer.last_order_at ? new Date(customer.last_order_at).toLocaleDateString("ar-PS") : "—"}/></div>
              <button onClick={() => setSelectedCustomerId(customer.id)} className="mt-3 w-full rounded-lg bg-red-600 px-3 py-2.5 text-xs font-black text-white hover:bg-red-500">فتح ملف CRM</button>
            </article>;
          })}</div>
          <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[760px] text-xs"><thead className="bg-slate-900/70 text-slate-500"><tr><th className="p-3 text-right">العميل</th><th className="p-3 text-right">المدينة</th><th className="p-3 text-right">التصنيف</th><th className="p-3 text-center">الحالة</th><th className="p-3 text-center">آخر طلب</th><th className="p-3 text-center">الشكاوى</th><th className="p-3 text-left">الإجراء</th></tr></thead>
          <tbody>{filteredCustomers.map((customer) => {
            const resolved = resolveCustomerCategory(customer, customer.orders_count ?? 0);
            return <tr key={customer.id} className="border-t border-white/5 transition-colors hover:bg-white/[0.035]">
              <td className="p-3"><div className="font-bold text-white">{customer.name}</div><div className="mt-1 text-[11px] text-slate-500">{customer.phone || customer.mobile || "لا يوجد هاتف"}</div></td>
              <td className="p-3 text-slate-300"><span className="flex items-center gap-1"><MapPin size={12} className="text-slate-600" />{customer.city || "غير محددة"}</span></td>
              <td className="p-3"><span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 font-bold ${resolved.category === "vip" ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-violet-500/20 bg-violet-500/10 text-violet-200"}`}><Sparkles size={11} />{CUSTOMER_CATEGORY_LABELS[resolved.category]}</span></td>
              <td className="p-3 text-center"><span className={customer.status === "blocked" ? "text-red-400" : customer.status === "inactive" ? "text-amber-400" : "text-emerald-400"}>{customer.status === "blocked" ? "محظور" : customer.status === "inactive" ? "غير نشط" : "نشط"}</span></td>
              <td className="p-3 text-center text-slate-400">{customer.last_order_at ? new Date(customer.last_order_at).toLocaleDateString("ar-PS") : "—"}</td>
              <td className="p-3 text-center"><span className={customer.open_complaints_count ? "font-black text-amber-400" : "text-slate-600"}>{customer.open_complaints_count ?? 0}</span></td>
              <td className="p-3 text-left"><button onClick={() => setSelectedCustomerId(customer.id)} className="rounded-lg bg-red-600 px-3 py-2 font-black text-white hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-400">فتح ملف CRM</button></td>
            </tr>;
          })}</tbody></table></div></>}
      </section>

      <aside className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-100"><strong>رسوم التوصيل:</strong> إدارة المناطق والرسوم غير مفعلة في الواجهة لعدم توفر CRUD Backend موثّق. لم تتم إضافة رسوم أو تأثير محاسبي افتراضي.</aside>

      {selectedCustomerId && <CustomerProfileDrawer isOpen customerId={selectedCustomerId} onClose={() => setSelectedCustomerId(null)} />}
    </main>
  );
};

const Metric = ({ label, value, accent = "text-white" }: { label: string; value: number; accent?: string }) => <div className="min-w-24 px-4 text-center"><div className={`text-xl font-black ${accent}`}>{value.toLocaleString("ar-PS")}</div><div className="mt-1 text-[10px] font-bold text-slate-500">{label}</div></div>;
const CareSignal = ({ label, value, color }: { label: string; value: number; color: string }) => <div className="flex min-h-24 flex-col items-center justify-center p-3 text-center"><strong className={`text-2xl font-black ${color}`}>{value.toLocaleString("ar-PS")}</strong><span className="mt-1 text-[10px] font-bold text-slate-500">{label}</span></div>;
const MobileFact = ({ label, value }: { label: string; value: string }) => <div className="rounded-lg bg-slate-950 p-2"><div className="text-slate-600">{label}</div><div className="mt-1 truncate font-bold text-slate-200">{value}</div></div>;
