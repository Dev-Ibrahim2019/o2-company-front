import { useEffect, useState } from "react";
import {
  Moon,
  Sun,
  CheckCircle2,
  TrendingUp,
  Wallet,
  Layers,
  BarChart3,
} from "lucide-react";

const accentRed = "#A30000";
const successGreen = "#00B67A";

export function ERPAccountingDashboard() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [formState, setFormState] = useState({
    customer: "شركة النخبة للمقاولات",
    currency: "USD",
    date: new Date().toISOString().slice(0, 10),
    description: "فاتورة خدمات الإدارة والاحتساب الربع سنوي",
  });
  const [statusMessage, setStatusMessage] = useState("لم يتم الحفظ بعد");
  const [statusSaved, setStatusSaved] = useState(false);

  useEffect(() => {
    const storedTheme = localStorage.getItem("erp-theme");
    const storedForm = localStorage.getItem("erp-ledger-form");
    if (storedTheme === "light" || storedTheme === "dark") {
      setTheme(storedTheme);
    }
    if (storedForm) {
      try {
        setFormState(JSON.parse(storedForm));
      } catch {
        // Ignore invalid storage data
      }
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("erp-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("erp-ledger-form", JSON.stringify(formState));
  }, [formState]);

  const handleSave = () => {
    setStatusSaved(true);
    setStatusMessage("تم الحفظ بنجاح");
    window.setTimeout(() => setStatusSaved(false), 2500);
  };

  const themeConfig = {
    dark: {
      body: "bg-[#0B0F12] text-[#F0F6FC]",
      card: "bg-[#161B22] border-[#30363D] text-[#F0F6FC]",
      muted: "text-[#8B949E]",
      border: "border-[#30363D]",
      surface: "shadow-[0_18px_50px_rgba(0,0,0,0.20)]",
    },
    light: {
      body: "bg-[#F8F9FA] text-[#0B0F12]",
      card: "bg-white border-[#E1E4E8] text-[#0B0F12]",
      muted: "text-[#656D76]",
      border: "border-[#E1E4E8]",
      surface: "shadow-[0_18px_50px_rgba(15,23,42,0.08)]",
    },
  } as const;

  const currentTheme = themeConfig[theme];

  return (
    <main
      dir="rtl"
      className={`${currentTheme.body} min-h-screen font-sans transition-colors duration-500`}
      style={{ fontFamily: "'Tajawal', 'Cairo', sans-serif" }}
    >
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-[18px] border px-5 py-5 shadow-xl sm:px-6 sm:py-6 md:px-8 md:py-7" style={{ borderColor: currentTheme.border }}>
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-col gap-4">
              <div className="inline-flex items-center gap-3 rounded-[18px] bg-[#A30000] px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-white shadow-[0_14px_48px_rgba(163,0,0,0.25)]">
                <span className="text-lg">O₂</span>
              </div>
              <div>
                <p className="max-w-2xl text-sm font-medium leading-7 text-[#8B949E] dark:text-[#8B949E]">
                  لوحة تحكم ERP ومحاسبة متكاملة للعروض والتسعير، مصممة لتجربة إدارية راقية وقابلة للتوسع.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 xl:justify-end">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full bg-[#A30000] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#7a0000]"
                >
                  طلب عرض سعر
                </button>
                <button
                  type="button"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="inline-flex items-center gap-2 rounded-full border px-4 py-3 text-sm font-medium transition"
                  style={{ borderColor: currentTheme.border }}
                >
                  {theme === "dark" ? <Sun className="h-4 w-4 text-[#F0F6FC]" /> : <Moon className="h-4 w-4 text-[#0B0F12]" />}
                  <span>{theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}</span>
                </button>
              </div>
              <nav className="flex flex-wrap items-center gap-4 text-sm font-medium">
                {['الرئيسية', 'المبيعات', 'المخزون', 'الحسابات'].map((item) => (
                  <a
                    key={item}
                    href="#"
                    className="rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white dark:hover:bg-slate-700/80"
                  >
                    {item}
                  </a>
                ))}
              </nav>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <article className={`rounded-[20px] border p-6 ${currentTheme.card} ${currentTheme.surface}`}>
            <div className="flex items-center justify-between gap-4 border-b pb-4" style={{ borderColor: currentTheme.border }}>
              <div>
                <h1 className="text-xl font-black">سجل القيود المالية</h1>
                <p className={`mt-2 max-w-2xl text-sm ${currentTheme.muted}`}>
                  بطاقة إدخال البيانات الكاملة لحفظ القيود والدفاتر بدون انقطاع.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#151A21] px-4 py-2 text-sm text-[#F0F6FC] shadow-sm">
                <CheckCircle2 className="h-4 w-4 text-[#00B67A]" />
                <span>{statusSaved ? "تم الحفظ" : "في وضع المسودة"}</span>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium">
                <span>الزبون</span>
                <input
                  value={formState.customer}
                  onChange={(event) => setFormState({ ...formState, customer: event.target.value })}
                  placeholder="أدخل اسم الزبون"
                  className="h-14 rounded-[6px] border px-4 text-base outline-none transition focus:border-[#A30000] focus:ring-1 focus:ring-[#A30000]/20"
                  style={{ borderColor: currentTheme.border, backgroundColor: theme === "dark" ? "#0F141A" : "#FFFFFF", color: theme === "dark" ? "#F0F6FC" : "#0B0F12" }}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                <span>العملة</span>
                <select
                  value={formState.currency}
                  onChange={(event) => setFormState({ ...formState, currency: event.target.value })}
                  className="h-14 rounded-[6px] border px-4 text-base outline-none transition focus:border-[#A30000] focus:ring-1 focus:ring-[#A30000]/20"
                  style={{ borderColor: currentTheme.border, backgroundColor: theme === "dark" ? "#0F141A" : "#FFFFFF", color: theme === "dark" ? "#F0F6FC" : "#0B0F12" }}
                >
                  <option>USD</option>
                  <option>EUR</option>
                  <option>SAR</option>
                  <option>AED</option>
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                <span>التاريخ</span>
                <input
                  type="date"
                  value={formState.date}
                  onChange={(event) => setFormState({ ...formState, date: event.target.value })}
                  className="h-14 rounded-[6px] border px-4 text-base outline-none transition focus:border-[#A30000] focus:ring-1 focus:ring-[#A30000]/20"
                  style={{ borderColor: currentTheme.border, backgroundColor: theme === "dark" ? "#0F141A" : "#FFFFFF", color: theme === "dark" ? "#F0F6FC" : "#0B0F12" }}
                />
              </label>
              <label className="col-span-full flex flex-col gap-2 text-sm font-medium">
                <span>البيان</span>
                <textarea
                  value={formState.description}
                  onChange={(event) => setFormState({ ...formState, description: event.target.value })}
                  rows={3}
                  placeholder="تفاصيل القيد أو البيان العام"
                  className="min-h-[120px] rounded-[6px] border px-4 py-3 text-base outline-none transition focus:border-[#A30000] focus:ring-1 focus:ring-[#A30000]/20"
                  style={{ borderColor: currentTheme.border, backgroundColor: theme === "dark" ? "#0F141A" : "#FFFFFF", color: theme === "dark" ? "#F0F6FC" : "#0B0F12" }}
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="rounded-[16px] bg-[#131820] p-4 text-sm text-[#8B949E] shadow-sm" style={{ backgroundColor: theme === "dark" ? "#131820" : "#F3F4F6" }}>
                <p className="font-semibold text-[#F0F6FC]">نظرة سريعة</p>
                <div className="mt-3 grid gap-3 text-sm">
                  <p>حالة العميل محفوظة محلياً، وجاهزة للمراجعة.</p>
                  <p>يُحفَظ التاريخ والعملة والبيان بشكل مباشر.</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex h-14 items-center justify-center rounded-full bg-[#A30000] px-6 text-sm font-semibold text-white transition hover:bg-[#7a0000]"
                >
                  حفظ القيد
                </button>
                <div className="rounded-full border px-4 py-3 text-sm font-semibold"
                     style={{ borderColor: currentTheme.border, backgroundColor: theme === "dark" ? "#0F141A" : "#FFFFFF" }}>
                  <span className={statusSaved ? "text-[#00B67A]" : currentTheme.muted}>{statusMessage}</span>
                </div>
              </div>
            </div>
          </article>

          <aside className={`rounded-[20px] border p-6 ${currentTheme.card} ${currentTheme.surface}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black">المؤشرات التشغيلية</h2>
                <p className={`mt-2 text-sm ${currentTheme.muted}`}>
                  عرض سريع للقيود المفتوحة، التوازنات، وحالة المصادقة.
                </p>
              </div>
              <div className="rounded-full bg-[#2b2f35] px-3 py-2 text-[0.82rem] text-[#F0F6FC]">موثوقة</div>
            </div>

            <div className="mt-6 grid gap-4">
              {[
                { label: "إجمالي الإيرادات", value: "١٢٬٤٠٠", icon: TrendingUp },
                { label: "رصيد القبض", value: "٨٬٢٠٠", icon: Wallet },
                { label: "فواتير غير مدفوعة", value: "٤٢", icon: BarChart3 },
                { label: "أرصدة الأصول", value: "١٦٬٩٠٠", icon: Layers },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-[16px] border p-4" style={{ borderColor: currentTheme.border }}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="rounded-2xl bg-[#161B22] p-3 text-[#F0F6FC]" style={{ backgroundColor: theme === "dark" ? "#131820" : "#F1F5F9" }}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-xs uppercase tracking-[0.18em] text-[#8B949E]">{item.label}</span>
                    </div>
                    <p className="mt-4 text-2xl font-black" style={{ color: accentRed }}>{item.value}</p>
                  </div>
                );
              })}
            </div>
          </aside>
        </section>

        <section className={`rounded-[20px] border p-6 ${currentTheme.card} ${currentTheme.surface}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black">آخر القيود</h2>
              <p className={`mt-2 text-sm ${currentTheme.muted}`}>سجل فوري وحالة المصادقة لآخر حركات الدفتر.</p>
            </div>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full bg-[#A30000] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#7a0000]"
            >
              تحديث السجل
            </button>
          </div>

          <div className="mt-6 overflow-hidden rounded-[16px] border" style={{ borderColor: currentTheme.border }}>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left" style={{ direction: "rtl" }}>
                <thead className={`${theme === "dark" ? "bg-[#11161B]" : "bg-[#F8FAFB]"}`}>
                  <tr>
                    {['التاريخ', 'الزبون', 'البيان', 'المبلغ', 'الحالة'].map((heading) => (
                      <th key={heading} className="px-4 py-4 font-semibold uppercase tracking-[0.12em] text-[#8B949E]">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { date: '2026-05-16', customer: 'المجموعة الوطنية', note: 'فاتورة خدمات محاسبية', amount: '١٠٬٢٠٠ SAR', status: 'تم التحقق' },
                    { date: '2026-05-18', customer: 'شركة التميز', note: 'قيد احتساب الموردين', amount: '٤٬٨٠٠ USD', status: 'قيد الانتظار' },
                    { date: '2026-05-20', customer: 'مؤسسة الرؤية', note: 'قيد سند قبض', amount: '٧٬٣٥٠ AED', status: 'تم الحفظ' },
                  ].map((row) => (
                    <tr key={row.date + row.customer} className={theme === "dark" ? "border-t border-[#252A30]" : "border-t border-[#E6E9EE]"}>
                      <td className="px-4 py-4 font-medium">{row.date}</td>
                      <td className="px-4 py-4">{row.customer}</td>
                      <td className="px-4 py-4 text-[#8B949E]">{row.note}</td>
                      <td className="px-4 py-4 font-semibold">{row.amount}</td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${row.status === 'تم التحقق' || row.status === 'تم الحفظ' ? 'bg-[#00B67A]/15 text-[#00B67A]' : 'bg-[#A30000]/10 text-[#A30000]'}`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
