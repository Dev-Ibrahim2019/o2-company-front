import React, { useEffect, useState } from 'react';
import { Landmark, Loader2 } from 'lucide-react';
import api from '../../api/axios';

interface AccountingSettingRow {
  key: string;
  value: string | null;
  description: string | null;
}

const LABELS: Record<string, string> = {
  allowed_discount_account: 'حساب الخصم المسموح',
  vat_account: 'حساب الضريبة المضافة',
  service_charge_account: 'حساب بدل الخدمة',
  minimum_order_limit_account: 'حساب الحد الأدنى',
  sales_revenue_account: 'حساب إيراد المبيعات',
  extra_chairs_account: 'حساب زبون اضافي',
};

export const AccountsInfoTab: React.FC = () => {
  const [rows, setRows] = useState<AccountingSettingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.get('/accounting-settings')
      .then(({ data }) => {
        if (!cancelled) setRows(data.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex-1 bg-slate-900 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 p-3 sm:p-8 overflow-y-auto custom-scrollbar">
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Landmark size={16} className="text-red-500" />
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">أرقام الحسابات</h3>
          </div>
          <p className="text-[9px] font-bold text-slate-600 mb-4">
            حسابات محاسبية عامة على مستوى المنشأة — تُدار من لوحة الإدارة، للاطلاع فقط هون.
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="text-red-500 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
              {rows.map((row) => (
                <div key={row.key} className="space-y-1.5">
                  <label className="flex items-center gap-1 text-[9px] font-black text-slate-500 uppercase tracking-widest mr-2">
                    {LABELS[row.key] ?? row.description ?? row.key}
                  </label>
                  <div className="p-2 sm:p-3 bg-slate-800 rounded-xl border border-white/5 font-black text-[10px] sm:text-xs text-slate-300">
                    {row.value || '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
