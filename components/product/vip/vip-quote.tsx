import { Quote } from 'lucide-react'
import { VipQuote as VipQuoteData } from '@/lib/types'

interface Props {
  quote: VipQuoteData
}

// Quote individual destacada. La página puede intercalar varios entre otras
// secciones para dar respiro. No usa header VIP para mantenerse ligera.
export function VipQuoteBlock({ quote }: Props) {
  if (!quote.text) return null

  return (
    <section className="py-10 md:py-14">
      <div className="container mx-auto px-4">
        <figure
          className="relative max-w-3xl mx-auto rounded-3xl p-8 md:p-12 text-center overflow-hidden border border-amber-200/60 shadow-md"
          style={{
            background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
          }}
        >
          <Quote
            className="absolute top-6 left-6 w-10 h-10 text-amber-300"
            fill="currentColor"
            strokeWidth={0}
            aria-hidden
          />
          <blockquote className="relative font-serif text-xl md:text-2xl lg:text-3xl font-bold text-amber-950 leading-tight text-balance px-4 md:px-8">
            &ldquo;{quote.text}&rdquo;
          </blockquote>
          {quote.author && (
            <figcaption className="mt-5 text-sm font-semibold text-amber-800 uppercase tracking-widest">
              — {quote.author}
            </figcaption>
          )}
        </figure>
      </div>
    </section>
  )
}
