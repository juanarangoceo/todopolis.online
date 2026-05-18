import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getSanityClient } from '@/lib/sanity/client'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const SYSTEM_PROMPT = `Eres un director creativo de un call center premium con 20 años de experiencia entrenando a las mejores asesoras de venta telefónica de Latinoamérica. Tu trabajo es escribir el guion maestro (system prompt) para una asistente de voz IA en tiempo real llamada "Lucy", anclada a UN solo producto en una tienda colombiana llamada Todopolis.

La asistente hablará por audio con clientes reales. Por eso el prompt debe estar optimizado para una llamada de voz natural, en español colombiano con tuteo, y con foco quirúrgico en cerrar la venta de ESE producto específico.

OBJETIVO: que Lucy conozca el producto a la perfección y guíe al cliente hacia la compra de forma cálida, breve y honesta.

REGLAS DEL PROMPT QUE VAS A ESCRIBIR:

1. IDENTIDAD Y TONO
- Empieza con: "Eres Lucy, asesora especializada en [NOMBRE DEL PRODUCTO] para Todopolis."
- Personalidad: cálida, cercana, segura, colombiana, tuteo, sin formalismos.
- Habla SIEMPRE como si la conversación fuera por teléfono: frases cortas, naturales, sin enumerar largo, sin emojis, sin markdown.

2. CONOCIMIENTO DEL PRODUCTO (la parte más importante)
- Explica con tus palabras qué resuelve el producto, para quién es, cómo se usa, principales beneficios y por qué vale lo que cuesta.
- Incluye precio EXACTO en pesos colombianos (escrito en palabras o cifras, lo que suene mejor en voz).
- Lista al menos 3 objeciones típicas con la respuesta que Lucy debe dar.
- Detalla el envío: doce mil pesos a todo Colombia, contraentrega, 3 a 7 días hábiles.
- Si el producto tiene oferta vigente, mencionarla con urgencia honesta.

3. ESTRUCTURA DE LLAMADA QUE LUCY DEBE SEGUIR
- Saluda corto y pregunta el nombre del cliente.
- Conecta con su dolor o necesidad (qué busca resolver).
- Presenta UN beneficio clave en una sola frase, espera la reacción.
- Maneja la objeción si aparece (con la lista del punto 2).
- Cuando el cliente muestre intención de comprar, llama la herramienta iniciar_pedido y guíalo cálidamente para tomar sus datos.

4. REGLAS ABSOLUTAS PARA LUCY
- Respuestas MUY cortas: una o dos oraciones máximo. NUNCA monólogos.
- Cero emojis, cero asteriscos, cero formato markdown — la respuesta se convierte a voz.
- Si el cliente pregunta por otros productos: con tacto redirige al producto anclado y di "lo mío es ayudarte con [producto]; puedes ver más en la tienda cuando termines la llamada".
- Si no sabe algo concreto, sé honesta: "déjame consultarlo y te confirmamos por WhatsApp al cerrar el pedido".
- Nunca inventes datos, certificaciones ni promesas médicas.
- Nunca digas la palabra "prompt", "IA", "modelo" ni rompas el personaje.

5. HERRAMIENTA DISPONIBLE
- iniciar_pedido(producto_id, producto_nombre, precio) → ábrelo en cuanto el cliente diga "lo quiero", "cómo lo compro", "lo llevo" o equivalente. Anuncia "perfecto, te abro el formulario para tomar tus datos".

FORMATO DE SALIDA:

Responde ÚNICAMENTE con el texto del prompt, listo para pegar como system instructions del modelo de voz. NO uses markdown, NO uses encabezados, NO añadas explicaciones tuyas. Debe leerse como un brief operativo a Lucy, en segunda persona, con párrafos cortos numerados o separados por líneas en blanco. Apunta a 800-1500 palabras de prompt limpio.`

export async function POST(request: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY no está configurada.' },
      { status: 500 }
    )
  }

  const { productId } = await request.json()
  if (!productId) {
    return NextResponse.json({ error: 'Falta productId.' }, { status: 400 })
  }

  try {
    const client = getSanityClient()
    const product = await client.fetch(
      `*[_type == "product" && _id == $id][0] {
        name,
        "slug": slug.current,
        shortDescription,
        price,
        originalPrice,
        category,
        heroTitle,
        heroSubtitle,
        benefits[]{title, description},
        specifications[]{label, value},
        offerName,
        offerEndsAt,
        faqs[]{question, answer}
      }`,
      { id: productId.startsWith('drafts.') ? productId.slice('drafts.'.length) : productId },
    )

    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado.' }, { status: 404 })
    }

    const priceStr = product.price
      ? `$${Number(product.price).toLocaleString('es-CO')} COP`
      : 'precio no definido'

    const offerBlock = product.offerName
      ? `\nOFERTA ACTIVA: ${product.offerName}${product.offerEndsAt ? ` (termina el ${product.offerEndsAt})` : ''}`
      : ''

    const benefitsBlock = Array.isArray(product.benefits) && product.benefits.length
      ? '\nBENEFICIOS:\n' + product.benefits.map((b: any) => `- ${b.title}: ${b.description}`).join('\n')
      : ''

    const specsBlock = Array.isArray(product.specifications) && product.specifications.length
      ? '\nESPECIFICACIONES:\n' + product.specifications.map((s: any) => `- ${s.label}: ${s.value}`).join('\n')
      : ''

    const faqsBlock = Array.isArray(product.faqs) && product.faqs.length
      ? '\nPREGUNTAS FRECUENTES:\n' + product.faqs.map((f: any) => `P: ${f.question}\nR: ${f.answer}`).join('\n\n')
      : ''

    const productBrief = `DATOS DEL PRODUCTO:
Nombre: ${product.name}
Slug (producto_id): ${product.slug}
Categoría: ${product.category ?? 'otros'}
Precio: ${priceStr}${product.originalPrice ? ` (antes $${Number(product.originalPrice).toLocaleString('es-CO')} COP)` : ''}
Hero título: ${product.heroTitle ?? '—'}
Hero subtítulo: ${product.heroSubtitle ?? '—'}
Descripción breve: ${product.shortDescription ?? '—'}${offerBlock}${benefitsBlock}${specsBlock}${faqsBlock}`

    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' })

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: SYSTEM_PROMPT + '\n\n' + productBrief }] }],
      generationConfig: { temperature: 0.9 } as any,
    })

    const candidate = result.response.candidates?.[0]
    const parts = candidate?.content?.parts ?? []

    let raw = parts
      .filter((p: any) => !p.thought && typeof p.text === 'string' && p.text.trim())
      .map((p: any) => p.text)
      .join('')

    if (!raw) {
      raw = result.response.text?.() ?? ''
    }

    const prompt = raw.replace(/```[a-z]*\n?/gi, '').trim()

    if (!prompt) {
      return NextResponse.json({ error: 'El modelo no devolvió texto. Intenta de nuevo.' }, { status: 500 })
    }

    return NextResponse.json({ prompt })
  } catch (error: any) {
    const message = error?.message || error?.toString() || 'Error desconocido'
    console.error('[generate-voice-prompt]', message)
    return NextResponse.json({ error: `Error al generar prompt: ${message}` }, { status: 500 })
  }
}
