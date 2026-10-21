import { NextRequest, NextResponse } from 'next/server'
import { authorizeEditorialRequest } from '@/lib/ai/authorize'
import { createEditorialModel } from '@/lib/ai/gemini'
import { PRODUCT_CONTENT_SCHEMA, validateProductContent } from '@/lib/ai/product-contract'
import { fetchInlineImages } from '@/lib/ai/reference-images'
import { createUsageCollector } from '@/lib/ai/usage'
import { ADULT_CATEGORY, isAllowedAdultProduct } from '@/lib/adult-policy'
import { audienceFitFromAi } from '@/lib/audience-fit'
import { classifyProductTags, fetchTagTaxonomy, tagSlugsToReferences } from '@/lib/auto-tag'
import { PRODUCT_CATEGORIES, isProductCategory } from '@/lib/categories'
import { askJev, decideCategory } from '@/lib/category-classifier'
import { DropiNotConnectedError, getDropiAccessToken } from '@/lib/dropi/connection'
import { DropiMcpClient } from '@/lib/dropi/mcp'
import { dropiFields, dropiMarkedAdult, findDropiProduct, sanityVariants } from '@/lib/dropi/catalog'
import { sanityMutate, sanityQuery, sanityTaxonomyConfig, uploadDropiImage } from '@/lib/dropi/sanity-store'
import { PRODUCT_COPY_TEMPERATURE, SYSTEM_PROMPT, buildCategoryBlock, buildImageAnalysisBlock } from '@/lib/product-content-prompt'
import { slugifyProductName } from '@/lib/slugify'
import { strategicPrice } from '@/lib/supplier-pricing'

export const maxDuration = 240

const key = () => Math.random().toString(36).slice(2, 9)

