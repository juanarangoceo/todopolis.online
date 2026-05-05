import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag, revalidatePath } from 'next/cache'
import { createHmac } from 'crypto'

function validateSanityWebhook(req: NextRequest, body: string): { isValid: boolean; error?: string } {
  const secret = process.env.SANITY_REVALIDATE_SECRET
  if (!secret) return { isValid: true } // dev: allow without secret

  // Support simple token via query param (?secret=xxx)
  const url = new URL(req.url)
  const querySecret = url.searchParams.get('secret')
  if (querySecret === secret) return { isValid: true }

  // Support Sanity HMAC webhook signature
  const signature = req.headers.get('sanity-webhook-signature')
  if (!signature) {
    return { isValid: false, error: 'Missing signature' }
  }

  const parts = signature.split(',')
  const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1]
  const hash = parts.find(p => p.startsWith('v1='))?.split('=')[1]

  if (!timestamp || !hash) {
    return { isValid: false, error: 'Invalid signature format' }
  }

  const expectedHash = createHmac('sha256', secret)
    .update(`${timestamp}.${body}`)
    .digest('hex')

  if (hash !== expectedHash) {
    return { isValid: false, error: 'Signature mismatch' }
  }

  return { isValid: true }
}

export async function POST(request: NextRequest) {
  const body = await request.text()

  const validation = validateSanityWebhook(request, body)
  if (!validation.isValid) {
    return NextResponse.json({ error: 'Unauthorized', details: validation.error }, { status: 401 })
  }

  try {
    const payload = JSON.parse(body)
    console.log('Revalidating due to Sanity publish:', payload._type, payload._id)

    revalidateTag('products', 'max')
    const productSlug = payload.slug?.current ?? payload._id
    revalidateTag(`product-${productSlug}`, 'max')

    // Revalidate pages including sitemap
    revalidatePath('/')
    revalidatePath('/sitemap.xml')
    if (productSlug) revalidatePath(`/producto/${productSlug}`)

    return NextResponse.json({ revalidated: true, timestamp: new Date().toISOString() })
  } catch (error) {
    console.error('Error in revalidate webhook:', error)
    return NextResponse.json({ error: 'Error revalidating' }, { status: 500 })
  }
}
