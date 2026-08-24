import { X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Branch } from "../../../services/branchService";
import { CRM_CATEGORY_OPTIONS } from "./categoryOptions";
import { CRM_GENDER_FILTER_OPTIONS, CRM_SOURCE_FILTER_OPTIONS } from "./sourceOptions";

export interface CrmFilterDrawerValues {
  status: string;
  category: string;
  branchId: string;
  source: string;
  gender: string;
}

const inputCls =
  "h-11 w-full rounded-xl border border-[var(--crmx-border)] bg-white px-3 text-[14px] text-[var(--crmx-text)] outline-none transition focus:border-[var(--crmx-navy)] focus:ring-2 focus:ring-[var(--crmx-navy)]/10";
const labelCls = "mb-1.5 block text-[13px] font-semibold text-[var(--crmx-text-secondary)]";

function ComingSoonField({ label }: { label: string }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="flex h-11 items-center justify-between rounded-xl border border-dashed border-[var(--crmx-border)] bg-[var(--crmx-neutral-soft)] px-3 text-[13px] text-[var(--crmx-text-muted)]">
        غير مدعوم حاليًا
        <span className="rounded-full border border-[var(--crmx-border)] bg-white px-2 py-0.5 text-[11px] font-bold text-[var(--crmx-text-muted)]">
          قريبًا
        </span>
      </div>
    </div>
  );
}

export function CrmFilterDrawer({
  open,
  onClose,
  values,
  branches,
  showBranchFilter,
  onApply,
  onReset,
}: {
  open: boolean;
  onClose: () => void;
  values: CrmFilterDrawerValues;
  branches: Branch[];
  showBranchFilter: boolean;
  onApply: (values: CrmFilterDrawerValues) => void;
  onReset: () => void;
}) {
  const [local, setLocal] = useState(values);

  useEffect(() => {
    if (open) setLocal(values);
  }, [open, values]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="فلاتر متقدمة">
      <button aria-label="إغلاق" className="absolute inset-0 bg-[#0B1220]/40" onClick={onClose} />
      <div dir="rtl" className="crmx-drawer-panel relative flex h-full w-full max-w-sm flex-col bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-[var(--crmx-border)] px-5 py-4">
          <h2 className="text-[17px] font-bold text-[var(--crmx-text)]">فلاتر متقدمة</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--crmx-text-muted)] hover:bg-[var(--crmx-neutral-soft)]" aria-label="إغلاق">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div>
            <label className={labelCls}>الحالة</label>
            <select className={inputCls} value={local.status} onChange={(e) => setLocal((s) => ({ ...s, status: e.target.value }))}>
              <option value="">كل الحالات</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
              <option value="blocked">محظور</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>التصنيف</label>
            <select className={inputCls} value={local.category} onChange={(e) => setLocal((s) => ({ ...s, category: e.target.value }))}>
              {CRM_CATEGORY_OPTIONS.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          {showBranchFilter && (
            <div>
              <label className={labelCls}>الفرع</label>
              <select className={inputCls} value={local.branchId} onChange={(e) => setLocal((s) => ({ ...s, branchId: e.target.value }))}>
                <option value="">كل الفروع</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className={labelCls}>مصدر العميل</label>
            <select className={inputCls} value={local.source} onChange={(e) => setLocal((s) => ({ ...s, source: e.target.value }))}>
              {CRM_SOURCE_FILTER_OPTIONS.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>الجنس</label>
            <select className={inputCls} value={local.gender} onChange={(e) => setLocal((s) => ({ ...s, gender: e.target.value }))}>
              {CRM_GENDER_FILTER_OPTIONS.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          <ComingSoonField label="المدينة" />
          <ComingSoonField label="تاريخ الإضافة" />
          <ComingSoonField label="نطاق الطلبات" />
        </div>

        <footer className="flex items-center gap-2.5 border-t border-[var(--crmx-border)] px-5 py-4">
          <button
            onClick={() => { onApply(local); onClose(); }}
            className="h-11 flex-1 rounded-xl bg-[var(--crmx-navy)] text-[14px] font-bold text-white transition hover:bg-[var(--crmx-navy-hover)]"
          >
            تطبيق الفلاتر
          </button>
          <button
            onClick={() => { const cleared = { status: "", category: "", branchId: "", source: "", gender: "" }; setLocal(cleared); onReset(); }}
            className="h-11 rounded-xl border border-[var(--crmx-border)] px-4 text-[14px] font-semibold text-[var(--crmx-text-secondary)] hover:bg-[var(--crmx-neutral-soft)]"
          >
            إعادة تعيين
          </button>
        </footer>
      </div>
    </div>
  );
}
