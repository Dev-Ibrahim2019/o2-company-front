import { AlertTriangle, Check, ChevronLeft, ChevronRight, Loader2, Plus, RotateCw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../auth";
import { CRM_PERMISSIONS } from "../../auth/permissions";
import { toast } from "../../components/shared/Toast";
import { branchService, type Branch } from "../../services/branchService";
import { employeeService, type EmployeeFromApi } from "../../services/employeeService";
import { crmApi } from "./api";
import { getCrmError } from "./components";
import { CrmAvatar } from "./customers-ui/CrmAvatar";
import { CRM_CREATE_STATUS_OPTIONS } from "./customers-ui/customerCreateFields";
import { CRM_ENGAGEMENT_OPTIONS, CRM_GROUP_TYPE_LABELS } from "./customers-ui/engagementOptions";
import { CRM_CUSTOMER_SOURCE_LABELS } from "./customers-ui/sourceOptions";
import "./customers-ui/crmx.css";
import { OCCASION_TYPE_LABELS } from "./occasionLabels";
import type { CrmCustomerGroup, CrmCustomerProfile, CrmOccasionType } from "./types";

// Full-page form — matches the approved reference exactly (a page navigated
// to, not a drawer/side panel). Used for both create (/admin/crm/customers/new)
// and edit (/admin/crm/customers/:customerId/edit). Both submit through
// CRM's own endpoints (CrmController@store / @update), not the Financial
// controller — title/gender/birth_date/work_address are CRM-only concepts.
//
// Redesigned as a 3-step wizard per the approved plan. Every field below is
// still exactly the field CrmController@store validates (see that method) —
// the wizard changes information architecture, not the data contract. Two
// deliberate departures from the plan as given, both because the backend
// genuinely has nothing behind them:
//   - "الاسم الأول / اسم العائلة" as separate 3-column inputs: the schema has
//     one `name` column, not first/last — splitting the input without a
//     matching field would either silently concatenate on save (surprising)
//     or need a new backend column (out of scope here). Full name + kunya +
//     gender fill that row instead, same 3-column layout, real fields.
//   - "زر تبديل العنوان الافتراضي": no such boolean exists on customers or
//     work_address — home and work address are just two independent,
//     simultaneously-fillable field sets today, so both stay visible rather
//     than gated behind a switch that would imply picking one hides the
//     other.
// "معلومات عائلية / لديه أبناء؟" stays disabled+"قريبًا": no children table,
// no such column anywhere — inventing the input would silently discard
// whatever the user types on save. "مناسبات أخرى" DID gain real backend
// support since that pending-section comment was written (the Occasions
// module: POST /crm/customers/{id}/occasions, CrmController@createOccasion,
// enum in database/migrations/2027_01_18_000001) — enabled for real below.

const emptyForm = {
  name: "", name_en: "", title: "", gender: "", phone: "", mobile: "", email: "",
  address: "", city: "", country: "", engagement_status: "", group_id: "", status: "active",
  branch_id: "", salesperson_id: "", notes: "",
  birth_date: "",
  work_city: "", work_street: "", work_area: "", work_building_no: "", work_phone: "",
};

type FormState = typeof emptyForm;

type OccasionDraft = { key: string; occasion_type: CrmOccasionType; title: string; date: string };

const STEPS = [
  { id: 1, title: "البيانات الأساسية", hint: "الاسم وبيانات التواصل الرئيسية" },
  { id: 2, title: "الاتصال والعناوين", hint: "جوال إضافي، عنوان المنزل والعمل" },
  { id: 3, title: "التفضيلات والمناسبات", hint: "تصنيف العميل ومناسباته الخاصة" },
] as const;

const pendingLabelCls = "mb-1.5 block text-[13px] font-semibold text-[var(--crmx-text-secondary)]";
const pendingInputCls = "h-11 w-full cursor-not-allowed rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-neutral-soft)] px-3 text-[14px] text-[var(--crmx-text-muted)] outline-none";
const pendingBadge = (
  <span className="rounded-full bg-[var(--crmx-warning-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--crmx-warning-text)]">قريبًا</span>
);

/** Still genuinely pending — no children table, no column, anywhere in the schema. */
function FamilyInfoPending() {
  return (
    <FormSection title="معلومات عائلية" badge={pendingBadge}>
      <label className={pendingLabelCls}>لديه أبناء؟</label>
      <input disabled className={pendingInputCls} placeholder="أسماء الأبناء وتواريخ الميلاد" />
    </FormSection>
  );
}

function FormSection({ title, badge, children }: { title: string; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-5 sm:p-6">
      <h3 className="mb-4 flex items-center gap-2 text-[16px] font-bold text-[var(--crmx-text)]">{title} {badge}</h3>
      {children}
    </section>
  );
}

function readApiErrors(error: unknown): { message: string; fields: Record<string, string> } {
  const response = (error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response;
  const fields: Record<string, string> = {};
  if (response?.data?.errors) {
    for (const [key, messages] of Object.entries(response.data.errors)) fields[key] = messages[0];
  }
  return { message: response?.data?.message || "تعذر حفظ العميل. تحقق من البيانات وحاول مجددًا.", fields };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Loose on purpose: this is inline "looks plausible" feedback while typing,
// not the real validator — the backend's own phone rule is just
// nullable|string|max:30, so anything stricter here would reject values the
// server would happily accept.
const PHONE_RE = /^[\d+][\d\s-]{6,}$/;

/** A small green check that fades in once a field looks valid — inline
 * validation feedback, not a gate; the backend's own rule is the real one. */
function InlineValidIcon({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[var(--crmx-success)]">
      <Check className="h-4 w-4" />
    </span>
  );
}

/**
 * Completion ring — a frontend-only heuristic over a fixed set of fields
 * that make a customer's profile genuinely useful (not a backend concept,
 * nothing is sent or stored). Modern circular progress, --crmx-primary
 * stroke, percentage centred.
 */
const COMPLETION_FIELDS: Array<keyof FormState> = [
  "name", "phone", "email", "title", "gender", "engagement_status",
  "group_id", "birth_date", "address", "notes",
];
function completionPercent(form: FormState): number {
  const filled = COMPLETION_FIELDS.filter((k) => form[k].trim() !== "").length;
  return Math.round((filled / COMPLETION_FIELDS.length) * 100);
}

function CompletionRing({ percent }: { percent: number }) {
  const size = 56;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - percent / 100);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--crmx-border)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--crmx-primary)" strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 300ms ease" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[12px] font-bold text-[var(--crmx-text)]">{percent}٪</span>
    </div>
  );
}

