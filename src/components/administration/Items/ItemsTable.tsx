import { useState } from "react";
import { useApp } from "../../../../store";
import {
  Clock,
  Edit2,
  Trash2,
  Monitor,
  ChefHat,
  Star,
  Tag,
} from "lucide-react";

const ItemsTable: React.FC = () => {
  const { menuItems, departments, deleteMenuItem } = useApp();

  const [menuSearchQuery] = useState("");

  const [menuFilters] = useState({
    departmentId: "all",
    status: "all",
    popular: false,
    chefRecommended: false,
    seasonal: false,
  });

  const [modalType, setModalType] = useState<
    "DEPARTMENT" | "MENU_ITEM" | "EMPLOYEE" | "CUSTOMER" | null
  >(null);

  const [editingItem, setEditingItem] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = (
    type: "DEPARTMENT" | "MENU_ITEM" | "EMPLOYEE" | "CUSTOMER",
    item: any = null
  ) => {
    setModalType(type);
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const filteredMenuItems = menuItems.filter((item) => {
    const matchesSearch =
      item.nameAr.toLowerCase().includes(menuSearchQuery.toLowerCase()) ||
      item.name.toLowerCase().includes(menuSearchQuery.toLowerCase()) ||
      item.code?.toLowerCase().includes(menuSearchQuery.toLowerCase());

    const matchesDept =
      menuFilters.departmentId === "all" ||
      item.departmentId === menuFilters.departmentId;

    const matchesStatus =
      menuFilters.status === "all" || item.status === menuFilters.status;

    const matchesPopular = !menuFilters.popular || item.popular;
    const matchesChef = !menuFilters.chefRecommended || item.chefRecommended;
    const matchesSeasonal = !menuFilters.seasonal || item.seasonal;

    return (
      matchesSearch &&
      matchesDept &&
      matchesStatus &&
      matchesPopular &&
      matchesChef &&
      matchesSeasonal
    );
  });

  return (
    <div className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="text-slate-500 text-[10px] uppercase tracking-wider border-b border-white/5">
                  <th className="p-4 font-bold">الصنف والمعلومات</th>
                  <th className="p-4 font-bold">القسم</th>
                  <th className="p-4 font-bold">التسعير</th>
                  <th className="p-4 font-bold">العمليات</th>
                  <th className="p-4 font-bold">الأداء</th>
                  <th className="p-4 font-bold">الحالة</th>
                  <th className="p-4 font-bold">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredMenuItems.map(item => (
                  <tr key={item.id} className="text-sm hover:bg-white/5 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-800 overflow-hidden shrink-0 border border-white/5 relative">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          {item.popular && (
                            <div className="absolute top-0 right-0 p-0.5 bg-orange-500 text-white rounded-bl-lg">
                              <Star size={8} fill="currentColor" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-white">{item.nameAr || item.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              <Tag size={10} />
                              {item.code || `IT-${item.id.slice(-4)}`}
                            </span>
                            {item.chefRecommended && (
                              <span className="text-[8px] bg-red-500/10 text-red-500 px-1 rounded flex items-center gap-0.5">
                                <ChefHat size={8} />
                                توصية
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-slate-300 font-medium">
                          {departments.find(d => d.id === item.departmentId)?.nameAr || 'غير محدد'}
                        </span>
                        <span className="text-[10px] text-slate-500">{item.category}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-white">${item.price.toFixed(2)}</span>
                        {item.offerPrice && (
                          <span className="text-[10px] text-emerald-500 line-through opacity-50">${item.offerPrice.toFixed(2)}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <Clock size={12} />
                          {item.prepTime} دقيقة
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <Monitor size={12} />
                          {item.requiresKitchen ? 'مطبخ' : 'مباشر'}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-white font-bold">{item.stats?.salesCount || 0} مبيعات</span>
                        <span className="text-[10px] text-slate-500">${(item.stats?.totalRevenue || 0).toLocaleString()} إيراد</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                        item.status === 'AVAILABLE' ? 'bg-emerald-500/10 text-emerald-500' : 
                        item.status === 'OUT_OF_STOCK' ? 'bg-orange-500/10 text-orange-500' :
                        'bg-red-500/10 text-red-500'
                      }`}>
                        {item.status === 'AVAILABLE' ? 'متوفر' : 
                         item.status === 'OUT_OF_STOCK' ? 'نفذ' : 'غير متاح'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => openModal('MENU_ITEM', item)}
                          className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors"
                          title="تعديل"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => deleteMenuItem(item.id)}
                          className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                          title="حذف"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
  );
};

export default ItemsTable;