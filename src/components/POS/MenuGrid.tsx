// src/components/POS/MenuGrid.tsx

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Package } from 'lucide-react';
import type { MenuCategory, MenuItem } from "../../hooks/useMenu";

interface MenuGridProps {
  categories: MenuCategory[];
  selectedCategory: string;        // 'all' أو id القسم كـ string
  setSelectedCategory: (cat: string) => void;
  searchQuery: string;
  addToCart: (item: MenuItem) => void;
  loading?: boolean;
}

export const MenuGrid: React.FC<MenuGridProps> = ({
  categories,
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  addToCart,
  loading = false,
}) => {
  // ── Filtered items ────────────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase();

    return categories
      .filter(cat => selectedCategory === 'all' || String(cat.id) === selectedCategory)
      .flatMap(cat => cat.items)
      .filter(item =>
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.name_ar.toLowerCase().includes(q) ||
        String(item.id).includes(q) ||
        item.code.toLowerCase().includes(q)
      );
  }, [categories, selectedCategory, searchQuery]);

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 overflow-y-auto pb-6 pr-1 custom-scrollbar">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="flex flex-col gap-2 animate-pulse">
            <div className="aspect-square rounded-2xl bg-slate-800" />
            <div className="h-3 bg-slate-800 rounded w-3/4" />
            <div className="h-3 bg-slate-800 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* ── Category Tabs ── */}
      <div className="mb-3 flex flex-wrap gap-1 shrink-0 sticky top-0 z-10 py-1">
        {/* زر "الكل" */}
        <button
          onClick={() => setSelectedCategory('all')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg whitespace-nowrap text-[8px] font-black transition-all duration-200 border ${selectedCategory === 'all'
            ? 'bg-red-600 text-white border-red-600 shadow-sm'
            : 'bg-slate-900 text-slate-500 border-white/5 hover:bg-slate-800'
            }`}
        >
          <span className="text-[10px]">🍽️</span>
          <span>الكل</span>
        </button>

        {/* أقسام المنيو */}
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(String(cat.id))}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg whitespace-nowrap text-[8px] font-black transition-all duration-200 border ${selectedCategory === String(cat.id)
              ? 'bg-red-600 text-white border-red-600 shadow-sm'
              : 'bg-slate-900 text-slate-500 border-white/5 hover:bg-slate-800'
              }`}
          >
            <span className="text-[10px]">{cat.icon}</span>
            <span>{cat.name_ar || cat.name}</span>
          </button>
        ))}
      </div>

      {/* ── Items Grid ── */}
      <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 overflow-y-auto pr-1 pb-6 custom-scrollbar">
        {filteredItems.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-600 gap-3">
            <Package size={40} strokeWidth={1} />
            <p className="font-black text-xs">
              {searchQuery ? 'لا توجد نتائج مطابقة' : 'لا توجد أصناف في هذا القسم'}
            </p>
          </div>
        ) : (
          filteredItems.map(item => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => addToCart(item)}
              className="group cursor-pointer flex flex-col gap-2"
            >
              {/* Image */}
              <div className="aspect-square relative rounded-2xl overflow-hidden bg-slate-900 border border-white/5 group-hover:border-red-600/50 transition-all duration-300 shadow-lg">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name_ar}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-700">
                    <Package size={32} strokeWidth={1} />
                  </div>
                )}

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* Badge رقم الصنف */}
                <div className="absolute top-2 right-2 bg-red-600 text-white px-1.5 py-0.5 rounded-md text-[8px] font-black shadow-lg border border-white/10">
                  #{item.id}
                </div>
              </div>

              {/* Info */}
              <div className="px-1">
                <h4 className="font-black text-slate-100 text-[9px] leading-tight group-hover:text-red-500 transition-colors line-clamp-2">
                  {item.name_ar || item.name}
                </h4>
                <div className="flex items-center justify-between mt-0.5">
                  {/* ✅ السعر يجي من pivot الفرع */}
                  <span className="text-[10px] font-black text-red-500">
                    {item.price > 0 ? `${item.price.toFixed(2)} ₪` : '—'}
                  </span>
                  {item.unit && (
                    <span className="text-[8px] text-slate-600 font-bold">{item.unit}</span>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </>
  );
};