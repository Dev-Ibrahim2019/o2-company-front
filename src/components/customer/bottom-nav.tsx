'use client'

import { Link, useLocation, useParams } from "react-router-dom";
import { Home, UtensilsCrossed, ShoppingBag } from 'lucide-react'
import { useCart } from "./cart-provider";
import { cn } from "../../utils/utils";

export function BottomNav() {
  const location = useLocation();
  const pathname = location.pathname;
  const { qrCode } = useParams<{ qrCode: string }>()
  const { cartCount } = useCart()

  const links = [
    { href: `/customer/${qrCode}`, label: 'الطاولة', icon: Home },
    { href: `/customer/${qrCode}/menu`, label: 'القائمة', icon: UtensilsCrossed },
    { href: `/customer/${qrCode}/cart`, label: 'الطلب', icon: ShoppingBag },
  ]

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md">
      <div className="mx-3 mb-3 flex items-center justify-around rounded-2xl border border-[#30363d]/80 bg-[#161b22]/90 px-2 py-2 shadow-2xl backdrop-blur-xl">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          const showBadge = href.endsWith('/cart') && cartCount > 0
          return (
            <Link
              key={href}
              to={href}
              className={cn(
                'relative flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-xs font-medium transition-all duration-200',
                active ? 'text-[#c8a44e]' : 'text-[#8b949e] hover:text-[#f0f6fc]',
              )}
            >
              <span
                className={cn(
                  'relative flex size-10 items-center justify-center rounded-xl transition-all duration-200',
                  active && 'bg-[#c8a44e]/15 shadow-sm',
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.4 : 1.8} />
                {showBadge && (
                  <span className="absolute -top-1 -left-1 flex size-5 items-center justify-center rounded-full bg-[#c8a44e] text-[10px] font-bold text-white shadow-md shadow-[#c8a44e]/30">
                    {cartCount}
                  </span>
                )}
              </span>
              <span className={cn(active && 'font-semibold')}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
