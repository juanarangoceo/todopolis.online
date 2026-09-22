import { DestacadoBanner as DestacadoBannerData } from '@/lib/types'
import { sanityCdnImage } from '@/lib/sanity/cdn-image'

interface Props {
  banner?: DestacadoBannerData
}

// Banner de campaña bajo el hero, de borde a borde (sin `container`): es la
// pieza que el comprador acaba de ver en el anuncio, y reconocerla le confirma
// que llegó al sitio correcto.
//
// `<picture>` y no `next/image`: hay dos recortes distintos (escritorio
// horizontal, móvil vertical) y el que elige es el navegador según el ancho.
// Las URLs salen ya redimensionadas del CDN de Sanity —mismo motivo que el
// resto de bloques de campaña: el optimizador local se atraganta con PNG
// grandes—.
//
// Las dimensiones del asset van como `width`/`height` para que el navegador
// reserve el alto antes de que llegue la imagen y la página no salte.
export function DestacadoBanner({ banner }: Props) {
  const desktop = banner?.desktop
  if (!desktop) return null

  const mobile = banner?.mobile
  const alt = banner?.alt ?? ''
  const desktopDims = banner?.desktopDimensions
  const mobileDims = banner?.mobileDimensions

  return (
    <section aria-label={alt || 'Banner de campaña'} className="bg-surface-soft">
      <picture>
        {mobile && (
          <source
            media="(max-width: 767px)"
            srcSet={`${sanityCdnImage(mobile, 828)} 828w, ${sanityCdnImage(mobile, 1242)} 1242w`}
            sizes="100vw"
            width={mobileDims?.width}
            height={mobileDims?.height}
          />
        )}
        <source
          srcSet={[1280, 1920, 2560].map((w) => `${sanityCdnImage(desktop, w)} ${w}w`).join(', ')}
          sizes="100vw"
          width={desktopDims?.width}
          height={desktopDims?.height}
        />
        <img
          src={sanityCdnImage(desktop, 1920)}
          alt={alt}
          width={desktopDims?.width}
          height={desktopDims?.height}
          loading="lazy"
          decoding="async"
          // Tope de alto por si suben una imagen vertical al campo de
          // escritorio: sin él, el banner ocuparía varias pantallas.
          className="block h-auto max-h-[85vh] w-full object-cover"
        />
      </picture>
    </section>
  )
}
