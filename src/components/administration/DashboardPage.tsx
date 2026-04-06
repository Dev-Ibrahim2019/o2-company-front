import React, { useMemo } from 'react';
import { 
  TrendingUp, 
  Layers, 
  Wallet, 
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  XCircle,
  Smartphone,
  DollarSign,
  CreditCard,
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  AreaChart,
  Area,
  PieChart, 
  Pie, 
} from 'recharts';
import { useApp } from '../../../store';
import { OrderStatus, OrderType, PaymentMethod } from '../../../types';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  trend?: string;
  trendUp?: boolean;
  color?: string;
}

const { 
    activeOrders, 
    menuItems, 
    financialTransactions,
    currentShift
  } = useApp();

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, trend, trendUp, color = "text-red-500" }) => (
  <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-5 hover:border-red-500/30 transition-all group">
    <div className="flex items-center justify-between mb-4">
      <div className={`w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>
        <Icon size={20} />
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-xs font-bold ${trendUp ? 'text-emerald-500' : 'text-red-500'}`}>
          {trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {trend}
        </div>
      )}
    </div>
    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
    <h4 className="text-2xl font-black text-white">{value}</h4>
  </div>
);

const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = activeOrders.filter(o => new Date(o.createdAt) >= today);
    const totalSales = todayOrders.reduce((sum, o) => sum + o.total, 0);
    const invoiceCount = todayOrders.length;
    const avgInvoice = invoiceCount > 0 ? totalSales / invoiceCount : 0;
    
    const todayTransactions = financialTransactions.filter(tx => new Date(tx.timestamp) >= today);
    
    const expenses = todayTransactions
      .filter(tx => tx.type === 'EXPENSE')
      .reduce((sum, tx) => sum + tx.amount, 0);
      
    const withdrawals = todayTransactions
      .filter(tx => tx.type === 'WITHDRAWAL')
      .reduce((sum, tx) => sum + tx.amount, 0);
      
    const deposits = todayTransactions
      .filter(tx => tx.type === 'DEPOSIT')
      .reduce((sum, tx) => sum + tx.amount, 0);
      
    const refunds = todayTransactions
      .filter(tx => tx.type === 'REFUND')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const cashSales = todayOrders
      .filter(o => o.paymentMethod === PaymentMethod.CASH)
      .reduce((sum, o) => sum + o.total, 0);
      
    const cardSales = todayOrders
      .filter(o => o.paymentMethod === PaymentMethod.CREDIT_CARD)
      .reduce((sum, o) => sum + o.total, 0);
      
    const walletSales = todayOrders
      .filter(o => o.paymentMethod === PaymentMethod.WALLET)
      .reduce((sum, o) => sum + o.total, 0);

    const openingCash = currentShift?.openingBalance || 0;
    const netCash = openingCash + cashSales + deposits - expenses - withdrawals - refunds;

    return {
      totalSales,
      invoiceCount,
      avgInvoice,
      expenses,
      withdrawals,
      netCash,
      cashSales,
      cardSales,
      walletSales,
      activeCount: activeOrders.filter(o => o.status !== OrderStatus.COMPLETED && o.status !== OrderStatus.CANCELED).length,
      cancelledCount: activeOrders.filter(o => o.status === OrderStatus.CANCELED).length
    };
  }, [activeOrders, financialTransactions, currentShift]);

  const hourlySalesData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, sales: 0 }));
    activeOrders.forEach(o => {
      const hour = new Date(o.createdAt).getHours();
      hours[hour].sales += o.total;
    });
    return hours;
  }, [activeOrders]);

  const deptSalesData = useMemo(() => {
    const deptSales: Record<string, number> = {};
    activeOrders.forEach(o => {
      o.items.forEach(item => {
        const menuItem = menuItems.find(mi => mi.id === item.itemId);
        if (menuItem) {
          deptSales[menuItem.category] = (deptSales[menuItem.category] || 0) + (item.price * item.quantity);
        }
      });
    });
    return Object.entries(deptSales).map(([id, sales]) => ({ name: id, value: sales }));
  }, [activeOrders, menuItems]);

    const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef'];


