// Lógica pura de los carriles de inspiración. Vive aparte del componente porque
// el componente es .tsx y `node --test` no puede importar JSX: la parte que
// decide QUÉ imágenes van en cada carril es justo la que merece prueba, porque
// si falla lo hace en silencio (el mismo carril repetido toda la home, o
// carriles vacíos a mitad del scroll infinito).

export interface AiImage {
  image: string
  name: string
  slug: string
  /** Opcional: sin precio la tarjeta solo pinta el nombre. */
  price?: number
}

interface InspirationProduct {
  name: string
  slug: string
  price?: number | null
  aiLifestyleImage?: string | null
  aiLifestyleImageCreatedAt?: string | null
}

/** Primero las fotos nuevas, aunque se hayan generado para productos antiguos.
 * No usar _updatedAt del producto: el stock lo cambia cada hora. */
export function inspirationImages(products: InspirationProduct[]): AiImage[] {
  const imageTime = (product: InspirationProduct) => Date.parse(product.aiLifestyleImageCreatedAt ?? '') || 0
  return products
    .filter((product) => !!product.aiLifestyleImage)
    .sort((a, b) => imageTime(b) - imageTime(a))
    .map((product) => ({
      image: product.aiLifestyleImage!,
      name: product.name,
      slug: product.slug,
      price: product.price ?? 0,
    }))
}

/** Imágenes por carril. Con ~39 disponibles salen ~5 carriles sin repetir. */
export const RAIL_SIZE = 8

/**
 * Las imágenes del carril número `occurrence`, dando la vuelta cuando se
 * agotan. Da la vuelta a propósito: con 574 productos salen ~35 carriles y solo
 * hay ~39 imágenes. Repetir es aceptable en una superficie de descubrimiento;
 * dejar de mostrarlas a mitad del scroll, no.
 */
export function railSlice(images: AiImage[], occurrence: number): AiImage[] {
  if (images.length === 0) return []
  const start = (occurrence * RAIL_SIZE) % images.length
  const out: AiImage[] = []
  for (let i = 0; i < Math.min(RAIL_SIZE, images.length); i++) {
    out.push(images[(start + i) % images.length])
  }
  return out
}
