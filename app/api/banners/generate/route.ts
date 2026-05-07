import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { GoogleGenerativeAI } from '@google/generative-ai'

const SYSTEM_PROMPT = `Eres un Director Creativo experto en E-commerce.
Tu tarea es analizar una lista de productos y crear un concepto para un Banner Promocional unificador.
El objetivo es vender estos productos agrupándolos bajo un estilo de vida o necesidad (Ej: "Hogar Acogedor", "Rutina de Belleza Perfecta", "Entrenamiento de Élite").

REGLAS:
1. title: Máximo 4-5 palabras. Muy persuasivo.
2. subtitle: Máximo 6-8 palabras. Explica el beneficio.
3. backgroundColor: Un color en formato HEX. Debe ser un color pastel MUY suave y elegante que transmita limpieza y modernidad (ej: #F0F9FF, #FFF1F2, #F0FDF4, #FDF4FF, #FFFBEB). NUNCA uses colores oscuros o saturados.

Responde ÚNICAMENTE con un JSON válido, sin markdown:
{
  "title": "Título del Banner",
  "subtitle": "Subtítulo del Banner",
  "backgroundColor": "#HEXCOLOR"
}`

export async function POST(request: NextRequest) {
  const geminiKey = process.env.GEMINI_API_KEY
  const sanityToken = process.env.SANITY_API_TOKEN
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production'
  const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2025-01-01'
  const adminPassword = process.env.ADMIN_DASHBOARD_PASSWORD

  if (!geminiKey || !sanityToken || !projectId) {
    return NextResponse.json({ error: 'Configuración incompleta en .env' }, { status: 500 })
  }

  let body: { password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  if (adminPassword && body.password !== adminPassword) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    // 1. Fetch 3 random products from Sanity
    const query = encodeURIComponent(`*[_type == "product" && defined(mastershopImageUrl)][0...10]{ _id, name, shortDescription, category }`)
    const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${query}`
    
    const sanityRes = await fetch(url)
    const sanityData = await sanityRes.json()
    
    if (!sanityData.result || sanityData.result.length === 0) {
      return NextResponse.json({ error: 'No hay productos en Sanity para generar un banner' }, { status: 400 })
    }

    // Shuffle and pick 3
    const shuffled = sanityData.result.sort(() => 0.5 - Math.random())
    const selectedProducts = shuffled.slice(0, 3)

    // 2. Ask Gemini for the copy
    const genAI = new GoogleGenerativeAI(geminiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const promptText = `
Productos seleccionados:
${selectedProducts.map((p: any) => `- ${p.name} (${p.category}): ${p.shortDescription}`).join('\n')}
`
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: promptText }] }],
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: { temperature: 0.8 },
    })

    const rawText = result.response.text()
    if (!rawText) throw new Error('Gemini no devolvió contenido')

    const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim()
    const ai = JSON.parse(cleanJson)

    // 3. Create or update the HeroBanner document in Sanity
    // We will use a fixed ID so there's always only one active banner
    const bannerId = 'dynamic-hero-banner'

    const sanityDoc = {
      _id: bannerId,
      _type: 'heroBanner',
      title: ai.title,
      subtitle: ai.subtitle,
      backgroundColor: ai.backgroundColor,
      products: selectedProducts.map((p: any) => ({
        _type: 'reference',
        _ref: p._id,
        _key: p._id
      }))
    }

    const mutateUrl = `https://${projectId}.api.sanity.io/v${apiVersion}/data/mutate/${dataset}`
    const mutateRes = await fetch(mutateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sanityToken}`,
      },
      body: JSON.stringify({ mutations: [{ createOrReplace: sanityDoc }] }),
    })

    if (!mutateRes.ok) {
      const err = await mutateRes.text()
      console.error('Error mutating sanity:', err)
      throw new Error('Error al guardar en Sanity')
    }

    // Force Next.js cache revalidation for the heroBanner
    revalidateTag('heroBanner', 'max')

    return NextResponse.json({ success: true, banner: sanityDoc })

  } catch (error: any) {
    console.error('Banner Generation Error:', error)
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
  }
}
