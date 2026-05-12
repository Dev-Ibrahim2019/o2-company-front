import React from 'react';

interface InvoiceInfoTabProps {
  editingOrderId: string | null;
  currentUser: { name: string } | null;
}

export const InvoiceInfoTab: React.FC<InvoiceInfoTabProps> = ({ editingOrderId, currentUser }) => {
  return (
    <div className="flex-1 bg-slate-900 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 p-3 sm:p-8 overflow-y-auto custom-scrollbar">
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
          {[
            { label: 'رقم نقطة البيع', value: 'POS-001' },
            { label: 'رقم الفاتورة', value: editingOrderId ? `#${editingOrderId.slice(-6)}` : 'تلقائي عند الحفظ' },
            { label: 'التاريخ والوقت', value: new Date().toLocaleString('ar-PS') },
            { label: 'عملة الفاتورة', value: 'شيكل فلسطيني (₪)' },
            { label: 'رقم الحساب', value: 'ACC-9988-22' },
            { label: 'اسم المستخدم', value: currentUser?.name || '-' },
          ].map(({ label, value }) => (
            <div key={label} className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mr-2">{label}</label>
              <div className="p-2 sm:p-3 bg-slate-800 rounded-xl border border-white/5 font-black text-[10px] sm:text-xs text-slate-300">
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
