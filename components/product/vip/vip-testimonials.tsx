import Image from 'next/image'
import { Quote } from 'lucide-react'
import { VipVisualTestimonial } from '@/lib/types'
import { VipSectionHeader } from './vip-section-header'

interface Props {
  testimonials: VipVisualTestimonial[]
}

export function VipTestimonials({ testimonials }: Props) {
  const valid = testimonials.filter((t) => t.quote && t.name)
  if (valid.length === 0) return null

  return (
    <section className="py-10 md:py-14">
      <div className="container mx-auto px-4">
        <VipSectionHeader
          eyebrow="Voces reales"
          title="Lo que dicen quienes lo usaron"
          subtitle="Clientes reales, fotos reales. Sin actores ni stock."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
          {valid.map((t) => (
            <figure
              key={t._key ?? `${t.name}-${t.quote.slice(0, 20)}`}
              className="relative flex flex-col bg-surface rounded-2xl border border-amber-200/60 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              {t.photo && (
                <div className="relative aspect-square bg-muted overflow-hidden">
                  <Image
                    src={t.photo}
                    alt={t.photoAlt || t.name}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  <Quote
                    className="absolute top-4 right-4 w-7 h-7 text-amber-300 drop-shadow"
                    fill="currentColor"
                    strokeWidth={0}
                  />
                </div>
              )}

              <figcaption className="p-5 md:p-6 flex-1 flex flex-col">
                <blockquote className="text-foreground/85 leading-relaxed text-sm md:text-base mb-4 flex-1">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <div className="pt-3 border-t border-amber-100">
                  <p className="font-bold text-sm text-foreground leading-tight">{t.name}</p>
                  {t.location && (
                    <p className="text-xs text-foreground/55 mt-0.5">{t.location}</p>
                  )}
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
