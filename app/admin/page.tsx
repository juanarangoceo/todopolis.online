import Link from 'next/link'
import { ArrowRight, Gauge, Package, PenSquare, ShoppingBag } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTrm } from '@/lib/ai/trm'
import { ORDER_STATUS_LABEL, type OrderStatus } from '@/lib/orders'
import { getSanityClient } from '@/lib/sanity/client'
import { AdminPage, Card, Section, StatCard, StatusPill, daysAgoIso } from './_components/ui'

// Resumen del panel. Antes /admin daba 404: se entraba escribiendo
// /admin/pedidos o /admin/mastershop. Aquí va lo que hay que mirar al abrir el
// día —qué pedidos esperan, cómo va la entrega, cuánto se gastó en IA— y el
// camino a cada herramienta.

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Resumen · Panel' }

const STATUS_TONE: Record<string, 'ok' | 'warn' | 'danger' | 'info' | 'muted'> = {
  pending_payment: 'warn',
  pending: 'warn',
  confirmed: 'info',
  shipped: 'info',
  delivered: 'ok',
  cancelled: 'danger',
}

export default async function AdminHome() {
  const db = createAdminClient()
  const since30 = daysAgoIso(30)

  const [orders30, recent, ai30, trm, catalog] = await Promise.all([
    db.from('orders').select('status, price, quantity').gte('created_at', since30),
    db.from('orders').select('id, created_at, product_name, customer_name, customer_city, price, quantity, status').order('created_at', { ascending: false }).limit(6),
    db.from('ai_usage').select('cost_usd, flow').gte('created_at', since30).limit(20000),
    getTrm(),
    getSanityClient()
      .fetch<{ products: number; untagged: number; otros: number; destacados: number; noImage: number }>(
        `{
          "products": count(*[_type=="product" && !(_id in path("drafts.**"))]),
          "untagged": count(*[_type=="product" && !(_id in path("drafts.**")) && count(coalesce(tags, [])) == 0]),
          "otros": count(*[_type=="product" && !(_id in path("drafts.**")) && category == "otros"]),
          "destacados": count(*[_type=="product" && !(_id in path("drafts.**")) && isVip == true]),
          "noImage": count(*[_type=="product" && !(_id in path("drafts.**")) && !defined(images[0]) && !defined(mastershopImageUrl)])
        }`,
      )
      .catch(() => null),
  ])

  const o = orders30.data ?? []
  const waiting = o.filter((x) => x.status === 'pending' || x.status === 'pending_payment').length
  const delivered = o.filter((x) => x.status === 'delivered')
  const closed = o.filter((x) => x.status === 'delivered' || x.status === 'cancelled').length
  const revenue = delivered.reduce((t, x) => t + (x.price ?? 0) * (x.quantity ?? 1), 0)

  const aiRows = ai30.data ?? []
  const aiUsd = aiRows.reduce((t, r) => t + Number(r.cost_usd ?? 0), 0)
  const products = new Set(aiRows.map((r) => r.flow).filter((f): f is string => !!f && /^(import|sync|manual):/.test(f))).size

  const money = (n: number) => '$ ' + Math.round(n).toLocaleString('es-CO')

  return (
    <AdminPage eyebrow="Panel" title="Resumen" description="Últimos 30 días.">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Pedidos por confirmar" value={String(waiting)} tone={waiting > 0 ? 'warn' : undefined} hint="esperan una llamada o el pago" />
        <StatCard label="Pedidos" value={String(o.length)} hint={`${delivered.length} entregados`} />
        <StatCard label="Tasa de entrega" value={closed ? `${Math.round((delivered.length / closed) * 100)} %` : '—'} hint={`cobrado ${money(revenue)}`} />
        <StatCard label="Gasto en IA" value={money(aiUsd * trm.rate)} hint={products ? `${products} productos creados` : 'sin consumo medido aún'} />
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: '/admin/pedidos', icon: ShoppingBag, title: 'Pedidos', text: 'Confirmar, despachar y marcar entregados.' },
          { href: '/admin/mastershop', icon: Package, title: 'Importar productos', text: 'Traer productos del proveedor con IA.' },
          { href: '/admin/profit', icon: Gauge, title: 'Nitro Profit', text: 'Cuánto cuesta la IA por producto.' },
          { href: '/studio', icon: PenSquare, title: 'Studio', text: 'Editar productos, colecciones y blog.' },
        ].map(({ href, icon: Icon, title, text }) => (
          <Link key={href} href={href} className="group rounded-3xl border border-nav-inactive-border bg-surface p-5 transition-shadow hover:shadow-md">
            <Icon className="h-5 w-5 text-todopolis-lavender-deep" />
            <p className="mt-3 flex items-center gap-1.5 font-bold text-ink-title">
              {title}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">{text}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-x-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Section
          title="Últimos pedidos"
          actions={
            <Link href="/admin/pedidos" className="text-sm font-bold text-todopolis-lavender-deep hover:underline">
              Ver todos
            </Link>
          }
        >
          <Card>
            {(recent.data ?? []).length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">Aún no hay pedidos.</p>
            ) : (
              <ul className="divide-y divide-nav-inactive-border">
                {(recent.data ?? []).map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-title">{r.product_name ?? '—'}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {r.customer_name ?? '—'}
                        {r.customer_city ? ` · ${r.customer_city}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-sm font-bold tabular-nums text-ink-title">{money((r.price ?? 0) * (r.quantity ?? 1))}</span>
                      <StatusPill tone={STATUS_TONE[r.status] ?? 'muted'}>{ORDER_STATUS_LABEL[r.status as OrderStatus] ?? r.status}</StatusPill>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </Section>

        <Section title="Catálogo">
          <Card className="divide-y divide-nav-inactive-border">
            {catalog ? (
              [
                { label: 'Productos publicados', value: catalog.products },
                { label: 'Destacados', value: catalog.destacados },
                { label: 'Sin etiquetas', value: catalog.untagged, warn: catalog.untagged > 0 },
                { label: 'En «Otros»', value: catalog.otros, warn: catalog.otros > 10 },
                { label: 'Sin foto', value: catalog.noImage, warn: catalog.noImage > 0 },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between px-5 py-3 text-sm">
                  <span className="text-foreground/75">{row.label}</span>
                  <span className={`font-bold tabular-nums ${row.warn ? 'text-amber-700' : 'text-ink-title'}`}>{row.value}</span>
                </div>
              ))
            ) : (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">No se pudo leer el catálogo.</p>
            )}
          </Card>
        </Section>
      </div>
    </AdminPage>
  )
}
