import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHmac } from 'crypto'

// Initialize dynamically to avoid build-time errors if env vars are missing
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function validateSanityWebhook(req: NextRequest, body: string): boolean {
  const secret = process.env.SANITY_WEBHOOK_SECRET
  if (!secret) return true

  const signature = req.headers.get('sanity-webhook-signature')
  if (!signature) return false

  const parts = signature.split(',')
  const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1]
  const hash = parts.find(p => p.startsWith('v1='))?.split('=')[1]

  if (!timestamp || !hash) return false

  const expectedHash = createHmac('sha256', secret)
    .update(`${timestamp}.${body}`)
    .digest('hex')

  return hash === expectedHash
}

export async function POST(request: NextRequest) {
  const body = await request.text()

  if (!validateSanityWebhook(request, body)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = JSON.parse(body)

    if (payload._type !== 'product') {
      return NextResponse.json({ skipped: true, reason: 'Not a product document' })
    }

    // Build image URL from Sanity asset reference
    const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
    const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production'
    const imageRef = payload.images?.[0]?.asset?._ref
    let imageUrl: string | null = null

    if (imageRef) {
      // Convert Sanity asset ref to CDN URL: image-{id}-{width}x{height}-{format}
      const [, id, dimensions, format] = imageRef.split('-')
      imageUrl = `https://cdn.sanity.io/images/${projectId}/${dataset}/${id}-${dimensions}.${format}`
    }

    const productRow = {
      id: payload._id,
      slug: payload.slug?.current,
      name: payload.name,
      short_description: payload.shortDescription,
      price: payload.price ?? null,
      original_price: payload.originalPrice ?? null, // Nuevo campo añadido
      image_url: imageUrl,
      category: payload.category ?? null,
      is_new: payload.isNew ?? false,
      is_best_seller: payload.isBestSeller ?? false,
      hero_title: payload.heroTitle ?? null,
      hero_subtitle: payload.heroSubtitle ?? null,
      hero_cta: payload.heroCta ?? null,
      benefits: payload.benefits ?? null,
      specifications: payload.specifications ?? null,
      testimonials: payload.testimonials ?? null,
      cta_headline: payload.ctaHeadline ?? null,
      cta_text: payload.ctaText ?? null,
      updated_at: new Date().toISOString(),
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { error } = await supabaseAdmin
      .from('products')
      .upsert(productRow, { onConflict: 'id' })

    if (error) throw error

    console.log(`✅ Producto sincronizado en Supabase: ${payload.name}`)

    return NextResponse.json({ synced: true, id: payload._id })
  } catch (error) {
    console.error('Error syncing product to Supabase:', error)
    return NextResponse.json({ error: 'Error syncing product' }, { status: 500 })
  }
}
