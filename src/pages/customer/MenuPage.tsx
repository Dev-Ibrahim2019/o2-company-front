import { useState, useMemo, useRef } from 'react'
import { useParams } from 'react-router-dom'
import {
  Search,
  Salad,
  Soup,
  Flame,
  UtensilsCrossed,
  CupSoda,
  CakeSlice,
  type LucideIcon,
  Grid3X3,
  List,
} from 'lucide-react'
import { MenuItemCard } from '../../components/customer/menu-item-card'
import { MenuItemCardGrid } from '../../components/customer/menu-item-card-grid'
import { BottomNav } from '../../components/customer/bottom-nav'
import { useCart } from '../../components/customer/cart-provider'
import { cn } from '../../utils/utils'

const iconMap: Record<string, LucideIcon> = {
  Salad,
  Soup,
  Flame,
  UtensilsCrossed,
  CupSoda,
  CakeSlice,
}

export default function MenuPage() {
  const { qrCode } = useParams<{ qrCode: string }>()
  const { categories, allItems, tableNumber, restaurant, placedItems, activeOrderData } = useCart()

  const [active, setActive] = useState(categories[0]?.id ?? 0)
  const [query, setQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  const filtered = useMemo(() => {
    if (!query.trim()) return allItems
    const q = query.trim()
    return allItems.filter(
      (i) => i.name.includes(q) || i.name_ar.includes(q),
    )
  }, [query, allItems])

  function scrollToCategory(id: number) {
    setActive(id)
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const visibleCategories = query.trim()
    ? categories.filter((c) => filtered.some((i) => i.category_id === c.id))
    : categories

  return (
    <main className="mx-auto min-h-screen max-w-md pb-28 bg-[#0b0f12]">
      {/* Header */}
      <header className="relative overflow-hidden rounded-b-[2.5rem] border-b border-[#30363d] bg-gradient-to-b from-[#161b22] to-[#0b0f12] px-5 pb-6 pt-8">
        <div className="absolute left-0 top-0 h-40 w-40 bg-gradient-to-br from-[#c8a44e]/15 to-transparent blur-3xl" />
        <div className="absolute right-0 top-0 h-32 w-32 bg-gradient-to-bl from-[#c8a44e]/10 to-transparent blur-2xl" />

        <div className="relative flex justify-between items-center">
          <p className="font-serif text-sm text-[#c8a44e] tracking-wide">{restaurant.name}</p>
          <div className="flex items-center gap-2">
            {tableNumber && (
              <span className="bg-[#c8a44e]/10 text-[#c8a44e] text-xs px-2.5 py-1 rounded-full font-semibold border border-[#c8a44e]/20">
                طاولة: {tableNumber}
              </span>
            )}
          </div>
        </div>

        <h1 className="relative mt-1 font-serif text-3xl font-bold text-white">قائمة الطعام</h1>
        <p className="relative mt-1 text-sm text-[#8b949e]">
          اختر أطباقك المفضلة وأضفها إلى طلبك
        </p>

        <div className="relative mt-5 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-4 top-1/2 size-5 -translate-y-1/2 text-[#8b949e]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن طبق..."
              className="w-full rounded-2xl border border-[#30363d] bg-[#0b0f12]/80 py-3.5 pr-12 pl-4 text-sm text-white outline-none transition-all placeholder:text-[#8b949e] focus:border-[#c8a44e]/50 focus:ring-2 focus:ring-[#c8a44e]/10"
            />
          </div>
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-[#30363d] bg-[#161b22] text-[#8b949e] hover:text-[#c8a44e] hover:border-[#c8a44e]/30 transition-all"
            title={viewMode === 'grid' ? 'عرض كقائمة' : 'عرض كشبكة'}
          >
            {viewMode === 'grid' ? <List className="size-5" /> : <Grid3X3 className="size-5" />}
          </button>
        </div>
      </header>

      {/* Category tabs - Hospitality style */}
      {!query.trim() && (
        <div className="sticky top-0 z-40 -mt-px bg-[#0b0f12]/95 py-3 backdrop-blur-xl border-b border-[#30363d]/50 shadow-lg shadow-black/20">
          <div className="flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categories.map((cat) => {
              const Icon = iconMap[cat.icon] || UtensilsCrossed
              const isActive = active === cat.id
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => scrollToCategory(cat.id)}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'border-[#c8a44e]/40 bg-gradient-to-l from-[#c8a44e]/25 to-[#c8a44e]/10 text-[#c8a44e] shadow-lg shadow-[#c8a44e]/10'
                      : 'border-[#30363d] bg-[#161b22] text-[#8b949e] hover:border-[#c8a44e]/20 hover:text-[#f0f6fc] hover:bg-[#1d242d]',
                  )}
                >
                  <span className={cn(
                    'flex size-7 items-center justify-center rounded-lg transition-all',
                    isActive ? 'bg-[#c8a44e]/20' : 'bg-[#0b0f12]'
                  )}>
                    <Icon className={cn('size-4', isActive ? 'text-[#c8a44e]' : 'text-[#8b949e]')} />
                  </span>
                  <span>{cat.name_ar || cat.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-8 px-5 pt-6">
        {visibleCategories.map((cat) => {
          const items = filtered.filter((i) => i.category_id === cat.id)
          if (items.length === 0) return null
          const Icon = iconMap[cat.icon] || UtensilsCrossed

          return (
            <section
              key={cat.id}
              ref={(el) => {
                sectionRefs.current[cat.id] = el
              }}
              className="scroll-mt-24"
            >
              {/* Section Header */}
              <div className="mb-4 flex items-center gap-2.5">
                <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#c8a44e]/15 to-[#c8a44e]/5 border border-[#c8a44e]/10">
                  <Icon className="size-5 text-[#c8a44e]" />
                </span>
                <h2 className="font-serif text-xl font-semibold text-white">{cat.name_ar || cat.name}</h2>
                <span className="mr-auto text-sm text-[#8b949e]">
                  {items.length} {items.length === 1 ? 'صنف' : 'أصناف'}
                </span>
              </div>

              {/* Items: Grid or List */}
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 gap-3">
                  {items.map((item) => (
                    <MenuItemCardGrid key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <MenuItemCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </section>
          )
        })}

        {query.trim() && filtered.length === 0 && (
          <div className="py-16 text-center text-[#8b949e]">
            <p className="font-serif text-lg">لا توجد نتائج</p>
            <p className="mt-1 text-sm">جرّب كلمة بحث أخرى</p>
          </div>
        )}
      </div>

      {/* Active order indicator */}
      {placedItems.length > 0 && (
        <div className="fixed bottom-20 inset-x-0 z-30 px-5 mx-auto max-w-md">
          <div className="rounded-2xl border border-[#c8a44e]/20 bg-gradient-to-r from-[#c8a44e]/10 to-[#c8a44e]/5 backdrop-blur-xl px-4 py-3 text-center shadow-lg shadow-[#c8a44e]/10">
            <p className="text-xs text-[#c8a44e] font-semibold">
              لديك طلب نشط • {placedItems.length} {placedItems.length === 1 ? 'صنف' : 'أصناف'}
            </p>
            <p className="text-[10px] text-[#8b949e] mt-0.5">
              الأصناف الجديدة ستضاف للطلب الحالي
            </p>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  )
}