// Reconciliación de los cobros de Confío. ES LA VÍA PRINCIPAL, no un respaldo.
//
// Todopolis NO tiene webhook de Confío a propósito: comparte la tienda con el
// bot de Nitro y Confío admite UNA sola URL de webhook por tienda, que ya
// apunta a Nitro. Los eventos de estos cobros llegan allí, Nitro no los
// reconoce (el correlationId lleva prefijo 'todopolis:', no 'nitro:'), los
// registra como `unmatched` y responde 200 sin tocar nada. Por eso aquí se
// consulta por GET, que es exactamente el camino con el que Nitro estuvo
// operando mientras Confío no entregaba su WEBHOOK_KEY.

import { admin, confioConfig, ORDER_COLUMNS, reconcileOrder, type OrderRow } from '@/lib/payments/confio-orders'

export const runtime = 'nodejs'
export const maxDuration = 60

const BATCH = 25

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return Response.json({ error: 'cron is not configured' }, { status: 503 })
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const config = confioConfig()
  if (!config) return Response.json({ skipped: 'confio no configurado' })

  // Solo cobros NUESTROS y todavía esperando. El más desactualizado primero.
  const { data: orders, error } = await admin()
    .from('orders')
    .select(ORDER_COLUMNS)
    .eq('payment_method', 'confio')
    .eq('payment_status', 'awaiting')
    .order('provider_synced_at', { ascending: true, nullsFirst: true })
    .limit(BATCH)
    .returns<OrderRow[]>()

  if (error) {
    console.error('[confio-reconcile] no se pudieron leer los cobros abiertos:', error)
    return Response.json({ error: 'db error' }, { status: 500 })
  }

  let funded = 0
  let changed = 0
  const problems: { orderId: string; reason: string }[] = []

  for (const order of orders ?? []) {
    try {
      const result = await reconcileOrder(config, order)
      if (result.funded) funded++
      if (result.changed) changed++
      if (result.reason === 'descuadre_de_monto') {
        problems.push({ orderId: order.id, reason: result.reason })
      }
    } catch (err) {
      // Un cobro que falla no puede impedir que se revisen los demás: el
      // siguiente pase lo reintenta.
      console.error(`[confio-reconcile] pedido ${order.id}:`, err)
      problems.push({ orderId: order.id, reason: (err as Error).message.slice(0, 120) })
    }
  }

  return Response.json({ revisados: orders?.length ?? 0, funded, changed, problems })
}
