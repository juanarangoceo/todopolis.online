import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { generateAndSaveArticle } from '@/lib/generate-article'

// Allow up to 60s — import includes AI generation + Sanity write
export const maxDuration = 60

const MS_BASE = 'https://prod.api.mastershop.com/api'

// ─── Category mapping Mastershop → Sanity ────────────────────────────────────
const CATEGORY_MAP: Record<string, string> = {
  'Salud, belleza y cuidado personal': 'belleza',
  'Hogar, Muebles, Cocina': 'hogar',
  'Tecnología y electrodomésticos': 'electronica',
  'Tecnología y electrodomesticos': 'electronica',
  'Moda, Ropa y Accesorios': 'moda',
  'Relojes y Joyas': 'accesorios',
  'Animales y Mascotas': 'otros',
  'Bebés, juegos y juguetes': 'juguetes',
  'Deportes y Fitness': 'deportes',
  Vehículos: 'otros',
  'Librerías y papelería': 'otros',
  Herramientas: 'otros',
  Otros: 'otros',
  'Adultos': 'bienestar-intimo',
  'Eróticos': 'bienestar-intimo',
  'Bienestar sexual': 'bienestar-intimo',
  'Juguetes adultos': 'bienestar-intimo',
  'Lencería': 'bienestar-intimo',
}

// ─── AI System Prompt ─────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Eres el mejor copywriter de ventas de América Latina. Llevas 15 años creando landing pages de alta conversión para e-commerce en Colombia, México y toda la región. Tu escritura combina la calidez latina con técnicas probadas de persuasión: storytelling, triggers psicológicos y el método PAS (Problema → Agitación → Solución).

CONTEXTO DE LA TIENDA:
Todopolis es una tienda online colombiana enfocada en productos de calidad con entrega rápida. El cliente ideal es una persona entre 25-45 años que busca soluciones reales a problemas concretos, valora la relación calidad-precio y necesita sentir confianza antes de comprar. Toma decisiones emocionales justificadas con lógica.

─── FRAMEWORK DE ESCRITURA ───────────────────────────────────────────────────

1. MÉTODO PAS EMOCIONAL
   - PROBLEMA: Identifica el dolor específico que resuelve el producto (no el producto en sí)
   - AGITACIÓN: Intensifica ese dolor con lenguaje empático que haga al lector decir "¡eso me pasa a mí!"
   - SOLUCIÓN: Presenta el producto como la transformación inevitable, no como una compra

2. TRIGGERS PSICOLÓGICOS (úsalos con sutileza, no de forma agresiva)
   - Prueba social: nombres y ciudades reales de Colombia en los testimonios
   - Autoridad: menciona si aplica datos, certificaciones, tiempo en el mercado
   - Escasez percibida: lenguaje que implique demanda alta sin mentir
   - Identidad: conecta el producto con quién quiere SER el cliente, no solo qué quiere TENER
   - Microcompromiso: el CTA debe pedir el menor paso posible ("Ver mi pedido" > "Comprar ahora")

3. NARRATIVA DE TRANSFORMACIÓN
   - Antes: cómo se sentía la persona SIN el producto
   - Después: cómo se siente CON el producto (sensaciones concretas, no abstractas)
   - Los beneficios son resultados, no características. Nunca digas "tiene X función", di "gracias a X lograrás Y"

─── REGLAS DE REDACCIÓN ────────────────────────────────────────────────────

HERO TITLE:
- Máximo 8 palabras. Orientado al resultado final, no al producto
- Formato: [Resultado deseado] + [sin/con + obstáculo/ventaja]
- Ejemplos buenos: "Duerme profundo sin pastillas ni ruido" / "Cuida tu piel como experta desde casa"
- Ejemplos malos: "Producto de alta calidad para el hogar" / "El mejor suplemento del mercado"

HERO SUBTITLE:
- 2 oraciones. Primera: amplía el beneficio principal. Segunda: prueba social o credibilidad
- Tono cálido, como si lo dijera una amiga que ya lo usó

NOMBRE ESTRATÉGICO (improvedName):
- Toma el nombre original del producto y mejóralo para que sea muy atractivo, persuasivo y descriptivo.
- Ej: En vez de "GAS PIMIENTA", usa "Gas Pimienta de Defensa Personal - Ultra Rápido y Seguro" o "Protector Personal en Spray (Gas Pimienta) - Máxima Seguridad".
- No inventes marcas que no existen. Debe sonar premium pero no engañoso. Máximo 6-8 palabras.

