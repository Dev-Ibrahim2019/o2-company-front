'use client'

import { useState } from 'react'
import { Plus, Check } from 'lucide-react'
import { useCart } from './cart-provider'
import { cn } from '../../utils/utils'

type MenuItemProps = {
  id: number
  name: string
  name_ar: string
  code: string
  image?: string
  image_url?: string
  price: number
  department_id: number
  category_id: number
  category_name: string
}

const formatPrice = (price: number) => {
  return `${price.toFixed(2)}`
}

export function MenuItemCard({ item }: { item: MenuItemProps }) {
  const { addToCart, restaurant, getItemImage } = useCart()
  const [added, setAdded] = useState(false)

  const imageUrl = getItemImage(item)

  function handleAdd() {
    addToCart(item.id)
    setAdded(true)
    setTimeout(() => setAdded(false), 1200)
  }

  return (
    <article className="group relative flex gap-4 overflow-hidden rounded-2xl border border-[#30363d] bg-[#161b22] p-3 transition-all duration-200 hover:border-[#c8a44e]/30 card-elevated">
      <div className="relative size-28 shrink-0 overflow-hidden rounded-xl bg-[#1d242d]">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={item.name}
            sizes="112px"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[#8b949e] text-2xl">🍽️</div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-serif text-lg font-semibold leading-tight text-white">
            {item.name_ar || item.name}
          </h3>
        </div>

        <div className="mt-auto flex items-center justify-between pt-2">
          <p className="flex items-baseline gap-1 font-bold text-[#c8a44e]">
            <span className="text-lg">{formatPrice(item.price)}</span>
            <span className="text-xs font-medium text-[#8b949e]">{restaurant.currency}</span>
          </p>
          <button
            type="button"
            onClick={handleAdd}
            aria-label={`إضافة ${item.name} إلى الطلب`}
            className={cn(
              'flex size-10 items-center justify-center rounded-xl transition-all duration-200 active:scale-90',
              added
                ? 'bg-gradient-to-br from-[#c8a44e] to-[#c8a44e] text-white shadow-md shadow-[#c8a44e]/20'
                : 'bg-[#c8a44e]/15 text-[#c8a44e] hover:bg-[#c8a44e]/25 hover:shadow-md hover:shadow-[#c8a44e]/10',
            )}
          >
            {added ? <Check className="size-5" strokeWidth={2.5} /> : <Plus className="size-5" />}
          </button>
        </div>
      </div>
    </article>
  )
}
