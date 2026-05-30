import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { generateAndSaveArticle } from '@/lib/generate-article'
import { fetchTagTaxonomy, classifyProductTags, tagSlugsToReferences } from '@/lib/auto-tag'
import { SYSTEM_PROMPT, PRODUCT_COPY_TEMPERATURE } from '@/lib/product-content-prompt'

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

    // ── STEP 2: Generate AI content with Gemini (en paralelo con auto-tagging) ──
    const genAI = new GoogleGenerativeAI(geminiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const userPrompt = `Producto: ${name}\n\nDescripción: ${description || name}`

    // Arrancamos copy generation y auto-tagging en paralelo: ambos llaman a Gemini
    // y son independientes. Las tags son best-effort (no bloquean si fallan).
    const copyPromise = model.generateContent({
      contents: [{ role: 'user', parts: [{ text: SYSTEM_PROMPT + '\n\n' + userPrompt }] }],
      generationConfig: { temperature: PRODUCT_COPY_TEMPERATURE } as any,
    })

    const tagsPromise = (async () => {
      try {
        const taxonomy = await fetchTagTaxonomy({ projectId, dataset, apiVersion, token: sanityToken })
        return await classifyProductTags(taxonomy, { name, shortDescription: description, category }, geminiKey)
      } catch (err) {
        console.error('[import] auto-tagging falló (best-effort, sigue sin tags):', err)
        return [] as string[]
      }
    })()

    const aiResult = await copyPromise

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

    // Variantes (talla, color, etc.) — solo se incluyen si existen
    const variants = extractVariants(p)

    // Esperamos las tags ahora — ya tuvieron tiempo de procesarse en paralelo con el copy.
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
      ...(variants.length > 0 && { variants }),
      ...(tagReferences.length > 0 && { tags: tagReferences }),
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

    // Revalida de inmediato — el producto aparece en el home y en su landing
    // sin depender del webhook de Sanity ni esperar el ISR de 24 h.
    revalidateTag('products', 'max')
    revalidatePath('/')
    revalidatePath(`/producto/${slug}`)

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
