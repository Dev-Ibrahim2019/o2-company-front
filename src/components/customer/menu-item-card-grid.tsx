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

export function MenuItemCardGrid({ item }: { item: MenuItemProps }) {
  const { addToCart, restaurant, getItemImage } = useCart()
  const [added, setAdded] = useState(false)

  const imageUrl = getItemImage(item)

  function handleAdd() {
    addToCart(item.id)
    setAdded(true)
    setTimeout(() => setAdded(false), 1200)
  }

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#30363d] bg-[#161b22] transition-all duration-200 hover:border-[#c8a44e]/30 hover:shadow-lg hover:shadow-[#c8a44e]/5 card-elevated">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-[#1d242d]">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={item.name}
            sizes="(max-width: 640px) 50vw, 200px"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[#8b949e] text-3xl">
            🍽️
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#161b22] via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-3 pt-2">
        <h3 className="font-serif text-sm font-semibold leading-tight text-white line-clamp-2">
          {item.name_ar || item.name}
        </h3>

        <div className="mt-auto flex items-center justify-between pt-2">
          <p className="flex items-baseline gap-1 font-bold text-[#c8a44e]">
            <span className="text-sm">{formatPrice(item.price)}</span>
            <span className="text-[10px] font-medium text-[#8b949e]">{restaurant.currency}</span>
          </p>
          <button
            type="button"
            onClick={handleAdd}
            aria-label={`إضافة ${item.name} إلى الطلب`}
            className={cn(
              'flex size-9 items-center justify-center rounded-xl transition-all duration-200 active:scale-90',
              added
                ? 'bg-gradient-to-br from-[#c8a44e] to-[#c8a44e] text-white shadow-md shadow-[#c8a44e]/20'
                : 'bg-[#c8a44e]/15 text-[#c8a44e] hover:bg-[#c8a44e]/25 hover:shadow-md hover:shadow-[#c8a44e]/10',
            )}
          >
            {added ? <Check className="size-4.5" strokeWidth={2.5} /> : <Plus className="size-4.5" />}
          </button>
        </div>
      </div>
    </article>
  )
}