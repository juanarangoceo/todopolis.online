// Venta cruzada de la ficha normal: qué productos se parecen a este.
//
// Antes la ficha cortaba los 12 primeros del catálogo, que viene ordenado por
// fecha: TODAS las fichas sugerían los mismos 12 productos recién llegados. Un
// batidor de café proponía unas cartas didácticas, una bicicleta infantil y un
// soporte para botellón. Vive en lib/ y con test porque es el tipo de fallo
// que no rompe nada: el carrusel se ve lleno y solo vende menos.
//
// El parecido se mide con lo que el catálogo ya tiene: etiquetas compartidas,
// misma categoría y precio parecido. Las etiquetas pesan según lo raras que
// sean: «Ideal para regalo» la llevan cientos de productos y no dice casi nada;
// «Cuidado capilar» sí.

export interface RelatableProduct {
  id: string
  category?: string
  price?: number
  tags?: { slug?: string }[] | null
}

export const RELATED_COUNT = 12

const tagSlugs = (p: RelatableProduct): string[] =>
  (p.tags ?? []).map((t) => t?.slug).filter((s): s is string => !!s)

const norm = (c?: string) => (c ?? '').trim().toLowerCase()

/**
 * Los `count` productos más parecidos a `current`, sin incluirlo.
 *
 * Si no hay suficientes parecidos se completa con el resto en el orden en que
 * llegaron (el catálogo viene por fecha): un carrusel corto se lee como tienda
 * vacía. El relleno va SIEMPRE detrás de los parecidos.
 */
export function relatedProducts<T extends RelatableProduct>(
  current: RelatableProduct,
  candidates: T[],
  count = RELATED_COUNT,
): T[] {
  const pool = candidates.filter((p) => p.id !== current.id)
  if (pool.length === 0 || count <= 0) return []

  // Frecuencia de cada etiqueta en el catálogo, para pesarla por rareza.
  const df = new Map<string, number>()
  for (const p of pool) for (const s of new Set(tagSlugs(p))) df.set(s, (df.get(s) ?? 0) + 1)
  const total = pool.length

  const ownTags = new Set(tagSlugs(current))
  const ownCategory = norm(current.category)
  const ownPrice = current.price ?? 0

  const scored = pool.map((p, order) => {
    let score = 0
    for (const s of new Set(tagSlugs(p))) {
      if (ownTags.has(s)) score += Math.log(1 + total / (df.get(s) ?? 1))
    }
    if (ownCategory && ownCategory !== 'otros' && norm(p.category) === ownCategory) score += 2
    // El precio solo desempata entre parecidos: por sí solo no hace pariente a
    // un producto (un labial y una linterna pueden costar lo mismo).
    if (score > 0 && ownPrice > 0 && p.price && p.price >= ownPrice / 2 && p.price <= ownPrice * 2) {
      score += 0.5
    }
    return { p, score, order }
  })

  const related = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .map((s) => s.p)
    .slice(0, count)

  if (related.length >= count) return related
  const picked = new Set(related.map((p) => p.id))
  const filler = pool.filter((p) => !picked.has(p.id)).slice(0, count - related.length)
  return [...related, ...filler]
}
