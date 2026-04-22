import React from 'react';
import { motion } from 'framer-motion';
import { CATEGORIES } from '../../../constants';

interface MenuItem {
  id: string;
  nameAr: string;
  name: string;
  image: string;
  category: string;
  price: number;
  dineInPrice?: number;
  takeawayPrice?: number;
  deliveryPrice?: number;
  offerPrice?: number;
  offerStartDate?: string;
  offerEndDate?: string;
}

interface MenuGridProps {
  filteredItems: MenuItem[];
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  getItemCurrentPrice: (item: MenuItem) => number;
  addToCart: (item: MenuItem) => void;
}

export const MenuGrid: React.FC<MenuGridProps> = ({
  filteredItems, selectedCategory, setSelectedCategory, getItemCurrentPrice, addToCart,
}) => {
  return (
    <>
      <div className="mb-3 flex flex-wrap gap-1 shrink-0 sticky top-0 z-10 py-1">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg whitespace-nowrap text-[8px] font-black transition-all duration-200 border ${
              selectedCategory === cat.id
                ? 'bg-red-600 text-white border-red-600 shadow-sm'
                : 'bg-slate-900 text-slate-500 border-white/5 hover:bg-slate-800'
            }`}
          >
            <span className="text-[10px]">{cat.icon}</span>
            <span>{cat.name}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 overflow-y-auto pr-1 pb-6 custom-scrollbar">
        {filteredItems.map(item => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => addToCart(item)}
            className="group cursor-pointer flex flex-col gap-2"
          >
            <div className="aspect-square relative rounded-2xl overflow-hidden bg-slate-900 border border-white/5 group-hover:border-red-600/50 transition-all duration-300 shadow-lg">
              <img
                src={item.image}
                alt={item.nameAr}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute top-2 right-2 bg-red-600 text-white px-1.5 py-0.5 rounded-md text-[8px] font-black shadow-lg border border-white/10">
                #{item.id}
              </div>
            </div>

            <div className="px-1 space-y-0">
              <div className="flex items-center justify-between gap-1">
                <h4 className="font-black text-slate-100 text-[9px] leading-tight group-hover:text-red-500 transition-colors line-clamp-1 flex-1">
                  {item.nameAr}
                </h4>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-red-500">{getItemCurrentPrice(item)} ₪</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </>
  );
};
