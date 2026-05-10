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

// Converts a Sanity asset ref to a CDN URL
// ref format: "image-{hash}-{width}x{height}-{ext}"  →  CDN URL
function sanityRefToUrl(ref: string): string {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production'
  const withoutPrefix = ref.replace(/^image-/, '')
  const withExtension = withoutPrefix.replace(/-([a-zA-Z0-9]+)$/, '.$1')
  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${withExtension}`
}

function buildImagePrompt(name: string, heroTitle: string, description: string): string {
  const parts = [
    `Product name: "${name}".`,
    heroTitle ? `Headline: "${heroTitle}".` : '',
    description ? `Description: ${description.slice(0, 250)}.` : '',
  ].filter(Boolean).join(' ')

  return `Generate a hyperrealistic commercial lifestyle photograph. An attractive Latin American person is using or holding this EXACT product — keep the product completely identical to the reference image provided, same shape, color, design and details. ${parts} Style: ultra-photorealistic, professional studio-quality lighting with soft natural fill, the person looks genuinely happy and satisfied, the product is clearly visible and prominent in the scene, warm inviting Colombian lifestyle setting, magazine-quality advertising composition, sharp focus on both person and product, portrait format. No text, no watermarks, no logos overlay.`
}

async function fetchImageBuffer(url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') ?? 'image/jpeg'
    const buffer = Buffer.from(await res.arrayBuffer())
    return { buffer, contentType }
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY no está configurada.' }, { status: 500 })
  }
  if (!process.env.SANITY_API_TOKEN) {
    return NextResponse.json({ error: 'SANITY_API_TOKEN no está configurada.' }, { status: 500 })
  }

  const { name, heroTitle, shortDescription, imageRef, mastershopImageUrl, docId } = await request.json()

  if (!name || !docId) {
    return NextResponse.json({ error: 'Se requieren name y docId.' }, { status: 400 })
  }

  try {
    const prompt = buildImagePrompt(name, heroTitle ?? '', shortDescription ?? '')

    // Resolve the product reference image (Sanity asset first, then mastershop URL)
    let referenceImage: { buffer: Buffer; contentType: string } | null = null

    if (imageRef) {
      const url = sanityRefToUrl(imageRef)
      referenceImage = await fetchImageBuffer(url)
    }
    if (!referenceImage && mastershopImageUrl) {
      referenceImage = await fetchImageBuffer(mastershopImageUrl)
    }

    let b64: string | undefined

    if (referenceImage) {
      // Use /edits endpoint — model sees the real product and replicates it faithfully
      const ext = referenceImage.contentType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg'
      const filename = `product.${ext}`

      const formData = new FormData()
      formData.append('model', 'gpt-image-2')
      formData.append('prompt', prompt)
      formData.append('n', '1')
      formData.append('size', '1024x1536')
      formData.append('quality', 'high')
      formData.append('image[]', new File([referenceImage.buffer], filename, { type: referenceImage.contentType }))

      const editsRes = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: formData,
      })

      if (!editsRes.ok) {
        const errBody = await editsRes.json().catch(() => ({}))
        throw new Error(errBody?.error?.message ?? `gpt-image-2 edits error ${editsRes.status}`)
      }

      const editsData = await editsRes.json()
      b64 = editsData?.data?.[0]?.b64_json
    } else {
      // Fallback: no reference image available → use generations endpoint
      const genRes = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-image-2',
          prompt,
          n: 1,
          size: '1024x1536',
          quality: 'high',
        }),
      })

      if (!genRes.ok) {
        const errBody = await genRes.json().catch(() => ({}))
        throw new Error(errBody?.error?.message ?? `gpt-image-2 generations error ${genRes.status}`)
      }

      const genData = await genRes.json()
      b64 = genData?.data?.[0]?.b64_json
    }

    if (!b64) throw new Error('gpt-image-2 no devolvió datos de imagen.')

    const imageBuffer = Buffer.from(b64, 'base64')
    const client = getSanityWriteClient()

    const asset = await client.assets.upload('image', imageBuffer, {
      filename: `ai-lifestyle-${docId}-${Date.now()}.png`,
      contentType: 'image/png',
    })

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
    console.error('Error generando imagen con gpt-image-2:', message)
    return NextResponse.json({ error: `Error al generar imagen: ${message}` }, { status: 500 })
  }
}
