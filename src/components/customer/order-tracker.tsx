import { Check, ChefHat, Bell, Utensils, Send } from 'lucide-react'
import { type OrderStatus } from './cart-provider'
import { cn } from '../../utils/utils'

const steps: { key: OrderStatus; label: string; icon: typeof Send }[] = [
  { key: 'placed', label: 'تم الاستلام', icon: Send },
  { key: 'preparing', label: 'قيد التحضير', icon: ChefHat },
  { key: 'ready', label: 'جاهز للتقديم', icon: Bell },
  { key: 'served', label: 'تم التقديم', icon: Utensils },
]

const order: OrderStatus[] = ['placed', 'preparing', 'ready', 'served']

export function OrderTracker({ status }: { status: OrderStatus }) {
  const currentIndex = order.indexOf(status)

  return (
    <div className="overflow-hidden rounded-3xl border border-[#30363d] bg-[#161b22] p-5 card-elevated" dir="rtl">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold text-white">حالة الطلب</h2>
        <span className="rounded-full bg-gradient-to-l from-[#c8a44e]/20 to-[#c8a44e]/10 px-3.5 py-1 text-xs font-semibold text-[#c8a44e] border border-[#c8a44e]/20">
          {steps.find((s) => s.key === status)?.label}
        </span>
      </div>

      <div className="relative flex justify-between">
        {/* progress line background */}
        <div className="absolute right-5 left-5 top-5 h-0.5 -translate-y-1/2 bg-[#1d242d]">
          {/* progress line filled */}
          <div
            className="h-full bg-gradient-to-l from-[#c8a44e] to-[#c8a44e] transition-all duration-700 ease-out"
            style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
          />
        </div>

        {steps.map((step, i) => {
          const done = i < currentIndex
          const activeStep = i === currentIndex
          const Icon = step.icon
          return (
            <div key={step.key} className="relative z-10 flex flex-1 flex-col items-center gap-2.5">
              <span
                className={cn(
                  'flex size-10 items-center justify-center rounded-full border-2 transition-all duration-500',
                  done && 'border-[#c8a44e] bg-gradient-to-br from-[#c8a44e] to-[#c8a44e] text-white shadow-lg shadow-[#c8a44e]/20',
                  activeStep &&
                    'border-[#c8a44e] bg-gradient-to-br from-[#c8a44e] to-[#c8a44e] text-white ring-4 ring-[#c8a44e]/20 shadow-lg shadow-[#c8a44e]/30',
                  !done && !activeStep && 'border-[#1d242d] bg-[#0b0f12] text-[#8b949e]',
                )}
              >
                {done ? <Check className="size-5" strokeWidth={2.5} /> : <Icon className="size-4" />}
              </span>
              <span
                className={cn(
                  'text-center text-[11px] font-medium leading-tight',
                  i <= currentIndex ? 'text-white' : 'text-[#8b949e]',
                )}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
