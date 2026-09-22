import Image from 'next/image'
import { CustomerPhoto } from '@/lib/types'
import { sanityCdnImage } from '@/lib/sanity/cdn-image'
import { DestacadoSection, DestacadoSectionHeader, DestacadoSplit } from './destacado-section-header'

interface Props {
  photos?: CustomerPhoto[]
  productName: string
}

const MAX_VISIBLE = 6

// «Así les llegó»: fotos REALES que mandan los clientes, sin estrellas,
// promedio ni sello de verificado (nada de eso está comprobado todavía).
//
// Absorbió a los «Testimonios visuales» de Destacados: si alguna foto trae lo
// que dijo el cliente, el bloque pasa a tarjetas con la frase debajo; si no,
// es una rejilla de fotos. Antes eran dos secciones distintas para la misma
// cosa —una foto real de alguien que compró—.
export function DestacadoCustomerPhotos({ photos, productName }: Props) {
  const usable = (photos ?? []).filter((p) => !!p?.url)
  if (usable.length === 0) return null

  const visible = usable.slice(0, MAX_VISIBLE)
  const overflow = usable.length - visible.length
  const withQuotes = visible.some((p) => p.quote?.trim())
  const cols = withQuotes
    ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'
    : visible.length === 1 ? 'grid-cols-1 max-w-sm' : visible.length === 2 || visible.length === 4 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'

  return (
    <DestacadoSection>
      <DestacadoSplit
        header={
          <DestacadoSectionHeader
            eyebrow="Fotos de clientes"
            title="Así les llegó"
            subtitle={`Fotos que nos mandaron quienes ya recibieron su ${productName}, tal como salió de la caja.`}
            className="lg:mb-0"
          />
        }
      >
        <div className={`grid gap-3 ${cols}`}>
          {visible.map((photo, index) => {
            const isLast = index === visible.length - 1
            const credit = [photo.customerName, photo.city].filter(Boolean).join(' · ')
            if (withQuotes) {
              return (
                <figure
                  key={photo._key ?? photo.url ?? index}
                  className="flex flex-col overflow-hidden rounded-2xl border border-nav-inactive-border bg-surface"
                >
                  <div className="relative aspect-square bg-surface-muted">
                    <Image
                      src={sanityCdnImage(photo.url as string, 700)}
                      alt={photo.alt || `${productName} — foto de un cliente`}
                      fill
                      sizes="(min-width: 1280px) 20vw, (min-width: 640px) 33vw, 100vw"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <figcaption className="flex flex-1 flex-col gap-3 p-5">
                    {photo.quote?.trim() && (
                      <blockquote className="flex-1 leading-relaxed text-ink-title">
                        &ldquo;{photo.quote.trim()}&rdquo;
                      </blockquote>
                    )}
                    {credit && <span className="text-sm text-muted-foreground">{credit}</span>}
                  </figcaption>
                </figure>
              )
            }
            return (
              <figure
                key={photo._key ?? photo.url ?? index}
                className="relative aspect-square overflow-hidden rounded-2xl bg-surface-muted"
              >
                <Image
                  src={sanityCdnImage(photo.url as string, 700)}
                  alt={photo.alt || `${productName} — foto de un cliente`}
                  fill
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  className="object-cover"
                  unoptimized
                />
                {credit && (
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-8 text-xs font-semibold text-white">
                    {credit}
                  </figcaption>
                )}
                {isLast && overflow > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-ink-title/60">
                    <span className="font-serif text-2xl font-extrabold text-white">+{overflow}</span>
                  </div>
                )}
              </figure>
            )
          })}
        </div>
      </DestacadoSplit>
    </DestacadoSection>
  )
}
