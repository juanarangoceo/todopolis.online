import { dispatchCatalogOutbox } from '@/lib/catalog/outbox'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return Response.json({ error: 'cron is not configured' }, { status: 503 })
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }
  return Response.json(await dispatchCatalogOutbox(50))
}
