import { GoogleGenerativeAI } from '@google/generative-ai'
import { generateAndSaveArticle } from './generate-article'

const MS_BASE = 'https://prod.api.mastershop.com/api'
const PAGE_LIMIT = 50

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

HERO TITLE: Máximo 8 palabras. Orientado al resultado final, no al producto.
HERO SUBTITLE: 2 oraciones. Primera amplía beneficio. Segunda da prueba social o credibilidad.
NOMBRE ESTRATÉGICO (improvedName): Premium y descriptivo, máximo 6-8 palabras. Sin marcas inventadas.
DESCRIPCIÓN MEJORADA (improvedDescription): 3 bullet points con emoji. Máximo 12 palabras por punto.
BENEFICIOS (4): Título = resultado 3-5 palabras. Descripción = 2 oraciones (resultado + emoción).
ESPECIFICACIONES (5): Mezcla datos técnicos con características de uso.
TESTIMONIOS (3): Historia corta de transformación. Nombres colombianos. Rating: 5, 5, 4.
CTA HEADLINE: Urgencia real sin mentir. CTA TEXT: 2 oraciones (beneficio + reducción de fricción).

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
  "ctaText": "Oración de beneficio final. Oración que reduce el miedo o fricción de compra."
}`

function log(msg: string) {
  console.log(`[mastershop-sync] ${new Date().toISOString()} ${msg}`)
}

async function fetchAllMastershopIds(apiKey: string): Promise<number[]> {
  const ids: number[] = []
  let page = 1
  let total = Infinity

  while (ids.length < total) {
    const res = await fetch(`${MS_BASE}/products?page=${page}&limit=${PAGE_LIMIT}`, {
      headers: { 'ms-api-key': apiKey },
    })
    if (!res.ok) throw new Error(`Mastershop error ${res.status} en página ${page}`)

    const data = await res.json()
    const products: any[] = data.results ?? []
    total = data.resultsCount?.totalProducts ?? products.length

    for (const p of products) {
      if (p.idProduct) ids.push(p.idProduct)
    }

    if (products.length < PAGE_LIMIT) break
    page++
  }

  return ids
}

async function fetchSanityImportedIds(
  projectId: string,
  dataset: string,
  apiVersion: string,
  token: string,
): Promise<Set<number>> {
  const query = encodeURIComponent(`*[_type == "product" && defined(mastershopId)].mastershopId`)
  const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${query}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`Sanity GROQ error ${res.status}`)
  const data = await res.json()
  return new Set<number>(data.result ?? [])
}

async function fetchProductsWithoutArticles(
  projectId: string,
  dataset: string,
  apiVersion: string,
  token: string,
  limit = 3,
): Promise<{ sanityId: string; slug: string; name: string; description: string; category: string; benefits: string[] }[]> {
  const query = encodeURIComponent(
    `*[_type == "product" && defined(mastershopId) && count(*[_type == "article" && relatedProduct._ref == ^._id]) == 0][0...${limit}]{ _id, name, "slug": slug.current, shortDescription, category, benefits[]{ title } }`
  )
  const res = await fetch(
    `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${query}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) return []
  const data = await res.json()
  return (data.result ?? []).map((p: any) => ({
    sanityId: p._id,
    slug: p.slug ?? '',
    name: p.name ?? '',
    description: p.shortDescription ?? '',
    category: p.category ?? 'otros',
    benefits: (p.benefits ?? []).map((b: any) => b.title).filter(Boolean),
  }))
}

interface ImportResult {
  sanityId: string | null
  slug: string
  name: string
  description: string
  category: string
  benefits: string[]
}

