import { NextRequest } from 'next/server'
import { getSanityClient } from '@/lib/sanity/client'

const FOOTER_RULES = `

REGLAS OPERATIVAS (no negociables):
- Responde en español colombiano con tuteo natural.
- Una o dos oraciones máximo por turno. Habla como en una llamada real.
- Cero emojis, cero asteriscos, cero markdown — todo se convierte a voz.
- No menciones que eres una IA, un modelo o un prompt. Eres Lucy.
- Solo conoces este producto. Si preguntan por otro, redirige con amabilidad: "lo mío es ayudarte con este; cuando termines puedes ver más en la tienda".
- Envío: doce mil pesos a todo Colombia, contraentrega, 3 a 7 días hábiles.
- Cuando el cliente diga "lo quiero", "lo llevo", "cómo lo compro" o equivalente, llama de inmediato la herramienta iniciar_pedido con producto_id, producto_nombre y precio EXACTOS del producto anclado.`

type VoiceAssistant = {
  prompt: string
  greeting: string | null
  voice: string | null
  product: {
    slug: string
    name: string
    price: number | null
  } | null
}

// Cache en memoria por slug. La primera llamada paga el fetch a Sanity; las
// siguientes mientras dure la instancia arrancan al instante.
const assistantCache = new Map<string, { data: VoiceAssistant; expires: number }>()
const ASSISTANT_TTL_MS = 5 * 60 * 1000

async function loadAssistant(slug: string): Promise<VoiceAssistant | null> {
  const cached = assistantCache.get(slug)
  if (cached && cached.expires > Date.now()) return cached.data

  try {
    const client = getSanityClient()
    const data: VoiceAssistant | null = await client.fetch(
      `*[_type == "voiceAssistant" && enabled == true && product->slug.current == $slug][0] {
        prompt,
        greeting,
        voice,
        "product": product-> {
          "slug": slug.current,
          name,
          price
        }
      }`,
      { slug },
    )
    if (data) {
      assistantCache.set(slug, { data, expires: Date.now() + ASSISTANT_TTL_MS })
    }
    return data
  } catch (err) {
    console.error('[voice-session] error cargando asistente:', err)
    return null
  }
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'OPENAI_API_KEY no configurado' }, { status: 500 })
  }

  let body: { productSlug?: string } = {}
  try { body = await request.json() } catch { /* ignore */ }
  const slug = body.productSlug?.trim()
  if (!slug) {
    return Response.json({ error: 'Falta productSlug' }, { status: 400 })
  }

  const assistant = await loadAssistant(slug)
  if (!assistant || !assistant.product) {
    return Response.json(
      { error: 'No hay asistente de voz configurado para este producto.' },
      { status: 404 },
    )
  }

  const product = assistant.product
  const priceLine = product.price
    ? `\n\nPRECIO OFICIAL DEL PRODUCTO: $${Number(product.price).toLocaleString('es-CO')} COP.`
    : ''
  const greetingLine = assistant.greeting
    ? `\n\nSALUDO INICIAL OBLIGATORIO (di esta frase como primer turno, adaptándola con naturalidad): "${assistant.greeting}"`
    : ''

  const instructions = `${assistant.prompt}${priceLine}${greetingLine}${FOOTER_RULES}\n\nPRODUCTO ANCLADO:\n- producto_id (slug exacto a usar en iniciar_pedido): ${product.slug}\n- producto_nombre: ${product.name}\n- precio (COP): ${product.price ?? 'consultar'}`

  const tools = [
    {
      type: 'function',
      name: 'iniciar_pedido',
      description: 'Abre el formulario de compra en pantalla con los datos del producto anclado. Úsalo en cuanto el cliente diga que quiere comprar.',
      parameters: {
        type: 'object',
        properties: {
          producto_id: { type: 'string', description: 'Slug exacto del producto anclado' },
          producto_nombre: { type: 'string' },
          precio: { type: 'number', description: 'Precio en COP sin envío' },
        },
        required: ['producto_id', 'producto_nombre', 'precio'],
      },
    },
  ]

  const res = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      session: {
        type: 'realtime',
        model: 'gpt-realtime',
        audio: {
          input: {
            transcription: { model: 'whisper-1' },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 200,
              silence_duration_ms: 400,
            },
          },
          output: { voice: assistant.voice ?? 'shimmer', speed: 1.1 },
        },
        instructions,
        tools,
        tool_choice: 'auto',
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[voice-session] OpenAI error:', err)
    return Response.json({ error: `OpenAI: ${err}` }, { status: res.status })
  }

  const data = await res.json()
  return Response.json({
    client_secret: { value: data.value },
    product: {
      id: product.slug,
      nombre: product.name,
      precio: product.price ?? 0,
    },
  })
}
