'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { type AiImage } from '@/lib/inspiration'

// Carril horizontal de imágenes de estilo de vida generadas por IA.
//
// Sustituye a la antigua columna lateral sticky de escritorio. Esa columna no
// podía funcionar con la cuadrícula: el catálogo carga de 24 en 24 sobre 574
// productos, así que `sticky` dejaba 3 imágenes congeladas al lado de un scroll
// interminable. Como fila dentro de la cuadrícula, el scroll infinito pasa de
// problema a ventaja: aparece inspiración nueva a medida que bajas.
//
// El movimiento es una marquesina CSS (`.rail-marquee`, en globals.css) que solo
// anima `transform`. No hay JS en el bucle: lo único que hace este componente es
// encender y apagar la animación según el carril esté o no en pantalla.
//
// A partir del primer gesto del usuario el carril pasa a MANUAL y se puede
// adelantar y devolver, con el dedo o con las flechas. Marquesina y scroll
// nativo no pueden convivir —una mueve `transform` y el otro `scrollLeft`, y se
// suman—, así que el traspaso congela la animación, borra el `transform` y
// pasa ese desplazamiento a `scrollLeft`. El carril no da un salto: se queda
// exactamente donde estaba y desde ahí manda el dedo.

function sanityOptimized(url: string, width: number): string {
  if (!url || !url.includes('cdn.sanity.io')) return url
  return `${url}?w=${width}&auto=format&q=80`
}

function Card({ item, priority, dup = false }: { item: AiImage; priority: boolean; dup?: boolean }) {
  return (
    <Link
      href={`/producto/${item.slug}`}
      className={`group shrink-0 w-[168px] md:w-[212px] mr-3 active:scale-[0.98] transition-transform${dup ? ' rail-marquee-dup' : ''}`}
    >
      <div className="rounded-2xl overflow-hidden shadow-sm border border-todopolis-lavender/40 group-hover:border-todopolis-lavender group-hover:shadow-md transition-all">
        <div className="relative w-full aspect-[3/4]">
          <Image
            src={sanityOptimized(item.image, 440)}
            alt={item.name}
            fill
            sizes="(min-width: 768px) 212px, 168px"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            loading={priority ? undefined : 'lazy'}
            unoptimized
          />
        </div>
        <div className="px-2.5 py-2 bg-white/95">
          <p className="text-[11px] md:text-xs font-medium text-foreground/75 leading-snug line-clamp-2 group-hover:text-todopolis-lavender-deep transition-colors">
            {item.name}
          </p>
        </div>
      </div>
    </Link>
  )
}

export function InspirationRail({ images }: { images: AiImage[] }) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [running, setRunning] = useState(false)
  const [manual, setManual] = useState(false)

  // Enciende la marquesina solo mientras el carril se ve. Una animación
  // infinita fuera de pantalla sigue costando, y en la home hay varios.
  useEffect(() => {
    const node = viewportRef.current
    if (!node || manual) return
    const observer = new IntersectionObserver(
      (entries) => setRunning(entries[0]?.isIntersecting ?? false),
      { rootMargin: '100px 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [manual])

  /**
   * Traspaso de marquesina a manual, sin salto visual.
   *
   * Lee cuánto lleva desplazado el `transform` de la pista, lo borra y mete ese
   * mismo número en `scrollLeft`. Sin esto el carril saltaría al principio en
   * cuanto lo tocas, o peor: dejaría las primeras tarjetas inalcanzables,
   * porque el desplazamiento de la animación y el del scroll se suman.
   */
  const goManual = useCallback(() => {
    if (manual) return
    const viewport = viewportRef.current
    const track = trackRef.current
    if (!viewport || !track) return

    let desplazado = 0
    try {
      const matrix = new DOMMatrixReadOnly(getComputedStyle(track).transform)
      desplazado = -matrix.m41 // translateX es negativo mientras avanza
    } catch {
      desplazado = 0 // navegador sin DOMMatrix: arranca desde el principio
    }

    setRunning(false)
    setManual(true)
    track.style.transform = 'none'
    track.style.animation = 'none'
    // Se SUMA al scroll que el gesto ya haya hecho: si no, el primer empujón
    // del dedo se pierde y el carril parece que se resiste.
    viewport.scrollLeft = Math.max(0, desplazado + viewport.scrollLeft)
  }, [manual])

  // Una tarjeta y pico: el salto deja siempre una asomada al borde, que es lo
  // que le dice al usuario que el carril sigue.
  const nudge = (direction: 1 | -1) => {
    goManual()
    const viewport = viewportRef.current
    if (!viewport) return
    const paso = Math.max(160, viewport.clientWidth * 0.7)
    viewport.scrollBy({ left: direction * paso, behavior: 'smooth' })
  }

  if (images.length === 0) return null

  return (
    <section aria-label="Inspiración" className="py-1">
      <div className="flex items-center gap-1.5 mb-3 px-4 md:px-0">
        <Sparkles className="w-4 h-4 text-todopolis-lavender-deep" />
        <p className="text-xs md:text-sm font-bold text-todopolis-lavender-deep uppercase tracking-wider">
          Inspiración
        </p>

        {/* Las flechas viven en la cabecera y no flotando sobre las fotos: en
            móvil un botón encima de la imagen tapa producto y compite con el
            toque que abre la ficha. */}
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => nudge(-1)}
            aria-label="Ver inspiración anterior"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-todopolis-lavender/50 text-todopolis-lavender-deep shadow-sm active:scale-90 hover:bg-todopolis-lavender/10 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => nudge(1)}
            aria-label="Ver más inspiración"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-todopolis-lavender/50 text-todopolis-lavender-deep shadow-sm active:scale-90 hover:bg-todopolis-lavender/10 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* El viewport recorta y también desplaza; la pista se mueve sola hasta
          que alguien la toca.

          El traspaso cuelga de `onScroll` y no de `touchstart`/`wheel` a
          propósito: esos dos disparan también cuando el dedo o la rueda pasan
          por encima camino de bajar la página, y pararían la marquesina de
          todos los carriles con solo recorrer el home. `onScroll` solo salta
          cuando de verdad hubo desplazamiento horizontal. */}
      {/* Sin padding en el viewport NI en la pista: `translateX(-50%)` se
          calcula sobre el ancho de borde, así que cualquier padding rompería
          el bucle. La marquesina sangra de borde a borde, que además es lo
          correcto para algo en movimiento. */}
      <div
        ref={viewportRef}
        className="rail-viewport overflow-x-auto overflow-y-hidden overscroll-x-contain"
        onScroll={goManual}
      >
        <div
          ref={trackRef}
          className="rail-marquee flex w-max"
          data-running={running && !manual ? 'true' : 'false'}
        >
          {images.map((item, i) => (
            <Card key={`a-${item.slug}-${i}`} item={item} priority={i < 3} />
          ))}
          {/* Segunda tanda idéntica: la animación desplaza -50%, que con la
              separación dentro de cada tarjeta es exactamente el ancho de la
              primera. Por eso el bucle no tiene costura. */}
          {images.map((item, i) => (
            <Card key={`b-${item.slug}-${i}`} item={item} priority={false} dup />
          ))}
        </div>
      </div>
    </section>
  )
}
