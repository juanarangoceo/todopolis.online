import { createHmac } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

// Envía a Nitro los eventos `order.v1` que encola el trigger `orders_enqueue_nitro`
// (migración 20260923150000). Mismo secreto, firma y cabeceras que el catálogo
// (`lib/catalog/outbox.ts`); en Nitro los recibe
// `/api/integrations/todopolis/orders` y los guarda en `web_orders`.
//
// La URL sale de NITRO_ORDERS_ENDPOINT o, si no está, de la del catálogo
// cambiando `/catalog` por `/orders`: los dos receptores viven lado a lado y
// así no hace falta configurar nada nuevo en Vercel.

type OutboxRow = {
  event_id: string
  payload: Record<string, unknown>
  created_at: string
}

export function ordersEndpoint(): string | null {
  const explicit = process.env.NITRO_ORDERS_ENDPOINT
  if (explicit) return explicit
  const catalog = process.env.NITRO_CATALOG_ENDPOINT
  if (!catalog || !/\/catalog\/?$/.test(catalog)) return null
  return catalog.replace(/\/catalog\/?$/, '/orders')
}

function signature(secret: string, timestamp: string, body: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')
}

export async function dispatchOrderOutbox(limit = 20): Promise<{
  disabled: boolean
  claimed: number
  sent: number
  failed: number
}> {
  const endpoint = ordersEndpoint()
  const secret = process.env.TODOPOLIS_NITRO_INTEGRATION_SECRET
  if (!endpoint || !secret) return { disabled: true, claimed: 0, sent: 0, failed: 0 }

  const admin = createAdminClient()
  const { data, error } = await admin.rpc('claim_order_outbox', {
    p_limit: limit,
    p_lease_seconds: 300,
  })
  if (error) throw new Error(`No se pudo reclamar el outbox de pedidos: ${error.message}`)

  const rows = (data ?? []) as OutboxRow[]
  let sent = 0
  let failed = 0
  for (const row of rows) {
    const body = JSON.stringify({
      contract_version: 'order.v1',
      event_id: row.event_id,
      event_type: 'order.upsert',
      occurred_at: row.created_at,
      order: row.payload,
    })
    const timestamp = Date.now().toString()
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-todopolis-event-id': row.event_id,
          'x-todopolis-timestamp': timestamp,
          'x-todopolis-signature': signature(secret, timestamp, body),
        },
        body,
        signal: AbortSignal.timeout(15_000),
      })
      if (!response.ok) {
        const detail = await response.text().catch(() => '')
        throw new Error(`Nitro respondió HTTP ${response.status} ${detail.slice(0, 200)}`)
      }

      const { error: updateError } = await admin
        .from('order_outbox')
        .update({ status: 'sent', sent_at: new Date().toISOString(), locked_at: null, last_error: null })
        .eq('event_id', row.event_id)
        .eq('status', 'sending')
      if (updateError) throw updateError
      sent += 1
    } catch (err) {
      failed += 1
      await admin.rpc('fail_order_outbox_event', {
        p_event_id: row.event_id,
        p_error: err instanceof Error ? err.message : 'unknown error',
        p_max_attempts: 8,
      })
    }
  }

  return { disabled: false, claimed: rows.length, sent, failed }
}
