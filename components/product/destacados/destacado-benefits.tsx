import { ProductLifestyleGallery } from '@/components/product/product-lifestyle-gallery'
import type { LifestyleImage } from '@/lib/lifestyle'
import { DestacadoSection, DestacadoSectionHeader } from './destacado-section-header'

type Benefit = { _key?: string; icon?: string; title?: string; description?: string } | string

interface Props {
  benefits: Benefit[]
  images: LifestyleImage[]
  productName: string
}

// Beneficios y galería lifestyle en la MISMA sección, lado a lado.
//
// Antes eran dos bloques seguidos: un acordeón de 4xl y, debajo, una sola foto
// IA de 448 px centrada con dos márgenes vacíos enormes. En escritorio eso era
// el mayor responsable de que la página pareciera desordenada. Juntos, la foto
// ilustra lo que dicen los beneficios mientras se leen.
//
// En la landing de campaña los beneficios van ABIERTOS, sin acordeón: quien
// llega de un anuncio no va a abrir cuatro desplegables para saber qué gana.
// Y sin emoji: la fila de emojis de colores era la firma más reconocible de
// una landing hecha con IA; el número hace el mismo trabajo de orden.
export function DestacadoBenefits({ benefits, images, productName }: Props) {
  const items = benefits
    .map((b) => {
      const raw = typeof b === 'string' ? { description: b } : b
      const title = raw.title?.trim()
      const description = raw.description?.trim()
      return { key: raw._key, heading: title || description || '', body: title ? description : undefined }
    })
    .filter((b) => b.heading)

  if (items.length === 0 && images.length === 0) return null

  const header = (
    <DestacadoSectionHeader eyebrow="Por qué este" title="Lo que vas a notar en casa" />
  )

  const list = items.length > 0 && (
    <ol className={images.length > 0 ? 'divide-y divide-nav-inactive-border border-y border-nav-inactive-border' : 'grid gap-x-12 md:grid-cols-2'}>
      {items.map((b, i) => (
        <li
          key={b.key ?? i}
          className={images.length > 0 ? 'flex gap-5 py-6' : 'flex gap-5 border-t border-nav-inactive-border py-6'}
        >
          <span className="w-7 shrink-0 pt-0.5 font-serif text-sm font-extrabold tabular-nums text-todopolis-lavender-deep">
            {String(i + 1).padStart(2, '0')}
          </span>
          <div className="min-w-0">
            <h3 className="font-serif text-lg font-bold leading-snug text-ink-title md:text-xl">{b.heading}</h3>
            {b.body && <p className="mt-2 leading-relaxed text-muted-foreground">{b.body}</p>}
          </div>
        </li>
      ))}
    </ol>
  )

  if (images.length === 0) {
    return (
      <DestacadoSection>
        {header}
        {list}
      </DestacadoSection>
    )
  }

  return (
    <DestacadoSection>
      <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
        <ProductLifestyleGallery
          images={images}
          productName={productName}
          className="lg:col-span-5"
        />
        <div className="lg:col-span-7">
          {header}
          {list}
        </div>
      </div>
    </DestacadoSection>
  )
}
