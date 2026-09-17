import Image from 'next/image'
import { Camera } from 'lucide-react'
import { CustomerPhoto } from '@/lib/types'

interface CustomerPhotosProps {
  photos?: CustomerPhoto[]
  productName: string
}

// Cuántas fotos se pintan. El bloque vive al lado del formulario de
// suscripción y las dos tarjetas se estiran a la misma altura: sin tope, un
// producto con doce fotos estiraría la fila y dejaría el formulario flotando
// en medio de una columna vacía.
const MAX_VISIBLE = 6

// «Así les llegó» — fotos REALES que mandan los clientes al recibir el pedido.
//
// Es prueba social auténtica, y es lo único de la ficha que lo es: los
// testimonios de más arriba los escribe la IA con nombres inventados (ver
// "Testimonios IA de la landing — pendiente" en CLAUDE.md). Por eso este
// bloque se separa de ellos y se etiqueta por lo que es —una foto que mandó
// alguien— sin estrellas, sin promedio y sin sello de "compra verificada":
// nada de eso está comprobado todavía, y afirmarlo aquí repetiría exactamente
// el problema que se acaba de quitar de las tarjetas.
//
// Sin fotos cargadas no se renderiza nada y el padre vuelve a una sola
// columna.
export function CustomerPhotos({ photos, productName }: CustomerPhotosProps) {
  const usable = (photos ?? []).filter((p) => !!p?.url)

  if (usable.length === 0) return null

  const visible = usable.slice(0, MAX_VISIBLE)
  const overflow = usable.length - visible.length

  return (
    <div className="relative h-full rounded-3xl p-7 md:p-8 overflow-hidden border border-nav-inactive-border shadow-md bg-surface">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-trust-bg border border-trust-border mb-3">
          <Camera className="w-3.5 h-3.5 text-trust-fg" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-trust-fg">
            Fotos de clientes
          </span>
        </div>
        <h3 className="font-serif text-2xl md:text-[1.75rem] font-bold text-ink-title tracking-tight leading-tight mb-2 text-balance">
          Así les llegó.
        </h3>
        <p className="text-foreground/65 text-sm leading-relaxed">
          Fotos que nos mandaron quienes ya recibieron su{' '}
          <span className="font-semibold text-foreground/85">{productName}</span>. Sin retoque ni
          estudio: el producto tal como sale de la caja.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {visible.map((photo, index) => {
          const isLast = index === visible.length - 1
          const credit = [photo.customerName, photo.city].filter(Boolean).join(' · ')

          return (
            <figure
              key={photo._key ?? photo.url ?? index}
              className="relative aspect-square rounded-xl overflow-hidden bg-surface-muted group"
            >
              <Image
                src={photo.url as string}
                alt={photo.alt || `${productName} — foto de un cliente`}
                fill
                sizes="(max-width: 640px) 45vw, 160px"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />

              {/* Crédito sobre la foto. Solo si el editor puso nombre o ciudad:
                  un degradado negro sin texto debajo solo ensucia la imagen. */}
              {credit && (
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pt-6 pb-1.5">
                  <span className="block text-[10px] font-semibold text-white leading-tight truncate">
                    {credit}
                  </span>
                </figcaption>
              )}

              {/* El "+N" va sobre la última foto visible, no en una casilla
                  aparte: una casilla vacía con un número rompe la cuadrícula y
                  parece una imagen que no cargó. */}
              {isLast && overflow > 0 && (
                <div className="absolute inset-0 bg-ink-title/60 flex items-center justify-center">
                  <span className="font-serif text-xl font-extrabold text-white">+{overflow}</span>
                </div>
              )}
            </figure>
          )
        })}
      </div>
    </div>
  )
}
