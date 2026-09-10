import { Link, useParams } from 'react-router-dom'
import { QrCode, UtensilsCrossed, Receipt, Sparkles, ChevronLeft } from 'lucide-react'
import { useCart } from '../../components/customer/cart-provider'
import { BottomNav } from '../../components/customer/bottom-nav'

import { OrderTracker } from '../../components/customer/order-tracker'
import { CallWaiter } from '../../components/customer/call-waiter'
import { RatingCard } from '../../components/customer/rating-card'

const formatPrice = (price: number) => {
  return `${price.toFixed(2)}`
}

export default function TablePage() {
  const { tableNumber, tableInfo, placedItems, orderStatus, billSummary, restaurant, getItemById, getItemImage } = useCart()
  const { qrCode } = useParams<{ qrCode: string }>()
  const hasOrder = orderStatus !== 'idle'

  return (
    <main className="mx-auto min-h-screen max-w-md pb-28" dir="rtl">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="relative h-64 overflow-hidden rounded-b-[2.5rem]">
          <img
            src="/menu/about.jpeg"
            alt="أجواء المطعم"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f12] via-[#0b0f12]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#c8a44e]/20 to-transparent" />

          <div className="absolute left-0 top-0 h-32 w-32 bg-gradient-to-br from-[#c8a44e]/20 to-transparent blur-2xl" />
        </div>

        <div className="absolute inset-x-0 bottom-0 px-5 pb-6">
          <div className="flex items-center gap-2 text-[#c8a44e]">
            <Sparkles className="size-4" />
            <span className="font-serif text-sm tracking-wide">{restaurant.tagline || restaurant.name}</span>
          </div>
          <h1 className="mt-1 font-serif text-4xl font-bold text-white">{restaurant.name}</h1>
          <div className="mt-3 flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-full border border-[#c8a44e]/30 bg-[#c8a44e]/10 px-3 py-1 text-sm font-medium text-[#c8a44e] backdrop-blur-sm">
              <QrCode className="size-4" />
              طاولة {tableNumber}
            </span>
            {tableInfo?.hall_name && (
              <span className="flex items-center gap-1.5 rounded-full border border-[#30363d] bg-[#161b22]/80 px-3 py-1 text-sm text-[#8b949e] backdrop-blur-sm">
                {tableInfo.hall_name}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="space-y-4 px-5 pt-6">
        {/* Welcome / CTA when no order */}
        {!hasOrder && (
          <div className="overflow-hidden rounded-3xl border border-[#30363d] bg-[#161b22] p-6 text-center card-elevated-lg">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#a30000]/20 to-[#c8a44e]/10">
        <UtensilsCrossed className="size-8 text-[#c8a44e]" />

            </div>
            <h2 className="mt-4 font-serif text-2xl font-bold text-white">أهلاً بك</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#8b949e]">
              تصفّح قائمتنا الفاخرة، أضف أطباقك المفضلة، وأرسل طلبك مباشرةً من طاولتك
            </p>
            <Link
              to={`/customer/${qrCode}/menu`}
              className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-[#c8a44e] to-[#7a0000] py-3.5 font-bold text-white shadow-lg shadow-[#c8a44e]/25 transition-all active:scale-95 hover:shadow-xl hover:shadow-[#c8a44e]/30"
            >
              <UtensilsCrossed className="size-5" />
              تصفّح القائمة
              <ChevronLeft className="size-4" />
            </Link>
          </div>
        )}

        {/* Order tracker */}
        {hasOrder && <OrderTracker status={orderStatus} />}

        {/* Live bill */}
        {placedItems && placedItems.length > 0 && (
          <div className="overflow-hidden rounded-3xl border border-[#30363d] bg-[#161b22] p-5 card-elevated">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#c8a44e]/20 to-[#c8a44e]/5">
                <Receipt className="size-5 text-[#ff6b6b]" />
              </span>
              <div>
                <h2 className="font-serif text-lg font-semibold text-white">الفاتورة</h2>
                <span className="text-xs text-[#8b949e]">طاولة {tableNumber}</span>
              </div>
            </div>

            <div className="space-y-3">
              {placedItems.map((line) => {
                const item = getItemById(line.itemId)
                if (!item) return null
                const img = getItemImage(item)
                return (
                  <div key={line.itemId} className="flex items-center gap-3 rounded-xl bg-[#0b0f12]/50 p-2.5">
                    <div className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-[#1d242d]">
                      {img ? (
                        <img
                          src={img}
                          alt={item.name}
                          className="absolute inset-0 h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[#8b949e]">🍽️</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{item.name_ar || item.name}</p>
                      <p className="text-xs text-[#8b949e]">
                        {line.qty} × {formatPrice(item.price)} {restaurant.currency}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-[#c8a44e]">
                      {formatPrice(item.price * line.qty)}
                    </p>
                  </div>
                )
              })}
            </div>

            <div className="my-4 border-t border-dashed border-[#30363d]" />

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between text-[#8b949e]">
                <span>المجموع الفرعي</span>
                <span>{formatPrice(billSummary.subtotal)} {restaurant.currency}</span>
              </div>
              <div className="flex justify-between text-[#8b949e]">
                <span>الخصم</span>
                <span>-{formatPrice(billSummary.discount)} {restaurant.currency}</span>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-2xl bg-gradient-to-l from-[#c8a44e]/15 to-[#c8a44e]/10 px-4 py-3.5 border border-[#c8a44e]/20">
                <span className="font-serif text-lg font-bold text-white">الإجمالي</span>
                <span className="text-xl font-bold text-[#c8a44e]">
                  {formatPrice(billSummary.total)} {restaurant.currency}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Call waiter */}
        <CallWaiter />

        {/* Rating - available once served */}
        {orderStatus === 'served' && <RatingCard />}
      </div>

      <BottomNav />
    </main>
  )
}
