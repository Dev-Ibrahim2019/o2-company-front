import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { branchService, type Branch } from "../../services/branchService";
import { employeeService, type EmployeeFromApi } from "../../services/employeeService";
import { crmApi } from "./api";
import { getCrmError } from "./components";
import { CRM_CREATE_CATEGORY_OPTIONS, CRM_CREATE_STATUS_OPTIONS } from "./customers-ui/customerCreateFields";
import { CRM_CUSTOMER_SOURCE_LABELS } from "./customers-ui/sourceOptions";
import "./customers-ui/crmx.css";
import type { CrmCustomerProfile } from "./types";

// Full-page form — matches the approved reference exactly (a page navigated
// to, not a drawer/side panel). Used for both create (/admin/crm/customers/new)
// and edit (/admin/crm/customers/:customerId/edit). Both submit through
// CRM's own endpoints (CrmController@store / @update), not the Financial
// controller — title/gender/birth_date/work_address are CRM-only concepts.

const emptyForm = {
  name: "", name_en: "", title: "", gender: "", phone: "", mobile: "", email: "",
  address: "", city: "", country: "", category: "retail", status: "active",
  branch_id: "", salesperson_id: "", notes: "",
  birth_date: "",
  work_city: "", work_street: "", work_area: "", work_building_no: "", work_phone: "",
};

type FormState = typeof emptyForm;

const pendingLabelCls = "mb-1.5 block text-[13px] font-semibold text-[var(--crmx-text-secondary)]";
const pendingInputCls = "h-11 w-full cursor-not-allowed rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-neutral-soft)] px-3 text-[14px] text-[var(--crmx-text-muted)] outline-none";
const pendingBadge = (
  <span className="rounded-full bg-[var(--crmx-warning-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--crmx-warning-text)]">قريبًا</span>
);

/**
 * Children and free-form occasions still have no backend support (no
 * children table, no CRM-scoped generic-occasion-create endpoint) — kept
 * disabled/pending. Birthday and work address moved OUT of this section
 * since both are now real (see the identity completion report).
 */
