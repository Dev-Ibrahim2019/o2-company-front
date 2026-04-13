import { useApp } from '../../../../store';
import {
  Package,
  CheckCircle2,
  AlertCircle,
  Star
} from "lucide-react";



const ItemsStats: React.FC<{}> = () => {
  const { menuItems } = useApp();

  const stats = {
    total: menuItems.length,
    available: menuItems.filter(i => i.status === "AVAILABLE").length,
    outOfStock: menuItems.filter(i => i.status === "OUT_OF_STOCK").length,
    popular: menuItems.filter(i => i.popular).length,
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      
      <div className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
            <Package size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase">إجمالي الأصناف</p>
            <p className="text-xl font-bold text-white">{stats.total}</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase">متوفر حالياً</p>
            <p className="text-xl font-bold text-white">{stats.available}</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-500/10 rounded-lg text-red-500">
            <AlertCircle size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase">نفذت الكمية</p>
            <p className="text-xl font-bold text-white">{stats.outOfStock}</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
            <Star size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase">الأكثر مبيعاً</p>
            <p className="text-xl font-bold text-white">{stats.popular}</p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ItemsStats;