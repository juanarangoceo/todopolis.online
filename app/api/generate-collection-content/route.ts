import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { SYSTEM_PROMPT, COLLECTION_COPY_TEMPERATURE } from '@/lib/collection-content-prompt'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

interface CollectionProductInput {
  name: string
  shortDescription?: string
  price?: number
  category?: string
  specifications?: { label: string; value: string }[]
}

function formatProductsForPrompt(products: CollectionProductInput[]): string {
  return products
    .map((p, i) => {
      const specs = Array.isArray(p.specifications) && p.specifications.length
        ? '\n  Especificaciones: ' +
          p.specifications.map((s) => `${s.label}: ${s.value}`).join(' | ')
        : ''
      const price = typeof p.price === 'number' ? `\n  Precio: $ ${p.price.toLocaleString('es-CO')}` : ''
      const cat = p.category ? `\n  Categoría: ${p.category}` : ''
      const desc = p.shortDescription ? `\n  Descripción: ${p.shortDescription}` : ''
      return `Producto ${i + 1}: ${p.name}${price}${cat}${desc}${specs}`
    })
    .join('\n\n')
}

export async function POST(request: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY no está configurada.' },
      { status: 500 }
    )
  }

  const { segmentHint, products } = await request.json()

  if (!Array.isArray(products) || products.length < 3) {
    return NextResponse.json(
      { error: 'Se requieren al menos 3 productos.' },
      { status: 400 }
    )
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.5-flash',
    })

    const segmentLine = segmentHint
      ? `Segmento: ${segmentHint}\n\n`
      : ''
    const userPrompt = `${segmentLine}Productos de la colección (en orden):\n\n${formatProductsForPrompt(products)}`

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: SYSTEM_PROMPT + '\n\n' + userPrompt }] }],
      generationConfig: {
        temperature: COLLECTION_COPY_TEMPERATURE,
      } as any,
    })

    // Gemini thinking mode devuelve "thought" parts además del texto real.
    // response.text() lanza si NO hay partes no-thought; extraemos manualmente.
    const candidate = result.response.candidates?.[0]
    const parts = candidate?.content?.parts ?? []

    const rawText = parts
      .filter((p: any) => !p.thought && typeof p.text === 'string' && p.text.trim())
      .map((p: any) => p.text)
      .join('')

    if (!rawText) {
      const fallbackText = result.response.text?.()
      if (!fallbackText) {
        throw new Error('El modelo no devolvió texto. Intenta de nuevo.')
      }
      const cleanFallback = fallbackText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      return NextResponse.json(JSON.parse(cleanFallback))
    }

    const cleanText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const content = JSON.parse(cleanText)

    return NextResponse.json(content)
  } catch (error: any) {
    const message = error?.message || error?.toString() || 'Error desconocido'
    console.error('Error generando contenido de colección con Gemini:', message)
    return NextResponse.json(
      { error: `Error al generar contenido: ${message}` },
      { status: 500 }
    )
  }
}
