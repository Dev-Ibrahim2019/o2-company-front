import { useState } from "react";
import { useApp } from "../../../../store";
import { Search, Plus, Filter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ItemsSearch: React.FC = () => {
  const { menuItems, departments } = useApp();

  const [menuSearchQuery, setMenuSearchQuery] = useState("");

  const [menuFilters, setMenuFilters] = useState({
    departmentId: "all",
    status: "all",
    popular: false,
    chefRecommended: false,
    seasonal: false,
  });

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full max-w-md">
          <Search
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
            size={18}
          />
          <input
            type="text"
            placeholder="البحث عن صنف بالاسم أو الكود..."
            value={menuSearchQuery}
            onChange={(e) => setMenuSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-white/5 rounded-xl py-2.5 pr-10 pl-4 text-sm text-white focus:outline-none focus:border-red-500/50 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="hidden md:block px-3 py-1 bg-slate-800 rounded-full border border-white/5">
            <span className="text-[10px] font-bold text-slate-400">
              نتائج البحث: {filteredMenuItems.length}
            </span>
          </div>

          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`flex-1 md:flex-none border px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all ${
              showAdvancedFilters
                ? "bg-red-600/10 border-red-600/50 text-red-500"
                : "bg-slate-900 border-white/5 text-white hover:bg-slate-800"
            }`}
          >
            <Filter size={18} />
            تصفية متقدمة
          </button>

          <button
            onClick={() => openModal("MENU_ITEM")}
            className="flex-1 md:flex-none bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all shadow-lg shadow-red-900/20"
          >
            <Plus size={18} />
            إضافة صنف جديد
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showAdvancedFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase">
                  القسم
                </label>
                <select
                  value={menuFilters.departmentId}
                  onChange={(e) =>
                    setMenuFilters((prev) => ({
                      ...prev,
                      departmentId: e.target.value,
                    }))
                  }
                  className="w-full bg-slate-800 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="all">الكل</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nameAr || d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase">
                  الحالة
                </label>
                <select
                  value={menuFilters.status}
                  onChange={(e) =>
                    setMenuFilters((prev) => ({
                      ...prev,
                      status: e.target.value,
                    }))
                  }
                  className="w-full bg-slate-800 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="all">الكل</option>
                  <option value="AVAILABLE">متوفر</option>
                  <option value="UNAVAILABLE">غير متوفر</option>
                  <option value="OUT_OF_STOCK">نفذت الكمية</option>
                </select>
              </div>

              <div className="flex items-end gap-2">
                <button
                  onClick={() => {
                    setMenuSearchQuery("");
                    setMenuFilters({
                      departmentId: "all",
                      status: "all",
                      popular: false,
                      chefRecommended: false,
                      seasonal: false,
                    });
                  }}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-[10px] font-bold transition-all"
                >
                  إعادة تعيين
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ItemsSearch;