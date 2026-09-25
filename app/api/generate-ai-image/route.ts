import { NextRequest, NextResponse } from 'next/server'
import { openaiImageUsage, recordAiUsage } from '@/lib/ai/usage'
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

// Encuadres para armar la galería lifestyle. Sin escena, el prompt es el de
// siempre; con escena, se le añade la instrucción para que cada foto de la
// galería cuente algo distinto en vez de salir cinco variaciones del mismo
// retrato. Las claves las manda GenerateAIImageButton.
const SCENES: Record<string, string> = {
  uso: 'Scene focus: the product in active, everyday use, mid-action, candid and natural rather than posed.',
  detalle: 'Scene focus: a close-up detail shot. Hands holding or operating the product; texture, materials and finish clearly visible. Shallow depth of field. The face may be out of frame.',
  ambiente: 'Scene focus (this overrides the person requirement above): the product placed in a beautiful, lived-in Colombian home or setting where it naturally belongs. No person, or only a hand or silhouette at the edge of the frame.',
  momento: 'Scene focus: an emotional everyday moment — family, friends or partner sharing the benefit of the product together. Warm, genuine interaction.',
  exterior: 'Scene focus: outdoors in natural daylight (park, balcony, street or terrace in a Colombian city), the product in use in that environment.',
}

// Prompt de la foto lifestyle.
//
// La versión anterior pedía «magazine-quality», «professional studio-quality
// lighting» y «an attractive Latin American person». Para anuncios de Meta eso
// juega en contra: la foto de estudio perfecta es justo lo que el ojo reconoce
// como publicidad —o como IA— y la salta. Lo que funciona en el feed es lo que
// parece una foto real de alguien usando el producto en su casa.
//
// Tres reglas que antes no estaban:
//  - La persona es QUIEN USA el producto (edad, contexto), no un modelo genérico.
//  - El producto conserva su TAMAÑO real: agrandarlo para que «domine el
//    encuadre» fabricaba una expectativa que el paquete no cumple.
//  - Nada de texto, logos inventados ni piezas que el producto no trae.
function buildImagePrompt(name: string, heroTitle: string, description: string, scene?: string): string {
  const parts = [
    `Product name: "${name}".`,
    heroTitle ? `What it does for the buyer: "${heroTitle}".` : '',
    description ? `Description: ${description.replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '').slice(0, 300)}.` : '',
  ].filter(Boolean).join(' ')

  return [
    'Create a photorealistic lifestyle photo of this exact product being used in real life in Colombia.',
    parts,
    'PRODUCT FIDELITY (most important): the reference image(s) show the real product. Reproduce its exact shape, colors, materials, proportions, parts and any printed branding. Keep its true real-world size relative to hands, people and furniture — never enlarge it. Do not add accessories, parts, colors or features the reference does not show. You may change the angle and position.',
    'PEOPLE: show the person who would really use this product, matching the age, gender and situation implied by the name and description (for example a toddler with a parent nearby for a toddler toy, an adult at a desk for a gaming accessory). Ordinary, natural-looking Colombian people with real skin texture — not models, no heavy retouching. Natural, candid expressions mid-action rather than posing for the camera.',
    'SETTING AND LIGHT: a believable Colombian home, apartment, balcony, park or street that fits the product. Natural window light or daylight. It should look like a well-composed photo taken by a good photographer with a real camera, not a studio catalog shot and not a 3D render.',
    'COMPOSITION: vertical portrait framing for a mobile feed. The product is clearly visible, in focus and easy to identify within the first second, with some breathing room around it.',
    'NEVER include: text, captions, prices, watermarks, invented logos, UI elements, extra fingers or distorted hands, duplicated products.',
    scene && SCENES[scene] ? SCENES[scene] : '',
  ].filter(Boolean).join('\n\n')
}

// Tiene que existir en AI_MODELS (lib/ai/pricing.ts) o Nitro Profit lo cuenta en cero.
const IMAGE_MODEL = 'gpt-image-2.5-sunburst'

const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function resolveContentType(url: string, header: string | null): string {
  // Use header if it's a valid image type (strip quality params like "; charset=...")
  const headerBase = header?.split(';')[0].trim() ?? ''
  if (SUPPORTED_TYPES.includes(headerBase)) return headerBase

  // Infer from URL extension when header is missing or octet-stream
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase()
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'png') return 'image/png'
  if (ext === 'webp') return 'image/webp'

  return 'image/jpeg'
}

