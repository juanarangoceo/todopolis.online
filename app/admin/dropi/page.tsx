'use client'

import { useCallback, useEffect, useState } from 'react'
import type { DropiDiscovery } from '@/lib/dropi/discovery'
import type { DropiConnectionSummary } from '@/lib/dropi/connection'

interface Status { discovery: DropiDiscovery; connection: DropiConnectionSummary; configured: boolean }
interface Tool { name: string; title?: string; description?: string; readOnly: boolean | null }
interface Found { id: number; name: string; cost: number; suggestedPrice: number; stock: number; supplierId: number | null; images: string[]; variations: unknown[]; sanityId: string | null }

const cop = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`

const ERRORS: Record<string, string> = {
  config: 'Falta DROPI_TOKEN_KEY en el servidor. Sin ella los tokens no se pueden guardar cifrados.',
  host: 'Dropi solo acepta volver a una dirección https o a localhost. En local, abre el panel en https://openclawagent.tail8ed093.ts.net/admin/dropi y conecta desde ahí.',
  discovery: 'Dropi no respondió con sus datos de autorización. Vuelve a intentarlo en unos minutos.',
  storage: 'No se pudo leer la conexión en la base de datos. Revisa que la migración 20261021120000_dropi_connection.sql esté aplicada en Supabase.',
  register: 'Dropi no aceptó registrar a Todópolis como aplicación. Vuelve a intentarlo.',
  state: 'El inicio de sesión tardó más de 10 minutos o se abrió en otra pestaña. Vuelve a conectar.',
  denied: 'La autorización se canceló en Dropi.',
  token: 'Dropi no entregó el acceso después de autorizar. Vuelve a conectar.',
}

function bogota(iso?: string) {
  return iso ? new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota' }) : ''
}

export default function DropiPage() {
  const [status, setStatus] = useState<Status | null>(null)
  const [tools, setTools] = useState<Tool[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  // Por el túnel (http://100.107.…) Dropi no deja volver: hay que usar localhost.
  const [tunnelHost, setTunnelHost] = useState(false)

  const load = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/dropi/status', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'No se pudo comprobar la conexión.')
      setStatus(data)
      if (data.connection.connected) {
        const res = await fetch('/api/dropi/tools', { cache: 'no-store' })
        const list = await res.json()
        if (res.ok) setTools(list.tools)
        else setError(list.error ?? 'Conectado, pero Dropi no devolvió sus herramientas.')
      } else setTools(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo comprobar la conexión.')
    } finally { setBusy(false) }
  }, [])

  useEffect(() => {
    setTunnelHost(window.location.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(window.location.hostname))
    const params = new URLSearchParams(window.location.search)
    const code = params.get('error')
    if (code) setError(ERRORS[code] ?? 'No se pudo conectar con Dropi.')
    if (params.get('connected')) setNotice('Dropi quedó conectado.')
    if (code || params.get('connected')) window.history.replaceState(null, '', '/admin/dropi')
    load()
  }, [load])

  async function disconnect() {
    setBusy(true)
    try {
      await fetch('/api/dropi/disconnect', { method: 'POST' })
      setNotice('Dropi quedó desconectado.')
    } finally { await load() }
  }

  const connection = status?.connection

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Proveedores · Piloto</p>
        <h1 className="mt-2 font-serif text-2xl font-extrabold text-ink-title">Conectar Dropi</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">Todópolis entra a Dropi con la cuenta de la tienda para buscar productos en su catálogo. La contraseña solo se escribe en oauth.dropi.co; aquí se guarda un acceso cifrado que se puede revocar.</p>
      </div>

      <section className="rounded-3xl border border-nav-inactive-border bg-surface p-5 shadow-sm" aria-labelledby="connection-title">
        <h2 id="connection-title" className="font-serif text-lg font-bold text-ink-title">Estado de conexión</h2>
        <div aria-live="polite" aria-busy={busy} className="my-3 space-y-2 text-sm">
          {notice && <p className="font-semibold">{notice}</p>}
          {error && <p role="alert">{error}</p>}
          {!status && busy && <p className="text-muted-foreground">Comprobando…</p>}
          {connection?.connected && <p><span className="font-bold">Conectado</span> desde el {bogota(connection.connectedAt)} (Colombia).</p>}
          {connection?.status === 'needs_reauth' && <p><span className="font-bold">La conexión venció.</span> {connection.lastError ?? 'Vuelve a conectar.'}</p>}
          {connection && connection.status === 'missing' && <p><span className="font-bold">Sin conectar.</span> {status?.discovery.status === 'authorization_required' ? 'Dropi está listo para autorizar la cuenta.' : status?.discovery.message}</p>}
          {status && !status.configured && <p>{ERRORS.config}</p>}
        </div>
        <div className="flex flex-wrap gap-3">
          {!connection?.connected && (tunnelHost
            ? <p className="max-w-2xl text-sm">{ERRORS.host}</p>
            : <a href="/api/dropi/connect" className="rounded-xl bg-ink-title px-4 py-2.5 text-sm font-bold text-white">{connection?.status === 'needs_reauth' ? 'Volver a conectar' : 'Conectar con Dropi'}</a>)}
          <button type="button" disabled={busy} onClick={load} className="rounded-xl border border-nav-inactive-border px-4 py-2.5 text-sm font-bold disabled:opacity-50">
            {busy ? 'Comprobando…' : 'Comprobar de nuevo'}
          </button>
          {connection?.connected && (
            <button type="button" disabled={busy} onClick={disconnect} className="rounded-xl border border-nav-inactive-border px-4 py-2.5 text-sm font-bold disabled:opacity-50">Desconectar</button>
          )}
        </div>
        <p className="mt-4 max-w-2xl text-xs text-muted-foreground">Dropi admite una sola sesión abierta por cuenta: si conectas la misma cuenta en otra herramienta, esta conexión puede vencer y habrá que volver a conectar.</p>
        {status && (
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer font-semibold text-todopolis-lavender-deep">Diagnóstico para soporte</summary>
            <pre className="mt-3 overflow-x-auto rounded-xl bg-surface-soft p-3 text-xs">{JSON.stringify(status, null, 2)}</pre>
          </details>
        )}
      </section>

      {connection?.connected && <CatalogSearch />}

      {tools && (
        <section className="text-sm leading-relaxed" aria-labelledby="tools-title">
          <h2 id="tools-title" className="font-serif text-lg font-bold text-ink-title">Lo que Dropi permite ({tools.length})</h2>
          <ul className="mt-3 divide-y divide-nav-inactive-border border-y border-nav-inactive-border">
            {tools.map((tool) => (
              <li key={tool.name} className="py-3">
                <p className="font-semibold">{tool.title ?? tool.name} <code className="ml-1 text-xs text-muted-foreground">{tool.name}</code></p>
                {tool.description && <p className="mt-1 max-w-3xl text-muted-foreground">{tool.description}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function CatalogSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Found[] | null>(null)
  const [next, setNext] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [importing, setImporting] = useState<number | null>(null)
  const [message, setMessage] = useState('')

  async function search(start = 0) {
    setBusy(true)
    setMessage('')
    try {
      const res = await fetch(`/api/dropi/products?q=${encodeURIComponent(query)}&start=${start}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'No se pudo buscar en Dropi.')
      setResults(start ? [...(results ?? []), ...data.products] : data.products)
      setNext(data.next)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'No se pudo buscar en Dropi.')
    } finally { setBusy(false) }
  }

  async function importProduct(p: Found) {
    setImporting(p.id)
    setMessage(`Importando «${p.name}»: fotos, textos con IA y etiquetas. Tarda cerca de un minuto.`)
    try {
      const res = await fetch('/api/dropi/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dropiId: p.id, name: p.name, supplierId: p.supplierId }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'No se pudo importar.')
      setResults((list) => list?.map((r) => (r.id === p.id ? { ...r, sanityId: data.sanityId } : r)) ?? null)
      setMessage(data.alreadyImported ? 'Ese producto ya estaba importado.' : `Quedó como borrador: «${data.name}», precio sugerido ${cop(data.price)} sobre un costo de ${cop(data.cost)}. Revísalo en el Studio antes de publicar.`)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'No se pudo importar.')
    } finally { setImporting(null) }
  }

  return (
    <section className="rounded-3xl border border-nav-inactive-border bg-surface p-5 shadow-sm" aria-labelledby="catalog-title">
      <h2 id="catalog-title" className="font-serif text-lg font-bold text-ink-title">Importar del catálogo de Dropi</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Cada producto entra como borrador, con sus fotos, textos e etiquetas hechos con IA y un precio sugerido desde el costo. Costo, stock y variantes se actualizan solos cada hora. Todavía no se pueden vender: el checkout los rechaza hasta conectar los pedidos con Dropi.</p>
      <form className="mt-4 flex flex-wrap gap-3" onSubmit={(e) => { e.preventDefault(); search() }}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Busca por nombre: cobija, faja, audífonos…" aria-label="Buscar en Dropi" className="min-w-0 flex-1 rounded-xl border border-nav-inactive-border px-4 py-2.5 text-sm" />
        <button type="submit" disabled={busy} className="rounded-xl bg-ink-title px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Buscando…' : 'Buscar'}</button>
      </form>
      <p aria-live="polite" className="mt-3 text-sm">{message}</p>
      {results && (results.length === 0
        ? <p className="mt-3 text-sm text-muted-foreground">Dropi no encontró productos con esa búsqueda.</p>
        : <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((p) => (
            <li key={p.id} className="flex gap-3 rounded-2xl border border-nav-inactive-border p-3">
              {p.images[0]
                // eslint-disable-next-line @next/next/no-img-element -- foto externa de Dropi solo para elegir; no pasa por el optimizador
                ? <img src={p.images[0]} alt="" className="h-20 w-20 flex-none rounded-xl object-cover" loading="lazy" />
                : <div className="h-20 w-20 flex-none rounded-xl bg-surface-soft" />}
              <div className="min-w-0 flex-1 text-sm">
                <p className="line-clamp-2 font-semibold">{p.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">Costo {cop(p.cost)} · sugerido {cop(p.suggestedPrice)}</p>
                <p className="text-xs text-muted-foreground">{p.stock > 0 ? `${p.stock.toLocaleString('es-CO')} en stock` : 'Agotado'}{p.variations.length ? ` · ${p.variations.length} variantes` : ''}</p>
                {p.sanityId
                  ? <a href={`/studio/desk/product;${p.sanityId}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs font-bold text-todopolis-lavender-deep underline">Ya importado · abrir en el Studio</a>
                  : <button type="button" disabled={importing !== null} onClick={() => importProduct(p)} className="mt-2 rounded-lg border border-nav-inactive-border px-3 py-1.5 text-xs font-bold disabled:opacity-50">{importing === p.id ? 'Importando…' : 'Importar como borrador'}</button>}
              </div>
            </li>
          ))}
        </ul>)}
      {next !== null && <button type="button" disabled={busy} onClick={() => search(next)} className="mt-4 rounded-xl border border-nav-inactive-border px-4 py-2.5 text-sm font-bold disabled:opacity-50">Ver más</button>}
    </section>
  )
}
