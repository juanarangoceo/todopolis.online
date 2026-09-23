import { dispatchCatalogOutbox } from '@/lib/catalog/outbox'
import { dispatchOrderOutbox } from '@/lib/nitro-order-outbox'

export const runtime = 'nodejs'
export const maxDuration = 300

// Despacha las dos bandejas hacia Nitro: catálogo y pedidos. Van en el mismo
// cron (cada minuto) para no sumar otro al proyecto, pero cada una por su lado:
// un fallo del catálogo no puede frenar los pedidos, ni al revés.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return Response.json({ error: 'cron is not configured' }, { status: 503 })
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }
  const [catalog, orders] = await Promise.allSettled([
    dispatchCatalogOutbox(50),
    dispatchOrderOutbox(50),
  ])
  const settle = <T,>(r: PromiseSettledResult<T>) =>
    r.status === 'fulfilled' ? r.value : { error: r.reason instanceof Error ? r.reason.message : String(r.reason) }
  // La respuesta del catálogo conserva su forma de siempre en la raíz.
  return Response.json({ ...settle(catalog), orders: settle(orders) })
}
