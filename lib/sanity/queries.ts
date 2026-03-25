import { sanityClient } from './client'

// GROQ query for a list of products (for home page cards)
const PRODUCTS_LIST_QUERY = `*[_type == "product" && defined(slug.current)] | order(_createdAt desc) {
  _id,
  name,
  "slug": slug.current,
  shortDescription,
  price,
  originalPrice,
  "image": images[0].asset->url,
  category,
  isNew,
  isBestSeller,
  heroTitle
}`

// GROQ query for a single product (for landing page)
const PRODUCT_DETAIL_QUERY = `*[_type == "product" && slug.current == $slug][0] {
  _id,
  name,
  "slug": slug.current,
  shortDescription,
  price,
  originalPrice,
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
  ctaHeadline,
  ctaText
}`

// GROQ query to get all slugs (for generateStaticParams)
const ALL_SLUGS_QUERY = `*[_type == "product" && defined(slug.current)]{ "slug": slug.current }`

export async function getSanityProducts() {
  return sanityClient.fetch(PRODUCTS_LIST_QUERY, {}, {
    next: { revalidate: 86400, tags: ['products'] }, // 24h cache, webhook invalida al instante
  })
}

export async function getSanityProductBySlug(slug: string) {
  return sanityClient.fetch(PRODUCT_DETAIL_QUERY, { slug }, {
    next: { revalidate: 86400, tags: ['products', `product-${slug}`] },
  })
}

export async function getAllProductSlugs(): Promise<{ slug: string }[]> {
  return sanityClient.fetch(ALL_SLUGS_QUERY, {}, {
    next: { revalidate: 86400, tags: ['products'] },
  })
}
