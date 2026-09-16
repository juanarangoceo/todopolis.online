// Qué cuenta como "producto nuevo" en la home.
//
// Vive aquí y no en `app/page.tsx` por dos razones. La práctica: llamar a
// `Date.now()` dentro del cuerpo de un componente es una función impura en
// render y el linter de React lo marca. La de fondo: esta decisión —cuántos
// días son "nuevo"— merece prueba, porque el fallo es silencioso. La sección
// anterior cortaba los 12 primeros productos y llamaba "recién llegados" a
// cosas de hace meses.

export interface DatedProduct {
  _id: string
  _createdAt?: string
}

/** Días hacia atrás que cuentan como novedad. */
export const NEW_ARRIVALS_WINDOW_DAYS = 7

/**
 * Los `_id` de los productos creados dentro de la ventana. `now` es un
 * parámetro para poder probarlo sin depender del reloj.
 */
export function recentProductIds(
  products: DatedProduct[],
  windowDays: number = NEW_ARRIVALS_WINDOW_DAYS,
  now: number = Date.now(),
): Set<string> {
  const cutoff = now - windowDays * 24 * 60 * 60 * 1000
  const ids = new Set<string>()
  for (const p of products) {
    if (!p._createdAt) continue
    const created = Date.parse(p._createdAt)
    if (Number.isNaN(created) || created <= cutoff) continue
    ids.add(p._id)
  }
  return ids
}

/** La fecha de creación más reciente del catálogo, o null. */
export function newestCreatedAt(products: DatedProduct[]): string | null {
  let best: string | null = null
  let bestTime = -Infinity
  for (const p of products) {
    if (!p._createdAt) continue
    const t = Date.parse(p._createdAt)
    if (Number.isNaN(t) || t <= bestTime) continue
    bestTime = t
    best = p._createdAt
  }
  return best
}

/**
 * Cuántas columnas usar en escritorio para que la última fila quede COMPLETA.
 *
 * El número de novedades cambia cada semana, así que una rejilla fija deja un
 * hueco casi siempre: con 4 columnas y 6 productos salen 4 + 2 y dos huecos al
 * final. Se elige el divisor exacto, prefiriendo 4 y 3 porque son los que dan
 * tarjetas de buen tamaño.
 *
 * Para cantidades sin divisor cómodo (7, 11…) se cae a 4 y la última fila se
 * centra, que se lee como decisión y no como hueco.
 */
export function bestColumns(count: number): number {
  if (count <= 0) return 1
  if (count <= 4) return count
  for (const c of [4, 3, 5, 6]) {
    if (count % c === 0) return c
  }
  return 4
}
