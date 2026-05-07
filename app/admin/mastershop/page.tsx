'use client'

import { useEffect, useState, useCallback } from 'react'

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

interface ProductRow extends MsProduct {
  inSanity: boolean
  sanityId?: string
  status: SyncStatus
  error?: string
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
  const [generatingBanner, setGeneratingBanner] = useState(false)
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
    setRows(prev =>
      prev.map(r => (r.idProduct === idProduct ? { ...r, status: 'importing' } : r))
    )
    try {
      const res = await fetch('/api/mastershop/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idProduct }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Error desconocido')

      setRows(prev =>
        prev.map(r =>
          r.idProduct === idProduct
            ? { ...r, status: 'done', inSanity: true, sanityId: data.sanityId }
            : r
        )
      )
    } catch (e: any) {
      setRows(prev =>
        prev.map(r =>
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

  const logout = async () => {
    try {
      await fetch('/api/admin/auth', { method: 'DELETE' })
      window.location.href = '/admin/login'
    } catch (e) {
      console.error('Error logging out', e)
    }
  }

  const generateBanner = async () => {
    setGeneratingBanner(true)
    try {
      const pwd = localStorage.getItem('mastershop_admin_pwd') || ''
      const res = await fetch('/api/banners/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al generar banner')
      alert('✨ ¡Banner Mágico generado exitosamente! Ve a la página principal para verlo.')
    } catch (e: any) {
      alert('Error generando banner: ' + e.message)
    } finally {
      setGeneratingBanner(false)
    }
  }

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

  return (
    <div className="ms-page">
      {/* ── Header ── */}
      <div className="ms-header">
        <div className="ms-header-left">
          <div className="ms-logo">
            <span>🔄</span>
          </div>
          <div>
            <h1 className="ms-title">Sincronización Mastershop</h1>
            <p className="ms-subtitle">Importa productos a Sanity con contenido generado por IA</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            className="ms-btn ms-btn-accent"
            style={{ background: 'linear-gradient(135deg, #f472b6, #8b5cf6)', boxShadow: '0 4px 15px rgba(244,114,182,0.3)' }}
            onClick={generateBanner}
            disabled={generatingBanner}
          >
            {generatingBanner ? '✨ Generando IA...' : '✨ Banner Mágico'}
          </button>
          <button
            id="btn-refresh"
            className="ms-btn ms-btn-outline"
            onClick={() => loadData(page)}
            disabled={loading}
          >
            {loading ? '⟳ Cargando...' : '↺ Actualizar'}
          </button>
          <button
            id="btn-logout"
            className="ms-btn ms-btn-ghost"
            onClick={logout}
          >
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="ms-stats">
        <div className="ms-stat-card">
          <div className="ms-stat-number">{stats.total}</div>
          <div className="ms-stat-label">En Mastershop</div>
        </div>
        <div className="ms-stat-card ms-stat-green">
          <div className="ms-stat-number">{stats.inSanity}</div>
          <div className="ms-stat-label">Ya en Sanity</div>
        </div>
        <div className="ms-stat-card ms-stat-amber">
          <div className="ms-stat-number">{stats.pending}</div>
          <div className="ms-stat-label">Pendientes</div>
        </div>
        <div className="ms-stat-card ms-stat-purple">
          <div className="ms-stat-number">
            {stats.total > 0 ? Math.round((stats.inSanity / stats.total) * 100) : 0}%
          </div>
          <div className="ms-stat-label">Sincronizado</div>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="ms-error">
          ⚠️ {error}
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="ms-toolbar">
        <div className="ms-filters">
          {(['all', 'new', 'imported'] as FilterMode[]).map(f => (
            <button
              key={f}
              id={`filter-${f}`}
              className={`ms-filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? `Todos (${rows.length})` : f === 'new' ? `⚡ Nuevos (${stats.pending})` : `✅ Importados (${stats.inSanity})`}
            </button>
          ))}
        </div>

        {stats.pending > 0 && (
          <button
            id="btn-import-all"
            className="ms-btn ms-btn-primary"
            onClick={importAll}
            disabled={batchRunning}
          >
            {batchRunning
              ? `Importando ${batchProgress.done}/${batchProgress.total}...`
              : `⚡ Importar todos los faltantes (${stats.pending})`}
          </button>
        )}
      </div>

      {/* ── Batch progress ── */}
      {batchRunning && (
        <div className="ms-progress-bar-wrap">
          <div
            className="ms-progress-bar"
            style={{ width: `${(batchProgress.done / batchProgress.total) * 100}%` }}
          />
          <span className="ms-progress-label">
            {batchProgress.done} de {batchProgress.total} importados
          </span>
        </div>
      )}

      {/* ── Table ── */}
      <div className="ms-table-wrap">
        {loading ? (
          <div className="ms-loading">
            <div className="ms-spinner" />
            <p>Consultando Mastershop y Sanity...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="ms-empty">
            {filter === 'new' ? '🎉 Todos los productos ya están en Sanity' : 'No hay productos'}
          </div>
        ) : (
          <table className="ms-table">
            <thead>
              <tr>
                <th>Imagen</th>
                <th>Producto</th>
                <th>Precio Sugerido</th>
                <th>Categoría</th>
                <th>Stock</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => (
                <tr key={row.idProduct} className={row.inSanity ? 'ms-row-done' : ''}>
                  {/* Imagen */}
                  <td>
                    <div className="ms-thumb-wrap">
                      {row.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={row.imageUrl}
                          alt={row.name}
                          className="ms-thumb"
                          onError={e => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="ms-thumb-placeholder">📦</div>
                      )}
                    </div>
                  </td>

                  {/* Nombre */}
                  <td>
                    <div className="ms-product-name">{row.name}</div>
                    <div className="ms-product-id">ID: {row.idProduct}</div>
                  </td>

                  {/* Precio */}
                  <td>
                    <div className="ms-price">{formatCOP(row.suggestedPrice || row.basePrice)}</div>
                    {row.suggestedPrice > row.basePrice && (
                      <div className="ms-price-base">{formatCOP(row.basePrice)}</div>
                    )}
                  </td>

                  {/* Categoría */}
                  <td>
                    <span className="ms-badge">{row.category || '—'}</span>
                  </td>

                  {/* Stock */}
                  <td>
                    <span className={`ms-stock ${row.stock > 0 ? 'ms-stock-ok' : 'ms-stock-low'}`}>
                      {row.stock}
                    </span>
                  </td>

                  {/* Estado */}
                  <td>
                    {row.status === 'importing' ? (
                      <span className="ms-status ms-status-loading">⟳ Importando...</span>
                    ) : row.status === 'error' ? (
                      <span className="ms-status ms-status-error" title={row.error}>⚠️ Error</span>
                    ) : row.inSanity ? (
                      <span className="ms-status ms-status-done">✅ En Sanity</span>
                    ) : (
                      <span className="ms-status ms-status-new">⚡ Nuevo</span>
                    )}
                  </td>

                  {/* Acción */}
                  <td>
                    {row.inSanity && row.status !== 'error' ? (
                      <a
                        href={`https://todopolis.online/studio/desk/product;${row.sanityId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ms-btn ms-btn-sm ms-btn-ghost"
                        id={`btn-studio-${row.idProduct}`}
                      >
                        Ver en Studio →
                      </a>
                    ) : (
                      <button
                        id={`btn-import-${row.idProduct}`}
                        className="ms-btn ms-btn-sm ms-btn-accent"
                        onClick={() => importProduct(row.idProduct)}
                        disabled={row.status === 'importing' || batchRunning}
                      >
                        {row.status === 'importing' ? '...' : row.status === 'error' ? '↺ Reintentar' : 'Importar'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="ms-pagination">
          <button
            className="ms-btn ms-btn-outline ms-btn-sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            id="btn-prev-page"
          >
            ← Anterior
          </button>
          <span className="ms-page-info">
            Página {page} de {totalPages}
          </span>
          <button
            className="ms-btn ms-btn-outline ms-btn-sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
            id="btn-next-page"
          >
            Siguiente →
          </button>
        </div>
      )}

      <style>{`
        .ms-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #0f0f1a 100%);
          color: #e2e8f0;
          font-family: 'Inter', system-ui, sans-serif;
          padding: 2rem;
        }

        /* Header */
        .ms-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .ms-header-left { display: flex; align-items: center; gap: 1rem; }
        .ms-logo {
          width: 56px; height: 56px; border-radius: 16px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          display: flex; align-items: center; justify-content: center; font-size: 1.6rem;
          box-shadow: 0 0 24px rgba(99,102,241,0.4);
        }
        .ms-title { font-size: 1.6rem; font-weight: 700; margin: 0; background: linear-gradient(135deg, #a5b4fc, #c4b5fd); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .ms-subtitle { font-size: 0.85rem; color: #94a3b8; margin: 0; }

        /* Stats */
        .ms-stats {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem;
        }
        .ms-stat-card {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px; padding: 1.25rem; text-align: center;
          backdrop-filter: blur(12px); transition: transform 0.2s;
        }
        .ms-stat-card:hover { transform: translateY(-2px); }
        .ms-stat-number { font-size: 2rem; font-weight: 800; color: #a5b4fc; }
        .ms-stat-green .ms-stat-number { color: #4ade80; }
        .ms-stat-amber .ms-stat-number { color: #fbbf24; }
        .ms-stat-purple .ms-stat-number { color: #c084fc; }
        .ms-stat-label { font-size: 0.8rem; color: #64748b; margin-top: 0.25rem; }

        /* Error */
        .ms-error {
          background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3);
          border-radius: 12px; padding: 1rem 1.5rem; margin-bottom: 1rem; color: #fca5a5;
        }

        /* Toolbar */
        .ms-toolbar {
          display: flex; align-items: center; justify-content: space-between;
          gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap;
        }
        .ms-filters { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .ms-filter-btn {
          padding: 0.45rem 1rem; border-radius: 999px; border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.04); color: #94a3b8; cursor: pointer; font-size: 0.85rem;
          transition: all 0.2s;
        }
        .ms-filter-btn:hover { border-color: rgba(99,102,241,0.5); color: #a5b4fc; }
        .ms-filter-btn.active { background: rgba(99,102,241,0.2); border-color: #6366f1; color: #a5b4fc; }

        /* Buttons */
        .ms-btn {
          padding: 0.55rem 1.2rem; border-radius: 10px; border: none; cursor: pointer;
          font-size: 0.88rem; font-weight: 600; transition: all 0.2s; white-space: nowrap;
        }
        .ms-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .ms-btn-primary { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; box-shadow: 0 4px 15px rgba(99,102,241,0.35); }
        .ms-btn-primary:hover:not(:disabled) { box-shadow: 0 6px 20px rgba(99,102,241,0.5); transform: translateY(-1px); }
        .ms-btn-outline { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.15); color: #94a3b8; }
        .ms-btn-outline:hover:not(:disabled) { border-color: rgba(99,102,241,0.5); color: #a5b4fc; }
        .ms-btn-accent { background: linear-gradient(135deg, #06b6d4, #6366f1); color: #fff; }
        .ms-btn-accent:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(6,182,212,0.35); }
        .ms-btn-ghost { background: rgba(255,255,255,0.04); color: #94a3b8; border: 1px solid rgba(255,255,255,0.08); }
        .ms-btn-ghost:hover { color: #a5b4fc; border-color: rgba(99,102,241,0.4); }
        .ms-btn-sm { padding: 0.35rem 0.8rem; font-size: 0.8rem; border-radius: 8px; }

        /* Progress bar */
        .ms-progress-bar-wrap {
          position: relative; background: rgba(255,255,255,0.06); border-radius: 999px;
          height: 28px; margin-bottom: 1rem; overflow: hidden; display: flex; align-items: center;
        }
        .ms-progress-bar {
          position: absolute; left: 0; top: 0; bottom: 0;
          background: linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4);
          border-radius: 999px; transition: width 0.4s ease;
        }
        .ms-progress-label {
          position: relative; z-index: 1; font-size: 0.82rem; color: #e2e8f0;
          font-weight: 600; padding: 0 1rem;
        }

        /* Table */
        .ms-table-wrap {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px; overflow: hidden; margin-bottom: 1.5rem;
        }
        .ms-table { width: 100%; border-collapse: collapse; }
        .ms-table thead tr {
          background: rgba(99,102,241,0.08); border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .ms-table th {
          padding: 0.85rem 1rem; text-align: left; font-size: 0.78rem;
          font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;
        }
        .ms-table td { padding: 0.75rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.04); vertical-align: middle; }
        .ms-table tr:last-child td { border-bottom: none; }
        .ms-table tbody tr { transition: background 0.15s; }
        .ms-table tbody tr:hover { background: rgba(99,102,241,0.05); }
        .ms-row-done { opacity: 0.75; }

        /* Cells */
        .ms-thumb-wrap { width: 52px; height: 52px; }
        .ms-thumb { width: 52px; height: 52px; object-fit: cover; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); }
        .ms-thumb-placeholder { width: 52px; height: 52px; border-radius: 10px; background: rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: center; font-size: 1.4rem; }
        .ms-product-name { font-size: 0.88rem; font-weight: 600; color: #e2e8f0; max-width: 260px; }
        .ms-product-id { font-size: 0.75rem; color: #475569; margin-top: 2px; }
        .ms-price { font-size: 0.9rem; font-weight: 700; color: #4ade80; }
        .ms-price-base { font-size: 0.75rem; color: #475569; text-decoration: line-through; }
        .ms-badge { background: rgba(99,102,241,0.15); color: #a5b4fc; border-radius: 6px; padding: 0.2rem 0.55rem; font-size: 0.75rem; font-weight: 500; }
        .ms-stock { font-size: 0.88rem; font-weight: 600; }
        .ms-stock-ok { color: #4ade80; }
        .ms-stock-low { color: #f87171; }
        .ms-status { font-size: 0.82rem; font-weight: 500; }
        .ms-status-new { color: #fbbf24; }
        .ms-status-done { color: #4ade80; }
        .ms-status-loading { color: #a5b4fc; animation: pulse 1s infinite; }
        .ms-status-error { color: #f87171; cursor: help; }

        /* Loading / empty */
        .ms-loading { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 4rem; color: #64748b; }
        .ms-spinner { width: 36px; height: 36px; border: 3px solid rgba(99,102,241,0.2); border-top-color: #6366f1; border-radius: 50%; animation: spin 0.8s linear infinite; }
        .ms-empty { text-align: center; padding: 4rem; color: #64748b; font-size: 1rem; }

        /* Pagination */
        .ms-pagination { display: flex; align-items: center; justify-content: center; gap: 1rem; }
        .ms-page-info { font-size: 0.85rem; color: #64748b; }

        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }

        @media (max-width: 768px) {
          .ms-page { padding: 1rem; }
          .ms-stats { grid-template-columns: repeat(2, 1fr); }
          .ms-table th:nth-child(3), .ms-table td:nth-child(3),
          .ms-table th:nth-child(5), .ms-table td:nth-child(5) { display: none; }
        }
      `}</style>
    </div>
  )
}
