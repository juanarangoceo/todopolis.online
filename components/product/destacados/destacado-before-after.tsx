'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { DestacadoBeforeAfterPair } from '@/lib/types'
import { DestacadoSection, DestacadoSectionHeader } from './destacado-section-header'
import { DestacadoSlider } from './destacado-slider'
import { sanityCdnImage } from '@/lib/sanity/cdn-image'

interface Props {
  pairs: DestacadoBeforeAfterPair[]
}

// Slider de comparación antes/después. Drag de la línea revela más o menos
// de la imagen "después" sobre la "antes". Funciona con mouse y touch.
function BeforeAfterSlider({ pair }: { pair: DestacadoBeforeAfterPair }) {
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
        className="relative aspect-[4/3] md:aspect-[16/10] rounded-2xl overflow-hidden border border-todopolis-lavender/55 shadow-md cursor-ew-resize select-none touch-pan-y bg-muted"
      >
        {/* "Antes" — capa base */}
        <Image
          src={sanityCdnImage(pair.beforeImage, 1200)}
          alt={pair.beforeImageAlt || 'Antes'}
          fill
          sizes="(min-width: 1024px) 800px, 100vw"
          className="object-cover pointer-events-none"
          draggable={false}
          unoptimized
        />
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 text-white text-[10px] font-black uppercase tracking-widest">
          Antes
        </span>

        {/* "Después" — recortada por position% */}
        <div className="absolute inset-0 pointer-events-none" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
          <Image
            src={sanityCdnImage(pair.afterImage, 1200)}
            alt={pair.afterImageAlt || 'Después'}
            fill
            sizes="(min-width: 1024px) 800px, 100vw"
            className="object-cover"
            draggable={false}
            unoptimized
          />
          <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-ink-title text-white text-[10px] font-black uppercase tracking-widest shadow">
            Después
          </span>
        </div>

        {/* Línea + handle */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(107,63,138,0.55)] pointer-events-none"
          style={{ left: `${position}%` }}
        >
          <span
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center border-2 border-todopolis-lavender-deep"
          >
            <span className="text-todopolis-lavender-deep text-base leading-none">⇆</span>
          </span>
        </div>
      </div>
      {pair.caption && <p className="text-sm text-center text-foreground/60 italic">{pair.caption}</p>}
    </div>
  )
}

export function DestacadoBeforeAfter({ pairs }: Props) {
  const valid = pairs.filter((p) => p.beforeImage && p.afterImage)
  if (valid.length === 0) return null

  return (
    <DestacadoSection>
        {/* Sin «sin filtros, sin retoques»: es una afirmación que la tienda
            no puede sostener sobre fotos que sube cualquier editor. */}
        <DestacadoSectionHeader
          eyebrow="Antes y después"
          title="La diferencia, a la vista"
          subtitle="Desliza la línea para comparar."
        />

        {valid.length === 1 ? (
          <div className="max-w-3xl">
            <BeforeAfterSlider pair={valid[0]} />
          </div>
        ) : (
          <DestacadoSlider slideClassName="w-[90%] sm:w-[420px]">
            {valid.map((pair) => (
              <BeforeAfterSlider key={pair._key ?? `${pair.beforeImage}-${pair.afterImage}`} pair={pair} />
            ))}
          </DestacadoSlider>
        )}
    </DestacadoSection>
  )
}
