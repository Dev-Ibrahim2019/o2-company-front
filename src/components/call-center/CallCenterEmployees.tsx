import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  AlertTriangle, Bike, BriefcaseBusiness, CalendarDays, Car, CheckCircle2,
  ChevronLeft, CircleDollarSign, Clock3, Headphones, Loader2, MapPin,
  PackageCheck, Pencil, Phone, Plus, Save, Search, ShieldCheck, Trash2,
  User, Users, WalletCards, X,
} from "lucide-react";
import {
  employeeService,
  type EmployeeFromApi,
  type EmployeePayload,
  type EmployeePerformance,
  type OperationalRole,
  type VehicleType,
} from "../../services/employeeService";
import { jobTitleService, type JobTitle } from "../../services/jobTitleService";
import { getStatusColor, getStatusLabel } from "./utils";

const inputCls = "w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-red-500/60 focus:ring-2 focus:ring-red-500/10 placeholder:text-slate-600";
const labelCls = "mb-1.5 block text-[11px] font-black text-slate-400";
const unavailable = "غير متاح حالياً";

interface EmployeeFormData extends EmployeePayload {}
type Department = { id: number; name: string };
type Branch = { id: number; name: string };

const roleMeta: Record<OperationalRole, { label: string; accent: string; icon: typeof Headphones }> = {
  call_center_agent: { label: "موظف كول سنتر", accent: "cyan", icon: Headphones },
  assembler: { label: "مجهّز طلبات", accent: "amber", icon: PackageCheck },
  delivery_driver: { label: "سائق توصيل", accent: "violet", icon: Bike },
  manager: { label: "مدير عمليات", accent: "red", icon: ShieldCheck },
  cashier: { label: "كاشير", accent: "emerald", icon: WalletCards },
  other: { label: "دور آخر", accent: "slate", icon: User },
};

const vehicleLabels: Record<VehicleType, string> = {
  bicycle: "دراجة هوائية", electric_bike: "دراجة كهربائية", motorcycle: "دراجة نارية", external: "توصيل خارجي",
};

function parsePerformance(value: EmployeeFromApi["performance"]): EmployeePerformance {
  if (!value) return {};
  if (typeof value === "object") return !Array.isArray(value) ? value : {};
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? parsed as EmployeePerformance
      : {};
  } catch { return {}; }
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function formatMetric(value: unknown, suffix = ""): string {
  const number = numberValue(value);
  return number === undefined ? unavailable : `${number.toLocaleString("ar-EG")}${suffix}`;
}

function roleOf(employee: EmployeeFromApi): OperationalRole {
  const role = employee.operational_role;
  return role && Object.prototype.hasOwnProperty.call(roleMeta, role) ? role : "other";
}

function vehicleLabel(value: EmployeeFromApi["vehicle_type"]): string | undefined {
  return value && Object.prototype.hasOwnProperty.call(vehicleLabels, value)
    ? vehicleLabels[value as VehicleType]
    : undefined;
}

function isActive(employee: EmployeeFromApi): boolean {
  return employee.status?.toUpperCase() === "ACTIVE";
}

function deliveryDelay(performance: EmployeePerformance): number | undefined {
  const direct = numberValue(performance.delivery_delay_minutes);
  if (direct !== undefined) return direct;
  const status = typeof performance.status === "string" ? performance.status.toLowerCase() : "";
  const completedStatuses = ["completed", "delivered", "cancelled", "canceled", "closed"];
  const hasActiveAssignment = Boolean(performance.active_trip_number || performance.active_order_number);
  if (!hasActiveAssignment || completedStatuses.includes(status)) return undefined;
  if (!performance.expected_delivery_at) return undefined;
  const expected = new Date(performance.expected_delivery_at).getTime();
  return Number.isNaN(expected) ? undefined : Math.max(0, Math.floor((Date.now() - expected) / 60000));
}

