import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Minus, Plus, Trash2, ShoppingBag, UtensilsCrossed, CheckCircle2 } from 'lucide-react'
import { useCart } from '../../components/customer/cart-provider'
import { BottomNav } from '../../components/customer/bottom-nav'

const formatPrice = (price: number) => {
  return `${price.toFixed(2)}`
}

export default function CartPage() {
  const { cart, setQty, removeLine, cartTotal, placeOrder, tableNumber, getItemById, getItemImage, restaurant } = useCart()
  const navigate = useNavigate()
  const { qrCode } = useParams<{ qrCode: string }>()
  const [sending, setSending] = useState(false)

  const discount = cartTotal * restaurant.discountRate
  const total = cartTotal - discount

  function handleSend() {
    setSending(true)
    setTimeout(() => {
      placeOrder()
      navigate(`/customer/${qrCode}/menu`)
    }, 900)
  }

  if (cart.length === 0) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 pb-28 text-center bg-[#0b0f12]" dir="rtl">
        <span className="flex size-24 items-center justify-center rounded-2xl bg-gradient-to-br from-[#161b22] to-[#0b0f12] border border-[#30363d]">
          <ShoppingBag className="size-10 text-[#8b949e]" />
        </span>
        <h1 className="mt-6 font-serif text-2xl font-bold text-white">طلبك فارغ</h1>
        <p className="mt-2 text-sm text-[#8b949e]">
          تصفّح القائمة وأضف أطباقك المفضلة لبدء الطلب
        </p>
        <Link
          to={`/customer/${qrCode}/menu`}
          className="mt-6 flex items-center gap-2 rounded-2xl bg-gradient-to-l from-[#c8a44e] to-[#7a0000] px-6 py-3 font-medium text-white shadow-lg shadow-[#c8a44e]/25 transition-all active:scale-95 hover:shadow-xl hover:shadow-[#c8a44e]/30"
        >
          <UtensilsCrossed className="size-5" />
          تصفّح القائمة
        </Link>
        <BottomNav />
      </main>
    )
  }

  return (
    <main className="mx-auto min-h-screen max-w-md pb-28 bg-[#0b0f12]" dir="rtl">
      <header className="rounded-b-[2.5rem] border-b border-[#30363d] bg-gradient-to-b from-[#161b22] to-[#0b0f12] px-5 pb-6 pt-8">
        <div className="absolute left-0 top-0 h-40 w-40 bg-gradient-to-br from-[#c8a44e]/15 to-transparent blur-3xl" />
        <h1 className="relative font-serif text-3xl font-bold text-white">مراجعة الطلب</h1>
        <p className="relative mt-1 text-sm text-[#8b949e]">
          طاولة {tableNumber} • {cart.length} أصناف
        </p>
      </header>

      <div className="space-y-3 px-5 pt-6">
        {cart.map((line) => {
          const item = getItemById(line.itemId)
          if (!item) return null
          const img = getItemImage(item)
          return (
            <div
              key={line.itemId}
              className="flex gap-3 rounded-2xl border border-[#30363d] bg-[#161b22] p-3 card-elevated"
            >
              <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-[#1d242d]">
                {img ? (
                  <img
                    src={img}
                    alt={item.name}
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[#8b949e] text-xl">🍽️</div>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-serif text-base font-semibold text-white truncate">
                    {item.name_ar || item.name}
                  </h3>
                  <button
                    type="button"
                    onClick={() => removeLine(line.itemId)}
                    aria-label={`حذف ${item.name}`}
                    className="text-[#8b949e] transition-colors hover:text-[#ff6b6b]"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <p className="text-sm font-bold text-[#c8a44e] mt-1">
                  {formatPrice(item.price * line.qty)} {restaurant.currency}
                </p>
                <div className="mt-auto flex items-center gap-3 pt-2">
                  <div className="flex items-center gap-3 rounded-xl border border-[#30363d] bg-[#0b0f12]/80 px-1 py-1">
                    <button
                      type="button"
                      onClick={() => setQty(line.itemId, line.qty - 1)}
                      aria-label="إنقاص الكمية"
                      className="flex size-7 items-center justify-center rounded-lg text-white transition-colors hover:bg-[#1d242d]"
                    >
                      <Minus className="size-4" />
                    </button>
                    <span className="min-w-4 text-center text-sm font-bold text-white">
                      {line.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQty(line.itemId, line.qty + 1)}
                      aria-label="زيادة الكمية"
                      className="flex size-7 items-center justify-center rounded-lg text-white transition-colors hover:bg-[#1d242d]"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        <Link
          to={`/customer/${qrCode}/menu`}
          className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-[#30363d] py-3.5 text-sm font-medium text-[#8b949e] transition-all hover:border-[#c8a44e]/40 hover:text-[#c8a44e]"
        >
          <Plus className="size-4" />
          إضافة المزيد من الأصناف
        </Link>

        {/* Summary */}
        <div className="mt-2 space-y-3 rounded-2xl border border-[#30363d] bg-[#161b22] p-5 card-elevated">
          <div className="flex justify-between text-sm text-[#8b949e]">
            <span>المجموع الفرعي</span>
            <span>{formatPrice(cartTotal)} {restaurant.currency}</span>
          </div>
          <div className="flex justify-between text-sm text-[#8b949e]">
            <span>الخصم</span>
            <span>-{formatPrice(discount)} {restaurant.currency}</span>
          </div>
          <div className="my-1 border-t border-[#30363d]" />
          <div className="flex items-center justify-between">
            <span className="font-serif text-lg font-bold text-white">الإجمالي</span>
            <span className="text-lg font-bold text-[#c8a44e]">
              {formatPrice(total)} {restaurant.currency}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSend}
            disabled={sending}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-[#c8a44e] to-[#7a0000] py-4 font-bold text-white shadow-xl shadow-[#c8a44e]/30 transition-all active:scale-95 hover:shadow-2xl hover:shadow-[#c8a44e]/40 disabled:opacity-80"
          >
            {sending ? (
              <>
                <CheckCircle2 className="size-5 animate-pulse" />
                جاري إرسال الطلب...
              </>
            ) : (
              <>إرسال الطلب للقرصون • {formatPrice(total)} {restaurant.currency}</>
            )}
          </button>
        </div>
      </div>

      <BottomNav />
    </main>
  )
}
