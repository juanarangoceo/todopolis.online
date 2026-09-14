import type { CanonicalCatalogProduct, CatalogVariant } from './canonical-types'
import { sha256Json } from './content-hash'

type SanityCatalogDocument = Record<string, unknown> & {
  _id?: string
  _updatedAt?: string
  name?: string
  slug?: string
  price?: number
  originalPrice?: number
  mastershopId?: number
  mastershopImageUrl?: string
  images?: string[]
  variants?: Array<Record<string, unknown>>
  tags?: Array<{ name?: string; slug?: string }>
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function compactStrings(values: unknown[]): string[] {
  return [...new Set(values.map(text).filter((value): value is string => Boolean(value)))]
}

function objectList<T>(value: unknown, map: (item: Record<string, unknown>) => T | null): T[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map(map)
    .filter((item): item is T => item !== null)
}

export function projectSanityProduct(document: SanityCatalogDocument): CanonicalCatalogProduct | null {
  const sanityId = text(document._id)?.replace(/^drafts\./, '') ?? null
  const title = text(document.name)
  const slug = text(document.slug)
  const basePrice = finiteNumber(document.price)
  const sourceUpdatedAt = text(document._updatedAt)
  if (!sanityId || !title || !slug || !basePrice || !Number.isInteger(basePrice) || basePrice <= 0 || !sourceUpdatedAt) return null

  const variants = objectList<CatalogVariant>(document.variants, (variant) => {
    const externalId = finiteNumber(variant.idVariant)?.toString() ?? text(variant.idVariant)
    const variantTitle = text(variant.name)
    if (!externalId || !variantTitle) return null
    return {
      external_id: externalId,
      title: variantTitle,
      sku: text(variant.sku),
      price: Number.isInteger(finiteNumber(variant.price)) ? finiteNumber(variant.price) : null,
      stock: Number.isInteger(finiteNumber(variant.stock)) ? finiteNumber(variant.stock) : null,
      enabled: variant.isEnable !== false,
    }
  })
  const enabledPrices = variants
    .filter((variant) => variant.enabled && variant.price !== null && variant.price > 0)
    .map((variant) => variant.price as number)
  const prices = enabledPrices.length ? enabledPrices : [basePrice]
  const trackStock = document.trackStock === true
  const stockTotal = trackStock
    ? variants.filter((variant) => variant.enabled).reduce((sum, variant) => sum + Math.max(0, variant.stock ?? 0), 0)
    : null
  const imageUrls = compactStrings([
    ...(Array.isArray(document.images) ? document.images : []),
    document.mastershopImageUrl,
    document.aiLifestyleImage,
  ])
  const videoUrls = compactStrings([
    document.vipHeroVideo && typeof document.vipHeroVideo === 'object'
      ? (document.vipHeroVideo as Record<string, unknown>).url
      : null,
  ])
  const specifications = objectList(document.specifications, (item) => {
    const label = text(item.label)
    const value = text(item.value)
    return label && value ? { label, value } : null
  })
  const benefits = objectList(document.benefits, (item) => {
    const benefitTitle = text(item.title)
    const description = text(item.description)
    return benefitTitle && description ? { title: benefitTitle, description } : null
  })
  const faqs = objectList(document.faqs, (item) => {
    const question = text(item.question)
    const answer = text(item.answer)
    return question && answer ? { question, answer } : null
  })
  const testimonials = objectList(document.testimonials, (item) => {
    const name = text(item.name)
    const testimonialText = text(item.text)
    if (!name || !testimonialText) return null
    return {
      name,
      role: text(item.role) ?? '',
      rating: finiteNumber(item.rating),
      text: testimonialText,
    }
  })
  const tags = compactStrings(
    Array.isArray(document.tags)
      ? document.tags.flatMap((tag) => [tag?.name, tag?.slug])
      : []
  )

  const withoutHash = {
    external_id: sanityId,
    sanity_id: sanityId,
    mastershop_id: finiteNumber(document.mastershopId),
    slug,
    title,
    description: text(document.shortDescription),
    currency: 'COP' as const,
    price: basePrice,
    price_min: Math.min(...prices),
    price_max: Math.max(...prices),
    compare_at_price: finiteNumber(document.originalPrice),
    brand: text(document.brand),
    category: text(document.category),
    tags,
    sku: variants.length === 1 ? variants[0].sku : null,
    stock_total: stockTotal,
    track_stock: trackStock,
    variants,
    image_url: imageUrls[0] ?? null,
    image_urls: imageUrls,
    video_urls: videoUrls,
    specifications,
    benefits,
    faqs,
    testimonials,
    sales_content: {
      hero_title: text(document.heroTitle),
      hero_subtitle: text(document.heroSubtitle),
      hero_cta: text(document.heroCta),
      cta_headline: text(document.ctaHeadline),
      cta_text: text(document.ctaText),
      offer_name: text(document.offerName),
      offer_ends_at: text(document.offerEndsAt),
      is_vip: document.isVip === true,
    },
    status: 'active' as const,
    source_updated_at: sourceUpdatedAt,
  }

  const hashable = Object.fromEntries(
    Object.entries(withoutHash).filter(([key]) => key !== 'source_updated_at')
  )
  return { ...withoutHash, content_hash: sha256Json(hashable) }
}

export const SANITY_CATALOG_PRODUCT_PROJECTION = `{
  _id,
  _updatedAt,
  mastershopId,
  mastershopImageUrl,
  name,
  "slug": slug.current,
  shortDescription,
  price,
  originalPrice,
  brand,
  trackStock,
  category,
  variants[]{idVariant, name, sku, price, stock, isEnable},
  "images": images[].asset->url,
  "aiLifestyleImage": aiLifestyleImage.asset->url,
  "tags": tags[]->{name, "slug": slug.current},
  benefits[]{title, description},
  specifications[]{label, value},
  testimonials[]{name, role, rating, text},
  faqs[]{question, answer},
  heroTitle,
  heroSubtitle,
  heroCta,
  ctaHeadline,
  ctaText,
  offerName,
  offerEndsAt,
  isVip,
  vipHeroVideo{url}
}`
