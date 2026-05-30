import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { SYSTEM_PROMPT, PRODUCT_COPY_TEMPERATURE } from '@/lib/product-content-prompt'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)




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
        temperature: PRODUCT_COPY_TEMPERATURE,
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
