import { GoogleGenerativeAI } from '@google/generative-ai'
import { generateAndSaveArticle } from './generate-article'
import { fetchTagTaxonomy, classifyProductTags, tagSlugsToReferences } from './auto-tag'
import { SYSTEM_PROMPT, PRODUCT_COPY_TEMPERATURE } from './product-content-prompt'

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


function log(msg: string) {
  console.log(`[mastershop-sync] ${new Date().toISOString()} ${msg}`)
}

// Extrae las variantes reales del payload de Mastershop.
// "Mis productos" usa el campo `variation`; el marketplace usa `variants`.
// Devuelve [] si el producto no tiene variantes reales (solo "Default Variant"
// o una única opción) — en ese caso no se escribe el campo en Sanity.
function extractVariants(p: any): any[] {
  const raw: any[] = p?.variation ?? p?.variants ?? []
  if (!Array.isArray(raw)) return []
  const real = raw.filter(
    (v) =>
      v &&
      v.idVariant != null &&
      (v.name ?? '').trim().toLowerCase() !== 'default variant' &&
      v.isEnable !== 0,
  )
  if (real.length < 2) return []
  return real.map((v) => ({
    _type: 'variant',
    _key: Math.random().toString(36).substring(2, 9),
    idVariant: v.idVariant,
    name: (v.name ?? '').trim(),
    sku: v.sku ?? '',
    price: typeof v.price === 'number' ? v.price : 0,
    stock: typeof v.stock === 'number' ? v.stock : 0,
    isEnable: v.isEnable !== 0,
  }))
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
  const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' })

  // Copy + auto-tagging en paralelo (mismo patrón que el import manual). El
  // tagging es best-effort: si falla, el producto se crea igual sin tags.
  const copyPromise = model.generateContent({
    contents: [{ role: 'user', parts: [{ text: SYSTEM_PROMPT + '\n\nProducto: ' + name + '\n\nDescripción: ' + (description || name) }] }],
    generationConfig: { temperature: PRODUCT_COPY_TEMPERATURE } as any,
  })

  const tagsPromise = (async () => {
    try {
      const taxonomy = await fetchTagTaxonomy({ projectId, dataset, apiVersion, token: sanityToken })
      return await classifyProductTags(taxonomy, { name, shortDescription: description, category }, geminiKey)
    } catch (err) {
      log(`auto-tagging falló para ${idProduct} (best-effort): ${(err as Error).message}`)
      return [] as string[]
    }
  })()

  const aiResult = await copyPromise

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

  const variants = extractVariants(p)

  // Esperamos las tags ahora — ya corrieron en paralelo con el copy.
  const tagSlugs = await tagsPromise
  const tagReferences = tagSlugsToReferences(tagSlugs)

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
    ...(variants.length > 0 && { variants }),
    ...(tagReferences.length > 0 && { tags: tagReferences }),
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
