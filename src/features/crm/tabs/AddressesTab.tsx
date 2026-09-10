import { Plus, X } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../../auth";
import { CRM_PERMISSIONS } from "../../../auth/permissions";
import { toast } from "../../../components/shared/Toast";
import { crmApi } from "../api";
import { getCrmError } from "../components";
import type { CrmAddressInput } from "../types";
import { DomainTable, SectionFrame, text, unwrapRows, useCrmSection } from "./shared";

// "العنوان" used to read a column named `address`, which customer_addresses
// does not have — the real address is split across `street`/`building_no`
// (confirmed against CrmController::addresses(), which returns the row as-is;
// see the field-inventory audit). Combined here into one readable string
// instead of one dead column plus city/area repeating what already has
// their own columns to the right.
function streetLine(r: Record<string, unknown>): string {
  const street = r.street ? String(r.street) : null;
  const building = r.building_no ? `مبنى ${r.building_no}` : null;
  const parts = [street, building].filter(Boolean);
  return parts.length ? parts.join("، ") : "—";
}

const inputCls =
  "h-11 w-full rounded-xl border border-[var(--crmx-border)] bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none transition focus:border-[var(--crmx-primary)] focus:ring-2 focus:ring-[var(--crmx-primary)]/10";
const labelCls = "mb-1.5 block text-[13px] font-semibold text-[var(--crmx-text-secondary)]";
const sectionTitle = "mb-3 text-[15px] font-bold text-[var(--crmx-text)]";

// customer_addresses.label is a free-text column — these are the labels the
// rest of the app already writes ("منزل" from CallCenterService::createCustomer,
// "العمل" from CustomerIdentityService::WORK_ADDRESS_LABEL). Kept as a fixed
// list so the delivery picker stays tidy rather than accumulating one-off
// spellings.
const LABEL_OPTIONS = ["منزل", "العمل", "أخرى"] as const;

const EMPTY_FORM: CrmAddressInput = {
  label: "منزل", city: "", area: "", street: "", building_no: "",
  floor: "", apartment: "", landmark: "", phone: "", delivery_notes: "", is_default: false,
};

