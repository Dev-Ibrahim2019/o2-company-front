import React, { useEffect, useState } from "react";
import { Users, UserCheck, UserPlus, ShoppingCart, AlertTriangle, Clock, DollarSign, TrendingUp, Loader2 } from "lucide-react";
import type { DashboardAnalytics } from "../../services/callCenterService";
import { callCenterService } from "../../services/callCenterService";
import { TopCustomersTable } from "./TopCustomersTable";

export const CustomerManagementDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    callCenterService.getAnalytics()
      .then(r => setAnalytics(r.data))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-red-500" />
      </div>
    );
  }

  if (!analytics) {
    return <div className="text-center py-12 text-slate-400">فشل تحميل البيانات</div>;
  }

  const cards = [
    { label: "إجمالي العملاء", value: String(analytics.total_customers), icon: Users, color: "text-blue-400 bg-blue-500/10" },
    { label: "العملاء النشطون", value: String(analytics.active_customers), icon: UserCheck, color: "text-emerald-400 bg-emerald-500/10" },
    { label: "جدد هذا الأسبوع", value: String(analytics.new_this_week), icon: UserPlus, color: "text-green-400 bg-green-500/10" },
    { label: "جدد هذا الشهر", value: String(analytics.new_this_month), icon: TrendingUp, color: "text-cyan-400 bg-cyan-500/10" },
    { label: "طلبوا آخر 7 أيام", value: String(analytics.ordered_last_7_days), icon: ShoppingCart, color: "text-purple-400 bg-purple-500/10" },
    { label: "طلبوا آخر 30 يوم", value: String(analytics.ordered_last_30_days), icon: Clock, color: "text-indigo-400 bg-indigo-500/10" },
    { label: "شكاوى مفتوحة", value: String(analytics.open_complaints), icon: AlertTriangle, color: "text-red-400 bg-red-500/10", highlight: analytics.open_complaints > 0 },
    { label: "عملاء غير نشطين", value: String(analytics.inactive_customers), icon: Clock, color: "text-amber-400 bg-amber-500/10" },
    { label: "متوسط قيمة الطلب", value: `${analytics.avg_order_value.toFixed(2)} ₪`, icon: DollarSign, color: "text-emerald-400 bg-emerald-500/10" },
    { label: "قيمة طلبات الشهر", value: `${analytics.total_order_value_month.toFixed(2)} ₪`, icon: DollarSign, color: "text-yellow-400 bg-yellow-500/10" },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h2 className="text-lg font-black text-white mb-1">إدارة العملاء</h2>
        <p className="text-xs text-slate-400">مؤشرات الأداء الرئيسية لخدمة العملاء والكول سنتر</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {cards.map((card) => (
          <div key={card.label} className={`bg-slate-900 border ${card.highlight ? "border-red-500/30" : "border-white/5"} rounded-xl p-4`}>
            <div className={`w-8 h-8 rounded-lg ${card.color} flex items-center justify-center mb-3`}>
              <card.icon size={16} />
            </div>
            <div className="text-2xl font-black text-white mb-1">{card.value}</div>
            <div className="text-[10px] font-bold text-slate-400">{card.label}</div>
          </div>
        ))}
      </div>

      <TopCustomersTable />
    </div>
  );
};
