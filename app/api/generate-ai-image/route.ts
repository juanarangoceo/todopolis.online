import { fetchInlineImages } from '@/lib/ai/reference-images'
import { authorizeEditorialRequest } from '@/lib/ai/authorize'
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
//
// Y tres para pautar en Meta (22-oct-2026): ningún «antes y después» ni un
// cuerpo presentado como defecto (Meta rechaza el anuncio), ropa y fajas
// puestas con naturalidad y sin poses sugerentes, y lo importante dentro del
// 4:5 central, que es lo que el feed recorta de una foto vertical 2:3.
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
    'COMPOSITION: vertical portrait framing for a mobile feed. The product is clearly visible, in focus and easy to identify within the first second, with some breathing room around it. Keep the product and any face inside the central 4:5 area: feeds crop the top and bottom of a 2:3 photo.',
    'AD POLICY (the photo will run in Facebook and Instagram ads): no before-and-after, no split images, no measuring tapes, scales or pinched skin, no close-ups of body parts presented as a problem. Clothing, shapewear and lingerie are shown worn naturally in an everyday, non-suggestive pose, by a person of ordinary build, with the garment\'s real fit, fabric and color. The product must not look better, bigger or shinier than the reference.',
    'NEVER include: text, captions, prices, watermarks, invented logos, UI elements, extra fingers or distorted hands, duplicated products.',
    scene && SCENES[scene] ? SCENES[scene] : '',
  ].filter(Boolean).join('\n\n')
}

// Tiene que existir en AI_MODELS (lib/ai/pricing.ts) o Nitro Profit lo cuenta en cero.
const IMAGE_MODEL = 'gpt-image-2.5-sunburst'

export const maxDuration = 180

export async function POST(request: NextRequest) {
  const denied = await authorizeEditorialRequest(request)
  if (denied) return denied
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY no está configurada.' }, { status: 500 })
  }
  if (!process.env.SANITY_API_TOKEN) {
    return NextResponse.json({ error: 'SANITY_API_TOKEN no está configurada.' }, { status: 500 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  const { name, heroTitle, shortDescription, imageRef, imageRefs, mastershopImageUrl, docId, scene } = body

  if (typeof name !== 'string' || !name.trim() || name.length > 500 || typeof docId !== 'string' || !/^[\w.-]{1,120}$/.test(docId) || (heroTitle != null && typeof heroTitle !== 'string') || (shortDescription != null && typeof shortDescription !== 'string') || (scene != null && (typeof scene !== 'string' || !SCENES[scene]))) {
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

    const urls = refs.filter((ref) => /^image-[a-zA-Z0-9]+-\d+x\d+-[a-zA-Z0-9]+$/.test(ref)).map((ref) => `${sanityRefToUrl(ref)}?w=1024&fm=jpg`)
    let referenceImages = await fetchInlineImages(urls)
    if (!referenceImages.length && typeof mastershopImageUrl === 'string') referenceImages = await fetchInlineImages([mastershopImageUrl])
    if (!referenceImages.length) {
      return NextResponse.json({ error: 'No pudimos leer una foto real del producto. Agrega una foto en Sanity antes de generar la imagen.' }, { status: 422 })
    }

    let b64: string | undefined
    let imageUsage: unknown = null

    {
      // Use /edits endpoint — model sees the real product and replicates it faithfully

      const formData = new FormData()
      formData.append('model', IMAGE_MODEL)
      formData.append('prompt', prompt)
      formData.append('n', '1')
      formData.append('size', '1024x1536')
      formData.append('quality', 'high')
      referenceImages.forEach((img, idx) => {
        const imgExt = img.mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg'
        formData.append('image[]', new File([Buffer.from(img.data, 'base64')], `product-${idx + 1}.${imgExt}`, { type: img.mimeType }))
      })

      const editsRes = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: formData,
        signal: AbortSignal.timeout(150_000),
      })

      if (!editsRes.ok) {
        await editsRes.body?.cancel()
        throw new Error(`OpenAI rechazó la generación (HTTP ${editsRes.status}).`)
      }

      const editsData = await editsRes.json()
      b64 = editsData?.data?.[0]?.b64_json
      imageUsage = editsData?.usage
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
    const message = error?.name === 'TimeoutError' ? 'La generación excedió el tiempo de espera; revisa el consumo antes de reintentar.' : error?.message ?? 'Error desconocido'
    console.error(`Error generando imagen con ${IMAGE_MODEL}:`, error instanceof Error ? error.name : 'Error')
    return NextResponse.json({ error: `Error al generar imagen: ${message}` }, { status: 500 })
  }
}
