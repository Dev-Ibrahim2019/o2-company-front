// src/components/administration/Items/ItemsStats.tsx

import { Package, FolderOpen, AlertCircle, Layers } from "lucide-react";
import { useItems } from "../../../hooks/useItem";
import { useDepartments } from "../../../hooks/useDepartments";

const ItemsStats: React.FC = () => {
  const { items } = useItems();
  const { departments } = useDepartments();

  const stats = {
    total: items.length,
    departments: departments.length,
    withImage: items.filter((i) => !!(i.image_url || i.image || i.image_path)).length,
    withUnit: items.filter((i) => !!i.unit).length,
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
            <Package size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase">
              إجمالي الأصناف
            </p>
            <p className="text-xl font-bold text-white">{stats.total}</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
            <FolderOpen size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase">
              الأقسام
            </p>
            <p className="text-xl font-bold text-white">{stats.departments}</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
            <Layers size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase">
              بها وحدة قياس
            </p>
            <p className="text-xl font-bold text-white">{stats.withUnit}</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
            <AlertCircle size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase">
              بدون صورة
            </p>
            <p className="text-xl font-bold text-white">
              {stats.total - stats.withImage}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemsStats;
