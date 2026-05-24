import { getSanityClient } from './client'
import { SanityArticle, TagTaxonomyEntry } from '../types'

// Reintenta una consulta con backoff. Clave durante el build: prerenderizar
// cientos de páginas dispara cientos de queries y la API de Sanity puede
// devolver errores transitorios o rate-limit (429). Sin reintento, un fallo
// transitorio en una página de detalle se convierte en un 404 permanente.
async function withRetry<T>(fn: () => Promise<T>, retries = 8): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt < retries) {
        // Backoff exponencial con tope (500ms → 1s → 2s → … → 8s).
        await new Promise((r) => setTimeout(r, Math.min(500 * 2 ** attempt, 8000)))
      }
    }
  }
  throw lastError
}

// GROQ query for a list of products (for home page cards)
const PRODUCTS_LIST_QUERY = `*[_type == "product" && defined(slug.current)] | order(_createdAt desc) {
  _id,
  name,
  "slug": slug.current,
  shortDescription,
  price,
  originalPrice,
  mastershopImageUrl,
  "image": images[0].asset->url,
  "aiLifestyleImage": aiLifestyleImage.asset->url,
  category,
  isNew,
  isBestSeller,
  heroTitle,
  testimonials,
  reviewsCount,
  "tags": tags[]->{ "slug": slug.current, name, group, icon }
}`

// GROQ query for a single product (for landing page)
const PRODUCT_DETAIL_QUERY = `*[_type == "product" && slug.current == $slug][0] {
  _id,
  name,
  "slug": slug.current,
  shortDescription,
  price,
  originalPrice,
  mastershopImageUrl,
  "image": images[0].asset->url,
  "images": images[].asset->url,
  variants[] {
    _key,
    idVariant,
    name,
    sku,
    price,
    stock,
    isEnable
  },
  category,
  isNew,
  isBestSeller,
  heroTitle,
  heroSubtitle,
  heroCta,
  "aiLifestyleImage": aiLifestyleImage.asset->url,
  benefits,
  specifications,
  testimonials,
  reviewsCount,
  ctaHeadline,
  ctaText,
  offerName,
  offerEndsAt,
  faqs[] {
    _key,
    question,
    answer
  },
  "articleSlug": *[_type == "article" && relatedProduct._ref == ^._id][0].slug.current,
  "articleTopic": *[_type == "article" && relatedProduct._ref == ^._id][0].topic
}`

const STORE_SETTINGS_QUERY = `*[_type == "storeSettings"][0] {
  _id,
  policies
}`

const HERO_BANNER_QUERY = `*[_type == "heroBanner"] | order(_updatedAt desc)[0] {
  _id,
  title,
  subtitle,
  backgroundColor,
  products[]->{
    _id,
    name,
    "slug": slug.current,
    price,
    mastershopImageUrl,
    "image": images[0].asset->url
  }
}`

// GROQ query to get all slugs (for generateStaticParams + sitemap)
const ALL_SLUGS_QUERY = `*[_type == "product" && defined(slug.current)]{ "slug": slug.current, category, _updatedAt }`

export async function getSanityProducts() {
  try {
    return await withRetry(() => getSanityClient().fetch(PRODUCTS_LIST_QUERY, {}, {
      next: { revalidate: 86400, tags: ['products'] },
    }))
  } catch {
    return []
  }
}

// Lanza error si la consulta falla tras los reintentos — NUNCA devuelve null
// por un error transitorio (eso convertiría un fallo de red en un 404 perenne).
// null solo significa "el producto no existe".
export async function getSanityProductBySlug(slug: string) {
  return withRetry(() => getSanityClient().fetch(PRODUCT_DETAIL_QUERY, { slug }, {
    next: { revalidate: 86400, tags: ['products', `product-${slug}`] },
  }))
}

export async function getAllProductSlugs(): Promise<{ slug: string; category?: string; _updatedAt?: string }[]> {
  try {
    return await withRetry(() => getSanityClient().fetch(ALL_SLUGS_QUERY, {}, {
      next: { revalidate: 86400, tags: ['products'] },
    }))
  } catch {
    return []
  }
}

export async function getSanityStoreSettings() {
  try {
    return await withRetry(() => getSanityClient().fetch(`*[_type == "storeSettings"][0] {
      _id,
      heroTitle,
      heroSubtitle,
      policies
    }`, {}, {
      next: { revalidate: 86400, tags: ['storeSettings'] },
    }))
  } catch {
    return null
  }
}

const TAGS_QUERY = `*[_type == "tag" && defined(slug.current)] | order(group asc, priority desc) {
  _id,
  "slug": slug.current,
  name,
  group,
  icon,
  priority,
  isFeatured
}`

export async function getSanityTags(): Promise<TagTaxonomyEntry[]> {
  try {
    return await withRetry(() => getSanityClient().fetch<TagTaxonomyEntry[]>(TAGS_QUERY, {}, {
      next: { revalidate: 3600, tags: ['tags'] },
    }))
  } catch {
    return []
  }
}