export const CallCenterEmployees: React.FC = () => {
  const [employees, setEmployees] = useState<EmployeeFromApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<OperationalRole | "all">("all");
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<EmployeeFromApi | null>(null);
  const [selected, setSelected] = useState<EmployeeFromApi | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      employeeService.getAll().then(setEmployees),
      jobTitleService.getAll().then(setJobTitles),
    ]).catch(() => setError("فشل تحميل بيانات فريق العمليات")).finally(() => setLoading(false));
  }, []);

  const fetchOptions = useCallback(async () => {
    try {
      const [branchData, departmentData] = await Promise.all([
        import("../../services/branchService").then((module) => module.branchService.getAll()),
        import("../../services/departmentService").then((module) => module.departmentService.getAll()),
      ]);
      setBranches(branchData);
      setDepartments(departmentData);
    } catch { /* Form options are non-blocking. */ }
  }, []);

  useEffect(() => { fetchOptions(); }, [fetchOptions]);

  const handleSave = async (form: EmployeeFormData) => {
    setSaving(true);
    setError("");
    try {
      const saved = editTarget
        ? await employeeService.update(editTarget.id, form)
        : await employeeService.create(form);
      setEmployees((current) => editTarget
        ? current.map((employee) => employee.id === saved.id ? saved : employee)
        : [saved, ...current]);
      setShowModal(false);
      setEditTarget(null);
    } catch { setError("فشل حفظ بيانات الموظف"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا الموظف؟")) return;
    try {
      await employeeService.delete(id);
      setEmployees((current) => current.filter((employee) => employee.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch { setError("فشل حذف الموظف"); }
  };

  const filtered = useMemo(() => employees.filter((employee) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || employee.name.toLowerCase().includes(query)
      || employee.phone.includes(query) || employee.employeeId?.toLowerCase().includes(query);
    return matchesSearch && (roleFilter === "all" || roleOf(employee) === roleFilter);
  }), [employees, roleFilter, search]);

  const lanes = (["call_center_agent", "assembler", "delivery_driver"] as OperationalRole[]).map((role) => {
    const members = employees.filter((employee) => roleOf(employee) === role);
    const active = members.filter(isActive).length;
    const delayed = role === "delivery_driver"
      ? members.filter((employee) => (deliveryDelay(parsePerformance(employee.performance)) ?? 0) > 15).length
      : 0;
    const values = members.map((employee) => parsePerformance(employee.performance));
    const aggregate = role === "call_center_agent"
      ? (() => {
        const calls = values.map((value) => numberValue(value.answered_calls ?? value.calls_today)).filter((value): value is number => value !== undefined);
        return calls.length ? calls.reduce((sum, value) => sum + value, 0) : undefined;
      })()
      : role === "assembler"
        ? (() => {
          const orders = values.map((value) => numberValue(value.completed_orders ?? value.orders_today)).filter((value): value is number => value !== undefined);
          return orders.length ? orders.reduce((sum, value) => sum + value, 0) : undefined;
        })()
        : (() => {
          const rates = values.map((value) => numberValue(value.on_time_percentage)).filter((value): value is number => value !== undefined);
          return rates.length ? Math.round(rates.reduce((sum, value) => sum + value, 0) / rates.length) : undefined;
        })();
    return { role, active, total: members.length, delayed, aggregate };
  });

  return (
    <main dir="rtl" className="h-full overflow-y-auto bg-slate-950 p-3 text-right sm:p-5 lg:p-6">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-red-400">
              <span className="h-px w-8 bg-red-500" /> مركز قيادة العمليات
            </div>
            <h1 className="text-2xl font-black text-white sm:text-3xl">فريق الكول سنتر والتشغيل</h1>
            <p className="mt-1 text-xs font-bold text-slate-500">ظ…طھط§ط¨ط¹ط© ط§ظ„ط¬ط§ظ‡ط²ظٹط©طŒ ط§ظ„ط£ط¯ط§ط، ط§ظ„ظ…ظٹط¯ط§ظ†ظٹ ظˆالتنبيهات ظ…ظ† ط´ط§ط´ط© ظˆط§ط­ط¯ط©</p>
          </div>
          <button onClick={() => { setEditTarget(null); setShowModal(true); }} className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-xs font-black text-white shadow-lg shadow-red-950/30 transition hover:bg-red-500 focus:ring-2 focus:ring-red-400">
            <Plus size={16} /> إضافة موظف
          </button>
        </header>

        <section aria-label="شريط قيادة العمليات" className="grid overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/20 md:grid-cols-3">
          {lanes.map(({ role, active, total, delayed, aggregate }, index) => {
            const meta = roleMeta[role];
            const Icon = meta.icon;
            const colors = role === "call_center_agent" ? "text-cyan-300 bg-cyan-500/10 border-cyan-400/20" : role === "assembler" ? "text-amber-300 bg-amber-500/10 border-amber-400/20" : "text-violet-300 bg-violet-500/10 border-violet-400/20";
            return (
              <button key={role} onClick={() => setRoleFilter(roleFilter === role ? "all" : role)} className={`group flex min-h-28 items-center gap-4 p-5 text-right transition hover:bg-white/[0.03] ${index ? "border-t border-white/10 md:border-r md:border-t-0" : ""}`}>
                <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl border ${colors}`}><Icon size={22} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-black text-slate-500">{meta.label}</span>
                  <span className="mt-1 flex items-end gap-2"><b className="text-3xl font-black tabular-nums text-white">{active}</b><span className="mb-1 text-[10px] font-bold text-slate-500">نشط من {total}</span></span>
                  <span className={`mt-2 block text-[10px] font-black ${delayed ? "text-red-400" : "text-slate-600"}`}>{role === "delivery_driver" ? (delayed ? `${delayed} توصيل متأخر` : aggregate === undefined ? unavailable : `${aggregate}ظھ متوسط الالتزام`) : aggregate !== undefined ? `${aggregate.toLocaleString("ar-EG")} ${role === "call_center_agent" ? "مكالمة مجابة" : "طلب مجهّز"}` : unavailable}</span>
                </span>
                <ChevronLeft size={16} className="text-slate-700 transition group-hover:-translate-x-1 group-hover:text-white" />
              </button>
            );
          })}
        </section>

        {error && <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-300"><AlertTriangle size={16} />{error}</div>}

        <section className="rounded-2xl border border-white/5 bg-slate-900/60">
          <div className="flex flex-col gap-3 border-b border-white/5 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-black text-white">لوحة الموظفين التشغيلية</h2>
              <p className="mt-1 text-[10px] font-bold text-slate-500">انقر على الموظف لعرض التفاصيل الحية المتاحة</p>
            </div>
            <div className="relative w-full lg:max-w-sm">
              <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} className={`${inputCls} pr-9`} placeholder="ط¨ط­ط« ط¨ط§ظ„ط§ط³ظ…طŒ الهاتف ط£ظˆ ط§ظ„ط±ظ‚ظ… ط§ظ„ظˆط¸ظٹظپظٹ" />
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-72 flex-col items-center justify-center gap-3 text-slate-500"><Loader2 className="animate-spin" size={28} /><span className="text-xs font-bold">جاري تحميل فريق العمليات...</span></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[940px] text-right">
                <thead className="bg-slate-950/50 text-[10px] font-black text-slate-500"><tr><th className="px-4 py-3">الموظف</th><th className="px-4 py-3">المهمة التشغيلية</th><th className="px-4 py-3">مؤشر الأداء</th><th className="px-4 py-3">المهمة الحالية</th><th className="px-4 py-3">التوقيت</th><th className="px-4 py-3">التنبيهات</th><th className="px-4 py-3">إجراءات</th></tr></thead>
                <tbody className="divide-y divide-white/5">
                  {!filtered.length ? <tr><td colSpan={7} className="py-16 text-center text-xs font-bold text-slate-600">لا توجد نتائج مطابقة</td></tr> : filtered.map((employee) => <EmployeeRow key={employee.id} employee={employee} onSelect={() => setSelected(employee)} onEdit={() => { setEditTarget(employee); setShowModal(true); }} onDelete={() => handleDelete(employee.id)} />)}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {selected && <EmployeeDrawer employee={selected} onClose={() => setSelected(null)} />}
      {showModal && <EmployeeFormModal employee={editTarget} branches={branches} departments={departments} jobTitles={jobTitles} saving={saving} onSave={handleSave} onClose={() => { setShowModal(false); setEditTarget(null); }} />}
    </main>
  );
};

function EmployeeRow({ employee, onSelect, onEdit, onDelete }: { employee: EmployeeFromApi; onSelect: () => void; onEdit: () => void; onDelete: () => void }) {
  const role = roleOf(employee);
  const meta = roleMeta[role];
  const performance = parsePerformance(employee.performance);
  const delay = role === "delivery_driver" ? deliveryDelay(performance) : undefined;
  const isLate = delay !== undefined && delay > 15;
  const performanceText = role === "call_center_agent" ? formatMetric(performance.answered_calls ?? performance.calls_today, " مكالمة") : role === "assembler" ? formatMetric(performance.completed_orders ?? performance.orders_today, " طلب") : role === "delivery_driver" ? formatMetric(performance.on_time_percentage, "ظھ في الموعد") : unavailable;
  const currentTask = performance.active_trip_number ? `رحلة #${performance.active_trip_number}` : performance.active_order_number ? `طلب #${performance.active_order_number}` : unavailable;
  const timing = role === "call_center_agent" ? formatMetric(performance.average_handle_time_minutes, " ط¯/مكالمة") : role === "assembler" ? formatMetric(performance.average_assembly_minutes, " ط¯/طلب") : delay === undefined ? unavailable : `${delay} دقيقة`;
  const handleKeyDown = (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect();
    }
  };

  return (
    <tr onClick={onSelect} onKeyDown={handleKeyDown} tabIndex={0} role="button" aria-label={`ط¹ط±ط¶ طھظپط§طµظٹظ„ الموظف ${employee.name}`} className="cursor-pointer transition hover:bg-white/[0.035] focus:bg-white/[0.05] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-500/70">
      <td className="px-4 py-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl border border-white/5 bg-slate-800 text-slate-400"><User size={15} /></span><div><p className="text-xs font-black text-white">{employee.name}</p><p className="mt-1 text-[10px] text-slate-500" dir="ltr">{employee.phone}</p></div></div></td>
      <td className="px-4 py-4"><p className="text-xs font-bold text-slate-300">{meta.label}</p><p className="mt-1 text-[10px] text-slate-600">{vehicleLabel(employee.vehicle_type) ?? employee.branch?.name ?? unavailable}</p></td>
      <td className="px-4 py-4 text-xs font-black text-slate-300">{performanceText}</td>
      <td className="px-4 py-4 text-xs font-bold text-slate-400">{currentTask}</td>
      <td className={`px-4 py-4 text-xs font-black ${isLate ? "text-red-400" : "text-slate-400"}`}>{timing}</td>
      <td className="px-4 py-4">{isLate ? <span className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] font-black text-red-300"><AlertTriangle size={12} />طھط£ط®ظٹط± ظٹطھط¬ط§ظˆط² 15 دقيقة</span> : performance.alert ? <span className="text-[10px] font-bold text-amber-300">{String(performance.alert)}</span> : <span className="text-[10px] font-bold text-slate-600">لا تنبيهات</span>}</td>
      <td className="px-4 py-4"><div className="flex gap-1" onClick={(event) => event.stopPropagation()}><button onClick={onEdit} aria-label="تعديل" className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-white"><Pencil size={14} /></button><button onClick={onDelete} aria-label="حذف" className="rounded-lg p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-400"><Trash2 size={14} /></button></div></td>
    </tr>
  );
}

function EmployeeDrawer({ employee, onClose }: { employee: EmployeeFromApi; onClose: () => void }) {
  const drawerRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const performance = parsePerformance(employee.performance);
  const role = roleOf(employee);
  const meta = roleMeta[role];
  const delay = role === "delivery_driver" ? deliveryDelay(performance) : undefined;
  const isLate = delay !== undefined && delay > 15;
  const operationalMetrics = role === "call_center_agent"
    ? [["مكالمات مجابة", formatMetric(performance.answered_calls)], ["مكالمات فائتة", formatMetric(performance.missed_calls)], ["متوسط المعالجة", formatMetric(performance.average_handle_time_minutes, " دقيقة")]]
    : role === "assembler"
      ? [["طلبط§طھ ظ…ظƒطھظ…ظ„ط©", formatMetric(performance.completed_orders)], ["متوسط التجهيز", formatMetric(performance.average_assembly_minutes, " دقيقة")], ["ط§ظ„طلب ط§ظ„ط­ط§ظ„ظٹ", performance.active_order_number ? `#${performance.active_order_number}` : unavailable]]
      : role === "delivery_driver"
        ? [["نسبة الالتزام", formatMetric(performance.on_time_percentage, "ظھ")], ["ط§ظ„رحلة ط§ظ„ط­ط§ظ„ظٹط©", performance.active_trip_number ? `#${performance.active_trip_number}` : unavailable], ["التأخير", delay === undefined ? unavailable : `${delay} دقيقة`]]
      : [["حالة التشغيل", performance.status ? String(performance.status) : unavailable]];

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
      previouslyFocusedRef.current?.focus();
    };
  }, [onClose]);

  const trapFocus = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Tab" || !drawerRef.current) return;
    const focusable = Array.from(drawerRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return <div className="fixed inset-0 z-[120] bg-slate-950/75 backdrop-blur-sm" onMouseDown={onClose}>
    <aside ref={drawerRef} role="dialog" aria-modal="true" aria-labelledby="employee-drawer-title" onKeyDown={trapFocus} onMouseDown={(event) => event.stopPropagation()} className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-white/10 bg-slate-950 shadow-2xl" dir="rtl">
      <div className="flex items-start justify-between border-b border-white/10 bg-slate-900/70 p-5"><div><span className="text-[10px] font-black text-red-400">ملف تشغيلي مباشر</span><h2 id="employee-drawer-title" className="mt-1 text-xl font-black text-white">{employee.name}</h2><p className="mt-1 text-xs font-bold text-slate-500">{meta.label} آ· {employee.employeeId ?? "بدون رقم وظيفي"}</p></div><button ref={closeButtonRef} onClick={onClose} aria-label="ط¥ط؛ظ„ط§ظ‚ طھظپط§طµظٹظ„ الموظف" className="rounded-xl border border-white/10 bg-slate-900 p-2 text-slate-400 hover:text-white focus:ring-2 focus:ring-red-500"><X size={18} /></button></div>
      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        {isLate && <div className="flex gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200"><AlertTriangle className="shrink-0" size={20} /><div><p className="text-xs font-black">تنبيه تأخير توصيل</p><p className="mt-1 text-[11px] font-bold text-red-300/80">طھط¬ط§ظˆط²طھ ط§ظ„رحلة ط§ظ„ظ…ظˆط¹ط¯ المتوقع ط¨ط£ظƒط«ط± ظ…ظ† 15 دقيقة.</p></div></div>}
        <DrawerSection title="النبض التشغيلي" icon={<BriefcaseBusiness size={15} />}><div className="grid grid-cols-2 gap-2">{operationalMetrics.map(([label, value]) => <Metric key={label} label={label} value={value} />)}</div></DrawerSection>
        <DrawerSection title="ط§ظ„ظ…ظ‡ظ…ط© ظˆط§ظ„ظ…ظˆظ‚ط¹" icon={<MapPin size={15} />}><InfoLine label="ط§ظ„طلب ط§ظ„ط­ط§ظ„ظٹ" value={performance.active_order_number ? `#${performance.active_order_number}` : unavailable} /><InfoLine label="ط§ظ„رحلة ط§ظ„ط­ط§ظ„ظٹط©" value={performance.active_trip_number ? `#${performance.active_trip_number}` : unavailable} /><InfoLine label="ط§ظ„ظ…ظˆظ‚ط¹ ط§ظ„ط­ط§ظ„ظٹ" value={performance.current_location ? String(performance.current_location) : unavailable} /></DrawerSection>
        <DrawerSection title="ط§ظ„ط¹ظ‡ط¯ط© ط§ظ„ظ†ظ‚ط¯ظٹط© â€” ط¹ط±ط¶ ظپظ‚ط·" icon={<CircleDollarSign size={15} />}><div className="grid grid-cols-2 gap-2"><Metric label="المحصّل" value={formatMetric(performance.cash_collected, " â‚ھ")} /><Metric label="المتوقع" value={formatMetric(performance.cash_expected, " â‚ھ")} /><Metric label="الفرق" value={formatMetric(performance.cash_variance, " â‚ھ")} /><Metric label="صافي مستحق" value={formatMetric(employee.net_payable, " â‚ھ")} /></div><p className="mt-3 text-[10px] font-bold text-slate-600">ظ‡ط°ظ‡ ط§ظ„ط¨ظٹط§ظ†ط§طھ ظ„ظ„ظ…طھط§ط¨ط¹ط© ظپظ‚ط· ظˆظ„ط§ طھظ†ط´ط¦ ط£ظٹ ظ‚ظٹط¯ محاسبظٹ.</p></DrawerSection>
        <DrawerSection title="ط¨ظٹط§ظ†ط§طھ الموظف" icon={<User size={15} />}><InfoLine label="الهاتف" value={employee.phone} /><InfoLine label="الفرع" value={employee.branch?.name ?? unavailable} /><InfoLine label="القسم" value={employee.department?.name ?? unavailable} /><InfoLine label="المركبة" value={vehicleLabel(employee.vehicle_type) ?? unavailable} /></DrawerSection>
      </div>
    </aside>
  </div>;
}

function DrawerSection({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) { return <section className="rounded-2xl border border-white/5 bg-slate-900/60 p-4"><h3 className="mb-3 flex items-center gap-2 text-xs font-black text-white">{icon}{title}</h3>{children}</section>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-slate-950/70 p-3"><p className="text-[9px] font-black text-slate-600">{label}</p><p className="mt-1 text-xs font-black text-slate-200">{value}</p></div>; }
function InfoLine({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-4 border-b border-white/5 py-2.5 last:border-0"><span className="text-[10px] font-bold text-slate-500">{label}</span><span className="text-[11px] font-black text-slate-300">{value}</span></div>; }

function EmployeeFormModal({ employee, branches, departments, jobTitles, saving, onSave, onClose }: { employee: EmployeeFromApi | null; branches: Branch[]; departments: Department[]; jobTitles: JobTitle[]; saving: boolean; onSave: (data: EmployeeFormData) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState<EmployeeFormData>({ name: employee?.name ?? "", phone: employee?.phone ?? "", email: employee?.email ?? "", address: employee?.address ?? "", branch_id: employee?.branch_id ?? branches[0]?.id ?? 0, department_id: employee?.department_id ?? departments[0]?.id ?? 0, jobTitleId: employee?.jobTitleId ?? "", hireDate: employee?.hireDate ?? new Date().toISOString().split("T")[0], salary: employee?.salary, role: employee?.role ?? "EMPLOYEE", status: employee?.status ?? "ACTIVE", employeeId: employee?.employeeId ?? "", username: employee?.username ?? "", notes: employee?.notes ?? "", operational_role: employee?.operational_role ?? "other", vehicle_type: employee?.vehicle_type });
  const set = <K extends keyof EmployeeFormData>(key: K, value: EmployeeFormData[K]) => setForm((current) => ({ ...current, [key]: value }));
  const valid = form.name.trim() && form.phone.trim() && form.branch_id && form.department_id && form.hireDate;

  return <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm" dir="rtl" onMouseDown={onClose}><div onMouseDown={(event) => event.stopPropagation()} className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl">
    <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/70 p-5"><div><h2 className="text-lg font-black text-white">{employee ? "تعديل ظ…ظ„ظپ الموظف" : "إضافة موظف ط¹ظ…ظ„ظٹط§طھ"}</h2><p className="mt-1 text-[10px] font-bold text-slate-500">ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ظˆط§ط±ط¯ ط§ظ„ط¨ط´ط±ظٹط© ظˆالدور التشغيلي</p></div><button onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-white/5 hover:text-white"><X size={18} /></button></div>
    <div className="grid gap-4 overflow-y-auto p-5 sm:grid-cols-2">
      <Field label="ط§ط³ظ… الموظف *"><input value={form.name} onChange={(event) => set("name", event.target.value)} className={inputCls} /></Field>
      <Field label="ط±ظ‚ظ… الهاتف *"><input value={form.phone} onChange={(event) => set("phone", event.target.value)} className={inputCls} dir="ltr" /></Field>
      <Field label="ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ"><input type="email" value={form.email ?? ""} onChange={(event) => set("email", event.target.value)} className={inputCls} dir="ltr" /></Field>
      <Field label="ط§ظ„ط±ظ‚ظ… ط§ظ„ظˆط¸ظٹظپظٹ"><input value={form.employeeId ?? ""} onChange={(event) => set("employeeId", event.target.value)} className={inputCls} /></Field>
      <Field label="الفرع *"><select value={form.branch_id} onChange={(event) => set("branch_id", Number(event.target.value))} className={inputCls}><option value={0}>ط§ط®طھط± الفرع</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></Field>
      <Field label="القسم *"><select value={form.department_id} onChange={(event) => set("department_id", Number(event.target.value))} className={inputCls}><option value={0}>ط§ط®طھط± القسم</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></Field>
      <Field label="الدور التشغيلي"><select value={form.operational_role} onChange={(event) => set("operational_role", event.target.value as OperationalRole)} className={inputCls}>{Object.entries(roleMeta).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}</select></Field>
      <Field label="ظ†ظˆط¹ المركبة"><select value={form.vehicle_type ?? ""} disabled={form.operational_role !== "delivery_driver"} onChange={(event) => set("vehicle_type", event.target.value ? event.target.value as VehicleType : undefined)} className={`${inputCls} disabled:opacity-40`}><option value="">بدون مركبة</option>{Object.entries(vehicleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
      <Field label="ط§ظ„ظ…ط³ظ…ظ‰ ط§ظ„ظˆط¸ظٹظپظٹ"><select value={form.jobTitleId ?? ""} onChange={(event) => set("jobTitleId", event.target.value)} className={inputCls}><option value="">بدون</option>{jobTitles.map((title) => <option key={title.id} value={String(title.id)}>{title.name}</option>)}</select></Field>
      <Field label="دور النظام *"><select value={form.role} onChange={(event) => set("role", event.target.value)} className={inputCls}><option value="ADMIN">مدير نظام</option><option value="BRANCH_MANAGER">مدير فرع</option><option value="CASHIER">كاشير</option><option value="WAITER">ويتر</option><option value="COOK">طباخ</option><option value="FINANCE">محاسب</option><option value="EMPLOYEE">موظف</option></select></Field>
      <Field label="الحالة *"><select value={form.status} onChange={(event) => set("status", event.target.value)} className={inputCls}><option value="ACTIVE">نشط</option><option value="ON_LEAVE">في إجازة</option><option value="SUSPENDED">موقوف</option><option value="TERMINATED">مفصول</option><option value="RESIGNED">مستقيل</option></select></Field>
      <Field label="طھط§ط±ظٹط® ط§ظ„طھظˆط¸ظٹظپ *"><input type="date" value={form.hireDate} onChange={(event) => set("hireDate", event.target.value)} className={inputCls} /></Field>
      <Field label="الراتب"><input type="number" min={0} value={form.salary ?? ""} onChange={(event) => set("salary", event.target.value ? Number(event.target.value) : undefined)} className={inputCls} /></Field>
      <Field label="اسم المستخدم"><input value={form.username ?? ""} onChange={(event) => set("username", event.target.value)} className={inputCls} dir="ltr" /></Field>
      <div className="sm:col-span-2"><Field label="العنوان"><input value={form.address ?? ""} onChange={(event) => set("address", event.target.value)} className={inputCls} /></Field></div>
      <div className="sm:col-span-2"><Field label="ملاحظات"><textarea value={form.notes ?? ""} onChange={(event) => set("notes", event.target.value)} className={`${inputCls} h-20 resize-none`} /></Field></div>
    </div>
    <div className="flex justify-end gap-2 border-t border-white/10 bg-slate-900/60 p-4"><button onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs font-black text-slate-400 hover:bg-white/5 hover:text-white">إلغاء</button><button disabled={!valid || saving} onClick={() => onSave(form)} className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-black text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40">{saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}{saving ? "جاري الحفظ" : "ط­ظپط¸ الموظف"}</button></div>
  </div></div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <label><span className={labelCls}>{label}</span>{children}</label>; }

