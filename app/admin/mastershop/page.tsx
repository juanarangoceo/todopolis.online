'use client'

import { useEffect, useState, useCallback } from 'react'
import { AdminPage, StatCard, StatusPill } from '../_components/ui'

// ─── Types ────────────────────────────────────────────────────────────────────
interface MsProduct {
  idProduct: number
  name: string
  description: string
  basePrice: number
  suggestedPrice: number
  imageUrl: string | null
  category: string
  stock: number
  sku: string
}

interface ImportedProduct {
  mastershopId: number
  sanityId: string
  name: string
  slug: string
}

type SyncStatus = 'idle' | 'importing' | 'done' | 'error'
type BlogStatus = 'idle' | 'creating' | 'done' | 'error'

interface ProductRow extends MsProduct {
  inSanity: boolean
  sanityId?: string
  status: SyncStatus
  error?: string
  blogStatus: BlogStatus
  blogSlug?: string
}

type FilterMode = 'all' | 'new' | 'imported'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatCOP(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function MastershopSyncPage() {
  const [rows, setRows] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterMode>('all')
  const [batchRunning, setBatchRunning] = useState(false)
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0 })
  const [page, setPage] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const LIMIT = 50


  const loadData = useCallback(async (p = 1) => {
    setLoading(true)
    setError(null)
    try {
      const [msRes, snRes] = await Promise.all([
        fetch(`/api/mastershop/products?page=${p}&limit=${LIMIT}`),
        fetch('/api/mastershop/sanity-ids'),
      ])

      if (!msRes.ok) throw new Error(`Error cargando Mastershop: ${msRes.status}`)
      if (!snRes.ok) throw new Error(`Error consultando Sanity: ${snRes.status}`)

      const msData = await msRes.json()
      const snData = await snRes.json()

      const importedMap = new Map<number, ImportedProduct>(
        (snData.imported ?? []).map((i: ImportedProduct) => [i.mastershopId, i])
      )

      setTotalProducts(msData.total ?? 0)
      setRows(
        (msData.products ?? []).map((p: MsProduct) => {
          const imp = importedMap.get(p.idProduct)
          return {
            ...p,
            inSanity: !!imp,
            sanityId: imp?.sanityId,
            status: 'idle' as SyncStatus,
            blogStatus: 'idle' as BlogStatus,
          }
        })
      )
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData(page)
  }, [loadData, page])

  const importProduct = useCallback(async (idProduct: number) => {
    setRows((prev: ProductRow[]) =>
      prev.map((r: ProductRow) => (r.idProduct === idProduct ? { ...r, status: 'importing' } : r))
    )
    try {
      const res = await fetch('/api/mastershop/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idProduct }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Error desconocido')

      setRows((prev: ProductRow[]) =>
        prev.map((r: ProductRow) =>
          r.idProduct === idProduct
            ? { ...r, status: 'done', inSanity: true, sanityId: data.sanityId }
            : r
        )
      )
    } catch (e: any) {
      setRows((prev: ProductRow[]) =>
        prev.map((r: ProductRow) =>
          r.idProduct === idProduct ? { ...r, status: 'error', error: e.message } : r
        )
      )
    }
  }, [])

  const importAll = useCallback(async () => {
    const pending = rows.filter(r => !r.inSanity && r.status === 'idle')
    if (!pending.length) return
    setBatchRunning(true)
    setBatchProgress({ done: 0, total: pending.length })
    for (let i = 0; i < pending.length; i++) {
      await importProduct(pending[i].idProduct)
      setBatchProgress({ done: i + 1, total: pending.length })
    }
    setBatchRunning(false)
  }, [rows, importProduct])

  const createBlog = useCallback(async (idProduct: number, sanityId?: string) => {
    setRows((prev: ProductRow[]) =>
      prev.map((r: ProductRow) => r.idProduct === idProduct ? { ...r, blogStatus: 'creating' } : r)
    )
    try {
      const res = await fetch('/api/generate-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Send sanityId if available, otherwise fallback to mastershopId for server-side lookup
        body: JSON.stringify(sanityId ? { sanityId } : { mastershopId: idProduct }),
      })
      const data = await res.json()
      if (!res.ok || (!data.success && !data.alreadyExists)) throw new Error(data.error ?? 'Error desconocido')
      setRows((prev: ProductRow[]) =>
        prev.map((r: ProductRow) =>
          r.idProduct === idProduct ? { ...r, blogStatus: 'done', blogSlug: data.articleSlug } : r
        )
      )
    } catch {
      setRows((prev: ProductRow[]) =>
        prev.map((r: ProductRow) => r.idProduct === idProduct ? { ...r, blogStatus: 'error' } : r)
      )
    }
  }, [])

  const filtered = rows.filter(r => {
    if (filter === 'new') return !r.inSanity
    if (filter === 'imported') return r.inSanity
    return true
  })

  const stats = {
    total: totalProducts,
    inSanity: rows.filter(r => r.inSanity).length,
    pending: rows.filter(r => !r.inSanity).length,
  }

  const totalPages = Math.ceil(totalProducts / LIMIT)
  const btn = 'inline-flex items-center justify-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50'

  // Mismo lenguaje que el resto del panel (docs/identidad-de-marca.md). Antes
  // esta página tenía un tema oscuro morado propio, emojis que en muchos
  // equipos salían como cuadros vacíos y su propio «Cerrar sesión».
  return (
    <AdminPage
      eyebrow="Catálogo"
      title="Importar de Mastershop"
      description="Trae productos del proveedor con su landing, categoría, etiquetas y artículo generados por IA."
      actions={
        <button type="button" className={`${btn} border border-nav-inactive-border bg-surface text-ink-title hover:border-foreground/30`} onClick={() => loadData(page)} disabled={loading}>
          {loading ? 'Cargando…' : 'Actualizar'}
        </button>
      }
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="En Mastershop" value={String(stats.total)} />
        <StatCard label="Ya en la tienda" value={String(stats.inSanity)} hint="de esta página" />
        <StatCard label="Por importar" value={String(stats.pending)} hint="de esta página" tone={stats.pending > 0 ? 'warn' : undefined} />
        <StatCard label="Sincronizado" value={`${rows.length > 0 ? Math.round((stats.inSanity / rows.length) * 100) : 0}%`} hint="de esta página" />
      </div>

      {error && (
        <p className="mt-4 rounded-2xl border border-sale/30 bg-sale-soft px-4 py-3 text-sm font-semibold text-sale">{error}</p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(['all', 'new', 'imported'] as FilterMode[]).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${
                filter === f
                  ? 'border-todopolis-lavender-deep bg-todopolis-lavender-deep text-white'
                  : 'border-nav-inactive-border bg-surface text-foreground/70 hover:text-ink-title'
              }`}
            >
              {f === 'all' ? `Todos · ${rows.length}` : f === 'new' ? `Por importar · ${stats.pending}` : `Importados · ${stats.inSanity}`}
            </button>
          ))}
        </div>
        {stats.pending > 0 && (
          <button type="button" className={`${btn} bg-ink-title px-4 py-2 text-sm text-white hover:opacity-90`} onClick={importAll} disabled={batchRunning}>
            {batchRunning ? `Importando ${batchProgress.done} de ${batchProgress.total}…` : `Importar los ${stats.pending} que faltan`}
          </button>
        )}
      </div>

      {batchRunning && (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-muted" role="progressbar" aria-valuenow={batchProgress.done} aria-valuemax={batchProgress.total}>
          <div className="h-full rounded-full bg-todopolis-lavender-deep transition-all" style={{ width: `${(batchProgress.done / Math.max(1, batchProgress.total)) * 100}%` }} />
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-3xl border border-nav-inactive-border bg-surface">
        {loading ? (
          <p className="px-6 py-16 text-center text-sm text-muted-foreground">Consultando Mastershop y la tienda…</p>
        ) : filtered.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-muted-foreground">
            {filter === 'new' ? 'Todos los productos de esta página ya están en la tienda.' : 'No hay productos.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-nav-inactive-border text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Precio sugerido</th>
                  <th className="px-4 py-3">Categoría del proveedor</th>
                  <th className="px-4 py-3 text-right">Stock</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => (
                  <tr key={row.idProduct} className="border-b border-nav-inactive-border/70 last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-surface-muted">
                          {row.imageUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={row.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="line-clamp-2 font-semibold text-ink-title">{row.name}</p>
                          <p className="text-xs tabular-nums text-muted-foreground">ID {row.idProduct}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      <p className="font-bold text-ink-title">{formatCOP(row.suggestedPrice || row.basePrice)}</p>
                      {row.suggestedPrice > row.basePrice && <p className="text-xs text-muted-foreground">costo {formatCOP(row.basePrice)}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-foreground/70">{row.category || '—'}</td>
                    <td className={`px-4 py-3 text-right font-semibold tabular-nums ${row.stock > 0 ? 'text-ink-title' : 'text-sale'}`}>{row.stock}</td>
                    <td className="px-4 py-3">
                      {row.status === 'importing' ? (
                        <StatusPill tone="info">Importando…</StatusPill>
                      ) : row.status === 'error' ? (
                        <span title={row.error}><StatusPill tone="danger">Error</StatusPill></span>
                      ) : row.inSanity ? (
                        <StatusPill tone="ok">En la tienda</StatusPill>
                      ) : (
                        <StatusPill tone="warn">Nuevo</StatusPill>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {row.inSanity && row.status !== 'error' ? (
                          <>
                            <a href={`/studio/desk/product;${row.sanityId}`} target="_blank" rel="noopener noreferrer" className={`${btn} border border-nav-inactive-border bg-surface text-ink-title hover:border-foreground/30`}>
                              Studio
                            </a>
                            {row.blogStatus === 'done' && row.blogSlug ? (
                              <a href={`/blog/${row.blogSlug}`} target="_blank" rel="noopener noreferrer" className={`${btn} bg-tag-active-bg text-tag-active-fg`}>
                                Ver artículo
                              </a>
                            ) : (
                              <button type="button" className={`${btn} bg-tag-active-bg text-tag-active-fg hover:bg-todopolis-lavender`} onClick={() => createBlog(row.idProduct, row.sanityId)} disabled={row.blogStatus === 'creating'}>
                                {row.blogStatus === 'creating' ? 'Generando…' : row.blogStatus === 'error' ? 'Reintentar artículo' : 'Crear artículo'}
                              </button>
                            )}
                          </>
                        ) : (
                          <button type="button" className={`${btn} bg-ink-title text-white hover:opacity-90`} onClick={() => importProduct(row.idProduct)} disabled={row.status === 'importing' || batchRunning}>
                            {row.status === 'importing' ? 'Importando…' : row.status === 'error' ? 'Reintentar' : 'Importar'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <button type="button" className={`${btn} border border-nav-inactive-border bg-surface text-ink-title`} onClick={() => setPage((p: number) => Math.max(1, p - 1))} disabled={page === 1 || loading}>
            Anterior
          </button>
          <span className="tabular-nums text-muted-foreground">Página {page} de {totalPages}</span>
          <button type="button" className={`${btn} border border-nav-inactive-border bg-surface text-ink-title`} onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))} disabled={page === totalPages || loading}>
            Siguiente
          </button>
        </div>
      )}
    </AdminPage>
  )
}
