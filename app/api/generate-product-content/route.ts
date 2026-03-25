import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const SYSTEM_PROMPT = `Eres un experto en copywriting de ventas y marketing digital para eCommerce latinoamericano.
Tu tarea es generar contenido completo y persuasivo para una landing page de producto basado en:
- El nombre del producto
- La descripción que te proporcionen

REGLAS:
- Usa lenguaje cálido, profesional y conversacional en español (Colombia/Latinoamérica)
- El contenido debe seguir el embudo de ventas AIDA (Atención, Interés, Deseo, Acción)
- Sé específico y evita clichés genéricos
- El heroTitle debe ser magnético y orientado al beneficio, máximo 10 palabras
- Los beneficios deben ser concretos y tangibles
- Los testimonios deben sonar auténticos y naturales
- El CTA final debe generar urgencia sin ser agresivo
- IMPORTANTE: La "improvedDescription" debe ser MUY CORTA. Máximo 3 líneas. Usa emojis al inicio de cada punto. Formato de viñetas con ✅, 🔥, ⭐ o similares. Debe leerse bien en pantalla de celular sin hacer scroll.

Responde ÚNICAMENTE con un JSON válido en este formato exacto, sin markdown ni texto adicional:
{
  "improvedDescription": "string — 2-3 bullet points con emoji, máximo 3 líneas totales, ultra persuasivo y fácil de leer en móvil",
  "heroTitle": "string — máximo 10 palabras, orientado al beneficio",
  "heroSubtitle": "string — 1-2 oraciones que amplíen el título",
  "heroCta": "string — texto del botón, máximo 5 palabras",
  "benefits": [
    { "icon": "emoji", "title": "string", "description": "string — 1-2 oraciones" }
  ],
  "specifications": [
    { "label": "string", "value": "string" }
  ],
  "testimonials": [
    { "name": "nombre colombiano/latinoamericano", "role": "ciudad y rol", "rating": 5, "text": "string — testimonio auténtico de 2-3 oraciones" }
  ],
  "ctaHeadline": "string — título urgente de llamada a la acción",
  "ctaText": "string — 1-2 oraciones de cierre persuasivo"
}

Genera exactamente 4 beneficios, 5 especificaciones y 3 testimonios.`

export async function POST(request: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY no está configurada.' },
      { status: 500 }
    )
  }

  const { name, shortDescription } = await request.json()

  if (!name || !shortDescription) {
    return NextResponse.json(
      { error: 'Se requieren name y shortDescription.' },
      { status: 400 }
    )
  }

  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-3-flash-preview',
    })

    const userPrompt = `Producto: ${name}\n\nDescripción: ${shortDescription}`

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: SYSTEM_PROMPT + '\n\n' + userPrompt }] }],
      generationConfig: {
        temperature: 1.0,
      } as any,
    })

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

    if (!rawText) {
      // Fallback: try the standard response.text() in case structure differs
      const fallbackText = result.response.text?.()
      if (!fallbackText) {
        throw new Error('El modelo no devolvió texto. Intenta de nuevo.')
      }
      const cleanFallback = fallbackText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const contentFallback = JSON.parse(cleanFallback)
      return NextResponse.json(contentFallback)
    }

    // Strip potential markdown code fences
    const cleanText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    const content = JSON.parse(cleanText)

    return NextResponse.json(content)
  } catch (error: any) {
    const message = error?.message || error?.toString() || 'Error desconocido'
    console.error('Error generando contenido con Gemini:', message)
    return NextResponse.json(
      { error: `Error al generar contenido: ${message}` },
      { status: 500 }
    )
  }
}