// ─── Campañas / Banner Temporada ─────────────────────────────────────────────

const ACTIVE_PROMO_CAMPAIGN_QUERY = `*[_type == "promoCampaign" && isActive == true] | order(_updatedAt desc)[0] {
  _id,
  title,
  imageAlt,
  ctaLabel,
  pageHeading,
  pageSubheading,
  tagMatchMode,
  "desktopImage": desktopImage.asset->url,
  "mobileImage": mobileImage.asset->url,
  "tagSlugs": tags[]->slug.current,
  "tags": tags[]->{ "slug": slug.current, name, icon }
}`

export interface PromoCampaign {
  _id: string
  title: string
  imageAlt: string
  ctaLabel?: string
  pageHeading: string
  pageSubheading?: string
  tagMatchMode: 'any' | 'all'
  desktopImage: string
  mobileImage: string
  tagSlugs: string[]
  tags: { slug: string; name: string; icon?: string }[]
}

export async function getActivePromoCampaign(): Promise<PromoCampaign | null> {
  try {
    return await withRetry(() => getSanityClient().fetch<PromoCampaign | null>(ACTIVE_PROMO_CAMPAIGN_QUERY, {}, {
      next: { revalidate: 3600, tags: ['promoCampaign'] },
    }))
  } catch {
    return null
  }
}

// Productos que matchean la campaña por tags. El modo "any" usa `in` (al menos un tag);
// "all" verifica que todos los slugs solicitados estén dentro de los tags del producto.
export async function getProductsByTags(slugs: string[], mode: 'any' | 'all'): Promise<any[]> {
  if (!slugs.length) return []
  const filter =
    mode === 'all'
      ? `*[_type == "product" && defined(slug.current) && count((tags[]->slug.current)[@ in $slugs]) == $required]`
      : `*[_type == "product" && defined(slug.current) && count((tags[]->slug.current)[@ in $slugs]) > 0]`
  const query = `${filter} | order(_createdAt desc) {
    _id,
    name,
    "slug": slug.current,
    shortDescription,
    price,
    originalPrice,
    mastershopImageUrl,
    "image": images[0].asset->url,
    category,
    isNew,
    isBestSeller,
    testimonials,
    reviewsCount,
    "tags": tags[]->{ "slug": slug.current, name, group, icon }
  }`
  try {
    return await withRetry(() => getSanityClient().fetch(query, { slugs, required: slugs.length }, {
      next: { revalidate: 3600, tags: ['products', 'promoCampaign'] },
    }))
  } catch {
    return []
  }
}

export async function getSanityHeroBanner() {
  try {
    return await withRetry(() => getSanityClient().fetch(HERO_BANNER_QUERY, {}, {
      next: { revalidate: 3600, tags: ['heroBanner'] },
    }))
  } catch {
    return null
  }
}

// ─── Article queries ──────────────────────────────────────────────────────────

const ARTICLES_LIST_QUERY = `*[_type == "article"] | order(publishedAt desc) {
  _id,
  title,
  "slug": slug.current,
  topic,
  seoDescription,
  readingTime,
  category,
  publishedAt,
  productSlug
}`

const ARTICLE_DETAIL_QUERY = `*[_type == "article" && slug.current == $slug][0] {
  _id,
  title,
  "slug": slug.current,
  topic,
  seoDescription,
  seoKeywords,
  readingTime,
  category,
  publishedAt,
  productSlug,
  "productName": relatedProduct->name,
  "productImage": coalesce(relatedProduct->images[0].asset->url, relatedProduct->mastershopImageUrl),
  _updatedAt,
  sections[] {
    _key,
    type,
    heading,
    content,
    items,
    buttonText,
    faqs[] {
      _key,
      question,
      answer
    }
  }
}`

const ALL_ARTICLE_SLUGS_QUERY = `*[_type == "article" && defined(slug.current)]{ "slug": slug.current, _updatedAt }`


export async function getArticles(): Promise<SanityArticle[]> {
  try {
    return await withRetry(() => getSanityClient().fetch(ARTICLES_LIST_QUERY, {}, {
      next: { revalidate: 3600, tags: ['articles'] },
    }))
  } catch {
    return []
  }
}

// Lanza error si la consulta falla tras los reintentos — NUNCA devuelve null
// por un error transitorio. null solo significa "el artículo no existe".
export async function getArticleBySlug(slug: string): Promise<SanityArticle | null> {
  return withRetry(() => getSanityClient().fetch(ARTICLE_DETAIL_QUERY, { slug }, {
    next: { revalidate: 86400, tags: ['articles', `article-${slug}`] },
  }))
}

export async function getAllArticleSlugs(): Promise<{ slug: string; _updatedAt?: string }[]> {
  try {
    return await withRetry(() => getSanityClient().fetch(ALL_ARTICLE_SLUGS_QUERY, {}, {
      next: { revalidate: 3600, tags: ['articles'] },
    }))
  } catch {
    return []
  }
}