function AddressFormDrawer({
  saving, onClose, onSubmit,
}: {
  saving: boolean;
  onClose: () => void;
  onSubmit: (data: CrmAddressInput) => void;
}) {
  const [form, setForm] = useState<CrmAddressInput>(EMPTY_FORM);
  const set = <K extends keyof CrmAddressInput>(key: K, value: CrmAddressInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Mirrors CrmController::storeAddress()'s server-side check: a row that is
  // only a label locates nothing. Keep the button disabled until at least
  // one of the three main lines is filled.
  const hasLocation = Boolean(form.city?.trim() || form.area?.trim() || form.street?.trim());

  const field = (key: keyof CrmAddressInput, label: string, extra?: { dir?: "ltr"; ph?: string }) => (
    <div>
      <label className={labelCls}>{label}</label>
      <input
        className={inputCls}
        value={(form[key] as string) ?? ""}
        onChange={(e) => set(key, e.target.value as CrmAddressInput[typeof key])}
        dir={extra?.dir}
        placeholder={extra?.ph}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="عنوان العميل">
      <button aria-label="إغلاق" className="absolute inset-0 bg-[#0B1220]/40" onClick={onClose} />
      <div dir="rtl" className="crmx-drawer-panel relative flex h-full w-full max-w-sm flex-col bg-[var(--crmx-card)] shadow-2xl">
        <header className="flex items-center justify-between border-b border-[var(--crmx-border)] px-5 py-4">
          <h2 className="text-[17px] font-bold text-[var(--crmx-text)]">إضافة عنوان</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--crmx-text-muted)] hover:bg-[var(--crmx-neutral-soft)]" aria-label="إغلاق">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <label className={labelCls}>نوع العنوان</label>
            <select
              className={inputCls}
              value={form.label}
              onChange={(e) => set("label", e.target.value)}
            >
              {LABEL_OPTIONS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {field("city", "المدينة")}
            {field("area", "المنطقة")}
          </div>
          {field("street", "الشارع", { ph: "الشارع، الحي..." })}
          <div className="grid grid-cols-2 gap-4">
            {field("building_no", "رقم المبنى")}
            {field("floor", "الطابق")}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {field("apartment", "الشقة")}
            {field("landmark", "معلم قريب")}
          </div>
          {field("phone", "هاتف", { dir: "ltr" })}

          <div>
            <label className={labelCls}>ملاحظات التوصيل</label>
            <textarea
              className={`${inputCls} h-20 resize-none py-2.5`}
              value={form.delivery_notes ?? ""}
              onChange={(e) => set("delivery_notes", e.target.value)}
              placeholder="تعليمات للسائق، أقرب نقطة دالة..."
              maxLength={1000}
            />
          </div>

          <label className="flex items-center gap-2.5 text-[14px] font-semibold text-[var(--crmx-text)]">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-[var(--crmx-border)]"
              checked={!!form.is_default}
              onChange={(e) => set("is_default", e.target.checked)}
            />
            تعيينه العنوان الافتراضي للتوصيل
          </label>

          {!hasLocation && (
            <p className="text-[12px] text-[var(--crmx-text-muted)]">
              أدخل المدينة أو المنطقة أو الشارع على الأقل.
            </p>
          )}
        </div>

        <footer className="flex items-center gap-2.5 border-t border-[var(--crmx-border)] px-5 py-4">
          <button
            disabled={saving || !hasLocation}
            onClick={() => onSubmit(form)}
            className="h-11 flex-1 rounded-xl bg-[var(--crmx-primary)] text-[14px] font-bold text-white transition hover:bg-[var(--crmx-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "جارٍ الحفظ..." : "حفظ العنوان"}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="h-11 rounded-xl border border-[var(--crmx-border)] px-4 text-[14px] font-semibold text-[var(--crmx-text-secondary)] hover:bg-[var(--crmx-neutral-soft)]"
          >
            إلغاء
          </button>
        </footer>
      </div>
    </div>
  );
}

export default function AddressesTab() {
  const { customerId = "" } = useParams();
  const { hasPermission } = useAuth();
  const canAdd = hasPermission(CRM_PERMISSIONS.EDIT_CUSTOMERS);

  const state = useCrmSection("addresses");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async (data: CrmAddressInput) => {
    setSaving(true);
    try {
      await crmApi.createAddress(customerId, data);
      toast.success("تمت إضافة العنوان");
      setDrawerOpen(false);
      await state.load();
    } catch (e) {
      toast.error("تعذّر حفظ العنوان", getCrmError(e).message);
    } finally {
      setSaving(false);
    }
  };

  // A 403 on the list takes the whole section — heading and add button
  // included: offering "add address" above a permission error would dangle
  // an action the server is going to refuse.
  if (state.error?.status === 403) return null;

  return (
    <section className="crmx-root space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className={`${sectionTitle} mb-0`}>العناوين</h3>
        {canAdd && (
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex h-11 items-center gap-2 rounded-xl border border-[var(--crmx-border)] bg-[var(--crmx-card)] px-4 text-[14px] font-bold text-[var(--crmx-navy)] transition hover:bg-[var(--crmx-neutral-soft)]"
          >
            <Plus className="h-4 w-4" /> إضافة عنوان
          </button>
        )}
      </div>

      <SectionFrame state={state}>
        {(d) => (
          <DomainTable
            empty="لا توجد عناوين محفوظة"
            rows={unwrapRows(d, ["addresses"])}
            columns={[
              { key: "label", label: "نوع العنوان", render: (v, r) => text(v ?? r.type) },
              { key: "street", label: "العنوان", render: (_v, r) => streetLine(r) },
              { key: "city", label: "المدينة" },
              { key: "area", label: "المنطقة" },
              { key: "is_default", label: "الافتراضي", render: (v) => (v ? "نعم" : "لا") },
            ]}
          />
        )}
      </SectionFrame>

      {drawerOpen && (
        <AddressFormDrawer saving={saving} onClose={() => setDrawerOpen(false)} onSubmit={submit} />
      )}
    </section>
  );
}
