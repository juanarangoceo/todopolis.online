// Qué entra en la sección de novedades de la home.
//
// Vive aquí y no en `app/page.tsx` porque la decisión merece prueba: el fallo
// es silencioso. La sección original cortaba los 12 primeros del array y
// llamaba "recién llegados" a cosas de hace meses, sin mirar una sola fecha.
//
// Hoy son SIEMPRE los 12 más recientes por `_createdAt`: entra uno nuevo y
// desplaza al más viejo de la tanda. Antes había una ventana de 7 días, que
// tenía dos problemas prácticos: una semana floja dejaba la sección con dos
// productos (o sin sección), y una tanda de import la desbordaba por encima de
// las 12 casillas que caben. Un cupo fijo da una sección estable, siempre
// llena, y la honestidad la sostiene la fecha que se muestra al lado, no el
// número.

export interface DatedProduct {
  _id: string
  _createdAt?: string
}

/** Cuántos productos ocupan la sección de novedades. */
export const NEW_ARRIVALS_COUNT = 12

/**
 * Los `_id` de los N productos más recientes.
 *
 * Ordena por fecha en vez de fiarse del orden del array: la consulta viene
 * ordenada hoy, pero si alguien le cambia el `order()` a la query, cortar los
 * N primeros volvería a llamar "nuevo" a lo que no lo es — que es exactamente
 * el fallo que esta sección ya tuvo una vez.
 *
 * Un producto sin fecha válida nunca cuenta: no se puede afirmar que sea nuevo.
 */
export function newestProductIds(
  products: DatedProduct[],
  count: number = NEW_ARRIVALS_COUNT,
): Set<string> {
  const conFecha: { id: string; t: number }[] = []
  for (const p of products) {
    if (!p._createdAt) continue
    const t = Date.parse(p._createdAt)
    if (Number.isNaN(t)) continue
    conFecha.push({ id: p._id, t })
  }
  conFecha.sort((a, b) => b.t - a.t)
  return new Set(conFecha.slice(0, Math.max(0, count)).map((x) => x.id))
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
