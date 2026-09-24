'use client'

import { ArrowRight } from 'lucide-react'
import { Product } from '@/lib/types'
import { SuggestedProductsCarousel } from '@/components/product/suggested-products-carousel'

// «Eleva tu estilo»: la sección de moda y accesorios del home, y el H1 de la
// página (sep 2026). Todópolis se enfoca poco a poco en ese sector y el slogan
// va pegado a productos que lo cumplen, no encima de un catálogo que todavía
// es sobre todo hogar y belleza. La selección está en `lib/style-picks.ts`.
//
// Mismo lenguaje que Novedades: antetítulo gris con filete, titular, una fila
// deslizable con la misma `ProductCard`. Va sobre fondo blanco y Novedades
// sobre gris suave, así las dos franjas se separan sin cajas.

export function StyleSpotlight({ products }: { products: Product[] }) {
  // Con muy pocos productos, el slogan encima de dos tarjetas se lee a medio
  // hacer. Mejor no pintar la sección.
  if (products.length < 4) return null

  const showAll = () => window.dispatchEvent(new CustomEvent('todopolis:show-category', { detail: 'Ropa' }))

  return (
    <section className="w-full bg-surface py-8 md:py-12" aria-labelledby="estilo-titulo">
      <div className="container mx-auto px-4">
        <div className="mb-6 flex items-end justify-between gap-4 md:mb-8">
          <div>
            <p className="mb-2 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              <span aria-hidden className="h-px w-6 bg-todopolis-lavender-deep/60" />
              Moda y accesorios
            </p>
            {/* El H1 del home. Hasta sep 2026 el home no tenía ninguno. */}
            <h1
              id="estilo-titulo"
              className="font-serif text-2xl font-extrabold leading-tight tracking-[-0.02em] text-ink-title text-balance md:text-[2rem]"
            >
              Eleva tu estilo
            </h1>
          </div>
          <button
            type="button"
            onClick={showAll}
            className="inline-flex shrink-0 items-center gap-1.5 pb-1 text-sm font-bold text-todopolis-lavender-deep transition-all hover:gap-2.5"
          >
            Ver toda la ropa
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <SuggestedProductsCarousel
          products={products}
          itemClassName="w-[44vw] max-w-[210px] sm:w-[240px] sm:max-w-none lg:w-[270px]"
        />
      </div>
    </section>
  )
}