const DashboardPage = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="إجمالي المبيعات اليوم" 
          value={`₪${stats.totalSales.toLocaleString()}`} 
          icon={TrendingUp} 
          trend="+12.5%" 
          trendUp={true} 
        />
        <StatCard 
          title="المصروفات" 
          value={`₪${stats.expenses.toLocaleString()}`} 
          icon={ArrowDownRight} 
          color="text-red-500"
        />
        <StatCard 
          title="السحوبات" 
          value={`₪${stats.withdrawals.toLocaleString()}`} 
          icon={Wallet} 
          color="text-orange-500"
        />
        <StatCard 
          title="صافي الصندوق" 
          value={`₪${stats.netCash.toLocaleString()}`} 
          icon={DollarSign} 
          color="text-emerald-500"
        />
      </div>

      {/* Payment Methods Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-bold mb-1">نقدي (Cash)</p>
            <p className="text-xl font-black text-white">₪{stats.cashSales.toLocaleString()}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <DollarSign size={20} />
          </div>
        </div>
        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-bold mb-1">بطاقة (Card)</p>
            <p className="text-xl font-black text-white">₪{stats.cardSales.toLocaleString()}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
            <CreditCard size={20} />
          </div>
        </div>
        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-bold mb-1">تطبيقات (Apps/Wallet)</p>
            <p className="text-xl font-black text-white">₪{stats.walletSales.toLocaleString()}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
            <Smartphone size={20} />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-red-500" />
            مبيعات اليوم حسب الساعة
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlySalesData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="hour" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Layers size={20} className="text-orange-500" />
            مبيعات الأقسام
          </h3>
          <div className="h-[300px] flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deptSalesData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {deptSalesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-1/3 space-y-2">
              {deptSalesData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-xs text-slate-400 truncate">{entry.name}</span>
                  <span className="text-xs font-bold text-white ml-auto">${entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity & Top Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900/50 border border-white/5 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white">آخر الطلبات</h3>
            <button className="text-sm text-red-500 font-bold hover:underline">عرض الكل</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="text-slate-500 text-sm border-b border-white/5">
                  <th className="pb-4 font-medium">رقم الطلب</th>
                  <th className="pb-4 font-medium">العميل</th>
                  <th className="pb-4 font-medium">النوع</th>
                  <th className="pb-4 font-medium">الحالة</th>
                  <th className="pb-4 font-medium">الإجمالي</th>
                  <th className="pb-4 font-medium">الوقت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {activeOrders.slice(0, 5).map(order => (
                  <tr key={order.id} className="text-sm hover:bg-white/5 transition-colors">
                    <td className="py-4 font-bold text-white">#{order.id.slice(-4)}</td>
                    <td className="py-4 text-slate-300">{order.customerName || 'عميل نقدي'}</td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                        order.type === OrderType.DINE_IN ? 'bg-blue-500/10 text-blue-500' :
                        order.type === OrderType.TAKEAWAY ? 'bg-orange-500/10 text-orange-500' :
                        'bg-purple-500/10 text-purple-500'
                      }`}>
                        {order.type}
                      </span>
                    </td>
                    <td className="py-4">
                      <span className={`flex items-center gap-1 text-[10px] font-bold ${
                        order.status === OrderStatus.COMPLETED ? 'text-emerald-500' :
                        order.status === OrderStatus.CANCELED ? 'text-red-500' :
                        'text-blue-500'
                      }`}>
                        {order.status === OrderStatus.COMPLETED ? <CheckCircle2 size={12} /> :
                         order.status === OrderStatus.CANCELED ? <XCircle size={12} /> :
                         <Clock size={12} />}
                        {order.status}
                      </span>
                    </td>
                    <td className="py-4 font-bold text-white">${order.total.toFixed(2)}</td>
                    <td className="py-4 text-slate-500 text-xs">{new Date(order.createdAt).toLocaleTimeString('ar-SA')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-6">الأكثر مبيعاً</h3>
          <div className="space-y-4">
            {menuItems.slice(0, 5).map((item, idx) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 overflow-hidden shrink-0">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{item.name}</p>
                  <p className="text-xs text-slate-500">{item.category}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">124</p>
                  <p className="text-[10px] text-emerald-500 font-bold">+12%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  export default DashboardPage;