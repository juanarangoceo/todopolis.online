import { authorizeEditorialRequest } from '@/lib/ai/authorize'
import { NextRequest, NextResponse } from 'next/server'
import { createUsageCollector } from '@/lib/ai/usage'
import { createEditorialModel } from '@/lib/ai/gemini'
import { SYSTEM_PROMPT, COLLECTION_COPY_TEMPERATURE } from '@/lib/collection-content-prompt'

export const maxDuration = 120

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
  const denied = await authorizeEditorialRequest(request)
  if (denied) return denied
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY no está configurada.' },
      { status: 500 }
    )
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  const { segmentHint, products } = body

  if (!Array.isArray(products) || products.length < 3 || products.length > 6 || !products.every((p) => p && typeof p.name === 'string' && p.name.trim() && (p.shortDescription == null || typeof p.shortDescription === 'string') && (p.specifications == null || (Array.isArray(p.specifications) && p.specifications.every((s: { label?: unknown; value?: unknown } | null) => s && typeof s.label === 'string' && typeof s.value === 'string'))))) {
    return NextResponse.json(
      { error: 'Se requieren entre 3 y 6 productos con datos válidos.' },
      { status: 400 }
    )
  }

  const usage = createUsageCollector(`collection:${crypto.randomUUID()}`)
  try {
    const model = createEditorialModel({ source: 'collection', onUsage: usage.sink })

    const segmentLine = segmentHint
      ? `Segmento: ${segmentHint}\n\n`
      : ''
    const userPrompt = `${segmentLine}Productos de la colección (en orden):\n\n${formatProductsForPrompt(products)}`

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: SYSTEM_PROMPT + '\n\n' + userPrompt }] }],
      generationConfig: {
        temperature: COLLECTION_COPY_TEMPERATURE,
      },
    })
    return NextResponse.json(JSON.parse(result.response.text()))
  } catch (error: any) {
    const message = error?.message || error?.toString() || 'Error desconocido'
    console.error('Error generando contenido de colección con Gemini:', message)
    return NextResponse.json(
      { error: `Error al generar contenido: ${message}` },
      { status: 500 }
    )
  } finally {
    await usage.flush()
  }
}
