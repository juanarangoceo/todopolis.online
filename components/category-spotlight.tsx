'use client'

import { ArrowRight } from 'lucide-react'
import { Product } from '@/lib/types'
import { COMPACT_ROW_ITEM, SuggestedProductsCarousel } from '@/components/product/suggested-products-carousel'

interface CategorySpotlightProps {
  products: Product[]
  id: string
  eyebrow: string
  title: string
  category: string
  linkLabel: string
  primary?: boolean
}

// El mismo estante para Moda y Belleza: mismas tarjetas, ancho y controles.
// Solo Moda lleva el H1; las demás secciones son H2.
export function CategorySpotlight({ products, id, eyebrow, title, category, linkLabel, primary = false }: CategorySpotlightProps) {
  if (products.length === 0) return null
  const Heading = primary ? 'h1' : 'h2'
  const showAll = () => window.dispatchEvent(new CustomEvent('todopolis:show-category', { detail: category }))

  return (
    <section className="w-full bg-surface pb-8 pt-6 md:py-12" aria-labelledby={id}>
      <div className="container mx-auto px-4">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8">
          <div>
            <p className="mb-2 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              <span aria-hidden="true" className="h-px w-6 bg-todopolis-lavender-deep/60" />
              {eyebrow}
            </p>
            <Heading id={id} className="font-serif text-2xl font-extrabold leading-tight tracking-[-0.02em] text-ink-title text-balance md:text-[2rem]">
              {title}
            </Heading>
          </div>
          <button
            type="button"
            onClick={showAll}
            className="inline-flex shrink-0 items-center gap-1.5 pb-1 text-sm font-bold text-todopolis-lavender-deep transition-all hover:gap-2.5 motion-reduce:transition-none"
          >
            {linkLabel}
            <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        </div>
        <SuggestedProductsCarousel products={products} itemClassName={COMPACT_ROW_ITEM} />
      </div>
    </section>
  )
}
