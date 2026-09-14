import { after, type NextRequest } from 'next/server'
import { parseBody } from 'next-sanity/webhook'
import { dispatchCatalogOutbox } from '@/lib/catalog/outbox'
import { syncSanityCatalogProduct } from '@/lib/catalog/sync-sanity-product'

export const runtime = 'nodejs'
export const maxDuration = 300

type WebhookBody = { _id?: string; _updatedAt?: string }

export async function POST(request: NextRequest) {
  const secret = process.env.SANITY_CATALOG_WEBHOOK_SECRET
  if (!secret) return Response.json({ error: 'catalog webhook is not configured' }, { status: 503 })
  if (Number(request.headers.get('content-length') ?? 0) > 100_000) {
    return Response.json({ error: 'payload too large' }, { status: 413 })
  }

  const { body, isValidSignature } = await parseBody<WebhookBody>(request, secret, true)
  if (!isValidSignature) return Response.json({ error: 'invalid signature' }, { status: 401 })

  // En un delete la proyección puede no contener el documento posterior. Sanity
  // conserva el identificador en este header para que despublicar siempre
  // archive el producto, incluso cuando el cuerpo solo contiene campos nulos.
  const externalId = (body?._id ?? request.headers.get('sanity-document-id'))?.replace(/^drafts\./, '')
  if (!externalId) return Response.json({ error: 'missing product id' }, { status: 400 })

  const result = await syncSanityCatalogProduct({
    externalId,
    sourceUpdatedAt: body?._updatedAt,
  })

  after(async () => {
    try {
      await dispatchCatalogOutbox(20)
    } catch (error) {
      console.error('[catalog-outbox] opportunistic dispatch failed', error)
    }
  })

  return Response.json({ ok: true, result })
}