async function fetchImageBuffer(url: string): Promise<{ buffer: ArrayBuffer; contentType: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return null
    const contentType = resolveContentType(url, res.headers.get('content-type'))
    const buffer = await res.arrayBuffer()
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

  const { name, heroTitle, shortDescription, imageRef, imageRefs, mastershopImageUrl, docId, scene } = await request.json()

  if (!name || !docId) {
    return NextResponse.json({ error: 'Se requieren name y docId.' }, { status: 400 })
  }

  try {
    const prompt = buildImagePrompt(name, heroTitle ?? '', shortDescription ?? '', scene)

    // Fotos de referencia: hasta 3 del producto (Sanity primero, Mastershop de
    // respaldo). Con una sola, el modelo inventaba lo que no se veía desde ese
    // ángulo —la parte de atrás, el tamaño real, las piezas del kit—.
    const refs: string[] = [
      ...(Array.isArray(imageRefs) ? imageRefs : []),
      ...(imageRef ? [imageRef] : []),
    ].filter((r, idx, arr): r is string => typeof r === 'string' && !!r && arr.indexOf(r) === idx).slice(0, 3)

    const referenceImages = (
      await Promise.all(refs.map((ref) => fetchImageBuffer(`${sanityRefToUrl(ref)}?w=1024&fm=jpg`)))
    ).filter((img): img is { buffer: ArrayBuffer; contentType: string } => img !== null)
    if (referenceImages.length === 0 && mastershopImageUrl) {
      const img = await fetchImageBuffer(mastershopImageUrl)
      if (img) referenceImages.push(img)
    }
    const referenceImage = referenceImages[0] ?? null

    let b64: string | undefined
    let imageUsage: unknown = null

    if (referenceImage) {
      // Use /edits endpoint — model sees the real product and replicates it faithfully

      const formData = new FormData()
      formData.append('model', IMAGE_MODEL)
      formData.append('prompt', prompt)
      formData.append('n', '1')
      formData.append('size', '1024x1536')
      formData.append('quality', 'high')
      referenceImages.forEach((img, idx) => {
        const imgExt = img.contentType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg'
        formData.append('image[]', new File([img.buffer], `product-${idx + 1}.${imgExt}`, { type: img.contentType }))
      })

      const editsRes = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: formData,
      })

      if (!editsRes.ok) {
        const errBody = await editsRes.json().catch(() => ({}))
        throw new Error(errBody?.error?.message ?? `${IMAGE_MODEL} edits error ${editsRes.status}`)
      }

      const editsData = await editsRes.json()
      b64 = editsData?.data?.[0]?.b64_json
      imageUsage = editsData?.usage
    } else {
      // Fallback: no reference image available → use generations endpoint
      const genRes = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: IMAGE_MODEL,
          prompt,
          n: 1,
          size: '1024x1536',
          quality: 'high',
        }),
      })

      if (!genRes.ok) {
        const errBody = await genRes.json().catch(() => ({}))
        throw new Error(errBody?.error?.message ?? `${IMAGE_MODEL} generations error ${genRes.status}`)
      }

      const genData = await genRes.json()
      b64 = genData?.data?.[0]?.b64_json
      imageUsage = genData?.usage
    }

    // Costo para /admin/profit, con los tokens reales que devuelve OpenAI.
    const productRef = typeof docId === 'string' ? docId.replace(/^drafts\./, '').slice(0, 120) : null
    await recordAiUsage({
      source: 'ai_image',
      model: IMAGE_MODEL,
      flow: productRef ? `image:${productRef}` : null,
      productRef,
      ...openaiImageUsage(imageUsage),
      ok: !!b64,
      meta: { references: referenceImages.length, scene: scene ?? null },
    })

    if (!b64) throw new Error(`${IMAGE_MODEL} no devolvió datos de imagen.`)

    const imageBuffer = Buffer.from(b64, 'base64')
    const client = getSanityWriteClient()

    // Upload to Sanity asset store — do NOT patch the document yet.
    // The Studio button will confirm before writing to the document field.
    const asset = await client.assets.upload('image', imageBuffer, {
      filename: `ai-lifestyle-preview-${Date.now()}.png`,
      contentType: 'image/png',
    })

    return NextResponse.json({ assetId: asset._id, assetUrl: asset.url })
  } catch (error: any) {
    const message = error?.message ?? 'Error desconocido'
    console.error(`Error generando imagen con ${IMAGE_MODEL}:`, message)
    return NextResponse.json({ error: `Error al generar imagen: ${message}` }, { status: 500 })
  }
}
