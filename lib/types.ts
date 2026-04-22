// Sanity product type (matches schema)
export interface SanityProduct {
  _id: string
  name: string
  slug: string
  shortDescription?: string
  price?: number
  image?: string
  images?: string[]
  category?: string
  isNew?: boolean
  isBestSeller?: boolean
  heroTitle?: string
  heroSubtitle?: string
  heroCta?: string
  benefits?: Array<{ icon: string; title: string; description: string }>
  specifications?: Array<{ label: string; value: string }>
  testimonials?: Array<{ name: string; role: string; rating: number; text: string }>
  reviewsCount?: number
  ctaHeadline?: string
  ctaText?: string
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
