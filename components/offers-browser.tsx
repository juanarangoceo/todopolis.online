'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { SearchX, Tag } from 'lucide-react'
import { MagicSearchBar } from './magic-search-bar'
import { MobileSearchFab } from './mobile-search-fab'
import { ProductGrid } from './product-grid'
import { Product } from '@/lib/types'
import { PRODUCT_CATEGORIES, categoryTitle } from '@/lib/categories'
import { CategoryBar } from './category-bar'
import { CategoryCards } from './category-cards'
import { FASHION_TITLES, getCategoryIcon } from './category-icons'
import { ADULT_TITLE } from '@/lib/catalog-filters'

export type DiscountedProduct = Product & { _discount: number }

type Sort = 'descuento' | 'menor-precio' | 'mayor-precio'

const SORTS: { value: Sort; label: string }[] = [
  { value: 'descuento', label: 'Mayor descuento' },
  { value: 'menor-precio', label: 'Menor precio' },
  { value: 'mayor-precio', label: 'Mayor precio' },
]

// /ofertas (rehecha en sep 2026).
//
// Antes: un banner con degradado rosa-lila, manchas difuminadas y un brillo
// animado —el único bloque así del sitio—, una franja rosa con «Hasta 42% off»
// en píldora roja, y dos frases que la página no podía sostener: «precios que
// solo duran lo que dura el cronómetro» y «Precios válidos por tiempo
// limitado». No hay cronómetro en el listado. Además no tenía buscador en
// móvil (solo el del header de escritorio) ni forma de filtrar u ordenar 155
// productos.
//
// Ahora usa el mismo lenguaje que el home: antetítulo gris con filete, titular,
// las MISMAS categorías (tarjetas con foto en móvil, barra en escritorio), «Filtros aplicados» implícitos en el contador y la
// MISMA tarjeta del catálogo. El descuento ya lo dice cada tarjeta junto al
// precio; la página no necesita gritarlo.
export function OffersBrowser({ products }: { products: DiscountedProduct[] }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [sort, setSort] = useState<Sort>('descuento')
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null)

  useEffect(() => {
    // El slot del header existe desde el primer render del cliente.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHeaderSlot(document.getElementById('header-search-slot'))
  }, [])

  const handleSearch = useCallback((q: string) => setSearchQuery(q), [])

  // Categorías que tienen ofertas, en el orden de la lista única, con cuántas y
  // la foto de la oferta más grande de cada una. Los componentes de categoría
  // son los del home (`CategoryCards` en móvil, `CategoryBar` en escritorio) y
  // trabajan con títulos; aquí el estado guarda el `value`.
  const { titles, counts, images, valueByTitle } = useMemo(() => {
    const byValue = new Map<string, number>()
    const imageByValue = new Map<string, string>()
    for (const p of products) {
      byValue.set(p.category, (byValue.get(p.category) ?? 0) + 1)
      if (!imageByValue.has(p.category) && p.image && p.image !== '/placeholder.jpg') imageByValue.set(p.category, p.image)
    }
    const present = PRODUCT_CATEGORIES.filter((c) => byValue.has(c.value))
    return {
      titles: ['Todos', ...present.map((c) => c.title)],
      counts: new Map<string, number>([['Todos', products.length], ...present.map((c) => [c.title, byValue.get(c.value) ?? 0] as [string, number])]),
      images: new Map(present.flatMap((c) => (imageByValue.has(c.value) ? [[c.title, imageByValue.get(c.value)!] as [string, string]] : []))),
      valueByTitle: new Map(present.map((c) => [c.title, c.value])),
    }
  }, [products])

  const activeTitle = category ? categoryTitle(category) : 'Todos'
  // Tocar la activa la quita, como en el home.
  const selectCategory = (title: string) => {
    const value = title === 'Todos' ? null : valueByTitle.get(title) ?? null
    setCategory((current) => (current === value ? null : value))
  }

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const list = products.filter((p) => {
      if (category && p.category !== category) return false
      if (!q) return true
      return `${p.name} ${p.shortDescription ?? ''} ${categoryTitle(p.category)}`.toLowerCase().includes(q)
    })
    const sorted = [...list]
    if (sort === 'descuento') sorted.sort((a, b) => b._discount - a._discount)
    if (sort === 'menor-precio') sorted.sort((a, b) => a.price - b.price)
    if (sort === 'mayor-precio') sorted.sort((a, b) => b.price - a.price)
    return sorted
  }, [products, searchQuery, category, sort])

  const placeholder = `Busca entre ${products.length} ofertas`
  const clearAll = () => {
    setCategory(null)
    setSearchQuery('')
    window.dispatchEvent(new CustomEvent('magic-search:set', { detail: '' }))
  }

  return (
    <>
      {headerSlot &&
        createPortal(<MagicSearchBar onSearch={handleSearch} placeholder={placeholder} compact />, headerSlot)}

      <section className="w-full border-b border-nav-inactive-border bg-surface">
        <div className="md:hidden px-4 pt-3">
          <MagicSearchBar onSearch={handleSearch} placeholder={placeholder} compact />
        </div>

        <div className="container mx-auto px-4 pt-6 md:pt-10">
          <p className="mb-2 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
            <span aria-hidden className="h-px w-6 bg-todopolis-lavender-deep/60" />
            Ofertas
          </p>
          <h1 className="font-serif text-2xl font-extrabold leading-tight tracking-[-0.02em] text-ink-title md:text-[2rem]">
            Productos con precio rebajado
          </h1>
        </div>

        <nav aria-label="Categorías en oferta" className="container mx-auto px-4 md:mt-2">
          <CategoryCards
            categories={titles}
            fashionTitles={FASHION_TITLES}
            adultTitle={ADULT_TITLE}
            active={activeTitle}
            counts={counts}
            images={images}
            getIcon={getCategoryIcon}
            onSelect={selectCategory}
          />
          <CategoryBar
            categories={titles}
            fashionTitles={FASHION_TITLES}
            adultTitle={ADULT_TITLE}
            active={activeTitle}
            counts={counts}
            getIcon={getCategoryIcon}
            onSelect={selectCategory}
            activeFilters={0}
          />
        </nav>
      </section>

      <section className="container mx-auto px-4 pb-16 pt-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <p className="text-sm font-bold tabular-nums text-ink-title">
            {filtered.length}
            <span className="font-normal text-muted-foreground">
              {' '}{filtered.length === 1 ? 'producto' : 'productos'}
              {searchQuery.trim() ? <> para «{searchQuery.trim()}»</> : null}
            </span>
          </p>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="hidden sm:inline">Ordenar por</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="rounded-full border border-nav-inactive-border bg-surface py-1.5 pl-3 pr-8 text-sm font-semibold text-ink-title focus:border-todopolis-lavender-deep/50 focus:outline-none"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </label>
        </div>

        {filtered.length > 0 ? (
          <ProductGrid products={filtered} />
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <Tag className="mb-4 h-10 w-10 text-muted-foreground/40" />
            <h2 className="mb-2 text-xl font-bold text-ink-title">Hoy no hay productos rebajados</h2>
            <p className="max-w-md text-muted-foreground">Cuando bajemos un precio, aparece aquí.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center py-20 text-center">
            <SearchX className="mb-4 h-10 w-10 text-muted-foreground/40" />
            <h2 className="mb-2 text-xl font-bold text-ink-title">No hay ofertas con ese filtro</h2>
            <p className="mb-6 max-w-md text-muted-foreground">Prueba con otra palabra o mira todas las ofertas.</p>
            <button
              type="button"
              onClick={clearAll}
              className="rounded-full bg-ink-title px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              Ver todas las ofertas
            </button>
          </div>
        )}
      </section>

      <MobileSearchFab />
    </>
  )
}
