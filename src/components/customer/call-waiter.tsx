import { BellRing, GlassWater, Receipt, Utensils, Check, Loader2 } from 'lucide-react'
import { useCart, type WaiterRequestType } from './cart-provider'
import { cn } from '../../utils/utils'

const actions: { type: WaiterRequestType; label: string; icon: typeof BellRing; color: string; bgColor: string }[] = [
  { type: 'waiter', label: 'استدعاء القرصون', icon: BellRing, color: '#ff6b6b', bgColor: 'from-[#c8a44e]/15 to-[#c8a44e]/5' },
  { type: 'water', label: 'طلب ماء', icon: GlassWater, color: '#6bafff', bgColor: 'from-[#1a5fb4]/15 to-[#1a5fb4]/5' },
  { type: 'utensils', label: 'أدوات مائدة', icon: Utensils, color: '#c8a44e', bgColor: 'from-[#c8a44e]/15 to-[#c8a44e]/5' },
  { type: 'bill', label: 'طلب الفاتورة', icon: Receipt, color: '#6bff8e', bgColor: 'from-[#26a269]/15 to-[#26a269]/5' },
]

const labels: Record<WaiterRequestType, string> = {
  waiter: 'القرصون',
  water: 'ماء',
  utensils: 'أدوات مائدة',
  bill: 'الفاتورة',
}

export function CallWaiter() {
  const { callWaiter, requests } = useCart()

  const pending = (requests || []).filter((r) => !r.resolved)
  const allRequests = requests || []

  return (
    <div className="overflow-hidden rounded-3xl border border-[#30363d] bg-[#161b22] p-5 card-elevated" dir="rtl">
      <h2 className="mb-4 font-serif text-lg font-semibold text-white">خدمة الطاولة</h2>

      <div className="grid grid-cols-2 gap-3">
        {actions.map(({ type, label, icon: Icon, color, bgColor }) => {
          const isPending = pending.some((r) => r.type === type)
          return (
            <button
              key={type}
              type="button"
              onClick={() => callWaiter && callWaiter(type)}
              disabled={isPending}
              className={cn(
                'group flex flex-col items-center justify-center gap-2.5 rounded-2xl border p-4 text-sm font-medium transition-all duration-200 active:scale-95',
                isPending
                  ? 'border-[#c8a44e]/40 bg-[#c8a44e]/10 text-[#c8a44e]'
                  : 'border-[#30363d] bg-[#0b0f12]/50 text-[#f0f6fc] hover:border-[#30363d]/80 hover:bg-[#1d242d]/50',
              )}
            >
              {isPending ? (
                <Loader2 className="size-6 animate-spin text-[#c8a44e]" />
              ) : (
                <span className={cn('flex size-12 items-center justify-center rounded-xl bg-gradient-to-br transition-transform group-hover:scale-110', bgColor)}>
                  <Icon className="size-6" style={{ color }} />
                </span>
              )}
              <span className="text-xs leading-tight">{isPending ? 'في الطريق إليك' : label}</span>
            </button>
          )
        })}
      </div>

      {allRequests.length > 0 && (
        <div className="mt-4 space-y-2">
          {allRequests.slice(0, 3).map((req) => (
            <div
              key={req.id}
              className="flex items-center gap-2.5 rounded-xl bg-[#0b0f12]/50 px-3.5 py-2.5 text-sm border border-[#30363d]/50"
            >
              {req.resolved ? (
                <span className="flex size-5 items-center justify-center rounded-full bg-[#26a269]/15">
                  <Check className="size-3 text-[#6bff8e]" />
                </span>
              ) : (
                <Loader2 className="size-4 animate-spin text-[#c8a44e]" />
              )}
              <span className="text-[#f0f6fc]">طلب {labels[req.type]}</span>
              <span className={cn(
                'mr-auto text-xs',
                req.resolved ? 'text-[#6bff8e]' : 'text-[#c8a44e]'
              )}>
                {req.resolved ? 'تم التأكيد' : 'بانتظار الرد'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
