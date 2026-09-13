/**
 * POSActivationPage.tsx — واجهة قفل وتفعيل أجهزة نقاط البيع
 */

import React, { useState, useEffect } from 'react'; // 👈 تم إضافة useEffect هنا
import api from '../../api/axios'; 
import { Monitor, KeyRound, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  saveDeviceUUIDSecurely,
  saveRegisterInfoSecurely,
  getDeviceUUIDSecurely,
  getRegisterInfoSecurely,
} from '../../utils/posSecurity';

interface Props {
  onActivationSuccess: (registerInfo: any) => void;
}

const POSActivationPage: React.FC<Props> = ({ onActivationSuccess }) => {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  /* ══════════════════════════════════════════════════════════════
   * 🛡️ الفحص التلقائي — التخطّي والدخول الفوري إذا كان الجهاز مفعلاً مسبقاً
   * ══════════════════════════════════════════════════════════════ */
  useEffect(() => {
    const checkExistingDevice = async () => {
      // نقرأ من المستودع المزدوج الآمن (LocalStorage + IndexedDB مع ترميم متبادل)
      // حتى لو مُسح كاش LocalStorage يبقى الجهاز مفعّلاً بلا إعادة إدخال الكود.
      const cachedUuid = await getDeviceUUIDSecurely();
      const posInfo = await getRegisterInfoSecurely();

      if (cachedUuid && posInfo) {
        // إذا كانت البيانات سليمة وموجودة، نبلغ الأب بالنجاح مباشرة لتخطي شاشة التفعيل
        onActivationSuccess(posInfo);
      }
    };

    checkExistingDevice();
  }, [onActivationSuccess]);

  /* ══════════════════════════════════════════════════════════════
   * ⚙️ دالة التفعيل عند إرسال الكود يدوياً
   * ══════════════════════════════════════════════════════════════ */
  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
        // 1. ضرب الـ API فقط باستخدام الـ token وبدون إرسال الـ device_uuid من هنا
        const response = await api.post('/pos/activate', {
            token: token.trim().toUpperCase(), 
        });

        // 2. نقرأ البيانات الراجعة من السيرفر مباشرة
        const { device_uuid, pos_info } = response.data;

        if (device_uuid && pos_info) {
            setSuccess('تم التحقق وتفعيل نقطة البيع بنجاح! جاري التهيئة...');
            
            // 3. تخزين الـ UUID ومعلومات نقطة البيع في المستودع المزدوج الآمن فوراً
            await saveDeviceUUIDSecurely(device_uuid);
            await saveRegisterInfoSecurely(pos_info);

            // 4. إعلام المكون الأب بالنجاح لتغيير الواجهة والانتقال لشاشة الكاشير
            setTimeout(() => {
              onActivationSuccess(pos_info);
            }, 2000);
        }
    } catch (err: any) {
      setError(err.response?.data?.message || 'فشل التفعيل! تأكد من الكود أو أنك متصل بشبكة إنترنت الفرع.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 text-white p-4 font-sans" dir="rtl">
      <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-8 shadow-2xl space-y-6 relative overflow-hidden">
        
        {/* ديكور وتأثيرات بصرية خلفية لتعطي طابع الأمان */}
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-red-600/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-emerald-600/10 rounded-full blur-2xl" />

        {/* الأيقونة والهيدر */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-slate-800 border border-white/10 rounded-2xl flex items-center justify-center mx-auto text-red-500 shadow-inner">
            <Monitor size={32} />
          </div>
          <h2 className="text-xl font-black tracking-tight mt-4">تفعيل جهاز نقطة البيع</h2>
          <p className="text-xs text-slate-400 font-bold">هذا الجهاز غير معرّف كنقطة بيع نشطة في النظام حالياً.</p>
        </div>

        {/* رسائل الخطأ والنجاح */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-600/20 text-red-400 rounded-xl text-xs font-bold border border-red-500/10">
            <AlertCircle size={16} className="shrink-0" /> <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 p-3 bg-emerald-600/20 text-emerald-400 rounded-xl text-xs font-bold border border-emerald-500/10">
            <CheckCircle2 size={16} className="shrink-0" /> <span>{success}</span>
          </div>
        )}

        {/* فورم إدخال الكود */}
        <form onSubmit={handleActivate} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">كود التفعيل (من لوحة الإدارة)</label>
            <div className="relative">
              <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                maxLength={6}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="مثل: X89TR4"
                disabled={loading}
                className="w-full bg-slate-950 border border-white/10 rounded-xl pr-10 pl-4 py-3 text-center font-mono text-lg font-black tracking-widest text-white uppercase outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all disabled:opacity-50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !token.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg active:scale-[0.98]"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" /> جاري فحص القيود والأمان...
              </>
            ) : (
              'تفعيل وربط الجهاز الحصري'
            )}
          </button>
        </form>

        <div className="text-center">
          <p className="text-[10px] text-slate-500 font-bold">
            يتطلب التفعيل التواجد داخل الفرع والاتصال بشبكة الإنترنت الرسمية للمنشأة.
          </p>
        </div>
      </div>
    </div>
  );
};

export default POSActivationPage;