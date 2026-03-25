import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag, revalidatePath } from 'next/cache'
import { createHmac } from 'crypto'

function validateSanityWebhook(req: NextRequest, body: string): boolean {
  const secret = process.env.SANITY_WEBHOOK_SECRET
  if (!secret) return true // Allow without secret in development

  const signature = req.headers.get('sanity-webhook-signature')
  if (!signature) return false

  // Sanity webhook signature format: "t=<timestamp>,v1=<hash>"
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
    console.log('Revalidating due to Sanity publish:', payload._type, payload._id)

    // Revalidate all product-related cache tags
    revalidateTag('products')
    const productSlug = payload.slug?.current ?? payload._id
    revalidateTag(`product-${productSlug}`)
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
