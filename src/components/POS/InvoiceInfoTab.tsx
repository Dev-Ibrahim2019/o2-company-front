import React from 'react';
import { Monitor, FileText, Clock, Lock, Unlock, User, Building2, Hash, DollarSign, CreditCard, ChevronsRight, ChevronRight, ChevronLeft, ChevronsLeft, Loader2 } from 'lucide-react';

interface UserInfo {
  id: number;
  name: string;
}

interface OpeningInfo {
  user: UserInfo | null;
  pos_name: string | null;
  date: string | null;
  time: string | null;
}

interface ClosingInfo {
  user: UserInfo | null;
  pos_name: string | null;
  date: string | null;
  time: string | null;
}

interface PosInfo {
  register_id: number | null;
  code: string | null;
  name: string | null;
  branch: { id: number; name: string } | null;
}

interface DetailsInfo {
  number: string;
  date: string | null;
  time: string | null;
  currency: string;
  exchange_rate?: number;
  account_number: string | null;
  daily_sequence?: number | null;
  reference_number?: string | null;
  financial_voucher_number?: string | null;
  vat_report_number?: string | null;
  journal_entry_number?: string | null;
}

interface InvoiceData {
  pos: PosInfo;
  details: DetailsInfo;
  opening: OpeningInfo | null;
  closing: ClosingInfo | null;
}

interface InvoiceInfoTabProps {
  editingOrderId: string | null;
  currentUser: { name: string } | null;
  posInfo?: { code?: string; name?: string; branch_id?: number } | null;
  invoiceData?: InvoiceData | null;
  onNavigate?: (direction: "next" | "prev" | "first" | "last") => void;
  navigating?: boolean;
}

