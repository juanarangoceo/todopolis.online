'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { VipBeforeAfterPair } from '@/lib/types'
import { VipSectionHeader } from './vip-section-header'
import { VipSlider } from './vip-slider'

interface Props {
  pairs: VipBeforeAfterPair[]
}

// Slider de comparación antes/después. Drag de la línea revela más o menos
// de la imagen "después" sobre la "antes". Funciona con mouse y touch.
function BeforeAfterSlider({ pair }: { pair: VipBeforeAfterPair }) {
  const [position, setPosition] = useState(50)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const pct = ((clientX - rect.left) / rect.width) * 100
    setPosition(Math.max(0, Math.min(100, pct)))
  }, [])

  const handlePointer = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.buttons === 0 && e.type === 'pointermove') return
      updateFromClientX(e.clientX)
    },
    [updateFromClientX],
  )

  if (!pair.beforeImage || !pair.afterImage) return null

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        onPointerDown={handlePointer}
        onPointerMove={handlePointer}
        className="relative aspect-[4/3] md:aspect-[16/10] rounded-2xl overflow-hidden border border-amber-200/60 shadow-md cursor-ew-resize select-none touch-pan-y bg-muted"
      >
        {/* "Antes" — capa base */}
        <Image
          src={pair.beforeImage}
          alt={pair.beforeImageAlt || 'Antes'}
          fill
          sizes="(min-width: 1024px) 800px, 100vw"
          className="object-cover pointer-events-none"
          draggable={false}
        />
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 text-white text-[10px] font-black uppercase tracking-widest">
          Antes
        </span>

        {/* "Después" — recortada por position% */}
        <div className="absolute inset-0 pointer-events-none" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
          <Image
            src={pair.afterImage}
            alt={pair.afterImageAlt || 'Después'}
            fill
            sizes="(min-width: 1024px) 800px, 100vw"
            className="object-cover"
            draggable={false}
          />
          <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest shadow">
            Después
          </span>
        </div>

        {/* Línea + handle */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(245,158,11,0.5)] pointer-events-none"
          style={{ left: `${position}%` }}
        >
          <span
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center border-2 border-amber-400"
          >
            <span className="text-amber-600 text-base leading-none">⇆</span>
          </span>
        </div>
      </div>
      {pair.caption && <p className="text-sm text-center text-foreground/60 italic">{pair.caption}</p>}
    </div>
  )
}

export function VipBeforeAfter({ pairs }: Props) {
  const valid = pairs.filter((p) => p.beforeImage && p.afterImage)
  if (valid.length === 0) return null

  return (
    <section className="py-8 md:py-10 bg-surface-soft">
      <div className="container mx-auto px-4">
        <VipSectionHeader
          eyebrow="Resultados reales"
          title="Antes y después"
          subtitle="Desliza la línea para ver el cambio. Sin filtros, sin retoques."
        />

        {valid.length === 1 ? (
          <div className="max-w-xl mx-auto">
            <BeforeAfterSlider pair={valid[0]} />
          </div>
        ) : (
          <VipSlider slideClassName="w-[90%] sm:w-[420px]">
            {valid.map((pair) => (
              <BeforeAfterSlider key={pair._key ?? `${pair.beforeImage}-${pair.afterImage}`} pair={pair} />
            ))}
          </VipSlider>
        )}
      </div>
    </section>
  )
}