DESCRIPCIÓN MEJORADA (improvedDescription):
- Exactamente 3 bullet points con emoji al inicio
- Cada punto = 1 beneficio concreto con resultado específico
- Usa ✅ 🔥 ⭐ 💪 🧬 🌿 según el tono del producto
- Máximo 12 palabras por punto — debe leerse en 3 segundos en celular

BENEFICIOS (4 en total):
- Título: resultado concreto en 3-5 palabras
- Descripción: 2 oraciones. Primera explica el resultado. Segunda conecta con emoción o identidad
- Cada beneficio debe ser diferente al anterior (no repitas la misma idea con otras palabras)

ESPECIFICACIONES (5 en total):
- Mezcla datos técnicos reales con características de uso
- Incluye siempre: material/composición, dimensiones/cantidad, compatibilidad/uso, garantía, una especificación diferenciadora

TESTIMONIOS (3 en total):
- Deben contar una HISTORIA CORTA de transformación (situación antes → resultado después)
- Nombres colombianos reales y variados (hombre/mujer, diferentes ciudades: Bogotá, Medellín, Cali, Barranquilla, Bucaramanga)
- Menciona un detalle específico que haga el testimonio creíble (tiempo de uso, ocasión concreta)
- Rating: el primero 5 estrellas, el segundo 5 estrellas, el tercero 4 estrellas (más realismo)
- Tono: como un mensaje de WhatsApp a un familiar, no como una reseña corporativa

CTA HEADLINE:
- Crea urgencia real (stock limitado, oferta por tiempo) sin mentir
- Formato: pregunta o afirmación directa que conecte con el deseo principal

CTA TEXT:
- 2 oraciones. Primera refuerza el beneficio principal. Segunda reduce el miedo a comprar
- Menciona garantía, envío o facilidad de compra si aplica

PREGUNTAS FRECUENTES (faqs, exactamente 5):
- Preguntas reales que un comprador colombiano haría antes de pagar
- Mezcla estratégica: (1) cómo se usa / aplica, (2) para quién es ideal, (3) garantía o soporte, (4) tiempo de entrega o envío, (5) resultado esperado o diferenciador vs productos similares
- Respuestas directas y tranquilizadoras en 2-3 oraciones máximo
- Las preguntas en formato interrogativo con ¿? — deben sonar naturales, como si alguien las escribiera en Google o le preguntara a ChatGPT
- Complementan los beneficios y specs, no los repiten

─── FORMATO DE SALIDA ──────────────────────────────────────────────────────

