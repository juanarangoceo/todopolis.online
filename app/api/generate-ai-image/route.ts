import { NextRequest, NextResponse } from 'next/server'
import { createClient } from 'next-sanity'

function getSanityWriteClient() {
  return createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
    apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2025-01-01',
    token: process.env.SANITY_API_TOKEN!,
    useCdn: false,
  })
}

const CATEGORY_CONTEXT: Record<string, string> = {
  electronica: 'electronic device or gadget',
  hogar: 'home product or appliance',
  moda: 'fashion item or clothing',
  deportes: 'sports or fitness equipment',
  juguetes: 'toy or children product',
  belleza: 'beauty or skincare product',
  alimentos: 'food or beverage product',
  accesorios: 'accessory item',
  sexshop: 'intimate wellness product',
  otros: 'consumer product',
}

function buildImagePrompt(name: string, category: string, description: string): string {
  const categoryCtx = CATEGORY_CONTEXT[category?.toLowerCase()] ?? 'consumer product'
  return `A hyperrealistic commercial lifestyle photograph of an attractive Latin American person using or holding a ${categoryCtx} called "${name}". Product context: ${description?.slice(0, 200) ?? ''}. Style: ultra-photorealistic, professional studio-quality lighting with soft natural fill, the person looks genuinely happy and satisfied, the product is clearly visible and prominent, warm inviting Colombian lifestyle setting, magazine-quality advertising composition, sharp focus on both person and product, portrait composition (4:5 ratio). No text, no watermarks, no logos.`
}

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY no está configurada.' }, { status: 500 })
  }
  if (!process.env.SANITY_API_TOKEN) {
    return NextResponse.json({ error: 'SANITY_API_TOKEN no está configurada.' }, { status: 500 })
  }

  const { name, category, shortDescription, docId } = await request.json()

  if (!name || !docId) {
    return NextResponse.json({ error: 'Se requieren name y docId.' }, { status: 400 })
  }

  try {
    const prompt = buildImagePrompt(name, category ?? 'otros', shortDescription ?? '')

    // Call gpt-image-2 via REST API (no SDK needed)
    // Size 1024x1280 = exact 4:5 ratio (both multiples of 16, ratio < 3:1)
    const imgGenRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt,
        n: 1,
        size: '1024x1536',
        quality: 'high',
      }),
    })

    if (!imgGenRes.ok) {
      const errBody = await imgGenRes.json().catch(() => ({}))
      throw new Error(errBody?.error?.message ?? `gpt-image-1 error ${imgGenRes.status}`)
    }

    const imgGenData = await imgGenRes.json()
    // gpt-image-1 returns base64-encoded image data
    const b64 = imgGenData?.data?.[0]?.b64_json
    if (!b64) throw new Error('gpt-image-1 no devolvió datos de imagen.')

    const imageBuffer = Buffer.from(b64, 'base64')

    const client = getSanityWriteClient()

    // Upload to Sanity asset store
    const asset = await client.assets.upload('image', imageBuffer, {
      filename: `ai-lifestyle-${docId}-${Date.now()}.png`,
      contentType: 'image/png',
    })

    // Patch the product document with the new image reference
    await client
      .patch(docId)
      .set({
        aiLifestyleImage: {
          _type: 'image',
          asset: { _type: 'reference', _ref: asset._id },
        },
      })
      .commit()

    return NextResponse.json({ success: true, assetId: asset._id })
  } catch (error: any) {
    const message = error?.message ?? 'Error desconocido'
    console.error('Error generando imagen con DALL-E:', message)
    return NextResponse.json({ error: `Error al generar imagen: ${message}` }, { status: 500 })
  }
}
