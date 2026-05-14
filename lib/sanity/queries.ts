import { getSanityClient } from './client'
import { SanityArticle } from '../types'

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
  reviewsCount
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

// GROQ query to get all slugs (for generateStaticParams)
const ALL_SLUGS_QUERY = `*[_type == "product" && defined(slug.current)]{ "slug": slug.current }`

export async function getSanityProducts() {
  try {
    return await getSanityClient().fetch(PRODUCTS_LIST_QUERY, {}, {
      next: { revalidate: 86400, tags: ['products'] },
    })
  } catch {
    return []
  }
}

export async function getSanityProductBySlug(slug: string) {
  try {
    return await getSanityClient().fetch(PRODUCT_DETAIL_QUERY, { slug }, {
      next: { revalidate: 86400, tags: ['products', `product-${slug}`] },
    })
  } catch {
    return null
  }
}

export async function getAllProductSlugs(): Promise<{ slug: string }[]> {
  try {
    return await getSanityClient().fetch(ALL_SLUGS_QUERY, {}, {
      next: { revalidate: 86400, tags: ['products'] },
    })
  } catch {
    return []
  }
}

export async function getSanityStoreSettings() {
  try {
    return await getSanityClient().fetch(`*[_type == "storeSettings"][0] {
      _id,
      heroTitle,
      heroSubtitle,
      policies
    }`, {}, {
      next: { revalidate: 86400, tags: ['storeSettings'] },
    })
  } catch {
    return null
  }
}

export async function getSanityHeroBanner() {
  try {
    return await getSanityClient().fetch(HERO_BANNER_QUERY, {}, {
      next: { revalidate: 3600, tags: ['heroBanner'] },
    })
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

const ALL_ARTICLE_SLUGS_QUERY = `*[_type == "article" && defined(slug.current)]{ "slug": slug.current }`

export async function getArticles(): Promise<SanityArticle[]> {
  try {
    return await getSanityClient().fetch(ARTICLES_LIST_QUERY, {}, {
      next: { revalidate: 3600, tags: ['articles'] },
    })
  } catch {
    return []
  }
}

export async function getArticleBySlug(slug: string): Promise<SanityArticle | null> {
  try {
    return await getSanityClient().fetch(ARTICLE_DETAIL_QUERY, { slug }, {
      next: { revalidate: 86400, tags: ['articles', `article-${slug}`] },
    })
  } catch {
    return null
  }
}

export async function getAllArticleSlugs(): Promise<{ slug: string }[]> {
  try {
    return await getSanityClient().fetch(ALL_ARTICLE_SLUGS_QUERY, {}, {
      next: { revalidate: 3600, tags: ['articles'] },
    })
  } catch {
    return []
  }
}
