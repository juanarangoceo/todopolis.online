import { getSanityClient } from './client'

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
  benefits,
  specifications,
  testimonials,
  reviewsCount,
  ctaHeadline,
  ctaText
}`

const STORE_SETTINGS_QUERY = `*[_type == "storeSettings"][0] {
  _id,
  policies
}`

const HERO_BANNER_QUERY = `*[_type == "heroBanner"][0] | order(_updatedAt desc) {
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
    return await getSanityClient().fetch(STORE_SETTINGS_QUERY, {}, {
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
