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
// ─── Por qué TODAS las consultas excluyen `drafts.**` ────────────────────────
//
// El cliente de Sanity lleva `SANITY_API_TOKEN`, y con token un `*[_type ==
// "product"]` devuelve el documento publicado Y su borrador como dos entradas
// distintas. Eso tenía dos efectos, los dos silenciosos:
//
//   1. PRODUCTO DUPLICADO. Mientras alguien tuviera abierto un borrador en el
//      Studio, ese producto salía DOS VECES en el home — se vio en las
//      novedades del 17-sep-2026, con la misma foto y el mismo precio en dos
//      casillas seguidas.
//   2. CONTENIDO SIN PUBLICAR A LA VISTA. Peor: las consultas de detalle
//      (`slug.current == $slug`) no garantizan cuál de los dos devuelven, así
//      que un comprador podía estar leyendo la versión en borrador de una
//      ficha, con precios o textos a medio editar.
//
// `PRODUCTS_COUNT_QUERY` ya lo excluía; las otras doce no. Si añades una
// consulta pública nueva, lleva el mismo filtro.

const PRODUCTS_LIST_QUERY = `*[_type == "product" && defined(slug.current) && !(_id in path("drafts.**"))] | order(_createdAt desc) {
  _id,
  _createdAt,
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
  "isDestacado": isVip,
  heroTitle,
  testimonials,
  reviewsCount,
  "tags": tags[]->{ "slug": slug.current, name, group, icon }
}`

// GROQ query for a single product (for landing page)
const PRODUCT_DETAIL_QUERY = `*[_type == "product" && slug.current == $slug && !(_id in path("drafts.**"))][0] {
  _id,
  _createdAt,
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
  // Fotos reales que mandan los clientes. Solo las pide la ficha de producto:
  // no entran en PRODUCTS_LIST_QUERY porque la tarjeta del catálogo no las usa
  // y serían 574 arrays de assets resueltos en cada carga del home.
  "customerPhotos": customerPhotos[]{
    _key,
    "url": asset->url,
    customerName,
    city,
    alt
  },
  ctaHeadline,
  ctaText,
  offerName,
  offerEndsAt,
  faqs[] {
    _key,
    question,
    answer
  },
  "articleSlug": *[_type == "article" && relatedProduct._ref == ^._id && !(_id in path("drafts.**"))][0].slug.current,
  "articleTopic": *[_type == "article" && relatedProduct._ref == ^._id && !(_id in path("drafts.**"))][0].topic,
  // Destacados — contenido manual extendido.
  // Los campos ALMACENADOS conservan el prefijo vip* (no se migró el dataset);
  // aquí se alias-ean al nombre de marca actual. Ver CLAUDE.md.
  "isDestacado": isVip,
  "destacadoStory": vipStory {
    eyebrow,
    problemTitle,
    problemText,
    turningPointTitle,
    turningPointText,
    outcomeTitle,
    outcomeText
  },
  "destacadoHeroVideo": vipHeroVideo {
    url,
    "posterImage": posterImage.asset->url,
    caption
  },
  "destacadoBeforeAfter": vipBeforeAfter[] {
    _key,
    "beforeImage": beforeImage.asset->url,
    "beforeImageAlt": beforeImage.alt,
    "afterImage": afterImage.asset->url,
    "afterImageAlt": afterImage.alt,
    caption
  },
  "destacadoSteps": vipSteps[] {
    _key,
    "image": image.asset->url,
    "imageAlt": image.alt,
    title,
    description
  },
  "destacadoBoxContents": vipBoxContents {
    title,
    "image": image.asset->url,
    "imageAlt": image.alt,
    intro,
    items
  },
  "destacadoTestimonials": vipTestimonials[] {
    _key,
    "photo": photo.asset->url,
    "photoAlt": photo.alt,
    quote,
    name,
    location
  },
  "destacadoComparison": vipComparison {
    title,
    ourLabel,
    theirLabel,
    rows[] { _key, feature, ours, theirs }
  },
  "destacadoQuotes": vipQuotes[] { _key, text, author }
}`

const STORE_SETTINGS_QUERY = `*[_type == "storeSettings"][0] {
  _id,
  policies
}`

// GROQ query to get all slugs (for generateStaticParams + sitemap)
const ALL_SLUGS_QUERY = `*[_type == "product" && defined(slug.current) && !(_id in path("drafts.**"))]{ "slug": slug.current, category, _updatedAt }`

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

// Conteo total de productos publicados. Usa GROQ count() para no traer documentos
// ni metadata — devuelve un entero. Cachéa 60s con tag 'products' para que se
// revalide en el mismo flujo que el catálogo (importaciones manuales o cron).
const PRODUCTS_COUNT_QUERY = `count(*[_type == "product" && defined(slug.current) && !(_id in path("drafts.**"))])`