async function importProduct(
  idProduct: number,
  apiKey: string,
  geminiKey: string,
  sanityToken: string,
  projectId: string,
  dataset: string,
  apiVersion: string,
): Promise<ImportResult | null> {
  const existsQuery = encodeURIComponent(
    `*[_type == "product" && mastershopId == ${idProduct}][0]._id`,
  )
  const existsRes = await fetch(
    `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${existsQuery}`,
    { headers: { Authorization: `Bearer ${sanityToken}` } },
  )
  if (existsRes.ok) {
    const existsData = await existsRes.json()
    if (existsData.result) {
      log(`Producto ${idProduct} ya existe, saltando.`)
      return null
    }
  }

  const msRes = await fetch(`${MS_BASE}/products/${idProduct}`, {
    headers: { 'ms-api-key': apiKey },
  })
  if (!msRes.ok) throw new Error(`Mastershop error ${msRes.status}`)
  const msProduct = await msRes.json()
  const p = msProduct.results?.[0] ?? msProduct.result ?? msProduct

  const name: string = p.name ?? `Producto ${idProduct}`
  const description: string = p.description ?? ''
  const basePrice: number = p.basePrice ?? p.variation?.[0]?.price ?? 0
  const suggestedPrice: number = p.suggestedPrice ?? 0
  const imageUrl: string | null = p.urlImageProduct ?? null
  const categoryRaw: string = p.prodFormatName ?? ''
  const category = CATEGORY_MAP[categoryRaw] ?? 'otros'

  const genAI = new GoogleGenerativeAI(geminiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
  const aiResult = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: SYSTEM_PROMPT + '\n\nProducto: ' + name + '\n\nDescripción: ' + (description || name) }] }],
    generationConfig: { temperature: 1.0 } as any,
  })

  const candidate = aiResult.response.candidates?.[0]
  const parts = candidate?.content?.parts ?? []
  const rawText =
    parts
      .filter((part: any) => !part.thought && typeof part.text === 'string' && part.text.trim())
      .map((part: any) => part.text)
      .join('') || aiResult.response.text?.()

  if (!rawText) throw new Error('Gemini no devolvió contenido')

  let ai: any = {}
  try {
    const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim()
    ai = JSON.parse(cleanJson)
  } catch {
    throw new Error('La IA no devolvió un JSON válido')
  }

  const finalName = ai.improvedName || name
  const slug = finalName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .substring(0, 96)

  const rawPrice = basePrice || suggestedPrice || 0
  let markup = 1.3
  if (rawPrice < 50000) markup = 1.7
  else if (rawPrice < 150000) markup = 1.5
  const strategicPrice = rawPrice > 0 ? Math.max(0, Math.floor(rawPrice * markup / 1000) * 1000 + 900) : 0

  const sanityDoc = {
    _type: 'product',
    mastershopId: idProduct,
    mastershopImageUrl: imageUrl,
    name: finalName,
    slug: { _type: 'slug', current: slug },
    shortDescription: ai.improvedDescription ?? description,
    price: strategicPrice,
    category,
    isNew: true,
    isBestSeller: false,
    heroTitle: ai.heroTitle ?? '',
    heroSubtitle: ai.heroSubtitle ?? '',
    heroCta: ai.heroCta ?? 'Comprar ahora',
    benefits: (ai.benefits ?? []).map((b: any) => ({
      _type: 'object',
      _key: Math.random().toString(36).substring(2, 9),
      icon: b.icon,
      title: b.title,
      description: b.description,
    })),
    specifications: (ai.specifications ?? []).map((s: any) => ({
      _type: 'object',
      _key: Math.random().toString(36).substring(2, 9),
      label: s.label,
      value: s.value,
    })),
    testimonials: (ai.testimonials ?? []).map((t: any) => ({
      _type: 'object',
      _key: Math.random().toString(36).substring(2, 9),
      name: t.name,
      role: t.role,
      text: t.text,
      rating: t.rating ?? 5,
    })),
    ctaHeadline: ai.ctaHeadline ?? '',
    ctaText: ai.ctaText ?? '',
  }

  const mutateRes = await fetch(
    `https://${projectId}.api.sanity.io/v${apiVersion}/data/mutate/${dataset}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${sanityToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mutations: [{ create: sanityDoc }] }),
    },
  )
  if (!mutateRes.ok) {
    const errText = await mutateRes.text()
    throw new Error(`Sanity mutate error ${mutateRes.status}: ${errText}`)
  }

  const mutateData = await mutateRes.json()
  const sanityId: string | null = mutateData.results?.[0]?.id ?? null

  return {
    sanityId,
    slug,
    name: finalName,
    description: ai.improvedDescription ?? description,
    category,
    benefits: (ai.benefits ?? []).map((b: any) => b.title).filter(Boolean),
  }
}

// ─── Main sync ────────────────────────────────────────────────────────────────

export interface SyncResult {
  imported: number
  errors: number
  articlesCreated: string[]
}

async function runSync(): Promise<SyncResult> {
  const apiKey = process.env.MASTERSHOP_API_KEY
  const geminiKey = process.env.GEMINI_API_KEY
  const sanityToken = process.env.SANITY_API_TOKEN
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production'
  const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2025-01-01'

  if (!apiKey || !geminiKey || !sanityToken || !projectId) {
    log('Variables de entorno incompletas, saltando sync.')
    return { imported: 0, errors: 0, articlesCreated: [] }
  }

  log('Iniciando sincronización...')

  const [allIds, importedIds] = await Promise.all([
    fetchAllMastershopIds(apiKey),
    fetchSanityImportedIds(projectId, dataset, apiVersion, sanityToken),
  ])

  const pending = allIds.filter(id => !importedIds.has(id))
  log(`${allIds.length} en Mastershop, ${importedIds.size} en Sanity, ${pending.length} pendientes.`)

  // ── Phase 1: Import new products ─────────────────────────────────────────
  const newlyImported: NonNullable<ImportResult>[] = []
  let importErrors = 0

  for (const id of pending) {
    try {
      log(`Importando ${id}...`)
      const result = await importProduct(id, apiKey, geminiKey, sanityToken, projectId, dataset, apiVersion)
      if (result) {
        newlyImported.push(result)
        log(`Producto ${id} → ${result.slug}`)
      }
    } catch (err: any) {
      importErrors++
      log(`Error importando ${id}: ${err.message}`)
    }
  }

  // ── Phase 2: Generate articles (max 3 per cron run) ───────────────────────
  // Candidates: newly imported products first, then existing ones without articles
  const existingWithoutArticle = await fetchProductsWithoutArticles(
    projectId, dataset, apiVersion, sanityToken, 3
  )

  const seen = new Set<string>()
  const toProcess = [
    ...newlyImported.filter(r => r.sanityId).map(r => ({ ...r, sanityId: r.sanityId! })),
    ...existingWithoutArticle,
  ].filter(c => {
    if (seen.has(c.sanityId)) return false
    seen.add(c.sanityId)
    return true
  }).slice(0, 3)

  const articlesCreated: string[] = []

  for (const item of toProcess) {
    try {
      log(`Generando artículo para ${item.slug}...`)
      await generateAndSaveArticle({
        productName: item.name,
        productDescription: item.description,
        productCategory: item.category,
        productBenefits: item.benefits,
        sanityProductId: item.sanityId,
        productSlug: item.slug,
        geminiKey,
        sanityToken,
        projectId,
        dataset,
        apiVersion,
      })
      articlesCreated.push(item.slug)
      log(`Artículo creado para ${item.slug}`)
    } catch (err: any) {
      log(`Error generando artículo para ${item.slug}: ${err.message}`)
    }
  }

  log(`Sync completado. ${newlyImported.length} importados, ${importErrors} errores, ${articlesCreated.length} artículos.`)
  return { imported: newlyImported.length, errors: importErrors, articlesCreated }
}

export { runSync as startMastershopSync }