// Importa UN producto de Dropi como BORRADOR (piloto TOD-16). A diferencia del
// import de Mastershop no publica, no revalida el home ni escribe artículo
// (el artículo apunta al documento publicado): el editor revisa y publica.
export async function POST(request: NextRequest) {
  const denied = await authorizeEditorialRequest(request)
  if (denied) return denied
  const geminiKey = process.env.GEMINI_API_KEY
  if (!geminiKey) return NextResponse.json({ error: 'Falta GEMINI_API_KEY.' }, { status: 500 })

  let body: { dropiId?: unknown; name?: unknown; supplierId?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }
  const dropiId = Number(body.dropiId)
  const name = typeof body.name === 'string' ? body.name.slice(0, 300) : ''
  if (!Number.isInteger(dropiId) || dropiId <= 0 || !name) return NextResponse.json({ error: 'Se requieren dropiId y name.' }, { status: 400 })

  const existing = await sanityQuery<{ _id: string } | null>('*[_type == "product" && dropiId == $id][0]{ _id }', { id: dropiId })
  if (existing) return NextResponse.json({ alreadyImported: true, sanityId: existing._id.replace(/^drafts\./, '') })

  const usage = createUsageCollector(`import:dropi-${dropiId}`)
  const client = new DropiMcpClient(getDropiAccessToken)
  try {
    // El producto se vuelve a leer de Dropi: costo y stock nunca vienen del navegador.
    const product = await findDropiProduct(client, { id: dropiId, name, supplierId: Number(body.supplierId) || null })
    if (!product) return NextResponse.json({ error: 'Dropi ya no lista ese producto.' }, { status: 404 })

    // Misma regla que Mastershop: si el proveedor lo marca adulto, solo entra
    // si es lencería. En duda, fuera.
    const adult = dropiMarkedAdult(product)
    if (adult && !isAllowedAdultProduct(product.name)) {
      return NextResponse.json({ error: `Dropi marca «${product.name}» como producto para adultos y no parece lencería. Todópolis no vende juguetes para adultos.` }, { status: 422 })
    }

    const uploads = (await Promise.all(product.images.slice(0, 4).map(uploadDropiImage))).filter((u) => u !== null)
    // Gemini lee las fotos ya subidas, a 1024 px y en JPG (como el botón del Studio).
    const referenceImages = await fetchInlineImages(uploads.slice(0, 3).map((u) => `${u.url}?w=1024&fm=jpg`))

    const description = `Producto de proveedor sin descripción. Categorías que marca el proveedor: ${product.categories.join(', ') || 'ninguna'}.${product.variations.length ? ` Variantes: ${product.variations.map((v) => v.name).slice(0, 20).join(', ')}.` : ''}`
    const model = createEditorialModel({ apiKey: geminiKey, source: 'product_copy', responseJsonSchema: PRODUCT_CONTENT_SCHEMA, validate: validateProductContent, onUsage: usage.sink })
    const jevPromise = adult ? null : askJev({ name: product.name, description }, { onUsage: usage.sink })
    const copyPromise = model.generateContent({
      contents: [{ role: 'user', parts: [
        ...referenceImages.map((image) => ({ inlineData: image })),
        { text: SYSTEM_PROMPT + buildImageAnalysisBlock(referenceImages.length) + (adult ? '' : buildCategoryBlock(PRODUCT_CATEGORIES)) + `\n\nProducto: ${product.name}\n\nDescripción: ${description}` },
      ] }],
      generationConfig: { temperature: PRODUCT_COPY_TEMPERATURE },
    })
    await Promise.allSettled([copyPromise, jevPromise])
    const ai = JSON.parse((await copyPromise).response.text())

    const geminiCategory = isProductCategory(ai.suggestedCategory) ? ai.suggestedCategory : null
    const category = adult ? ADULT_CATEGORY : decideCategory(jevPromise ? await jevPromise : null, [geminiCategory]).category

    let tagSlugs: string[] = []
    try {
      tagSlugs = await classifyProductTags(await fetchTagTaxonomy(sanityTaxonomyConfig()), { name: ai.improvedName || product.name, shortDescription: ai.improvedDescription ?? '', category }, geminiKey, { onUsage: usage.sink })
    } catch (err) {
      console.error('[dropi/import] etiquetas (best-effort):', err)
    }

    const finalName = ai.improvedName || product.name
    const variants = sanityVariants(product)
    const tags = tagSlugsToReferences(tagSlugs)
    const draftId = `drafts.${crypto.randomUUID()}`
    // El id de Dropi solo se añade al slug si el nombre ya está tomado.
    const baseSlug = slugifyProductName(finalName)
    const taken = await sanityQuery<string | null>('*[_type == "product" && slug.current == $slug][0]._id', { slug: baseSlug })
    const slug = taken ? `${baseSlug}-${product.id}` : baseSlug
    await sanityMutate([{ create: {
      _id: draftId,
      _type: 'product',
      ...dropiFields(product),
      name: finalName,
      slug: { _type: 'slug', current: slug },
      shortDescription: ai.improvedDescription ?? '',
      // Sugerido desde el COSTO; el editor lo revisa antes de publicar.
      price: strategicPrice(product.cost),
      category,
      isNew: true,
      isBestSeller: false,
      images: uploads.map((u) => ({ _type: 'image', _key: key(), asset: { _type: 'reference', _ref: u.assetId } })),
      heroTitle: ai.heroTitle ?? '',
      heroSubtitle: ai.heroSubtitle ?? '',
      heroCta: ai.heroCta ?? 'Comprar ahora',
      benefits: (ai.benefits ?? []).map((b: { icon?: string; title?: string; description?: string }) => ({ _type: 'benefit', _key: key(), icon: b.icon, title: b.title, description: b.description })),
      specifications: (ai.specifications ?? []).map((s: { label?: string; value?: string }) => ({ _type: 'specification', _key: key(), label: s.label, value: s.value })),
      testimonials: (ai.testimonials ?? []).map((t: { text?: string }) => ({ _type: 'testimonial', _key: key(), text: t.text })),
      ctaHeadline: ai.ctaHeadline ?? '',
      ctaText: ai.ctaText ?? '',
      faqs: (ai.faqs ?? []).map((f: { question?: string; answer?: string }) => ({ _type: 'faq', _key: key(), question: f.question, answer: f.answer })),
      ...(ai.campaignStory && { vipStory: ai.campaignStory }),
      ...(audienceFitFromAi(ai.audienceFit) && { audienceFit: audienceFitFromAi(ai.audienceFit) }),
      ...(variants.length > 0 && { variants }),
      ...(tags.length > 0 && { tags }),
    } }])

    const sanityId = draftId.replace(/^drafts\./, '')
    usage.setProductRef(sanityId)
    return NextResponse.json({ success: true, sanityId, name: finalName, images: uploads.length, price: strategicPrice(product.cost), cost: product.cost, stock: product.stock })
  } catch (error) {
    console.error(`[dropi/import] ${dropiId}`, error)
    const status = error instanceof DropiNotConnectedError ? 409 : 500
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo importar.' }, { status })
  } finally {
    await usage.flush()
    await client.close()
  }
}