export async function getSanityProductsCount(): Promise<number> {
  try {
    const n = await withRetry(() => getSanityClient().fetch<number>(PRODUCTS_COUNT_QUERY, {}, {
      next: { revalidate: 60, tags: ['products'] },
    }))
    return typeof n === 'number' && Number.isFinite(n) ? n : 0
  } catch {
    return 0
  }
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
      whatsappPhone,
      metaPixelId,
      policies
    }`, {}, {
      next: { revalidate: 86400, tags: ['storeSettings'] },
    }))
  } catch {
    return null
  }
}

// Slugs de las fichas de bienestar íntimo. Los usa el layout para NO cargar el
// Píxel de Meta en esas páginas: Meta prohíbe anunciar productos para adultos,
// y mandarle eventos de navegación desde ahí —que además alimentan audiencias—
// es un riesgo para la cuenta publicitaria que no compra nada a cambio.
//
// Consulta propia y no `getAllProductSlugs`: esa devuelve los 577 productos con
// su categoría y fecha, y esto se pide en CADA página del sitio. Aquí solo
// vuelven los slugs que hacen falta.
const ADULT_SLUGS_QUERY = `*[_type == "product" && category == "bienestar-intimo" && defined(slug.current) && !(_id in path("drafts.**"))]{ "slug": slug.current }`

export async function getAdultProductSlugs(): Promise<string[]> {
  try {
    const rows: { slug: string }[] = await withRetry(() =>
      getSanityClient().fetch(ADULT_SLUGS_QUERY, {}, {
        next: { revalidate: 86400, tags: ['products'] },
      })
    )
    return rows.map((r) => r.slug).filter(Boolean)
  } catch {
    // Si la consulta falla NO se asume que no hay ninguno: se devuelve lista
    // vacía y el pixel carga, que es el comportamiento de siempre. Bloquear de
    // más por un fallo de red dejaría la tienda entera sin medición.
    return []
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
      ? `*[_type == "product" && defined(slug.current) && !(_id in path("drafts.**")) && count((tags[]->slug.current)[@ in $slugs]) == $required]`
      : `*[_type == "product" && defined(slug.current) && !(_id in path("drafts.**")) && count((tags[]->slug.current)[@ in $slugs]) > 0]`
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

// ─── Article queries ──────────────────────────────────────────────────────────

const ARTICLES_LIST_QUERY = `*[_type == "article" && !(_id in path("drafts.**"))] | order(publishedAt desc) {
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

const ARTICLE_DETAIL_QUERY = `*[_type == "article" && slug.current == $slug && !(_id in path("drafts.**"))][0] {
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

const ALL_ARTICLE_SLUGS_QUERY = `*[_type == "article" && defined(slug.current) && !(_id in path("drafts.**"))]{ "slug": slug.current, _updatedAt }`


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

// ─── Colecciones de Marca ──────────────────────────────────────────────────
// Landing paraguas que agrupa 3-6 productos de un segmento con contenido IA.
// Los productos se resuelven conservando el orden del array de referencias.
const COLLECTION_DETAIL_QUERY = `*[_type == "collectionLanding" && slug.current == $slug && !(_id in path("drafts.**"))][0] {
  _id,
  title,
  "slug": slug.current,
  segmentHint,
  heroEyebrow,
  heroTitle,
  heroSubtitle,
  heroCta,
  brandIntro,
  segmentBenefits,
  buyersGuide,
  comparisonRows,
  faqs[] { _key, question, answer },
  ctaHeadline,
  ctaText,
  seoTitle,
  seoDescription,
  "products": products[]->{
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
    "isDestacado": isVip,
    testimonials,
    reviewsCount,
    "tags": tags[]->{ "slug": slug.current, name, group, icon }
  }
}`

const ALL_COLLECTION_SLUGS_QUERY = `*[_type == "collectionLanding" && defined(slug.current) && !(_id in path("drafts.**"))] {
  "slug": slug.current,
  _updatedAt
}`

export interface CollectionLanding {
  _id: string
  title: string
  slug: string
  segmentHint?: string
  heroEyebrow?: string
  heroTitle?: string
  heroSubtitle?: string
  heroCta?: string
  brandIntro?: string
  segmentBenefits?: { _key?: string; icon?: string; title?: string; description?: string }[]
  buyersGuide?: { _key?: string; title?: string; body?: string }[]
  comparisonRows?: { _key?: string; feature?: string; values?: string[] }[]
  faqs?: { _key?: string; question: string; answer: string }[]
  ctaHeadline?: string
  ctaText?: string
  seoTitle?: string
  seoDescription?: string
  products: any[]
}

// Lanza error si la consulta falla tras los reintentos — NUNCA devuelve null por
// un error transitorio. null solo significa "la colección no existe".
export async function getCollectionLandingBySlug(slug: string): Promise<CollectionLanding | null> {
  return withRetry(() => getSanityClient().fetch<CollectionLanding | null>(COLLECTION_DETAIL_QUERY, { slug }, {
    next: { revalidate: 86400, tags: ['collections', `collection-${slug}`] },
  }))
}

export async function getAllCollectionSlugs(): Promise<{ slug: string; _updatedAt?: string }[]> {
  try {
    return await withRetry(() => getSanityClient().fetch(ALL_COLLECTION_SLUGS_QUERY, {}, {
      next: { revalidate: 3600, tags: ['collections'] },
    }))
  } catch {
    return []
  }
}

// Lista de colecciones para la página índice /colecciones. Solo las que tienen
// productos. Trae portadas (primeras imágenes de producto) para el collage del card.
const COLLECTIONS_LIST_QUERY = `*[_type == "collectionLanding" && defined(slug.current) && !(_id in path("drafts.**")) && count(products) > 0] | order(_createdAt desc) {
  _id,
  title,
  "slug": slug.current,
  heroEyebrow,
  heroTitle,
  heroSubtitle,
  seoDescription,
  "productCount": count(products),
  "covers": products[0...4]->{ "image": coalesce(mastershopImageUrl, images[0].asset->url) }
}`

export interface CollectionListItem {
  _id: string
  title: string
  slug: string
  heroEyebrow?: string
  heroTitle?: string
  heroSubtitle?: string
  seoDescription?: string
  productCount: number
  covers: { image: string | null }[]
}

export async function getCollectionsList(): Promise<CollectionListItem[]> {
  try {
    return await withRetry(() => getSanityClient().fetch<CollectionListItem[]>(COLLECTIONS_LIST_QUERY, {}, {
      next: { revalidate: 3600, tags: ['collections'] },
    }))
  } catch {
    return []
  }
}
