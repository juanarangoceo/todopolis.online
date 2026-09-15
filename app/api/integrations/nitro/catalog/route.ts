import { after, NextResponse } from 'next/server'
import { verifyCatalogControlRequest } from '@/lib/catalog/control-auth'
import { dispatchCatalogOutbox } from '@/lib/catalog/outbox'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const MAX_BODY_BYTES = 128 * 1024
const MAX_SELECTED_PRODUCTS = 2_000

function authorized(request: Request, body: string): boolean {
  const secret = process.env.TODOPOLIS_NITRO_INTEGRATION_SECRET
  if (!secret) return false
  const url = new URL(request.url)
  return verifyCatalogControlRequest({
    secret,
    timestamp: request.headers.get('x-nitro-timestamp'),
    signature: request.headers.get('x-nitro-signature'),
    method: request.method,
    pathname: url.pathname,
    body,
  })
}

export async function GET(request: Request) {
  if (!authorized(request, '')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await createAdminClient()
    .from('catalog_products')
    .select('external_id,title,brand,slug,status,price_min,price_max,image_url,source_updated_at')
    .order('title')
    .limit(MAX_SELECTED_PRODUCTS)
  if (error) {
    console.error('[nitro-catalog-control] list failed', error)
    return NextResponse.json({ error: 'No se pudo leer el catálogo' }, { status: 500 })
  }
  return NextResponse.json({ products: data ?? [] }, { headers: { 'cache-control': 'no-store' } })
}

export async function POST(request: Request) {
  const body = await request.text()
  if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  }
  if (!authorized(request, body)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
  const value = parsed as { external_ids?: unknown }
  const ids = value.external_ids === null
    ? null
    : Array.isArray(value.external_ids)
      ? [...new Set(value.external_ids.map((id) => String(id).trim()).filter(Boolean))]
      : undefined
  if (ids === undefined || (ids && ids.length > MAX_SELECTED_PRODUCTS) || ids?.some((id) => id.length > 200)) {
    return NextResponse.json({ error: 'Selección inválida' }, { status: 400 })
  }

  const { data: queued, error } = await createAdminClient().rpc('requeue_catalog_snapshot', {
    p_external_ids: ids,
  })
  if (error) {
    console.error('[nitro-catalog-control] replay failed', error)
    return NextResponse.json({ error: 'No se pudo preparar la sincronización' }, { status: 500 })
  }

  after(async () => {
    try {
      await dispatchCatalogOutbox(Math.min(Math.max(Number(queued) || 1, 1), 20))
    } catch (dispatchError) {
      console.error('[nitro-catalog-control] immediate dispatch failed', dispatchError)
    }
  })
  return NextResponse.json({ queued: Number(queued) || 0 })
}