/** Sidebar card that mirrors the form live — no fetch, just a read of the same `form` state the fields write to. */
function LivePreviewCard({ form, groupLabel, percent }: { form: FormState; groupLabel: string | null; percent: number }) {
  return (
    <aside className="hidden w-72 shrink-0 lg:block">
      <div className="sticky top-6 space-y-4">
        <div className="rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-[13px] font-bold uppercase tracking-wide text-[var(--crmx-text-muted)]">معاينة الملف</h4>
            <CompletionRing percent={percent} />
          </div>
          <div className="flex items-center gap-3">
            <CrmAvatar name={form.name || "عميل جديد"} size={48} />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold text-[var(--crmx-text)]">
                {form.title ? `${form.title} ` : ""}{form.name || "بلا اسم بعد"}
              </p>
              <p className="truncate text-[12.5px] text-[var(--crmx-text-muted)]" dir="ltr">
                {form.phone || form.mobile || "بلا رقم هاتف بعد"}
              </p>
            </div>
          </div>
          {groupLabel && (
            <span className="mt-3 inline-flex items-center rounded-full bg-[var(--crmx-neutral-soft)] px-2.5 py-1 text-[12px] font-bold text-[var(--crmx-text-secondary)]">
              {groupLabel}
            </span>
          )}
        </div>
        <p className="px-1 text-[12px] leading-relaxed text-[var(--crmx-text-muted)]">
          يتحدث هذا الملخص فورًا أثناء تعبئة البيانات — لا يُحفظ شيء قبل الضغط على "حفظ العميل".
        </p>
      </div>
    </aside>
  );
}

function occasionKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Staged, not persisted per-row — every draft occasion here is written for
 * real via crmApi.createOccasion only when the whole form is submitted (see
 * handleSubmit), the same "nothing lost, nothing partial" guarantee the rest
 * of the wizard already gives by keeping everything in one piece of state
 * until the final save.
 */
