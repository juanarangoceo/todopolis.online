export interface ArticleSection {
  _key?: string
  type: 'intro' | 'h2' | 'list' | 'faq' | 'cta'
  heading?: string
  content?: string
  items?: string[]
  buttonText?: string
  faqs?: { _key?: string; question: string; answer: string }[]
}

export interface SanityArticle {
  _id: string
  title: string
  slug: string
  topic?: string
  seoDescription?: string
  seoKeywords?: string[]
  readingTime?: number
  category?: string
  publishedAt?: string
  productSlug?: string
  productName?: string
  productImage?: string
  _updatedAt?: string
  sections?: ArticleSection[]
}

// Variante de producto sincronizada desde Mastershop
export interface ProductVariant {
  _key?: string
  idVariant: number
  name: string
  sku?: string
  price?: number
  stock?: number
  isEnable?: boolean
}

// ─── VIP — contenido manual extendido (editorial) ────────────────────────────
// Estos tipos están en perfecta paridad con sanity/schemaTypes/product.ts.

export interface VipHeroVideo {
  url?: string
  posterImage?: string
  caption?: string
}

export interface VipBeforeAfterPair {
  _key?: string
  beforeImage?: string
  beforeImageAlt?: string
  afterImage?: string
  afterImageAlt?: string
  caption?: string
}

export interface VipStep {
  _key?: string
  image?: string
  imageAlt?: string
  title: string
  description?: string
}

export interface VipBoxContents {
  title?: string
  image?: string
  imageAlt?: string
  intro?: string
  items?: string[]
}

export interface VipVisualTestimonial {
  _key?: string
  photo?: string
  photoAlt?: string
  quote: string
  name: string
  location?: string
}

export interface VipComparisonRow {
  _key?: string
  feature: string
  ours?: string
  theirs?: string
}

export interface VipComparison {
  title?: string
  ourLabel?: string
  theirLabel?: string
  rows?: VipComparisonRow[]
}

export interface VipQuote {
  _key?: string
  text: string
  author?: string
}

// Sanity product type (matches schema)
export interface SanityProduct {
  _id: string
  name: string
  slug: string
  shortDescription?: string
  price?: number
  image?: string
  mastershopImageUrl?: string
  images?: string[]
  variants?: ProductVariant[]
  category?: string
  isNew?: boolean
  isBestSeller?: boolean
  heroTitle?: string
  heroSubtitle?: string
  heroCta?: string
  aiLifestyleImage?: string
  benefits?: Array<{ icon: string; title: string; description: string }>
  specifications?: Array<{ label: string; value: string }>
  testimonials?: Array<{ name: string; role: string; rating: number; text: string }>
  reviewsCount?: number
  ctaHeadline?: string
  ctaText?: string
  articleSlug?: string
  articleTopic?: string
  offerName?: string
  offerEndsAt?: string
  faqs?: Array<{ _key?: string; question: string; answer: string }>
  // VIP — manual
  isVip?: boolean
  vipHeroVideo?: VipHeroVideo
  vipBeforeAfter?: VipBeforeAfterPair[]
  vipSteps?: VipStep[]
  vipBoxContents?: VipBoxContents
  vipTestimonials?: VipVisualTestimonial[]
  vipComparison?: VipComparison
  vipQuotes?: VipQuote[]
}

// Legacy mock type (keep for backward compat during transition)
export interface Product {
  id: string
  name: string
  slug?: string
  shortDescription: string
  description: string
  price: number
  originalPrice?: number
  image: string
  mastershopImageUrl?: string
  images?: string[]
  variants?: ProductVariant[]
  category: string
  rating: number
  reviews?: Review[]
  isNew?: boolean
  isBestSeller?: boolean
  discount?: number
  features?: string[]
  specifications?: { label: string; value: string }[]
  benefits?: { icon: string; title: string; description: string }[]
  testimonials?: { name: string; role: string; rating: number; text: string }[]
  reviewsCount?: number
  heroTitle?: string
  heroSubtitle?: string
  heroCta?: string
  ctaHeadline?: string
  ctaText?: string
  tags?: ProductTag[]
  // VIP — manual (igual que SanityProduct, replicado aquí para el shape adaptado del producto)
  isVip?: boolean
  vipHeroVideo?: VipHeroVideo
  vipBeforeAfter?: VipBeforeAfterPair[]
  vipSteps?: VipStep[]
  vipBoxContents?: VipBoxContents
  vipTestimonials?: VipVisualTestimonial[]
  vipComparison?: VipComparison
  vipQuotes?: VipQuote[]
}

export interface ProductTag {
  slug: string
  name: string
  group: string
  icon?: string
}

export interface TagTaxonomyEntry extends ProductTag {
  _id: string
  priority?: number
  isFeatured?: boolean
}

export interface Review {
  id: string
  userName: string
  rating: number
  comment: string
  date: string
}

export interface StorePolicy {
  iconName: string
  title: string
  description: string
}

export interface StoreSettings {
  _id: string
  heroTitle?: string
  heroSubtitle?: string
  policies: StorePolicy[]
}

