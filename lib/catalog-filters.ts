// Filtros, orden y conteos del catálogo del home. Lógica pura: vive aquí y no
// en `product-browser.tsx` porque `node --test` no importa JSX y es justo la
// parte que falla en silencio (un conteo que no cuadra con lo que se ve, un
// orden que ignora un filtro).

export type CatalogSort = 'recomendado' | 'menor-precio' | 'mayor-precio' | 'descuento'

export const CATALOG_SORTS: { value: CatalogSort; label: string }[] = [
  { value: 'recomendado', label: 'Recomendados' },
  { value: 'menor-precio', label: 'Menor precio' },
  { value: 'mayor-precio', label: 'Mayor precio' },
  { value: 'descuento', label: 'Mayor descuento' },
]

// Rangos del catálogo real (23-sep-2026: mediana $58.900; 99 / 207 / 170 / 102
// productos por tramo).
export const PRICE_RANGES = [
  { value: 'hasta-30', label: 'Hasta $30.000', min: 0, max: 30_000 },
  { value: '30-60', label: '$30.000 – $60.000', min: 30_000, max: 60_000 },
  { value: '60-100', label: '$60.000 – $100.000', min: 60_000, max: 100_000 },
  { value: 'mas-100', label: 'Más de $100.000', min: 100_000, max: Infinity },
] as const

export type PriceRange = (typeof PRICE_RANGES)[number]['value']

export interface CatalogFilters {
  query: string
  /** Título de la categoría, o 'Todos'. */
  category: string
  tags: Set<string>
  price: PriceRange | null
  onlyOffers: boolean
  freeShipping: boolean
  sort: CatalogSort
}

export interface CatalogItem {
  name: string
  shortDescription?: string
  /** Ya normalizada a título («Belleza»). */
  category: string
  price: number
  originalPrice?: number
  isDestacado?: boolean
  tags?: { slug: string }[]
}

export const ADULT_TITLE = 'Bienestar Íntimo'

export const EMPTY_FILTERS: CatalogFilters = {
  query: '',
  category: 'Todos',
  tags: new Set(),
  price: null,
  onlyOffers: false,
  freeShipping: false,
  sort: 'recomendado',
}

export const discountOf = (p: CatalogItem) =>
  p.originalPrice && p.originalPrice > p.price ? 1 - p.price / p.originalPrice : 0

/** Cuántos filtros de la sección «Filtros» hay puestos (sin búsqueda ni categoría). */
export function panelFilterCount(f: CatalogFilters): number {
  return f.tags.size + (f.price ? 1 : 0) + (f.onlyOffers ? 1 : 0) + (f.freeShipping ? 1 : 0)
}

/** ¿Es el listado limpio del home? Gobierna Novedades, banner y carriles. */
export function isCleanListing(f: CatalogFilters): boolean {
  return !f.query.trim() && f.category === 'Todos' && panelFilterCount(f) === 0 && f.sort === 'recomendado'
}

function queryScore(p: CatalogItem, terms: string[]): number {
  const name = p.name.toLowerCase()
  const cat = p.category.toLowerCase()
  const text = `${name} ${(p.shortDescription ?? '').toLowerCase()} ${cat}`
  let score = 0
  for (const term of terms) {
    if (name.includes(term)) score += 10
    if (cat.includes(term)) score += 5
    if (text.includes(term)) score += 1
  }
  return score
}

/**
 * Aplica los filtros y el orden. `skipCategory` sirve para contar por
 * categoría: el conteo de cada pestaña es «cuántos verías si la tocas», con
 * todo lo demás puesto.
 */
export function applyCatalogFilters<T extends CatalogItem>(
  products: T[],
  f: CatalogFilters,
  options: { skipCategory?: boolean } = {},
): T[] {
  const range = f.price ? PRICE_RANGES.find((r) => r.value === f.price) : null
  const terms = f.query.trim().toLowerCase().split(/\s+/).filter(Boolean)

  let scored = products
    .filter((p) => {
      if (!options.skipCategory) {
        // «Todos» nunca incluye adultos: se entra solo por su pestaña, con aviso de edad.
        if (f.category === 'Todos' ? p.category === ADULT_TITLE : p.category !== f.category) return false
      }
      if (range && (p.price < range.min || p.price >= range.max)) return false
      if (f.onlyOffers && discountOf(p) <= 0) return false
      if (f.freeShipping && !p.isDestacado) return false
      if (f.tags.size > 0) {
        const own = new Set((p.tags ?? []).map((t) => t.slug))
        for (const slug of f.tags) if (!own.has(slug)) return false
      }
      return true
    })
    .map((p, order) => ({ p, order, score: terms.length ? queryScore(p, terms) : 0 }))

  if (terms.length) scored = scored.filter((s) => s.score > 0)

  const by: Record<CatalogSort, (a: (typeof scored)[number], b: (typeof scored)[number]) => number> = {
    // Con búsqueda, lo más relevante; sin ella, el orden de llegada (lo nuevo primero).
    recomendado: (a, b) => b.score - a.score || a.order - b.order,
    'menor-precio': (a, b) => a.p.price - b.p.price || a.order - b.order,
    'mayor-precio': (a, b) => b.p.price - a.p.price || a.order - b.order,
    descuento: (a, b) => discountOf(b.p) - discountOf(a.p) || a.order - b.order,
  }
  return scored.sort(by[f.sort]).map((s) => s.p)
}

/** Productos por categoría (título) con los demás filtros puestos. Excluye adultos de «Todos». */
export function categoryCounts(products: CatalogItem[], f: CatalogFilters): Map<string, number> {
  const counts = new Map<string, number>()
  let total = 0
  for (const p of applyCatalogFilters(products, f, { skipCategory: true })) {
    counts.set(p.category, (counts.get(p.category) ?? 0) + 1)
    if (p.category !== ADULT_TITLE) total++
  }
  counts.set('Todos', total)
  return counts
}
