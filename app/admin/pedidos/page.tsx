import { createAdminClient } from '@/lib/supabase/admin'
import { AdminPage, StatCard } from '../_components/ui'
import { ORDER_STATUS_LABEL, type OrderStatus } from '@/lib/orders'
import { OrdersTable, type OrderRow } from './orders-table'

export const metadata = { title: 'Pedidos' }
// Un panel de operación no se cachea: quien empaca tiene que ver el estado de
// ahora, no el de hace una hora.
export const dynamic = 'force-dynamic'

const COLUMNS =
  'id, created_at, product_name, product_id, price, quantity, customer_name, customer_phone, ' +
  'customer_city, customer_address, customer_department, customer_neighborhood, ' +
  'customer_address_details, customer_city_code, variant_name, status, payment_method, payment_status, ' +
  'utm_source, utm_campaign, utm_content, fbclid, meta_purchase_sent_at'

function formatCop(n: number) {
  return '$ ' + Math.round(n).toLocaleString('es-CO')
}

export default async function PedidosPage() {
  const db = createAdminClient()
  const { data, error } = await db
    .from('orders')
    .select(COLUMNS)
    .order('created_at', { ascending: false })
    .limit(300)

  if (error) {
    return (
      <main className="container mx-auto px-4 py-10">
        <h1 className="font-serif text-2xl font-extrabold text-ink-title mb-3">Pedidos</h1>
        <p className="text-sm text-sale">
          No se pudieron cargar los pedidos: {error.message}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Si el error menciona una columna que no existe, falta correr la migración{' '}
          <code>20260917150000_meta_attribution_and_order_lifecycle.sql</code>.
        </p>
      </main>
    )
  }

  const orders = (data ?? []) as unknown as OrderRow[]

  // ── Resumen ───────────────────────────────────────────────────────────────
  // Lo que Meta NO puede decirte: de los pedidos que entraron, cuántos se
  // entregaron de verdad. Esa tasa es la que dice si una campaña es rentable
  // con contraentrega, y no aparece en ningún informe del Administrador de
  // Anuncios porque allí un pedido y una entrega son lo mismo.
  const byStatus = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1
    return acc
  }, {})

  const delivered = orders.filter((o) => o.status === 'delivered')
  const closed = orders.filter((o) => o.status === 'delivered' || o.status === 'cancelled')
  const deliveryRate = closed.length ? Math.round((delivered.length / closed.length) * 100) : null
  const revenue = delivered.reduce((sum, o) => sum + (o.price ?? 0) * (o.quantity ?? 1), 0)

  // Por campaña, contando solo lo que se entregó.
  const byCampaign = orders.reduce<Record<string, { total: number; delivered: number; revenue: number }>>(
    (acc, o) => {
      const key = o.utm_campaign || (o.fbclid ? 'Meta (sin UTM)' : 'Directo / orgánico')
      acc[key] ??= { total: 0, delivered: 0, revenue: 0 }
      acc[key].total += 1
      if (o.status === 'delivered') {
        acc[key].delivered += 1
        acc[key].revenue += (o.price ?? 0) * (o.quantity ?? 1)
      }
      return acc
    },
    {}
  )
  const campaigns = Object.entries(byCampaign).sort((a, b) => b[1].total - a[1].total)

  return (
    <AdminPage eyebrow="Ventas" title="Pedidos" description={`${orders.length} pedidos · los 300 más recientes`}>
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Entregados" value={String(delivered.length)} />
        <StatCard label="Tasa de entrega" value={deliveryRate === null ? '—' : `${deliveryRate}%`} hint="sobre pedidos ya cerrados" />
        <StatCard label="Cobrado" value={formatCop(revenue)} hint="solo entregados" />
        <StatCard
          label="Sin confirmar"
          value={String((byStatus.pending ?? 0) + (byStatus.pending_payment ?? 0))}
          tone={(byStatus.pending ?? 0) + (byStatus.pending_payment ?? 0) > 0 ? 'warn' : undefined}
        />
      </div>

      {/* Por campaña */}
      {campaigns.length > 0 && (
        <section className="mb-8">
          <h2 className="font-serif text-lg font-bold text-ink-title mb-3">Por campaña</h2>
          <div className="overflow-x-auto rounded-3xl border border-nav-inactive-border bg-surface">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left font-bold px-4 py-3">Campaña</th>
                  <th className="text-right font-bold px-4 py-3">Pedidos</th>
                  <th className="text-right font-bold px-4 py-3">Entregados</th>
                  <th className="text-right font-bold px-4 py-3">Tasa</th>
                  <th className="text-right font-bold px-4 py-3">Cobrado</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(([name, s]) => (
                  <tr key={name} className="border-t border-nav-inactive-border">
                    <td className="px-4 py-3 font-semibold text-foreground">{name}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{s.total}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{s.delivered}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {s.total ? `${Math.round((s.delivered / s.total) * 100)}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-foreground">
                      {formatCop(s.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            «Directo / orgánico» son los pedidos que llegaron sin parámetros de campaña. Los
            pedidos anteriores a la puesta en marcha del seguimiento salen todos ahí, porque esa
            información no se guardaba.
          </p>
        </section>
      )}

      <h2 className="font-serif text-lg font-bold text-ink-title mb-3">
        Todos los pedidos{' '}
        <span className="font-sans text-xs font-medium text-muted-foreground">
          ({Object.entries(byStatus)
            .map(([s, n]) => `${ORDER_STATUS_LABEL[s as OrderStatus] ?? s}: ${n}`)
            .join(' · ')})
        </span>
      </h2>
      <OrdersTable orders={orders} />
    </AdminPage>
  )
}
