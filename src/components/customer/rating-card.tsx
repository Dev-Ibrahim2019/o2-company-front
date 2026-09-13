import { useState } from 'react'
import { Star, Heart } from 'lucide-react'
import { useCart } from './cart-provider'
import { cn } from '../../utils/utils'

const feedbackTags = ['طعام لذيذ', 'خدمة سريعة', 'أجواء رائعة', 'نظافة ممتازة', 'أسعار مناسبة']

export function RatingCard() {
  const { rating, submitRating } = useCart()
  const [hover, setHover] = useState(0)
  const [selected, setSelected] = useState<string[]>([])
  const [done, setDone] = useState(false)

  function toggleTag(tag: string) {
    setSelected((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  if (done) {
    return (
      <div className="overflow-hidden rounded-3xl border border-[#c8a44e]/20 bg-gradient-to-br from-[#161b22] to-[#0b0f12] p-6 text-center card-elevated" dir="rtl">
        <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#c8a44e]/20 to-[#c8a44e]/15">
          <Heart className="size-8 fill-[#c8a44e] text-[#c8a44e]" />
        </span>
        <h2 className="mt-4 font-serif text-xl font-bold text-white">شكراً لتقييمك</h2>
        <p className="mt-1.5 text-sm text-[#8b949e]">
          سعدنا بخدمتك، ونتطلع لزيارتك مرة أخرى
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-[#30363d] bg-[#161b22] p-5 card-elevated" dir="rtl">
      <h2 className="font-serif text-lg font-semibold text-white">قيّم تجربتك</h2>
      <p className="mt-1 text-sm text-[#8b949e]">رأيك يهمنا لتقديم أفضل خدمة</p>

      <div className="mt-5 flex justify-center gap-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            aria-label={`${star} نجوم`}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => submitRating && submitRating(star)}
            className="transition-transform duration-200 active:scale-90 hover:scale-110"
          >
            <Star
              className={cn(
                'size-10 transition-colors duration-200',
                (hover || rating || 0) >= star
                  ? 'fill-[#c8a44e] text-[#c8a44e] drop-shadow-[0_0_8px_rgba(200,164,78,0.4)]'
                  : 'text-[#1d242d] hover:text-[#30363d]',
              )}
            />
          </button>
        ))}
      </div>

      {rating ? (
        <>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {feedbackTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={cn(
                  'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-200',
                  selected.includes(tag)
                    ? 'border-[#c8a44e]/40 bg-[#c8a44e]/15 text-[#c8a44e]'
                    : 'border-[#30363d] bg-[#0b0f12]/50 text-[#8b949e] hover:border-[#30363d]/80 hover:text-[#f0f6fc]',
                )}
              >
                {tag}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setDone(true)}
            className="mt-5 w-full rounded-2xl bg-gradient-to-l from-[#c8a44e] to-[#7a0000] py-3.5 font-bold text-white shadow-lg shadow-[#c8a44e]/25 transition-all active:scale-95 hover:shadow-xl hover:shadow-[#c8a44e]/30"
          >
            إرسال التقييم
          </button>
        </>
      ) : null}
    </div>
  )
}