function PendingFieldsSection() {
  return (
    <>
      <FormSection title="معلومات عائلية" badge={pendingBadge}>
        <label className={pendingLabelCls}>لديه أبناء؟</label>
        <input disabled className={pendingInputCls} placeholder="أسماء الأبناء وتواريخ الميلاد" />
      </FormSection>

      <FormSection title="مناسبات أخرى" badge={pendingBadge}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={pendingLabelCls}>نوع المناسبة</label>
            <select disabled className={pendingInputCls}>
              <option>اختر نوع المناسبة</option>
            </select>
          </div>
          <div>
            <label className={pendingLabelCls}>التاريخ</label>
            <input type="date" disabled className={pendingInputCls} />
          </div>
        </div>
        <button disabled type="button" className="mt-3 h-10 w-full cursor-not-allowed rounded-xl border border-dashed border-[var(--crmx-border)] text-[13px] font-semibold text-[var(--crmx-text-muted)]">
          + إضافة مناسبة
        </button>
      </FormSection>
    </>
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

export function CrmCustomerFormPage() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(customerId);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<EmployeeFromApi[]>([]);
  const [loadingCustomer, setLoadingCustomer] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [customerSource, setCustomerSource] = useState<string | null>(null);

  useEffect(() => {
    branchService.getAll().then(setBranches).catch(() => setBranches([]));
    employeeService.getAll().then(setEmployees).catch(() => setEmployees([]));
  }, []);

  useEffect(() => {
    if (!customerId) { setForm(emptyForm); return; }
    let cancelled = false;
    setLoadingCustomer(true);
    crmApi.customer<CrmCustomerProfile>(customerId).then(({ identity }) => {
      if (cancelled) return;
      const phones = identity.phones ?? [];
      const secondaryPhone = phones.find((p) => !p.is_primary)?.phone;
      const work = identity.work_address;
      setForm({
        name: identity.name ?? "",
        name_en: "",
        title: identity.title ?? "",
        gender: identity.gender ?? "",
        phone: identity.primary_phone ?? "",
        mobile: secondaryPhone ?? "",
        email: identity.email ?? "",
        address: identity.default_address ?? "",
        city: "",
        country: "",
        category: identity.category ?? "retail",
        status: identity.status ?? "active",
        branch_id: identity.branch?.id != null ? String(identity.branch.id) : "",
        salesperson_id: "",
        notes: "",
        birth_date: identity.birth_date ?? "",
        work_city: work?.city ?? "",
        work_street: work?.street ?? "",
        work_area: work?.area ?? "",
        work_building_no: work?.building_no ?? "",
        work_phone: work?.phone ?? "",
      });
      setCustomerSource(identity.source ?? null);
    }).catch((e) => !cancelled && setErrorMessage(getCrmError(e).message))
      .finally(() => !cancelled && setLoadingCustomer(false));
    return () => { cancelled = true; };
  }, [customerId]);

  const set = (key: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (fieldErrors[key]) setFieldErrors((e) => { const next = { ...e }; delete next[key]; return next; });
  };

  const inputCls = (key: keyof FormState) =>
    `h-11 w-full rounded-xl border bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none transition focus:ring-2 focus:ring-[var(--crmx-navy)]/10 ${
      fieldErrors[key] ? "border-[var(--crmx-danger)] focus:border-[var(--crmx-danger)]" : "border-[var(--crmx-border)] focus:border-[var(--crmx-navy)]"
    }`;
  const labelCls = "mb-1.5 block text-[13px] font-semibold text-[var(--crmx-text-secondary)]";

  const handleSubmit = async (continueLater: boolean) => {
    if (!form.name.trim()) { setFieldErrors({ name: "اسم العميل مطلوب" }); return; }
    if (!form.phone.trim() && !form.mobile.trim()) { setFieldErrors({ phone: "رقم هاتف واحد على الأقل مطلوب" }); return; }
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
        category: form.category || undefined,
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

      if (isEdit && customerId) {
        await crmApi.updateCustomer(customerId, payload);
        navigate(`/admin/crm/customers/${customerId}`);
      } else {
        const created = await crmApi.createCustomer<{ id: number | string }>(payload);
        navigate(continueLater ? "/admin/crm/customers" : `/admin/crm/customers/${created.id}`);
      }
    } catch (error) {
      const { message, fields } = readApiErrors(error);
      setErrorMessage(message);
      setFieldErrors(fields);
      setSaving(false);
    }
  };

  if (loadingCustomer) {
    return (
      <div className="crmx-root flex min-h-[60vh] items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--crmx-text-muted)]" />
      </div>
    );
  }

  return (
    <div className="crmx-root p-4 sm:p-6" dir="rtl">
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

      <div className="mx-auto max-w-3xl space-y-4 pb-28">
        <FormSection title="المعلومات الأساسية">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>البريد الإلكتروني</label>
              <input className={inputCls("email")} value={form.email} onChange={(e) => set("email", e.target.value)} dir="ltr" type="email" placeholder="example@email.com" />
              {fieldErrors.email && <p className="mt-1 text-[12px] font-semibold text-[var(--crmx-danger-text)]">{fieldErrors.email}</p>}
            </div>
            <div>
              <label className={labelCls}>رقم الهاتف *</label>
              <input className={inputCls("phone")} value={form.phone} onChange={(e) => set("phone", e.target.value)} dir="ltr" placeholder="05xxxxxxxx" />
              {fieldErrors.phone && <p className="mt-1 text-[12px] font-semibold text-[var(--crmx-danger-text)]">{fieldErrors.phone}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>الاسم الكامل *</label>
              <input className={inputCls("name")} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="أدخل الاسم الكامل" />
              {fieldErrors.name && <p className="mt-1 text-[12px] font-semibold text-[var(--crmx-danger-text)]">{fieldErrors.name}</p>}
            </div>
            <div>
              <label className={labelCls}>الكنية</label>
              <input className={inputCls("title")} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="مثال: أبو خالد" maxLength={32} />
              {fieldErrors.title && <p className="mt-1 text-[12px] font-semibold text-[var(--crmx-danger-text)]">{fieldErrors.title}</p>}
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
              <label className={labelCls}>الاسم بالإنجليزية</label>
              <input className={inputCls("name_en")} value={form.name_en} onChange={(e) => set("name_en", e.target.value)} dir="ltr" />
            </div>
            <div>
              <label className={labelCls}>التصنيف</label>
              <select className={inputCls("category")} value={form.category} onChange={(e) => set("category", e.target.value)}>
                {CRM_CREATE_CATEGORY_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>تاريخ الميلاد</label>
              <input type="date" className={inputCls("birth_date")} value={form.birth_date} onChange={(e) => set("birth_date", e.target.value)} />
              <p className="mt-1 text-[11.5px] text-[var(--crmx-text-muted)]">يُنشئ مناسبة "عيد ميلاد" متكررة سنويًا لهذا العميل.</p>
            </div>
          </div>
        </FormSection>

        <FormSection title="بيانات إضافية">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>جوال إضافي</label>
              <input className={inputCls("mobile")} value={form.mobile} onChange={(e) => set("mobile", e.target.value)} dir="ltr" />
            </div>
            <div>
              <label className={labelCls}>الحالة</label>
              <select className={inputCls("status")} value={form.status} onChange={(e) => set("status", e.target.value)}>
                {CRM_CREATE_STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>عنوان المنزل</label>
              <input className={inputCls("address")} value={form.address} onChange={(e) => set("address", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>المدينة</label>
              <input className={inputCls("city")} value={form.city} onChange={(e) => set("city", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>الدولة</label>
              <input className={inputCls("country")} value={form.country} onChange={(e) => set("country", e.target.value)} />
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

        <PendingFieldsSection />

        <FormSection title="ملاحظات أخرى">
          <textarea
            className="h-28 w-full resize-none rounded-xl border border-[var(--crmx-border)] bg-white p-3 text-[14px] text-[var(--crmx-text)] outline-none focus:border-[var(--crmx-navy)] focus:ring-2 focus:ring-[var(--crmx-navy)]/10"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="أي ملاحظات إضافية حول العميل..."
          />
        </FormSection>
      </div>

      <footer className="sticky bottom-0 -mx-4 flex items-center justify-end gap-3 border-t border-[var(--crmx-border)] bg-[var(--crmx-card)] px-4 py-4 sm:-mx-6 sm:px-6">
        {!isEdit && (
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={saving}
            className="h-11 rounded-xl border border-[var(--crmx-border)] px-5 text-[14px] font-semibold text-[var(--crmx-text)] transition hover:bg-[var(--crmx-neutral-soft)] disabled:opacity-60"
          >
            حفظ ومتابعة لاحقًا
          </button>
        )}
        <button
          type="button"
          onClick={() => navigate(isEdit ? `/admin/crm/customers/${customerId}` : "/admin/crm/customers")}
          disabled={saving}
          className="h-11 rounded-xl border border-[var(--crmx-border)] px-5 text-[14px] font-semibold text-[var(--crmx-text-secondary)] hover:bg-[var(--crmx-neutral-soft)]"
        >
          إلغاء
        </button>
        <button
          type="button"
          onClick={() => handleSubmit(false)}
          disabled={saving}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--crmx-primary)] px-6 text-[14px] font-bold text-white transition hover:bg-[var(--crmx-primary-hover)] disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? "حفظ التعديلات" : "حفظ العميل"}
        </button>
      </footer>
    </div>
  );
}
