import Image from 'next/image'
import { Check } from 'lucide-react'
import { DestacadoBoxContents as VipBoxContentsData } from '@/lib/types'
import { DestacadoSection, DestacadoSectionHeader, DestacadoSplit } from './destacado-section-header'
import { sanityCdnImage } from '@/lib/sanity/cdn-image'

interface Props {
  data: VipBoxContentsData
}

// Tres piezas, todas opcionales: la foto del kit completo, la lista y una fila
// de fotos por pieza. Las fotos por pieza SUMAN a la lista, no la reemplazan:
// si el editor solo fotografió tres de cinco piezas, las otras dos siguen
// escritas.
//
// Sin foto del kit, el bloque va en dos columnas (título a la izquierda, lista
// a la derecha). A todo el ancho una lista de una o dos líneas quedaba como un
// filete suelto de 1.200 px.
export function DestacadoBoxContents({ data }: Props) {
  const items = data.items?.filter((i) => i && i.trim().length > 0) ?? []
  const pieces = data.pieces?.filter((p) => p.image) ?? []
  if (!data.image && items.length === 0 && pieces.length === 0) return null

  const header = (
    <DestacadoSectionHeader
      eyebrow="Qué viene en la caja"
      title={data.title || 'Todo lo que recibes'}
      subtitle={data.intro}
      className={data.image ? 'md:mb-8' : 'lg:mb-0'}
    />
  )

  const list = items.length > 0 && (
    <ul className="divide-y divide-nav-inactive-border border-y border-nav-inactive-border">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 py-4">
          <Check className="mt-1 h-4 w-4 shrink-0 text-todopolis-lavender-deep" strokeWidth={3} />
          <span className="leading-relaxed text-ink-title">{item}</span>
        </li>
      ))}
    </ul>
  )

  const pieceRow = pieces.length > 0 && (
    <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {pieces.map((piece, i) => (
        <li key={piece._key ?? i}>
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-surface-muted ring-1 ring-nav-inactive-border">
            <Image
              src={sanityCdnImage(piece.image, 400)}
              alt={piece.label || ''}
              fill
              sizes="(min-width: 1024px) 200px, 45vw"
              className="object-cover"
              unoptimized
            />
          </div>
          {piece.label && (
            <p className="mt-2 text-sm font-semibold leading-snug text-ink-title">{piece.label}</p>
          )}
        </li>
      ))}
    </ul>
  )

  if (!data.image) {
    return (
      <DestacadoSection>
        <DestacadoSplit header={header}>
          {list}
          {pieceRow}
        </DestacadoSplit>
      </DestacadoSection>
    )
  }

  // Con foto: la foto a la izquierda (5 columnas, vertical, que es como
  // llegan casi todas) y a la derecha título, lista y piezas juntos. Antes la
  // foto iba en 4:3 bajo el título —recortando la mitad de una imagen
  // vertical— y una lista de un solo renglón quedaba flotando a media altura
  // en la otra mitad de la pantalla.
  return (
    <DestacadoSection>
      <div className="grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-16">
        <div className="lg:order-2 lg:col-span-7">
          {header}
          {list}
          {pieceRow}
        </div>
        <div className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-3xl bg-surface-muted lg:order-1 lg:col-span-5 lg:max-w-none">
          <Image
            src={sanityCdnImage(data.image, 900)}
            alt={data.imageAlt || 'Contenido de la caja'}
            fill
            sizes="(min-width: 1024px) 40vw, 100vw"
            className="object-cover"
            unoptimized
          />
        </div>
      </div>
    </DestacadoSection>
  )
}
