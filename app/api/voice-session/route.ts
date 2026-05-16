export const runtime = 'edge'

const SYSTEM_PROMPT = `Eres Lucy, la asesora de ventas de Todopolis, una tienda colombiana con productos para el hogar, tecnología, moda, belleza, deportes, juguetes y más. Tu personalidad es cálida, cercana y profesional. Hablas en español colombiano con tuteo natural.

OBJETIVO: Ayudar al cliente a encontrar el producto ideal y cerrar la venta de forma honesta y amigable.

REGLAS:
1. Siempre tutea al cliente. Nunca uses "usted" a menos que el cliente lo pida.
2. Cuando menciones un producto específico, SIEMPRE llama mostrar_producto para que el cliente lo vea en pantalla.
3. Si no tienes información de un producto, usa buscar_productos para buscarlo en tiempo real en el catálogo.
4. Cuando el cliente quiera comprar, llama iniciar_pedido de inmediato.
5. Siempre menciona: el envío cuesta doce mil pesos colombianos y el pago es contraentrega, es decir, pagas cuando recibes.
6. Respuestas cortas y naturales: máximo dos o tres oraciones por turno.
7. No uses emojis ni signos especiales en voz.
8. Si el cliente pregunta por algo que no encuentras, sé honesta y ofrece alternativas similares.
9. Tiempo de entrega estimado: tres a siete días hábiles a todo Colombia.`

const TOOLS = [
  {
    type: 'function',
    name: 'mostrar_producto',
    description: 'Muestra un producto en pantalla para que el cliente lo vea mientras hablan',
    parameters: {
      type: 'object',
      properties: {
        producto_id: { type: 'string', description: 'Slug único del producto' },
        producto_nombre: { type: 'string', description: 'Nombre del producto' },
        producto_precio: { type: 'number', description: 'Precio en COP' },
        producto_imagen: { type: 'string', description: 'URL de la imagen' },
        producto_descripcion: { type: 'string', description: 'Descripción breve' },
      },
      required: ['producto_id', 'producto_nombre', 'producto_precio'],
    },
  },
  {
    type: 'function',
    name: 'buscar_productos',
    description: 'Busca productos en el catálogo de Todopolis por nombre, categoría o descripción',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Término de búsqueda' },
      },
      required: ['query'],
    },
  },
  {
    type: 'function',
    name: 'iniciar_pedido',
    description: 'Abre el formulario de compra para que el cliente haga su pedido',
    parameters: {
      type: 'object',
      properties: {
        producto_id: { type: 'string' },
        producto_nombre: { type: 'string' },
        precio: { type: 'number', description: 'Precio en COP sin envío' },
      },
      required: ['producto_id', 'producto_nombre', 'precio'],
    },
  },
]

export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'OPENAI_API_KEY no configurado' }), { status: 500 })
  }

  const res = await fetch('https://api.openai.com/v1/realtime/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-realtime-preview',
      voice: 'shimmer',
      modalities: ['audio', 'text'],
      instructions: SYSTEM_PROMPT,
      input_audio_transcription: { model: 'whisper-1' },
      turn_detection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 700,
      },
      tools: TOOLS,
      tool_choice: 'auto',
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[voice-session] OpenAI error:', err)
    return Response.json({ error: `OpenAI: ${err}` }, { status: res.status })
  }

  const data = await res.json()
  return Response.json({
    client_secret: data.client_secret,
    session_id: data.id,
  })
}
