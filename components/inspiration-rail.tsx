'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
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
  const [running, setRunning] = useState(false)

  // Enciende la marquesina solo mientras el carril se ve. Una animación
  // infinita fuera de pantalla sigue costando, y en la home hay varios.
  useEffect(() => {
    const node = viewportRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => setRunning(entries[0]?.isIntersecting ?? false),
      { rootMargin: '100px 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  if (images.length === 0) return null

  return (
    <section aria-label="Inspiración" className="py-1">
      <div className="flex items-center gap-1.5 mb-3 px-4 md:px-0">
        <Sparkles className="w-4 h-4 text-todopolis-lavender-deep" />
        <p className="text-xs md:text-sm font-bold text-todopolis-lavender-deep uppercase tracking-wider">
          Inspiración
        </p>
      </div>

      {/* El viewport recorta; la pista se mueve. Sin `overflow-x-auto` aquí: la
          marquesina y el scroll manual se pelearían. Con
          `prefers-reduced-motion` el CSS lo convierte en carrusel deslizable. */}
      {/* Sin padding en el viewport NI en la pista: `translateX(-50%)` se
          calcula sobre el ancho de borde, así que cualquier padding rompería
          el bucle. La marquesina sangra de borde a borde, que además es lo
          correcto para algo en movimiento. */}
      <div ref={viewportRef} className="rail-viewport overflow-hidden">
        <div className="rail-marquee flex w-max" data-running={running ? 'true' : 'false'}>
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
