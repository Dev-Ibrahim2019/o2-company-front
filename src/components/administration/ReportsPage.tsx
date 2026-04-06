
import React, { useState, useEffect } from 'react';
import { useApp } from '../../../store';
import { 
  TrendingUp, 
  Users, 
  Package, 
  Layers, 
  Wallet, 
  Download,
  ChevronRight,
  CheckCircle2,
  Printer,
  Users2
} from 'lucide-react';


const [generatingReport, setGeneratingReport] = useState<string | null>(null);

const { 
    activeOrders, 
    financialTransactions,
  } = useApp();

  interface ReportCardProps {
    title: string;
    description: string;
    icon: React.ElementType;
    color: string;
    onClick?: () => void; 
 }

const ReportCard: React.FC<ReportCardProps> = ({ title, description, icon: Icon, color }) => (
  <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 hover:border-red-500/30 transition-all group cursor-pointer">
    <div className={`w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center ${color} mb-4 group-hover:scale-110 transition-transform`}>
      <Icon size={24} />
    </div>
    <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
    <p className="text-sm text-slate-500 mb-6">{description}</p>
    <div className="flex items-center justify-between text-red-500 font-bold text-sm">
      <span>توليد الآن</span>
      <ChevronRight size={18} />
    </div>
  </div>
);

const ReportsPage = () => {
    const [reportData, setReportData] = useState<any[]>([]);
    
    useEffect(() => {
      if (generatingReport) {
        // Simulate data fetching based on report type
        if (generatingReport === 'تقرير المبيعات اليومي') {
          setReportData(activeOrders.map(o => ({
            id: o.id,
            customer: o.customerName || 'نقدي',
            total: o.total,
            method: o.paymentMethod,
            time: new Date(o.createdAt).toLocaleTimeString('ar-SA')
          })));
        } else if (generatingReport === 'التقرير المالي الختامي') {
          setReportData(financialTransactions.slice(0, 20).map(tx => ({
            id: tx.id,
            type: tx.type,
            amount: tx.amount,
            reason: tx.reason,
            date: new Date(tx.timestamp).toLocaleDateString('ar-SA')
          })));
        } else {
          setReportData([]);
        }
      }
    }, [generatingReport, activeOrders, financialTransactions]);

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {generatingReport ? (
          <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-black text-white">{generatingReport}</h2>
                <p className="text-slate-500 text-sm">تم التوليد في {new Date().toLocaleString('ar-SA')}</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => window.print()}
                  className="bg-slate-800 border border-white/5 rounded-xl px-4 py-2 text-sm font-bold text-white flex items-center gap-2 hover:bg-slate-700 transition-all"
                >
                  <Printer size={18} />
                  طباعة
                </button>
                <button 
                  onClick={() => setGeneratingReport(null)}
                  className="bg-red-500 rounded-xl px-4 py-2 text-sm font-bold text-white hover:bg-red-600 transition-all"
                >
                  إغلاق
                </button>
              </div>
            </div>
            
            {reportData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead>
                    <tr className="text-slate-500 text-xs font-bold uppercase border-b border-white/5">
                      {Object.keys(reportData[0]).map(key => (
                        <th key={key} className="px-4 py-3">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {reportData.map((row, idx) => (
                      <tr key={idx} className="text-sm text-slate-300 hover:bg-white/5 transition-colors">
                        {Object.values(row).map((val: any, i) => (
                          <td key={i} className="px-4 py-3">
                            {typeof val === 'number' ? `₪${val.toLocaleString()}` : val}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-8 flex justify-end gap-4">
                  <button className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl px-6 py-3 text-sm font-bold hover:bg-emerald-500/20 transition-all flex items-center gap-2">
                    <Download size={18} />
                    تصدير Excel
                  </button>
                  <button className="bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-xl px-6 py-3 text-sm font-bold hover:bg-blue-500/20 transition-all flex items-center gap-2">
                    <Download size={18} />
                    تصدير PDF
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-20 text-center space-y-4">
                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mx-auto">
                  <CheckCircle2 size={40} />
                </div>
                <h3 className="text-xl font-bold text-white">تم تجهيز التقرير بنجاح</h3>
                <p className="text-slate-500 max-w-sm mx-auto">لا توجد بيانات كافية لعرضها في الجدول حالياً، ولكن يمكنك تصدير التقرير الفارغ.</p>
                <button className="mt-4 bg-slate-800 border border-white/5 rounded-xl px-6 py-3 text-sm font-bold text-white hover:bg-slate-700 transition-all flex items-center gap-2 mx-auto">
                  <Download size={18} />
                  تنزيل بصيغة PDF
                </button>
              </div>
            )}
          </div>
        ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ReportCard 
              title="تقرير المبيعات اليومي" 
              description="ملخص كامل للمبيعات، الضرائب، وطرق الدفع لليوم الحالي."
              icon={TrendingUp}
              color="text-red-500"
              onClick={() => setGeneratingReport('تقرير المبيعات اليومي')}
            />
            <ReportCard 
              title="تقرير أداء الموظفين" 
              description="تحليل لإنتاجية الموظفين، ساعات العمل، والمبيعات المحققة."
              icon={Users2}
              color="text-blue-500"
              onClick={() => setGeneratingReport('تقرير أداء الموظفين')}
            />
            <ReportCard 
              title="تقرير المخزون والمنيو" 
              description="الأصناف الأكثر مبيعاً، الأصناف الراكدة، وتحليل التكاليف."
              icon={Package}
              color="text-orange-500"
              onClick={() => setGeneratingReport('تقرير المخزون والمنيو')}
            />
            <ReportCard 
              title="تقرير العملاء والولاء" 
              description="تحليل سلوك العملاء، نقاط الولاء، والعملاء الأكثر تردداً."
              icon={Users}
              color="text-purple-500"
              onClick={() => setGeneratingReport('تقرير العملاء والولاء')}
            />
            <ReportCard 
              title="التقرير المالي الختامي" 
              description="الأرباح والخسائر، التدفقات النقدية، والميزانية العمومية."
              icon={Wallet}
              color="text-emerald-500"
              onClick={() => setGeneratingReport('التقرير المالي الختامي')}
            />
            <ReportCard 
              title="تقرير الأقسام والمطبخ" 
              description="أداء الأقسام، أوقات التحضير، ونسبة الهالك."
              icon={Layers}
              color="text-amber-500"
              onClick={() => setGeneratingReport('تقرير الأقسام والمطبخ')}
            />
          </div>

          <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-6">تخصيص تقرير جديد</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">نوع التقرير</label>
                <select className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2 text-sm text-white focus:outline-none">
                  <option>مبيعات</option>
                  <option>مصروفات</option>
                  <option>موظفين</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">من تاريخ</label>
                <input type="date" className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2 text-sm text-white focus:outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">إلى تاريخ</label>
                <input type="date" className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2 text-sm text-white focus:outline-none" />
              </div>
              <div className="flex items-end">
                <button 
                  onClick={() => setGeneratingReport('تقرير مخصص')}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl font-bold text-sm transition-all shadow-lg shadow-red-900/20"
                >
                  توليد التقرير
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

 export default ReportsPage;