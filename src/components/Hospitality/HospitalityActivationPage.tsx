/**
 * HospitalityActivationPage.tsx — واجهة قفل وتفعيل أجهزة الضيافة
 */

import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { HeartHandshake, KeyRound, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { saveDeviceUUIDSecurely } from '../../utils/hospitalitySecurity';

interface Props {
  onActivationSuccess: (hospitalityInfo: any) => void;
}

const HospitalityActivationPage: React.FC<Props> = ({ onActivationSuccess }) => {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const checkExistingDevice = async () => {
      const cachedUuid = localStorage.getItem('hospitality_device_uuid');
      const cachedInfoRaw = localStorage.getItem('hospitality_register_info');

      if (cachedUuid && cachedInfoRaw) {
        try {
          const hospitalityInfo = JSON.parse(cachedInfoRaw);
          onActivationSuccess(hospitalityInfo);
        } catch (e) {
          localStorage.removeItem('hospitality_register_info');
        }
      }
    };

    checkExistingDevice();
  }, [onActivationSuccess]);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
        const response = await api.post('/hospitality/activate', {
            token: token.trim().toUpperCase(), 
        });

        const { device_uuid, hospitality_info } = response.data;

        if (device_uuid && hospitality_info) {
            setSuccess('تم التحقق وتفعيل جهاز الضيافة بنجاح! جاري التهيئة...');
            
            await saveDeviceUUIDSecurely(device_uuid);

            localStorage.setItem('hospitality_register_info', JSON.stringify(hospitality_info));

            setTimeout(() => {
              onActivationSuccess(hospitality_info);
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
        
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-rose-600/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-emerald-600/10 rounded-full blur-2xl" />

        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-slate-800 border border-white/10 rounded-2xl flex items-center justify-center mx-auto text-rose-500 shadow-inner">
            <HeartHandshake size={32} />
          </div>
          <h2 className="text-xl font-black tracking-tight mt-4">تفعيل جهاز الضيافة</h2>
          <p className="text-xs text-slate-400 font-bold">هذا الجهاز غير معرّف كجهاز ضيافة نشط في النظام حالياً.</p>
        </div>

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
                className="w-full bg-slate-950 border border-white/10 rounded-xl pr-10 pl-4 py-3 text-center font-mono text-lg font-black tracking-widest text-white uppercase outline-none focus:ring-2 focus:ring-rose-600 focus:border-transparent transition-all disabled:opacity-50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !token.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg active:scale-[0.98]"
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

export default HospitalityActivationPage;
