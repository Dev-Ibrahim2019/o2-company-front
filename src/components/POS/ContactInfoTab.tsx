import React from 'react';
import { Phone, Smartphone, MapPin, User, Calendar, FileText } from 'lucide-react';

interface ContactInfoTabProps {
  customerName: string;
  setCustomerName: (v: string) => void;
  customerPhone: string;
  setCustomerPhone: (v: string) => void;
  customerMobile: string;
  setCustomerMobile: (v: string) => void;
  customerAddress: string;
  setCustomerAddress: (v: string) => void;
  scheduledAt: string;
  setScheduledAt: (v: string) => void;
  customerNotes: string;
  setCustomerNotes: (v: string) => void;
}

export const ContactInfoTab: React.FC<ContactInfoTabProps> = ({
  customerName, setCustomerName,
  customerPhone, setCustomerPhone,
  customerMobile, setCustomerMobile,
  customerAddress, setCustomerAddress,
  scheduledAt, setScheduledAt,
  customerNotes, setCustomerNotes,
}) => {
  const fields: Array<{
    icon: React.ElementType;
    label: string;
    value: string;
    onChange: (v: string) => void;
    type?: string;
    placeholder?: string;
  }> = [
    { icon: User, label: 'اسم الزبون', value: customerName, onChange: setCustomerName, placeholder: 'اسم الزبون...' },
    { icon: Phone, label: 'رقم الهاتف', value: customerPhone, onChange: setCustomerPhone, placeholder: 'رقم الهاتف...' },
    { icon: Smartphone, label: 'رقم الجوال', value: customerMobile, onChange: setCustomerMobile, placeholder: 'رقم الجوال...' },
    { icon: MapPin, label: 'العنوان', value: customerAddress, onChange: setCustomerAddress, placeholder: 'العنوان...' },
    { icon: Calendar, label: 'تاريخ ووقت ثاني', value: scheduledAt, onChange: setScheduledAt, type: 'datetime-local' },
  ];

  return (
    <div className="flex-1 bg-slate-900 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 p-3 sm:p-8 overflow-y-auto custom-scrollbar">
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Phone size={16} className="text-red-500" />
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">بيانات التواصل</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
            {fields.map(({ icon: Icon, label, value, onChange, type, placeholder }) => (
              <div key={label} className="space-y-1.5">
                <label className="flex items-center gap-1 text-[9px] font-black text-slate-500 uppercase tracking-widest mr-2">
                  <Icon size={10} className="text-slate-600" />
                  {label}
                </label>
                <input
                  type={type ?? 'text'}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder={placeholder}
                  className="w-full p-2 sm:p-3 bg-slate-800 rounded-xl border border-white/5 outline-none focus:ring-1 focus:ring-red-600 font-black text-[10px] sm:text-xs text-white placeholder:text-slate-600"
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileText size={16} className="text-amber-500" />
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">ملاحظات</h3>
          </div>
          <textarea
            value={customerNotes}
            onChange={(e) => setCustomerNotes(e.target.value)}
            rows={4}
            placeholder="ملاحظات على الزبون أو الطلب..."
            className="w-full p-3 bg-slate-800 rounded-xl border border-white/5 outline-none focus:ring-1 focus:ring-red-600 font-bold text-xs text-white placeholder:text-slate-600 resize-none"
          />
        </div>
      </div>
    </div>
  );
};