Responde ÚNICAMENTE con JSON válido, sin markdown, sin texto adicional, sin comentarios:
{
  "improvedName": "Nombre estratégico y premium del producto",
  "improvedDescription": "✅ Bullet 1 concreto y poderoso\\n🔥 Bullet 2 con resultado específico\\n⭐ Bullet 3 que conecta con identidad",
  "heroTitle": "Título máximo 8 palabras orientado al resultado",
  "heroSubtitle": "Primera oración amplía beneficio. Segunda da prueba social o credibilidad.",
  "heroCta": "Texto botón máximo 4 palabras",
  "benefits": [
    { "icon": "emoji", "title": "Resultado en 3-5 palabras", "description": "Oración de resultado + oración emocional." },
    { "icon": "emoji", "title": "Resultado diferente al anterior", "description": "Oración de resultado + oración emocional." },
    { "icon": "emoji", "title": "Tercer resultado único", "description": "Oración de resultado + oración emocional." },
    { "icon": "emoji", "title": "Cuarto resultado único", "description": "Oración de resultado + oración emocional." }
  ],
  "specifications": [
    { "label": "Etiqueta técnica", "value": "Valor específico y real" },
    { "label": "Etiqueta técnica", "value": "Valor específico y real" },
    { "label": "Etiqueta técnica", "value": "Valor específico y real" },
    { "label": "Etiqueta técnica", "value": "Valor específico y real" },
    { "label": "Etiqueta técnica", "value": "Valor específico y real" }
  ],
  "testimonials": [
    { "name": "Nombre colombiano", "role": "Ciudad · ocupación o contexto", "rating": 5, "text": "Historia corta: situación antes → resultado concreto después. Detalle específico creíble." },
    { "name": "Nombre colombiano diferente", "role": "Ciudad diferente · contexto", "rating": 5, "text": "Historia corta con detalle específico de tiempo o uso." },
    { "name": "Nombre colombiano diferente", "role": "Ciudad diferente · contexto", "rating": 4, "text": "Historia positiva con una pequeña crítica constructiva que aumente credibilidad." }
  ],
  "ctaHeadline": "Titular de urgencia o conexión con deseo principal",
  "ctaText": "Oración de beneficio final. Oración que reduce el miedo o fricción de compra.",
  "faqs": [
    { "question": "¿Pregunta real que haría un comprador colombiano?", "answer": "Respuesta directa y tranquilizadora en 2-3 oraciones." },
    { "question": "¿Segunda pregunta relevante?", "answer": "Respuesta directa." },
    { "question": "¿Tercera pregunta?", "answer": "Respuesta directa." },
    { "question": "¿Cuarta pregunta?", "answer": "Respuesta directa." },
    { "question": "¿Quinta pregunta?", "answer": "Respuesta directa." }
  ]
}`


export async function POST(request: NextRequest) {
  const apiKey = process.env.MASTERSHOP_API_KEY
  const geminiKey = process.env.GEMINI_API_KEY
  const sanityToken = process.env.SANITY_API_TOKEN
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production'
  const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2025-01-01'

  if (!apiKey || !geminiKey || !sanityToken || !projectId) {
    return NextResponse.json({ error: 'Configuración incompleta en .env' }, { status: 500 })
  }

  let body: { idProduct: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { idProduct } = body
  if (!idProduct) {
    return NextResponse.json({ error: 'Se requiere idProduct' }, { status: 400 })
  }

  try {
    // ── STEP 0: Idempotency check — abort if already imported ─────────────────
    const existsQuery = encodeURIComponent(
      `*[_type == "product" && mastershopId == ${idProduct}][0]{ _id, name, slug }`
    )
    const existsUrl = `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${existsQuery}`
    const existsRes = await fetch(existsUrl, {
      headers: { Authorization: `Bearer ${sanityToken}` },
    })
    if (existsRes.ok) {
      const existsData = await existsRes.json()
      if (existsData.result?._id) {
        const existing = existsData.result
        return NextResponse.json(
          {
            success: true,
            alreadyImported: true,
            sanityId: existing._id,
            name: existing.name,
            slug: existing.slug?.current ?? '',
            studioUrl: `https://todopolis.online/studio/desk/product;${existing._id}`,
          },
          { status: 200 }
        )
      }
    }

    // ── STEP 1: Fetch product detail from Mastershop ──────────────────────────
    const msRes = await fetch(`${MS_BASE}/products/${idProduct}`, {
      headers: { 'ms-api-key': apiKey },
    })
    if (!msRes.ok) {
      return NextResponse.json(
        { error: `Mastershop no encontró el producto ${idProduct} (${msRes.status})` },
        { status: msRes.status }
      )
    }
    const msProduct = await msRes.json()

    // Mastershop returns the product wrapped in a 'results' array
    const p = msProduct.results?.[0] ?? msProduct.result ?? msProduct

    const name: string = p.name ?? `Producto ${idProduct}`
    const description: string = p.description ?? ''
    const basePrice: number = p.basePrice ?? p.variation?.[0]?.price ?? 0
    const suggestedPrice: number = p.suggestedPrice ?? 0
    const imageUrl: string | null = p.urlImageProduct ?? null
    const categoryRaw: string = p.prodFormatName ?? ''
    const category = CATEGORY_MAP[categoryRaw] ?? 'otros'

    // ── STEP 2: Generate AI content with Gemini ───────────────────────────────
    const genAI = new GoogleGenerativeAI(geminiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const userPrompt = `Producto: ${name}\n\nDescripción: ${description || name}`

    const aiResult = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: SYSTEM_PROMPT + '\n\n' + userPrompt }] }],
      generationConfig: { temperature: 1.0 } as any,
    })

    // Extract text safely (handles thinking models)
    const candidate = aiResult.response.candidates?.[0]
    const parts = candidate?.content?.parts ?? []
    const rawText =
      parts
        .filter((part: any) => !part.thought && typeof part.text === 'string' && part.text.trim())
        .map((part: any) => part.text)
        .join('') || aiResult.response.text?.()

    if (!rawText) throw new Error('Gemini no devolvió contenido')

    // ── STEP 3: Parse AI JSON response ───────────────────────────────────────
    let ai: any = {}
    try {
      // Remove backticks/markdown from JSON response if present
      const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim()
      ai = JSON.parse(cleanJson)
    } catch (err) {
      console.error('Error parsing AI JSON:', err, rawText)
      throw new Error('La IA no devolvió un JSON válido')
    }

    // Determine final name
    const finalName = ai.improvedName || name

    // Auto-generate a slug from the final name
    const slug = finalName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
      .substring(0, 96)

    // ── STEP 4: Create document in Sanity ────────────────────────────────────
    // Calculate strategic price based on profitability rules
    const rawPrice = basePrice || suggestedPrice || 0
    let markup = 1.3 // 30% for expensive items
    if (rawPrice < 50000) markup = 1.7 // 70% for cheap items
    else if (rawPrice < 150000) markup = 1.5 // 50% for mid-range items
    
    const calculatedPrice = rawPrice * markup
    // Strategic rounding to nearest 900 (e.g., 34900)
    const strategicPrice = rawPrice > 0 ? Math.max(0, Math.floor(calculatedPrice / 1000) * 1000 + 900) : 0

    const sanityDoc = {
      _type: 'product',
      mastershopId: idProduct,
      mastershopImageUrl: imageUrl,
      name: finalName,
      slug: { _type: 'slug', current: slug },
      shortDescription: ai.improvedDescription ?? description,
      price: strategicPrice,
      // originalPrice intentionally omitted to not show offers
      category,
      isNew: true,
      isBestSeller: false,
      // Landing page content (AI generated)
      heroTitle: ai.heroTitle ?? '',
      heroSubtitle: ai.heroSubtitle ?? '',
      heroCta: ai.heroCta ?? 'Comprar ahora',
      benefits: (ai.benefits ?? []).map((b: any) => ({
        _type: 'benefit',
        _key: Math.random().toString(36).substring(2, 9),
        icon: b.icon,
        title: b.title,
        description: b.description,
      })),
      specifications: (ai.specifications ?? []).map((s: any) => ({
        _type: 'specification',
        _key: Math.random().toString(36).substring(2, 9),
        label: s.label,
        value: s.value,
      })),
      testimonials: (ai.testimonials ?? []).map((t: any) => ({
        _type: 'testimonial',
        _key: Math.random().toString(36).substring(2, 9),
        name: t.name,
        role: t.role,
        text: t.text,
        rating: Number(t.rating ?? 5),
      })),
      ctaHeadline: ai.ctaHeadline ?? '',
      ctaText: ai.ctaText ?? '',
      faqs: (ai.faqs ?? []).map((f: any) => ({
        _type: 'faq',
        _key: Math.random().toString(36).substring(2, 9),
        question: f.question,
        answer: f.answer,
      })),
    }

    const mutateUrl = `https://${projectId}.api.sanity.io/v${apiVersion}/data/mutate/${dataset}`
    const mutateRes = await fetch(mutateUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sanityToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mutations: [{ create: sanityDoc }],
      }),
    })

    if (!mutateRes.ok) {
      const errText = await mutateRes.text()
      throw new Error(`Sanity mutate error ${mutateRes.status}: ${errText}`)
    }

    const mutateData = await mutateRes.json()
    const sanityId = mutateData.results?.[0]?.id ?? null

    // ── STEP 5: Generate blog article (non-blocking — failure doesn't affect import) ──
    let articleSlug: string | null = null
    try {
      const articleResult = await generateAndSaveArticle({
        productName: finalName,
        productDescription: ai.improvedDescription || description,
        productCategory: category,
        productBenefits: (ai.benefits ?? []).map((b: any) => b.title).filter(Boolean),
        sanityProductId: sanityId,
        productSlug: slug,
        geminiKey,
        sanityToken,
        projectId,
        dataset,
        apiVersion,
      })
      articleSlug = articleResult.articleSlug
      revalidatePath('/blog')
      revalidatePath(`/blog/${articleSlug}`)
      revalidatePath(`/producto/${slug}`)
    } catch (articleErr) {
      console.error(`Article generation failed for ${finalName} (non-critical):`, articleErr)
    }

    return NextResponse.json({
      success: true,
      sanityId,
      name,
      slug,
      articleSlug,
      studioUrl: `https://todopolis.online/studio/desk/product;${sanityId}`,
    })
  } catch (err: any) {
    console.error(`Error importing product ${idProduct}:`, err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
