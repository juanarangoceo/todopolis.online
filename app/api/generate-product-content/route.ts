import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import {
  SYSTEM_PROMPT,
  PRODUCT_COPY_TEMPERATURE,
  buildImageAnalysisBlock,
  buildCategoryBlock,
} from '@/lib/product-content-prompt'
import { fetchTagTaxonomy, classifyProductTags, tagSlugsToReferences } from '@/lib/auto-tag'
import { PRODUCT_CATEGORIES, isProductCategory } from '@/lib/categories'
import { askJev, decideCategory } from '@/lib/category-classifier'
import { urlForImage } from '@/lib/sanity/image'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// Bajar las fotos + el copy + el auto-tagging. Los dos últimos van en paralelo.
export const maxDuration = 60

// Más de 3 fotos no mejoran el copy y sí acercan el request al límite de 60 s.
const MAX_REFERENCE_IMAGES = 3
const IMAGE_FETCH_TIMEOUT_MS = 8_000

interface InlineImage {
  mimeType: string
  data: string
}

/**
 * Baja las fotos del producto y las deja listas para Gemini.
 *
 * Se piden a 1024 px y en JPG: el modelo no necesita el PNG de 4 MB que subió
 * el editor, y el original se come el presupuesto de tiempo del request.
 *
 * Best-effort a propósito: una foto que no baja no puede tumbar la generación
 * del copy. Si no baja ninguna, el prompt simplemente no lleva el bloque de
 * fotos y el resultado es el de antes (solo texto).
 */
async function fetchReferenceImages(
  refs: string[],
  fallbackUrl?: string,
): Promise<InlineImage[]> {
  const urls = refs
    .filter((ref) => typeof ref === 'string' && ref.startsWith('image-'))
    .slice(0, MAX_REFERENCE_IMAGES)
    .map((ref) => urlForImage(ref).width(1024).height(1024).fit('max').format('jpg').quality(80).url())

  // Productos sincronizados desde Mastershop no tienen asset en Sanity: su foto
  // vive en cdn.bemaster.com y es la única referencia disponible.
  if (urls.length === 0 && fallbackUrl) urls.push(fallbackUrl)

  const settled = await Promise.all(
    urls.map(async (url): Promise<InlineImage | null> => {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(IMAGE_FETCH_TIMEOUT_MS) })
        if (!res.ok) return null
        const buffer = await res.arrayBuffer()
        const header = res.headers.get('content-type')?.split(';')[0].trim() ?? ''
        const mimeType = header.startsWith('image/') ? header : 'image/jpeg'
        return { mimeType, data: Buffer.from(buffer).toString('base64') }
      } catch (err) {
        console.error('[generate-product-content] no se pudo bajar una foto de referencia:', url, err)
        return null
      }
    }),
  )

  return settled.filter((img): img is InlineImage => img !== null)
}

export async function POST(request: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY no está configurada.' },
      { status: 500 }
    )
  }

  const { name, shortDescription, category, imageRefs, mastershopImageUrl } = await request.json()

  if (!name || !shortDescription) {
    return NextResponse.json(
      { error: 'Se requieren name y shortDescription.' },
      { status: 400 }
    )
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.8-flash',
    })

    const referenceImages = await fetchReferenceImages(
      Array.isArray(imageRefs) ? imageRefs : [],
      typeof mastershopImageUrl === 'string' ? mastershopImageUrl : undefined,
    )

    // La categoría solo se le pide al modelo cuando el editor no la eligió.
    // Con categoría puesta, sugerirle otra solo gasta tokens: el botón no la usa.
    const systemPrompt =
      SYSTEM_PROMPT +
      buildImageAnalysisBlock(referenceImages.length) +
      (category ? '' : buildCategoryBlock(PRODUCT_CATEGORIES))

    const userPrompt = `Producto: ${name}\n\nDescripción: ${shortDescription}`

    // Sin categoría elegida, la decide JEV (lib/category-classifier.ts), en
    // paralelo con Gemini. La sugerencia de Gemini queda de respaldo si JEV no
    // responde o duda.
    const jevPromise = category ? null : askJev({ name, description: shortDescription })

    // Las fotos van primero y el texto de último: es el orden que recomienda
    // Gemini para que el modelo lea la instrucción con las imágenes ya vistas.
    const promptParts = [
      ...referenceImages.map((image) => ({ inlineData: image })),
      { text: systemPrompt + '\n\n' + userPrompt },
    ]

    // Copy generation y auto-tagging en paralelo: independientes, ambos a Gemini.
    // El tagging es best-effort — si falla, devolvemos [] y no bloquea el copy.
    const copyPromise = model.generateContent({
      contents: [{ role: 'user', parts: promptParts }],
      generationConfig: {
        temperature: PRODUCT_COPY_TEMPERATURE,
      } as any,
    })

    const tagsPromise = (async (): Promise<string[]> => {
      const sanityToken = process.env.SANITY_API_TOKEN
      const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
      const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production'
      const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2025-01-01'
      if (!sanityToken || !projectId) return []
      try {
        const taxonomy = await fetchTagTaxonomy({ projectId, dataset, apiVersion, token: sanityToken })
        return await classifyProductTags(
          taxonomy,
          { name, shortDescription, category },
          process.env.GEMINI_API_KEY!,
        )
      } catch (err) {
        console.error('[generate-product-content] auto-tagging falló (best-effort):', err)
        return []
      }
    })()

    const result = await copyPromise

    // Gemini 3 Flash thinking mode returns both "thought" parts and regular text parts.
    // response.text() throws if there are NO non-thought parts.
    // We manually extract the text from parts to be safe.
    const candidate = result.response.candidates?.[0]
    const parts = candidate?.content?.parts ?? []

    // Filter to get only the actual response text (not thinking tokens)
    const rawText =
      parts
        .filter((p: any) => !p.thought && typeof p.text === 'string' && p.text.trim())
        .map((p: any) => p.text)
        .join('') || result.response.text?.()

    if (!rawText) {
      throw new Error('El modelo no devolvió texto. Intenta de nuevo.')
    }

    // Resolvemos las tags ahora (ya corrieron en paralelo con el copy).
    const tagSlugs = await tagsPromise
    const tags = tagSlugsToReferences(tagSlugs)

    // Strip potential markdown code fences
    const cleanText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    const content = JSON.parse(cleanText)

    // La categoría del modelo se valida contra el catálogo antes de salir: un
    // valor inventado ensucia el dataset igual que los que estamos limpiando.
    const geminiCategory = isProductCategory(content.suggestedCategory) ? content.suggestedCategory : null
    const decision = jevPromise ? decideCategory(await jevPromise, [geminiCategory]) : null
    // «otros» sin respaldo = nadie supo: mejor dejar el campo vacío para que el
    // editor elija que rellenarlo con el cajón de sastre.
    const suggestedCategory = decision && decision.source !== 'otros' ? decision.category : null

    return NextResponse.json({
      ...content,
      suggestedCategory,
      tags,
      imagesAnalyzed: referenceImages.length,
    })
  } catch (error: any) {
    const message = error?.message || error?.toString() || 'Error desconocido'
    console.error('Error generando contenido con Gemini:', message)
    return NextResponse.json(
      { error: `Error al generar contenido: ${message}` },
      { status: 500 }
    )
  }
}
