import { getSanityClient } from '@/lib/sanity/client'

const BASE_PROMPT = `Eres Lucy, la asesora de ventas de Todopolis, una tienda colombiana con productos para el hogar, tecnología, moda, belleza, deportes, juguetes y más. Tu personalidad es cálida, cercana y profesional. Hablas en español colombiano con tuteo natural.

OBJETIVO: Ayudar al cliente a encontrar el producto ideal y cerrar la venta de forma honesta y amigable.

REGLAS:
1. Siempre tutea al cliente. Nunca uses "usted" a menos que el cliente lo pida.
2. Cuando menciones un producto específico, SIEMPRE llama mostrar_producto para que el cliente lo vea en pantalla. Usa el slug, nombre, precio e imagen EXACTOS del catálogo de abajo.
3. Si el cliente pide algo que no aparece en el catálogo de abajo, igual llama buscar_productos antes de afirmar que no existe — puede haber variantes o sinónimos. Prueba con términos en singular y plural y sin tildes.
4. Cuando el cliente quiera comprar, llama iniciar_pedido de inmediato.
5. Siempre menciona: el envío cuesta doce mil pesos colombianos y el pago es contraentrega, es decir, pagas cuando recibes.
6. Respuestas cortas y naturales: máximo dos o tres oraciones por turno.
7. No uses emojis ni signos especiales en voz.
8. Si el cliente pregunta por algo que realmente no encuentras, sé honesta y ofrece alternativas similares del catálogo.
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

type CatalogProduct = {
  slug: string
  name: string
  price: number | null
  category: string | null
  imagen: string | null
  isNew: boolean | null
  isBestSeller: boolean | null
}

async function loadCatalog(): Promise<CatalogProduct[]> {
  try {
    const client = getSanityClient()
    const products: CatalogProduct[] = await client.fetch(
      `*[_type == "product" && category != "bienestar-intimo" && defined(slug.current)] | order(isBestSeller desc, isNew desc, _createdAt desc) {
        "slug": slug.current,
        name,
        price,
        category,
        isNew,
        isBestSeller,
        "imagen": coalesce(mastershopImageUrl, images[0].asset->url)
      }`,
    )
    return products
  } catch (err) {
    console.error('[voice-session] error cargando catálogo:', err)
    return []
  }
}

function buildCatalogContext(products: CatalogProduct[]): string {
  if (products.length === 0) return ''

  const categories = Array.from(
    new Set(products.map((p) => p.category).filter(Boolean)),
  ) as string[]

  const lines = products.map((p) => {
    const tags = [
      p.isBestSeller ? 'MÁS VENDIDO' : null,
      p.isNew ? 'NUEVO' : null,
    ]
      .filter(Boolean)
      .join(', ')
    const precio = p.price ? `$${Number(p.price).toLocaleString('es-CO')} COP` : 'precio s/d'
    return `- ${p.name} | slug:${p.slug} | ${precio} | cat:${p.category ?? 'otros'}${tags ? ` | ${tags}` : ''} | img:${p.imagen ?? ''}`
  })

  return `\n\nCATEGORÍAS DISPONIBLES: ${categories.join(', ')}.\n\nCATÁLOGO COMPLETO (${products.length} productos). Usa el slug, nombre, precio e imagen EXACTOS cuando llames mostrar_producto:\n${lines.join('\n')}`
}

export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'OPENAI_API_KEY no configurado' }, { status: 500 })
  }

  const catalog = await loadCatalog()
  const instructions = BASE_PROMPT + buildCatalogContext(catalog)

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
              prefix_padding_ms: 300,
              silence_duration_ms: 700,
            },
          },
          output: { voice: 'shimmer' },
        },
        instructions,
        tools: TOOLS,
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
  return Response.json({ client_secret: { value: data.value } })
}
