// Qué entra en «Eleva tu estilo», la sección de moda y accesorios del home.
//
// Todópolis se enfoca poco a poco en moda y accesorios (sep 2026), y esta es la
// sección que lleva el slogan. Vive aquí, con prueba, por lo mismo que
// `new-arrivals.ts`: si la selección se rompe, nadie lo nota. El slogan
// quedaría encima de una cafetera o de un producto repetido en Novedades.

import { newestProductIds, type DatedProduct } from './new-arrivals.ts'

/**
 * Categorías que entran: el grupo de moda de `lib/categories.ts` MENOS la
 * lencería, que pasa por aviso de edad y no puede salir en el home.
 */
export const STYLE_CATEGORIES = ['moda', 'fajas', 'calzado', 'accesorios'] as const

/** Cuántos productos ocupan la sección. */
export const STYLE_PICKS_COUNT = 12

export interface StyleCandidate extends DatedProduct {
  category?: string | null
}

/**
 * Los `_id` de los N productos de moda y accesorios más recientes, en orden
 * del más nuevo al más viejo.
 *
 * `exclude` son los que ya salen en Novedades: el mismo producto dos veces,
 * una sección encima de la otra, se lee como relleno.
 */
export function stylePickIds(
  products: StyleCandidate[],
  exclude: ReadonlySet<string> = new Set(),
  count: number = STYLE_PICKS_COUNT,
): string[] {
  const candidates = products.filter(
    (p) => (STYLE_CATEGORIES as readonly string[]).includes(p.category ?? '') && !exclude.has(p._id),
  )
  const picked = newestProductIds(candidates, count)
  const time = (p: StyleCandidate) => Date.parse(p._createdAt ?? '')
  return candidates
    .filter((p) => picked.has(p._id))
    .sort((a, b) => time(b) - time(a))
    .map((p) => p._id)
}
