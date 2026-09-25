'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { type AiImage } from '@/lib/inspiration'

// Carril horizontal de imágenes de estilo de vida generadas por IA.
//
// Sustituye a la antigua columna lateral sticky de escritorio. Esa columna no
// podía funcionar con la cuadrícula: el catálogo carga de 24 en 24 sobre 574
// productos, así que `sticky` dejaba 3 imágenes congeladas al lado de un scroll
// interminable. Como fila dentro de la cuadrícula, el scroll infinito pasa de
// problema a ventaja: aparece inspiración nueva a medida que bajas.
//
// SE MUEVE SOLO CUANDO EL CLIENTE LO MUEVE (sep 2026). Fue una marquesina que
// avanzaba sola y pasaba a manual al primer gesto. Se quitó porque:
//   - Un blanco en movimiento cuesta tocarlo: la tarjeta se corre bajo el dedo
//     y se abre la de al lado.
//   - Con ~24 carriles en el home, cada pantalla tenía algo moviéndose de lado
//     mientras el ojo baja por la cuadrícula: compite con los productos en vez
//     de acompañarlos, y lo que se mueve solo se aprende a ignorar como un
//     anuncio.
//   - La tarjeta de la izquierda salía siempre cortada a la mitad.
// Ahora es scroll nativo con `snap`: arranca alineado y la última tarjeta
// asomada al borde dice que hay más.
//
// MÁS GRANDES QUE UNA TARJETA DE PRODUCTO (25-sep-2026). Eran 168 px en móvil,
// más chicas que las tarjetas del catálogo que las rodean: una foto de
// inspiración que se ve en miniatura no inspira. Ahora son ~62 % del ancho en
// móvil (una y media a la vista, que además dice «desliza») y 260 px en
// escritorio. Solo hay dos carriles en el home, así que la altura extra no
// aleja el catálogo.

function sanityOptimized(url: string, width: number): string {
  if (!url || !url.includes('cdn.sanity.io')) return url
  return `${url}?w=${width}&auto=format&q=80`
}

function Card({ item, priority }: { item: AiImage; priority: boolean }) {
  return (
    <Link
      href={`/producto/${item.slug}`}
      className="group shrink-0 snap-start w-[62vw] max-w-[260px] md:w-[240px] lg:w-[260px] mr-3 last:mr-0 active:scale-[0.98] transition-transform"
    >
      <div className="rounded-2xl overflow-hidden shadow-sm border border-nav-inactive-border group-hover:border-todopolis-lavender-deep/40 group-hover:shadow-md transition-all">
        <div className="relative w-full aspect-[3/4]">
          <Image
            src={sanityOptimized(item.image, 560)}
            alt={item.name}
            fill
            sizes="(min-width: 1024px) 260px, (min-width: 768px) 240px, 62vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            loading={priority ? undefined : 'lazy'}
            unoptimized
          />
        </div>
        <div className="px-3 py-2.5 bg-surface">
          <p className="text-xs md:text-sm font-medium text-foreground/75 leading-snug line-clamp-2 min-h-[2.5em]">
            {item.name}
          </p>
          {/* El precio es lo que convierte una foto bonita en un clic. */}
          {item.price ? (
            <p className="mt-1 text-sm md:text-base font-extrabold tabular-nums text-ink-title">
              $ {item.price.toLocaleString('es-CO')}
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  )
}

export function InspirationRail({ images }: { images: AiImage[] }) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ start: true, end: false })

  const updateEdges = useCallback(() => {
    const el = viewportRef.current
    if (!el) return
    const start = el.scrollLeft <= 4
    const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4
    setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }))
  }, [])

  useEffect(() => {
    updateEdges()
    window.addEventListener('resize', updateEdges)
    return () => window.removeEventListener('resize', updateEdges)
  }, [updateEdges])

  // Una tarjeta y pico: el salto deja siempre una asomada al borde, que es lo
  // que le dice al usuario que el carril sigue.
  const nudge = (direction: 1 | -1) => {
    const viewport = viewportRef.current
    if (!viewport) return
    const paso = Math.max(160, viewport.clientWidth * 0.7)
    viewport.scrollBy({ left: direction * paso, behavior: 'smooth' })
  }

  if (images.length === 0) return null

  const arrow =
    'w-8 h-8 flex items-center justify-center rounded-full bg-surface border border-nav-inactive-border text-foreground/70 shadow-sm active:scale-90 hover:text-ink-title transition-all disabled:opacity-30 disabled:pointer-events-none'

  return (
    <section aria-label="Inspiración" className="py-1">
      {/* Mismo antetítulo gris con filete que el resto de secciones del home
          (Novedades, Catálogo). Antes iba en lila con destello, el único
          encabezado del home con ese estilo. */}
      <div className="flex items-center gap-3 mb-3 px-4 md:px-0">
        <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
          <span aria-hidden className="h-px w-6 bg-todopolis-lavender-deep/60" />
          Inspiración
        </p>

        {/* Las flechas viven en la cabecera y no flotando sobre las fotos: en
            móvil un botón encima de la imagen tapa producto y compite con el
            toque que abre la ficha. */}
        <div className="ml-auto flex items-center gap-1.5">
          <button type="button" onClick={() => nudge(-1)} disabled={edges.start} aria-label="Ver inspiración anterior" className={arrow}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => nudge(1)} disabled={edges.end} aria-label="Ver más inspiración" className={arrow}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={viewportRef}
        onScroll={updateEdges}
        className="rail-viewport flex overflow-x-auto overflow-y-hidden overscroll-x-contain snap-x snap-mandatory scroll-px-4 px-4 md:scroll-px-0 md:px-0"
      >
        {images.map((item, i) => (
          <Card key={`${item.slug}-${i}`} item={item} priority={i < 3} />
        ))}
      </div>
    </section>
  )
}
