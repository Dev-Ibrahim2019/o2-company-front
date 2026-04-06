import { 
  Printer,
  Building2,
} from 'lucide-react';

const SettingsPage = () => (
    <div className="max-w-4xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-8">
        <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-2">
          <Building2 size={24} className="text-red-500" />
          معلومات المطعم الأساسية
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">اسم المطعم</label>
            <input type="text" defaultValue="RestoMaster Pro" className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">الرقم الضريبي</label>
            <input type="text" defaultValue="TR-987654321" className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">العملة الافتراضية</label>
            <select className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none">
              <option>USD ($)</option>
              <option>SAR (ر.س)</option>
              <option>AED (د.إ)</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">نسبة الضريبة (%)</label>
            <input type="number" defaultValue="15" className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50" />
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-white/5">
          <h4 className="text-sm font-bold text-white mb-4">خيارات الدفع المتاحة</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['نقدي', 'مدى / بطاقة', 'Apple Pay', 'محفظة إلكترونية'].map(method => (
              <label key={method} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-white/5 cursor-pointer hover:bg-slate-800 transition-all">
                <input type="checkbox" defaultChecked className="w-4 h-4 accent-red-600" />
                <span className="text-sm text-slate-300">{method}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-red-900/20">
            حفظ التغييرات
          </button>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-8">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Printer size={24} className="text-blue-500" />
          إعدادات الطباعة
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30 border border-white/5">
            <div>
              <p className="text-sm font-bold text-white">طباعة الفاتورة تلقائياً</p>
              <p className="text-xs text-slate-500">طباعة الفاتورة فور إتمام عملية الدفع</p>
            </div>
            <div className="w-12 h-6 bg-red-600 rounded-full relative cursor-pointer">
              <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
            </div>
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30 border border-white/5">
            <div>
              <p className="text-sm font-bold text-white">طباعة طلبات المطبخ</p>
              <p className="text-xs text-slate-500">إرسال بنود الطلب إلى طابعات الأقسام</p>
            </div>
            <div className="w-12 h-6 bg-slate-700 rounded-full relative cursor-pointer">
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  export default SettingsPage;