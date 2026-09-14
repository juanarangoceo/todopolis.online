import { createHmac } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

type OutboxRow = {
  event_id: string
  payload: unknown
  attempts: number
}

function integrationConfig(): { endpoint: string; secret: string } | null {
  const endpoint = process.env.NITRO_CATALOG_ENDPOINT
  const secret = process.env.TODOPOLIS_NITRO_INTEGRATION_SECRET
  return endpoint && secret ? { endpoint, secret } : null
}

function signature(secret: string, timestamp: string, body: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')
}

export async function dispatchCatalogOutbox(limit = 20): Promise<{
  disabled: boolean
  claimed: number
  sent: number
  failed: number
}> {
  const config = integrationConfig()
  if (!config) return { disabled: true, claimed: 0, sent: 0, failed: 0 }

  const admin = createAdminClient()
  const { data, error } = await admin.rpc('claim_catalog_outbox', {
    p_limit: limit,
    p_lease_seconds: 300,
  })
  if (error) throw new Error(`No se pudo reclamar el outbox: ${error.message}`)

  const rows = (data ?? []) as OutboxRow[]
  let sent = 0
  let failed = 0
  for (const row of rows) {
    const body = JSON.stringify(row.payload)
    const timestamp = Date.now().toString()
    try {
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-todopolis-event-id': row.event_id,
          'x-todopolis-timestamp': timestamp,
          'x-todopolis-signature': signature(config.secret, timestamp, body),
        },
        body,
        signal: AbortSignal.timeout(15_000),
      })
      if (!response.ok) throw new Error(`Nitro respondió HTTP ${response.status}`)

      const { error: updateError } = await admin
        .from('catalog_outbox')
        .update({ status: 'sent', sent_at: new Date().toISOString(), locked_at: null, last_error: null })
        .eq('event_id', row.event_id)
        .eq('status', 'sending')
      if (updateError) throw updateError
      sent += 1
    } catch (error) {
      failed += 1
      await admin.rpc('fail_catalog_outbox_event', {
        p_event_id: row.event_id,
        p_error: error instanceof Error ? error.message : 'unknown error',
        p_max_attempts: 8,
      })
    }
  }

  return { disabled: false, claimed: rows.length, sent, failed }
}
