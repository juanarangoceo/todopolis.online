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
  sections?: ArticleSection[]
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

export interface HeroBanner {
  _id: string
  title: string
  subtitle?: string
  backgroundColor?: string
  products: SanityProduct[]
}