export const InvoiceInfoTab: React.FC<InvoiceInfoTabProps> = ({
  editingOrderId,
  currentUser,
  posInfo,
  invoiceData,
  onNavigate,
  navigating,
}) => {
  // استخدام البيانات من الفاتورة الفعلية أو من معلومات POS المخزنة
  const posCode = invoiceData?.pos?.code || posInfo?.code || 'POS-...';
  const posName = invoiceData?.pos?.name || posInfo?.name || '---';
  const branchName = invoiceData?.pos?.branch?.name || 'الفرع الحالي';
  const invoiceNumber = invoiceData?.details?.number || (editingOrderId ? `#${editingOrderId.slice(-6)}` : 'تلقائي عند الحفظ');
  const invoiceDate = invoiceData?.details?.date || new Date().toLocaleDateString('ar-PS');
  const invoiceTime = invoiceData?.details?.time || new Date().toLocaleTimeString('ar-PS', { hour: '2-digit', minute: '2-digit' });
  const currency = invoiceData?.details?.currency || 'ILS';
  const accountNumber = invoiceData?.details?.account_number || '---';
  const exchangeRate = invoiceData?.details?.exchange_rate ?? 1;
  const dailySequence = invoiceData?.details?.daily_sequence ?? null;
  const referenceNumber = invoiceData?.details?.reference_number || null;
  const financialVoucherNumber = invoiceData?.details?.financial_voucher_number || null;
  const vatReportNumber = invoiceData?.details?.vat_report_number || null;
  const journalEntryNumber = invoiceData?.details?.journal_entry_number || null;
  const userName = currentUser?.name || invoiceData?.opening?.user?.name || '-';

  const openingUser = invoiceData?.opening?.user?.name || userName;
  const openingPos = invoiceData?.opening?.pos_name || posName;
  const openingDate = invoiceData?.opening?.date || invoiceDate;
  const openingTime = invoiceData?.opening?.time || invoiceTime;

  const closingUser = invoiceData?.closing?.user?.name || null;
  const closingPos = invoiceData?.closing?.pos_name || null;
  const closingDate = invoiceData?.closing?.date || null;
  const closingTime = invoiceData?.closing?.time || null;

  return (
    <div className="flex-1 bg-slate-900 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 p-3 sm:p-8 overflow-y-auto custom-scrollbar">
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-8">

        {/* ── التنقل بين الفواتير ── */}
        {onNavigate && (
          <div className="flex items-center justify-center gap-1.5 bg-slate-800/50 border border-white/5 rounded-xl p-1.5">
            {([
              { dir: 'first' as const, icon: ChevronsRight, label: 'الأول' },
              { dir: 'prev' as const, icon: ChevronRight, label: 'السابق' },
              { dir: 'next' as const, icon: ChevronLeft, label: 'التالي' },
              { dir: 'last' as const, icon: ChevronsLeft, label: 'الأخير' },
            ]).map(({ dir, icon: Icon, label }) => (
              <button
                key={dir}
                onClick={() => onNavigate(dir)}
                disabled={navigating}
                className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[9px] font-black text-slate-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40"
              >
                {navigating ? <Loader2 size={12} className="animate-spin" /> : <Icon size={12} />}
                {label}
              </button>
            ))}
          </div>
        )}

        {/* ── قسم 1: تفاصيل نقطة البيع ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Monitor size={16} className="text-red-500" />
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">تفاصيل نقطة البيع</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
            {[
              { icon: Hash, label: 'رقم نقطة البيع', value: posCode },
              { icon: Monitor, label: 'اسم نقطة البيع', value: posName },
              { icon: Building2, label: 'الفرع', value: branchName },
              { icon: User, label: 'المستخدم', value: userName },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="space-y-1.5">
                <label className="flex items-center gap-1 text-[9px] font-black text-slate-500 uppercase tracking-widest mr-2">
                  <Icon size={10} className="text-slate-600" />
                  {label}
                </label>
                <div className="p-2 sm:p-3 bg-slate-800 rounded-xl border border-white/5 font-black text-[10px] sm:text-xs text-slate-300">
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── قسم 2: تفاصيل الفاتورة ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileText size={16} className="text-amber-500" />
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">تفاصيل الفاتورة</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
            {[
              { icon: FileText, label: 'رقم الفاتورة', value: invoiceNumber },
              { icon: Hash, label: 'الرقم اليومي', value: dailySequence ?? '---' },
              { icon: Clock, label: 'التاريخ', value: invoiceDate },
              { icon: Clock, label: 'الوقت', value: invoiceTime },
              { icon: DollarSign, label: 'عملة الفاتورة', value: currency === 'ILS' ? 'شيكل فلسطيني (₪)' : currency },
              ...(currency !== 'ILS' ? [{ icon: DollarSign, label: 'سعر الصرف', value: exchangeRate }] : []),
              { icon: CreditCard, label: 'رقم الحساب', value: accountNumber },
              { icon: FileText, label: 'حالة الفاتورة', value: invoiceData?.closing ? 'مدفوعة (Paid)' : 'مسودة (Draft)' },
              { icon: Hash, label: 'الرقم المرجعي (للمرتجعات)', value: referenceNumber ?? '---' },
              { icon: Hash, label: 'رقم السند المالي', value: financialVoucherNumber ?? '---' },
              { icon: Hash, label: 'رقم كشف الضريبة', value: vatReportNumber ?? '---' },
              { icon: Hash, label: 'رقم القيد المحاسبي', value: journalEntryNumber ?? '---' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="space-y-1.5">
                <label className="flex items-center gap-1 text-[9px] font-black text-slate-500 uppercase tracking-widest mr-2">
                  <Icon size={10} className="text-slate-600" />
                  {label}
                </label>
                <div className="p-2 sm:p-3 bg-slate-800 rounded-xl border border-white/5 font-black text-[10px] sm:text-xs text-slate-300">
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── قسم 3: تفاصيل فتح الفاتورة ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Unlock size={16} className="text-emerald-500" />
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">فتح الفاتورة</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
            {[
              { icon: User, label: 'المستخدم', value: openingUser },
              { icon: Monitor, label: 'نقطة البيع', value: openingPos },
              { icon: Clock, label: 'التاريخ', value: openingDate },
              { icon: Clock, label: 'الوقت', value: openingTime },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="space-y-1.5">
                <label className="flex items-center gap-1 text-[9px] font-black text-slate-500 uppercase tracking-widest mr-2">
                  <Icon size={10} className="text-slate-600" />
                  {label}
                </label>
                <div className="p-2 sm:p-3 bg-slate-800 rounded-xl border border-white/5 font-black text-[10px] sm:text-xs text-slate-300">
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── قسم 4: تفاصيل إغلاق الفاتورة (تظهر فقط إذا كانت الفاتورة مدفوعة) ── */}
        {closingUser && closingDate && closingTime && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Lock size={16} className="text-blue-500" />
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">إغلاق الفاتورة</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
              {[
                { icon: User, label: 'المستخدم', value: closingUser },
                { icon: Monitor, label: 'نقطة البيع', value: closingPos || posName },
                { icon: Clock, label: 'التاريخ', value: closingDate },
                { icon: Clock, label: 'الوقت', value: closingTime },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="space-y-1.5">
                  <label className="flex items-center gap-1 text-[9px] font-black text-slate-500 uppercase tracking-widest mr-2">
                    <Icon size={10} className="text-slate-600" />
                    {label}
                  </label>
                  <div className="p-2 sm:p-3 bg-slate-800 rounded-xl border border-white/5 font-black text-[10px] sm:text-xs text-slate-300">
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* رسالة عند عدم وجود تفاصيل إغلاق */}
        {!closingUser && (
          <div className="p-3 bg-slate-800/50 rounded-xl border border-dashed border-white/5 text-center">
            <p className="text-[9px] font-bold text-slate-600">
              لم يتم إغلاق الفاتورة بعد — ستظهر تفاصيل الإغلاق هنا بعد الدفع
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
