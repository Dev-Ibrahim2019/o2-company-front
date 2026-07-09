'use client'

import { QrCode, Clock, Phone } from 'lucide-react'
import type { CustomerTableInfo } from '../../services/customerTableService'

type TableWaitingPageProps = {
  table: CustomerTableInfo;
  restaurantName: string;
}

export function TableWaitingPage({ table, restaurantName }: TableWaitingPageProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0f12] px-6" dir="rtl">
      <div className="w-full max-w-sm">
        {/* Decorative glow */}
        <div className="absolute left-1/2 top-1/4 -translate-x-1/2 h-64 w-64 rounded-full bg-[#c8a44e]/5 blur-[100px]" />

        <div className="relative text-center">
          {/* Icon */}
          <div className="mx-auto flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#c8a44e]/15 to-[#c8a44e]/5 border border-[#c8a44e]/20">
            <QrCode className="size-10 text-[#c8a44e]" />
          </div>

          {/* Restaurant name */}
          <p className="mt-6 text-sm font-medium text-[#c8a44e] tracking-wide">{restaurantName}</p>

          {/* Table info */}
          <h1 className="mt-2 font-serif text-3xl font-bold text-white">
            طاولة {table.table_number}
          </h1>
          <p className="mt-1 text-sm text-[#8b949e]">
            {table.hall_name} • السعة {table.capacity} أشخاص
          </p>

          {/* Divider */}
          <div className="my-8 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#30363d]" />
            <div className="flex size-2 items-center justify-center rounded-full bg-[#c8a44e]/30">
              <div className="size-1 rounded-full bg-[#c8a44e]" />
            </div>
            <div className="h-px flex-1 bg-[#30363d]" />
          </div>

          {/* Waiting message */}
          <div className="rounded-2xl border border-[#30363d] bg-[#161b22] p-6">
            <div className="flex items-center justify-center gap-2 text-[#8b949e]">
              <Clock className="size-5" />
              <span className="text-sm">في انتظار تسكينك على الطاولة</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[#8b949e]/80">
              الطاولة غير مشغولة حالياً. يرجى مخاطبة النادل لتسكينك على الطاولة، وبعدها ستتمكن من تصفح القائمة وطلب الطعام مباشرة من هاتفك.
            </p>
          </div>

          {/* Contact */}
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-[#8b949e]/60">
            <Phone className="size-3.5" />
            <span>اطلب النادل للمساعدة</span>
          </div>
        </div>
      </div>
    </main>
  )
}
