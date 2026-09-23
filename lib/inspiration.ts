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