function OccasionsRepeater({ drafts, onChange }: { drafts: OccasionDraft[]; onChange: (next: OccasionDraft[]) => void }) {
  const addRow = () => onChange([...drafts, { key: occasionKey(), occasion_type: "other", title: "", date: "" }]);
  const removeRow = (key: string) => onChange(drafts.filter((d) => d.key !== key));
  const updateRow = (key: string, patch: Partial<OccasionDraft>) =>
    onChange(drafts.map((d) => (d.key === key ? { ...d, ...patch } : d)));

  return (
    <FormSection title="مناسبات أخرى">
      <div className="space-y-3">
        {drafts.map((d) => (
          <div key={d.key} className="grid grid-cols-1 gap-3 rounded-xl border border-[var(--crmx-border)] p-3 sm:grid-cols-[1fr_1fr_auto_auto]">
            <div>
              <label className={labelClsStatic}>نوع المناسبة</label>
              <select
                className={inputClsStatic}
                value={d.occasion_type}
                onChange={(e) => updateRow(d.key, { occasion_type: e.target.value as CrmOccasionType })}
              >
                {Object.entries(OCCASION_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClsStatic}>العنوان</label>
              <input
                className={inputClsStatic}
                value={d.title}
                onChange={(e) => updateRow(d.key, { title: e.target.value })}
                placeholder="مثال: ذكرى الزواج"
              />
            </div>
            <div>
              <label className={labelClsStatic}>التاريخ</label>
              <input type="date" className={inputClsStatic} value={d.date} onChange={(e) => updateRow(d.key, { date: e.target.value })} />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => removeRow(d.key)}
                aria-label="حذف المناسبة"
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--crmx-border)] text-[var(--crmx-text-muted)] transition hover:border-[var(--crmx-danger)] hover:bg-[var(--crmx-danger-soft)] hover:text-[var(--crmx-danger-text)]"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addRow}
        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--crmx-border)] text-[14px] font-semibold text-[var(--crmx-text-secondary)] transition hover:border-[var(--crmx-primary)] hover:text-[var(--crmx-primary-text)]"
      >
        <Plus className="h-4 w-4" /> إضافة مناسبة
      </button>
      <p className="mt-2 text-[11.5px] text-[var(--crmx-text-muted)]">تُحفظ هذه المناسبات مع العميل عند الضغط على "حفظ العميل".</p>
    </FormSection>
  );
}

// Static class strings the repeater above needs before the component that
// defines the themed versions (with error state) exists — deliberately the
// same visual language, just without per-field error wiring since draft
// occasion rows validate as a whole at submit time, not per keystroke.
const labelClsStatic = "mb-1.5 block text-[13px] font-semibold text-[var(--crmx-text-secondary)]";
const inputClsStatic = "h-11 w-full rounded-xl border border-[var(--crmx-border)] bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none transition focus:border-[var(--crmx-primary)] focus:ring-2 focus:ring-[var(--crmx-primary)]/10";

