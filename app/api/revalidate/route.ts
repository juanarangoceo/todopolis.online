import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag, revalidatePath } from 'next/cache'
import { createHmac } from 'crypto'

function validateSanityWebhook(req: NextRequest, body: string): { isValid: boolean, error?: string } {
  const secret = process.env.SANITY_WEBHOOK_SECRET
  if (!secret) return { isValid: true } // Allow without secret in development

  const signature = req.headers.get('sanity-webhook-signature')
  if (!signature) {
    console.error('Sanity Webhook Refused: Missing sanity-webhook-signature header. Did you set the secret in Sanity Dashboard?')
    return { isValid: false, error: 'Missing signature' }
  }

  // Sanity webhook signature format: "t=<timestamp>,v1=<hash>"
  const parts = signature.split(',')
  const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1]
  const hash = parts.find(p => p.startsWith('v1='))?.split('=')[1]

  if (!timestamp || !hash) {
    console.error('Sanity Webhook Refused: Invalid signature format', signature)
    return { isValid: false, error: 'Invalid signature format' }
  }

  const expectedHash = createHmac('sha256', secret)
    .update(`${timestamp}.${body}`)
    .digest('hex')

  if (hash !== expectedHash) {
    console.error('Sanity Webhook Refused: Signature mismatch. Vercel secret does not match Sanity secret.')
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

    // Revalidate all product-related cache tags
    revalidateTag('products', 'max')
    const productSlug = payload.slug?.current ?? payload._id
    revalidateTag(`product-${productSlug}`, 'max')
    revalidatePath('/')

    return NextResponse.json({
      revalidated: true,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error in revalidate webhook:', error)
    return NextResponse.json({ error: 'Error revalidating' }, { status: 500 })
  }
}
