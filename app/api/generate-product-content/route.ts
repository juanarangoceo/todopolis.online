import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { SYSTEM_PROMPT, PRODUCT_COPY_TEMPERATURE } from '@/lib/product-content-prompt'
import { fetchTagTaxonomy, classifyProductTags, tagSlugsToReferences } from '@/lib/auto-tag'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// El copy + el auto-tagging disparan dos llamadas a Gemini en paralelo.
export const maxDuration = 60

export async function POST(request: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY no está configurada.' },
      { status: 500 }
    )
  }

  const { name, shortDescription, category } = await request.json()

  if (!name || !shortDescription) {
    return NextResponse.json(
      { error: 'Se requieren name y shortDescription.' },
      { status: 400 }
    )
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.5-flash',
    })

    const userPrompt = `Producto: ${name}\n\nDescripción: ${shortDescription}`

    // Copy generation y auto-tagging en paralelo: independientes, ambos a Gemini.
    // El tagging es best-effort — si falla, devolvemos [] y no bloquea el copy.
    const copyPromise = model.generateContent({
      contents: [{ role: 'user', parts: [{ text: SYSTEM_PROMPT + '\n\n' + userPrompt }] }],
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
    const rawText = parts
      .filter((p: any) => !p.thought && typeof p.text === 'string' && p.text.trim())
      .map((p: any) => p.text)
      .join('')

    // Resolvemos las tags ahora (ya corrieron en paralelo con el copy).
    const tagSlugs = await tagsPromise
    const tags = tagSlugsToReferences(tagSlugs)

    if (!rawText) {
      // Fallback: try the standard response.text() in case structure differs
      const fallbackText = result.response.text?.()
      if (!fallbackText) {
        throw new Error('El modelo no devolvió texto. Intenta de nuevo.')
      }
      const cleanFallback = fallbackText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const contentFallback = JSON.parse(cleanFallback)
      return NextResponse.json({ ...contentFallback, tags })
    }

    // Strip potential markdown code fences
    const cleanText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    const content = JSON.parse(cleanText)

    return NextResponse.json({ ...content, tags })
  } catch (error: any) {
    const message = error?.message || error?.toString() || 'Error desconocido'
    console.error('Error generando contenido con Gemini:', message)
    return NextResponse.json(
      { error: `Error al generar contenido: ${message}` },
      { status: 500 }
    )
  }
}
