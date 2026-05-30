'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface VipSliderProps {
  children: React.ReactNode
  /** Ancho de cada slide. Por defecto ~85% en mobile, fijo en desktop. */
  slideClassName?: string
}

// Slider horizontal con scroll-snap para las secciones VIP que viven dentro de
// la columna de contenido (más angosta). Cada hijo se envuelve como slide.
// Flechas prev/next solo en desktop; en mobile se desliza con el dedo.
export function VipSlider({
  children,
  slideClassName = 'w-[85%] sm:w-[300px]',
}: VipSliderProps) {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  const updateArrows = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    setCanPrev(el.scrollLeft > 4)
    setCanNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  }, [])

  useEffect(() => {
    updateArrows()
    const el = trackRef.current
    if (!el) return
    el.addEventListener('scroll', updateArrows, { passive: true })
    window.addEventListener('resize', updateArrows)
    return () => {
      el.removeEventListener('scroll', updateArrows)
      window.removeEventListener('resize', updateArrows)
    }
  }, [updateArrows])

  const scrollBy = (dir: 1 | -1) => {
    const el = trackRef.current
    if (!el) return
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.8), behavior: 'smooth' })
  }

  const items = Array.isArray(children) ? children : [children]

  return (
    <div className="relative">
      <div
        ref={trackRef}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((child, i) => (
          <div key={i} className={`snap-start shrink-0 ${slideClassName}`}>
            {child}
          </div>
        ))}
      </div>

      {/* Flechas — solo desktop, aparecen cuando hay overflow */}
      {canPrev && (
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label="Anterior"
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 w-9 h-9 items-center justify-center rounded-full bg-white shadow-lg border border-amber-200 text-amber-700 hover:scale-105 transition-transform"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      {canNext && (
        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label="Siguiente"
          className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 w-9 h-9 items-center justify-center rounded-full bg-white shadow-lg border border-amber-200 text-amber-700 hover:scale-105 transition-transform"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </div>
  )
}
