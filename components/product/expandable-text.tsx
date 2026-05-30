'use client'

import { useState } from 'react'

interface ExpandableTextProps {
  text?: string
  /** Si el texto supera este largo, se colapsa con botón "Ver más". */
  threshold?: number
  /** Líneas visibles al estar colapsado. */
  clampLines?: 2 | 3
  className?: string
}

// Texto con "Ver más / Ver menos". Solo muestra el botón si el contenido supera
// el umbral, para no agregar ruido en descripciones cortas.
export function ExpandableText({
  text,
  threshold = 90,
  clampLines = 2,
  className = 'text-sm text-foreground/65 leading-relaxed',
}: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false)

  if (!text) return null

  const isLong = text.length > threshold
  const clamp = clampLines === 3 ? 'line-clamp-3' : 'line-clamp-2'

  return (
    <div>
      <p className={`${className} ${isLong && !expanded ? clamp : ''}`}>{text}</p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-xs font-bold text-amber-700 hover:text-amber-800 transition-colors"
        >
          {expanded ? 'Ver menos' : 'Ver más'}
        </button>
      )}
    </div>
  )
}