function Stepper({ current, furthestValid, onJump }: { current: number; furthestValid: number; onJump: (step: number) => void }) {
  return (
    <ol className="mb-6 flex items-center gap-2 sm:gap-3" aria-label="خطوات إضافة العميل">
      {STEPS.map((s, i) => {
        const done = s.id < current || (s.id <= furthestValid && s.id !== current);
        const active = s.id === current;
        const reachable = s.id <= furthestValid || s.id === current;
        return (
          <li key={s.id} className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <button
              type="button"
              disabled={!reachable}
              onClick={() => reachable && onJump(s.id)}
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2 py-1.5 text-right transition disabled:cursor-not-allowed"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[14px] font-bold transition ${
                  active
                    ? "bg-[var(--crmx-primary)] text-white"
                    : done
                    ? "bg-[var(--crmx-success)] text-white"
                    : "bg-[var(--crmx-neutral-soft)] text-[var(--crmx-text-muted)]"
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : s.id}
              </span>
              <span className="min-w-0">
                <span className={`block truncate text-[13px] font-bold ${active ? "text-[var(--crmx-text)]" : done ? "text-[var(--crmx-text-secondary)]" : "text-[var(--crmx-text-muted)]"}`}>
                  {s.title}
                </span>
                <span className="hidden truncate text-[11.5px] text-[var(--crmx-text-muted)] sm:block">{s.hint}</span>
              </span>
            </button>
            {i < STEPS.length - 1 && <span className="hidden h-px flex-1 bg-[var(--crmx-border)] sm:block" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

export function CrmCustomerFormPage() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canCreateOccasions = hasPermission(CRM_PERMISSIONS.OCCASIONS_CREATE);
  const isEdit = Boolean(customerId);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [occasionDrafts, setOccasionDrafts] = useState<OccasionDraft[]>([]);
  const [step, setStep] = useState(1);
  const [furthestValid, setFurthestValid] = useState(1);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [groups, setGroups] = useState<CrmCustomerGroup[]>([]);
  const [employees, setEmployees] = useState<EmployeeFromApi[]>([]);
  const [loadingCustomer, setLoadingCustomer] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  // Load failure is terminal and must be kept separate from errorMessage
  // (which reports SAVE failures and has to leave the form on screen). An
  // unloaded customer must never fall through to an empty, submittable form.
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [customerSource, setCustomerSource] = useState<string | null>(null);
  const formTopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    branchService.getAll().then(setBranches).catch(() => setBranches([]));
    employeeService.getAll().then(setEmployees).catch(() => setEmployees([]));
  }, []);

  // Group picker data. Failure is non-blocking: the form still saves,
  // the picker just shows "بلا مجموعة" only.
  useEffect(() => {
    let cancelled = false;
    crmApi.customerGroups()
      .then((g) => !cancelled && setGroups(Array.isArray(g) ? g : []))
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!customerId) { setForm(emptyForm); return; }
    let cancelled = false;
    setLoadingCustomer(true);
    setLoadError("");
    crmApi.customer<CrmCustomerProfile>(customerId).then(({ identity }) => {
      if (cancelled) return;
      const phones = identity.phones ?? [];
      const secondaryPhone = phones.find((p) => !p.is_primary)?.phone;
      const work = identity.work_address;
      setForm({
        name: identity.name ?? "",
        name_en: identity.name_en ?? "",
        title: identity.title ?? "",
        gender: identity.gender ?? "",
        phone: identity.primary_phone ?? "",
        mobile: secondaryPhone ?? "",
        email: identity.email ?? "",
        address: identity.default_address ?? "",
        // Were hardcoded blank here — profile() never returned them, so
        // there was nothing to read regardless. Fixed on the backend
        // alongside this (Customer360QueryService::profile()) — this was
        // the "loads blank" half of a real save/read split, not a save bug:
        // city/country were being persisted correctly the whole time.
        city: identity.city ?? "",
        country: identity.country ?? "",
        engagement_status: identity.engagement_status ?? "",
        group_id: identity.group_id != null ? String(identity.group_id) : "",
        status: identity.status ?? "active",
        branch_id: identity.branch?.id != null ? String(identity.branch.id) : "",
        // Kept as the id, matching the <select> below whose value/options are
        // both ids from /api/employees — never substitute the resolved
        // identity.salesperson name here, that field exists only for display.
        salesperson_id: identity.salesperson_id != null ? String(identity.salesperson_id) : "",
        notes: "",
        birth_date: identity.birth_date ?? "",
        work_city: work?.city ?? "",
        work_street: work?.street ?? "",
        work_area: work?.area ?? "",
        work_building_no: work?.building_no ?? "",
        work_phone: work?.phone ?? "",
      });
      setCustomerSource(identity.source ?? null);
      setFurthestValid(3);
    }).catch((e) => !cancelled && setLoadError(getCrmError(e).message))
      .finally(() => !cancelled && setLoadingCustomer(false));
    return () => { cancelled = true; };
  }, [customerId, reloadKey]);

  const set = (key: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (fieldErrors[key]) setFieldErrors((e) => { const next = { ...e }; delete next[key]; return next; });
  };

  const inputCls = (key: keyof FormState) =>
    `h-11 w-full rounded-xl border bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none transition focus:ring-2 focus:ring-[var(--crmx-primary)]/10 ${
      fieldErrors[key] ? "border-[var(--crmx-danger)] focus:border-[var(--crmx-danger)]" : "border-[var(--crmx-border)] focus:border-[var(--crmx-primary)]"
    }`;
  const labelCls = "mb-1.5 block text-[13px] font-semibold text-[var(--crmx-text-secondary)]";

  const percent = useMemo(() => completionPercent(form), [form]);
  const groupLabel = useMemo(() => {
    const g = groups.find((g) => String(g.id) === form.group_id);
    if (!g) return null;
    return `${g.name}${CRM_GROUP_TYPE_LABELS[g.group_type] ? ` — ${CRM_GROUP_TYPE_LABELS[g.group_type]}` : ""}`;
  }, [groups, form.group_id]);

  const step1Valid = form.name.trim() !== "";
  const canLeaveStep1 = () => {
    if (!step1Valid) { setFieldErrors({ name: "اسم العميل مطلوب" }); return false; }
    return true;
  };

  const goToStep = (target: number) => {
    if (target === step) return;
    if (target > step && step === 1 && !canLeaveStep1()) return;
    setStep(target);
    setFurthestValid((f) => Math.max(f, target));
    formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const goNext = () => goToStep(Math.min(3, step + 1));
  const goPrev = () => goToStep(Math.max(1, step - 1));

  // Enter advances the wizard instead of doing nothing (native form default)
  // or submitting early — except inside a textarea, where Enter has to stay
  // a newline, and a <select>, where it's the browser's own "choose this
  // option" key.
  const onFormKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Enter") return;
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON") return;
    e.preventDefault();
    if (step < 3) goNext();
  };

  const handleSubmit = async (continueLater: boolean) => {
    if (!form.name.trim()) { setStep(1); setFieldErrors({ name: "اسم العميل مطلوب" }); return; }
    if (!form.phone.trim() && !form.mobile.trim()) {
      setStep(form.phone.trim() ? 2 : 1);
      setFieldErrors({ phone: "رقم هاتف واحد على الأقل مطلوب (رئيسي أو إضافي)" });
      return;
    }
    setSaving(true);
    setErrorMessage("");
    setFieldErrors({});

    const hasWorkAddress = [form.work_city, form.work_street, form.work_area, form.work_building_no, form.work_phone].some((v) => v.trim());

    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        name_en: form.name_en.trim() || undefined,
        title: form.title.trim() || undefined,
        gender: form.gender || undefined,
        phone: form.phone.trim() || undefined,
        mobile: form.mobile.trim() || undefined,
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        country: form.country.trim() || undefined,
        engagement_status: form.engagement_status || undefined,
        group_id: form.group_id ? Number(form.group_id) : null,
        // "حفظ ومتابعة لاحقًا" saves a real record too (there's no draft
        // concept on the backend) — the only difference is status and where
        // we navigate afterward, so nothing is silently lost either way.
        status: continueLater ? "inactive" : (form.status || undefined),
        branch_id: form.branch_id ? Number(form.branch_id) : null,
        salesperson_id: form.salesperson_id ? Number(form.salesperson_id) : null,
        notes: form.notes.trim() || undefined,
        birth_date: form.birth_date || (isEdit ? null : undefined),
        work_address: hasWorkAddress ? {
          city: form.work_city.trim() || undefined,
          street: form.work_street.trim() || undefined,
          area: form.work_area.trim() || undefined,
          building_no: form.work_building_no.trim() || undefined,
          phone: form.work_phone.trim() || undefined,
        } : (isEdit ? null : undefined),
      };

      let targetCustomerId: string | number;
      if (isEdit && customerId) {
        await crmApi.updateCustomer(customerId, payload);
        targetCustomerId = customerId;
      } else {
        const created = await crmApi.createCustomer<{ id: number | string }>(payload);
        targetCustomerId = created.id;
      }

      // Occasions ride on the customer id, so they can only be written after
      // it exists — a create followed immediately by N occasion writes, not
      // one atomic request (the backend has no such combined endpoint).
      // A failure here must not read as "the customer wasn't saved" — it
      // very much was; only the occasions are what's reported as failed.
      const readyDrafts = occasionDrafts.filter((d) => d.title.trim() && d.date);
      if (readyDrafts.length && canCreateOccasions) {
        const results = await Promise.allSettled(
          readyDrafts.map((d) =>
            crmApi.createOccasion("customers", targetCustomerId, {
              occasion_type: d.occasion_type,
              title: d.title.trim(),
              date: d.date,
              repeats_annually: false,
            }),
          ),
        );
        const failed = results.filter((r) => r.status === "rejected").length;
        if (failed > 0) {
          toast.error(
            "تم حفظ العميل، لكن بعض المناسبات لم تُحفظ",
            `${failed} من ${readyDrafts.length} مناسبة تعذّر حفظها — يمكن إضافتها لاحقًا من ملف العميل.`,
          );
        }
      }

      navigate(
        isEdit
          ? `/admin/crm/customers/${targetCustomerId}`
          : continueLater
          ? "/admin/crm/customers"
          : `/admin/crm/customers/${targetCustomerId}`,
      );
    } catch (error) {
      const { message, fields } = readApiErrors(error);
      setErrorMessage(message);
      setFieldErrors(fields);
      setSaving(false);
      // Whichever step the failed field actually lives on — otherwise a
      // server-side validation error on, say, `email` is invisible to a
      // user who's already moved on to step 3.
      if (fields.name || fields.title || fields.gender || fields.email || fields.engagement_status || fields.group_id) setStep(1);
      else if (fields.phone || fields.mobile || fields.address || fields.city || fields.country || Object.keys(fields).some((k) => k.startsWith("work_address"))) setStep(2);
      else setStep(3);
    }
  };

  if (loadingCustomer) {
    return (
      <div className="crmx-root flex min-h-[60vh] items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--crmx-text-muted)]" />
      </div>
    );
  }

  // Terminal state: the customer never loaded, so there is nothing to edit.
  // Rendering the form here would show empty fields over a stale record and
  // let "حفظ التعديلات" overwrite the real customer with blanks.
  if (loadError) {
    return (
      <div className="crmx-root p-4 sm:p-6" dir="rtl">
        <p className="mb-1 text-[12px] font-bold text-[var(--crmx-text-muted)]">CRM / العملاء / تعديل عميل</p>
        <div className="mx-auto mt-8 flex max-w-lg flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--crmx-danger-soft)] text-[var(--crmx-danger-text)]">
            <AlertTriangle className="h-6 w-6" />
          </span>
          <div>
            <p className="text-[16px] font-bold text-[var(--crmx-text)]">تعذر تحميل بيانات العميل</p>
            <p className="mt-1 max-w-sm text-[13px] text-[var(--crmx-text-secondary)]">{loadError}</p>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              className="flex h-11 items-center gap-2 rounded-xl bg-[var(--crmx-primary)] px-4 text-[14px] font-bold text-white transition hover:bg-[var(--crmx-primary-hover)]"
            >
              <RotateCw className="h-4 w-4" /> إعادة المحاولة
            </button>
            <button
              onClick={() => navigate("/admin/crm/customers")}
              className="h-11 rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] px-4 text-[14px] font-semibold text-[var(--crmx-text)] transition hover:bg-[var(--crmx-neutral-soft)]"
            >
              العودة إلى قائمة العملاء
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="crmx-root p-4 sm:p-6" dir="rtl" onKeyDown={onFormKeyDown} ref={formTopRef}>
      <p className="mb-1 text-[12px] font-bold text-[var(--crmx-text-muted)]">
        CRM / العملاء / {isEdit ? "تعديل عميل" : "إضافة عميل جديد"}
      </p>
      <h1 className="mb-6 text-[26px] font-extrabold text-[var(--crmx-text)] md:text-[30px]">
        {isEdit ? "تعديل بيانات العميل" : "إضافة عميل جديد"}
      </h1>

      {errorMessage && (
        <div className="mb-4 rounded-xl border border-[var(--crmx-danger)]/30 bg-[var(--crmx-danger-soft)] px-4 py-3 text-[13px] font-semibold text-[var(--crmx-danger-text)]">
          {errorMessage}
        </div>
      )}

      <div className="mx-auto flex max-w-6xl items-start gap-6 pb-28">
        <div className="min-w-0 flex-1 space-y-4">
          <Stepper current={step} furthestValid={furthestValid} onJump={goToStep} />

          {step === 1 && (
            <FormSection title="المعلومات الأساسية">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className={labelCls}>الاسم الكامل *</label>
                  <input autoFocus className={inputCls("name")} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="أدخل الاسم الكامل" />
                  {fieldErrors.name && <p className="mt-1 text-[12px] font-semibold text-[var(--crmx-danger-text)]">{fieldErrors.name}</p>}
                </div>
                <div>
                  <label className={labelCls}>الكنية</label>
                  <input className={inputCls("title")} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="مثال: استاذ / مهندس" maxLength={32} />
                </div>

                <div className="relative">
                  <label className={labelCls}>رقم الهاتف *</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[13px] font-semibold text-[var(--crmx-text-muted)]" dir="ltr">+970</span>
                    <input
                      className={`${inputCls("phone")} pl-9 pr-14`}
                      value={form.phone}
                      onChange={(e) => set("phone", e.target.value)}
                      dir="ltr"
                      placeholder="05xxxxxxxx"
                    />
                    <InlineValidIcon show={PHONE_RE.test(form.phone.trim())} />
                  </div>
                  {fieldErrors.phone && <p className="mt-1 text-[12px] font-semibold text-[var(--crmx-danger-text)]">{fieldErrors.phone}</p>}
                </div>
                <div className="relative sm:col-span-2">
                  <label className={labelCls}>البريد الإلكتروني</label>
                  <div className="relative">
                    <input className={`${inputCls("email")} pl-9`} value={form.email} onChange={(e) => set("email", e.target.value)} dir="ltr" type="email" placeholder="example@email.com" />
                    <InlineValidIcon show={EMAIL_RE.test(form.email.trim())} />
                  </div>
                  {fieldErrors.email && <p className="mt-1 text-[12px] font-semibold text-[var(--crmx-danger-text)]">{fieldErrors.email}</p>}
                </div>

                <div>
                  <label className={labelCls}>الجنس</label>
                  <select className={inputCls("gender")} value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                    <option value="">غير محدد</option>
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                </div>
                <div>
                  {/* The Call Center's engagement tag. The business classification
                      that used to share this field now belongs to the customer's
                      group — see the group picker below. */}
                  <label className={labelCls}>حالة التعامل</label>
                  <select className={inputCls("engagement_status")} value={form.engagement_status} onChange={(e) => set("engagement_status", e.target.value)}>
                    <option value="">غير محدد</option>
                    {CRM_ENGAGEMENT_OPTIONS.filter(([v]) => v !== "").map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  {/* Optional: most customers are individuals and belong to no
                      group. Groups are picked here, never created — that is a
                      separate screen. */}
                  <label className={labelCls}>المجموعة</label>
                  <select className={inputCls("group_id")} value={form.group_id} onChange={(e) => set("group_id", e.target.value)}>
                    <option value="">بلا مجموعة</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}{CRM_GROUP_TYPE_LABELS[g.group_type] ? ` — ${CRM_GROUP_TYPE_LABELS[g.group_type]}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className={labelCls}>الاسم بالإنجليزية</label>
                  <input className={inputCls("name_en")} value={form.name_en} onChange={(e) => set("name_en", e.target.value)} dir="ltr" />
                </div>
              </div>
            </FormSection>
          )}

          {step === 2 && (
            <>
              <FormSection title="بيانات التواصل">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="relative">
                    <label className={labelCls}>جوال إضافي</label>
                    <div className="relative">
                      <input className={`${inputCls("mobile")} pl-9`} value={form.mobile} onChange={(e) => set("mobile", e.target.value)} dir="ltr" />
                      <InlineValidIcon show={form.mobile.trim() !== "" && PHONE_RE.test(form.mobile.trim())} />
                    </div>
                    {fieldErrors.mobile && <p className="mt-1 text-[12px] font-semibold text-[var(--crmx-danger-text)]">{fieldErrors.mobile}</p>}
                  </div>
                </div>
              </FormSection>

              <FormSection title="عنوان المنزل">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label className={labelCls}>العنوان</label>
                    <input className={inputCls("address")} value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="الشارع، الحي..." />
                  </div>
                  <div>
                    <label className={labelCls}>المدينة</label>
                    <input className={inputCls("city")} value={form.city} onChange={(e) => set("city", e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>الدولة</label>
                    <input className={inputCls("country")} value={form.country} onChange={(e) => set("country", e.target.value)} />
                  </div>
                </div>
              </FormSection>

              <FormSection title="عنوان العمل">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>المدينة</label>
                    <input className={inputCls("work_city")} value={form.work_city} onChange={(e) => set("work_city", e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>المنطقة</label>
                    <input className={inputCls("work_area")} value={form.work_area} onChange={(e) => set("work_area", e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>الشارع</label>
                    <input className={inputCls("work_street")} value={form.work_street} onChange={(e) => set("work_street", e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>رقم المبنى</label>
                    <input className={inputCls("work_building_no")} value={form.work_building_no} onChange={(e) => set("work_building_no", e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>هاتف العمل</label>
                    <input className={inputCls("work_phone")} value={form.work_phone} onChange={(e) => set("work_phone", e.target.value)} dir="ltr" />
                  </div>
                </div>
                <p className="mt-2 text-[11.5px] text-[var(--crmx-text-muted)]">عنوان منفصل تمامًا عن عنوان المنزل أعلاه — لا يؤثر على عنوان التوصيل الافتراضي.</p>
              </FormSection>
            </>
          )}

          {step === 3 && (
            <>
              <FormSection title="تاريخ الميلاد">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>تاريخ الميلاد</label>
                    <input type="date" className={inputCls("birth_date")} value={form.birth_date} onChange={(e) => set("birth_date", e.target.value)} />
                    <p className="mt-1 text-[11.5px] text-[var(--crmx-text-muted)]">يُنشئ مناسبة "عيد ميلاد" متكررة سنويًا لهذا العميل تلقائيًا.</p>
                  </div>
                </div>
              </FormSection>

              {canCreateOccasions ? (
                <OccasionsRepeater drafts={occasionDrafts} onChange={setOccasionDrafts} />
              ) : (
                <FormSection title="مناسبات أخرى">
                  <p className="text-[13px] text-[var(--crmx-text-muted)]">لا تملك صلاحية إضافة مناسبات لهذا العميل.</p>
                </FormSection>
              )}

              <FamilyInfoPending />

              <FormSection title="بيانات تنظيمية">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>الحالة</label>
                    <select className={inputCls("status")} value={form.status} onChange={(e) => set("status", e.target.value)}>
                      {CRM_CREATE_STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>الفرع</label>
                    <select className={inputCls("branch_id")} value={form.branch_id} onChange={(e) => set("branch_id", e.target.value)}>
                      <option value="">بدون تحديد</option>
                      {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>الموظف المسؤول</label>
                    <select className={inputCls("salesperson_id")} value={form.salesperson_id} onChange={(e) => set("salesperson_id", e.target.value)}>
                      <option value="">بدون تحديد</option>
                      {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                    </select>
                  </div>
                  {isEdit && (
                    <div>
                      <label className={labelCls}>مصدر العميل</label>
                      <div className="flex h-11 items-center rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-neutral-soft)] px-3 text-[14px] text-[var(--crmx-text-secondary)]">
                        {customerSource ? (CRM_CUSTOMER_SOURCE_LABELS[customerSource as keyof typeof CRM_CUSTOMER_SOURCE_LABELS] || customerSource) : "غير محدد"}
                      </div>
                    </div>
                  )}
                </div>
              </FormSection>

              <FormSection title="ملاحظات أخرى">
                <textarea
                  className="h-28 w-full resize-none rounded-xl border border-[var(--crmx-border)] bg-white p-3 text-[14px] text-[var(--crmx-text)] outline-none focus:border-[var(--crmx-primary)] focus:ring-2 focus:ring-[var(--crmx-primary)]/10"
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="أي ملاحظات إضافية حول العميل..."
                />
              </FormSection>
            </>
          )}
        </div>

        <LivePreviewCard form={form} groupLabel={groupLabel} percent={percent} />
      </div>

      <footer className="sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t border-[var(--crmx-border)] bg-[var(--crmx-card)] px-4 py-4 sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            disabled={saving || step === 1}
            className="flex h-11 items-center gap-1.5 rounded-xl border border-[var(--crmx-border)] px-4 text-[14px] font-semibold text-[var(--crmx-text)] transition hover:bg-[var(--crmx-neutral-soft)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" /> السابق
          </button>
          {!isEdit && (
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={saving}
              className="hidden h-11 items-center rounded-xl border border-[var(--crmx-border)] px-5 text-[14px] font-semibold text-[var(--crmx-text)] transition hover:bg-[var(--crmx-neutral-soft)] disabled:opacity-60 sm:flex"
            >
              حفظ ومتابعة لاحقًا
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden text-[12.5px] font-semibold text-[var(--crmx-text-muted)] sm:inline">اكتمال الملف: {percent}٪</span>
          <button
            type="button"
            onClick={() => navigate(isEdit ? `/admin/crm/customers/${customerId}` : "/admin/crm/customers")}
            disabled={saving}
            className="h-11 rounded-xl border border-[var(--crmx-border)] px-5 text-[14px] font-semibold text-[var(--crmx-text-secondary)] hover:bg-[var(--crmx-neutral-soft)]"
          >
            إلغاء
          </button>
          {step < 3 ? (
            <button
              type="button"
              onClick={goNext}
              className="flex h-11 items-center gap-1.5 rounded-xl bg-[var(--crmx-primary)] px-6 text-[14px] font-bold text-white transition hover:bg-[var(--crmx-primary-hover)]"
            >
              التالي <ChevronLeft className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={saving}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--crmx-primary)] px-6 text-[14px] font-bold text-white transition hover:bg-[var(--crmx-primary-hover)] disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "حفظ التعديلات" : "تأكيد وإضافة العميل"}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
