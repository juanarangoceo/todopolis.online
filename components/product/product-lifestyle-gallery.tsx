'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LifestyleImage } from '@/lib/lifestyle'

interface Props {
  images: LifestyleImage[]
  productName: string
  className?: string
}

// Pre-redimensionar en Sanity para no pasar un PNG de 2 MB al optimizador
// (timeout local). Mismo criterio que el antiguo `product-lifestyle-image.tsx`, al que sustituye.
function resizedFromSanity(url: string, width: number): string {
  if (!url || !url.includes('cdn.sanity.io')) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}w=${width}&q=78&auto=format`
}

/**
 * Carrusel de la imagen lifestyle principal + la galería. Con una sola imagen
 * se pinta como foto fija, sin flechas ni puntos.
 *
 * `unoptimized` es INTENCIONAL (ver CLAUDE.md): las imágenes IA son PNG de
 * ~2 MB y el optimizador de Next hace timeout. La URL ya llega recortada por
 * el CDN de Sanity.
 *
 * Scroll nativo con `snap`, no un transform animado: el dedo en móvil funciona
 * sin código, y las flechas solo llaman a `scrollTo`.
 */
export function ProductLifestyleGallery({ images, productName, className }: Props) {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [index, setIndex] = useState(0)
  const count = images.length

  const onScroll = useCallback(() => {
    const el = trackRef.current
    if (!el || el.clientWidth === 0) return
    setIndex(Math.round(el.scrollLeft / el.clientWidth))
  }, [])

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [onScroll])

  const goTo = (i: number) => {
    const el = trackRef.current
    if (!el) return
    const next = (i + count) % count
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' })
  }

  if (count === 0) return null

  return (
    <div className={className}>
      <div className="relative">
        <div
          ref={trackRef}
          className="flex snap-x snap-mandatory overflow-x-auto rounded-3xl bg-surface-muted [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-roledescription="carrusel"
          aria-label={`Fotos de ${productName} en uso`}
        >
          {images.map((img, i) => (
            <div
              key={`${img.url}-${i}`}
              className="relative aspect-[4/5] w-full shrink-0 snap-center"
              aria-roledescription="diapositiva"
              aria-label={`${i + 1} de ${count}`}
            >
              <Image
                src={resizedFromSanity(img.url, 1000)}
                alt={img.alt || `${productName} en uso`}
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover"
                loading="lazy"
                unoptimized
              />
            </div>
          ))}
        </div>

        {count > 1 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 p-4">
            <span className="rounded-full bg-black/45 px-2.5 py-1 text-xs font-semibold tabular-nums text-white backdrop-blur-sm">
              {index + 1} / {count}
            </span>
            <div className="pointer-events-auto flex gap-2">
              <button
                type="button"
                onClick={() => goTo(index - 1)}
                aria-label="Foto anterior"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink-title shadow-md backdrop-blur-sm transition hover:bg-white"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => goTo(index + 1)}
                aria-label="Foto siguiente"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink-title shadow-md backdrop-blur-sm transition hover:bg-white"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {count > 1 && (
        <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
          {images.map((_, i) => (
            <span
              key={i}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === index ? 'w-6 bg-ink-title' : 'w-1.5 bg-nav-inactive-border',
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}
