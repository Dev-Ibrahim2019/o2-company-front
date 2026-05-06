// src/components/POS/InvoiceInfoTab.tsx
//
// يُظهر بيانات الفاتورة — يستخدم currentUser من AuthContext بدل القيم الوهمية

import React from "react";
import { useAuthContext } from "../../contexts/AuthContext";

interface InvoiceInfoTabProps {
  editingOrderId: string | null;
  // currentUser مُمرَّر من الخارج للتوافق، لكن نأخذ بيانات إضافية من AuthContext
  currentUser?: { name?: string } | null;
}

export const InvoiceInfoTab: React.FC<InvoiceInfoTabProps> = ({
  editingOrderId,
  currentUser,
}) => {
  // نستخدم AuthContext للحصول على بيانات الفرع والمستخدم الكاملة
  const { user } = useAuthContext();

  const displayUser = user ?? currentUser;

  const fields = [
    {
      label: "رقم نقطة البيع",
      value: user?.branch?.code ? `POS-${user.branch.code}` : "POS-001",
    },
    {
      label: "رقم الفاتورة",
      value: editingOrderId
        ? `#${editingOrderId.slice(-6)}`
        : "تلقائي عند الحفظ",
    },
    {
      label: "التاريخ والوقت",
      value: new Date().toLocaleString("ar-PS"),
    },
    {
      label: "عملة الفاتورة",
      value: "شيكل فلسطيني (₪)",
    },
    {
      label: "الفرع",
      value: user?.branch?.name ?? "غير محدد",
    },
    {
      label: "اسم المستخدم",
      value: (displayUser as any)?.name ?? "-",
    },
  ];

  return (
    <div className="flex-1 bg-slate-900 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 p-3 sm:p-8 overflow-y-auto custom-scrollbar">
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
          {fields.map(({ label, value }) => (
            <div key={label} className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mr-2">
                {label}
              </label>
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