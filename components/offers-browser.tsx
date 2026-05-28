'use client'

import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Tag, Percent, Zap, SearchX } from 'lucide-react'
import { MagicSearchBar } from './magic-search-bar'
import { ProductGrid } from './product-grid'
import { Product } from '@/lib/types'

type DiscountedProduct = Product & { _discount: number }

interface OffersBrowserProps {
  products: DiscountedProduct[]
}

// Versión liviana de ProductBrowser específica para /ofertas: portea la barra
// de búsqueda al slot del header (header-search-slot) y filtra el grid de
// ofertas localmente sin recargar.
export function OffersBrowser({ products }: OffersBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const slot = document.getElementById('header-search-slot')
    if (slot) setHeaderSlot(slot)
  }, [])

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return products
    return products.filter((p) => {
      const haystack = `${p.name} ${p.shortDescription ?? ''} ${p.category ?? ''}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [products, searchQuery])

  const maxDiscount = filtered.length > 0 ? Math.max(...filtered.map((p) => p._discount)) : 0

  return (
    <>
      {/* Portea la barra de búsqueda dentro del header (slot ya provisto por <Header />) */}
      {headerSlot &&
        createPortal(
          <MagicSearchBar
            onSearch={setSearchQuery}
            placeholder="Busca dentro de las ofertas..."
            compact
          />,
          headerSlot,
        )}

      {filtered.length > 0 ? (
        <>
          {/* Info bar */}
          <div className="flex items-center gap-3 mb-8 p-4 rounded-2xl bg-sale-soft border border-sale/25">
            <div className="w-10 h-10 rounded-xl bg-sale/10 flex items-center justify-center shrink-0">
              <Tag className="w-5 h-5 text-sale" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-foreground text-sm">
                {searchQuery
                  ? `${filtered.length} ${filtered.length === 1 ? 'resultado' : 'resultados'} para "${searchQuery}"`
                  : `${filtered.length} ${filtered.length === 1 ? 'producto' : 'productos'} en oferta ahora mismo`}
              </p>
              <p className="text-xs text-muted-foreground">
                Ordenados por mayor descuento · Precios válidos por tiempo limitado
              </p>
            </div>
            <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sale text-sale-fg text-xs font-bold shrink-0">
              <Percent className="w-3.5 h-3.5" />
              Hasta {maxDiscount}% off
            </div>
          </div>

          <ProductGrid products={filtered} />
        </>
      ) : searchQuery ? (
        <div className="text-center py-20 px-4 bg-muted/20 rounded-3xl border border-dashed border-border">
          <SearchX className="w-14 h-14 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">
            No encontramos ofertas para &ldquo;{searchQuery}&rdquo;
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Intenta con otra palabra o borra el buscador para ver todas las ofertas activas.
          </p>
        </div>
      ) : (
        <div className="text-center py-24 px-4 bg-muted/20 rounded-3xl border border-dashed border-border">
          <Zap className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">No hay ofertas disponibles ahora</h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-8">
            Vuelve pronto, actualizamos nuestras ofertas constantemente con los mejores precios.
          </p>
        </div>
      )}
    </>
  )
}
