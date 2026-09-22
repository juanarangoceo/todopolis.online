import type { QuantityOffer } from './quantity-offers'

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

// ─── Destacados — contenido manual extendido (editorial) ────────────────────────────
// Estos tipos están en perfecta paridad con sanity/schemaTypes/product.ts.

export interface DestacadoHeroVideo {
  url?: string
  posterImage?: string
  caption?: string
}

export interface DestacadoBeforeAfterPair {
  _key?: string
  beforeImage?: string
  beforeImageAlt?: string
  afterImage?: string
  afterImageAlt?: string
  caption?: string
}

export interface DestacadoStep {
  _key?: string
  image?: string
  imageAlt?: string
  title: string
  description?: string
}

export interface DestacadoBoxContents {
  title?: string
  image?: string
  imageAlt?: string
  intro?: string
  items?: string[]
}

export interface VipComparisonRow {
  _key?: string
  feature: string
  ours?: string
  theirs?: string
}

export interface DestacadoComparison {
  title?: string
  ourLabel?: string
  theirLabel?: string
  rows?: VipComparisonRow[]
}

/**
 * Columna vertebral editorial de una landing de campaña. Los tres momentos no
 * son componentes decorativos: obligan al editor a conectar la situación del
 * comprador con el mecanismo del producto y el resultado esperado.
 */
export interface DestacadoStory {
  eyebrow?: string
  problemTitle?: string
  problemText?: string
  turningPointTitle?: string
  turningPointText?: string
  outcomeTitle?: string
  outcomeText?: string
}

export interface ImageDimensions {
  width: number
  height: number
}

/** Banner a todo el ancho bajo el hero de un Destacado. */
export interface DestacadoBanner {
  desktop?: string
  desktopDimensions?: ImageDimensions
  mobile?: string
  mobileDimensions?: ImageDimensions
  alt?: string
}

/** Foto extra de la galería lifestyle (se suma a `aiLifestyleImage`). */
export interface LifestyleGalleryImage {
  _key?: string
  url?: string
  alt?: string
}

// Sanity product type (matches schema)
/** Foto que mandó un cliente, con el crédito opcional que quiera dársele. */
export interface CustomerPhoto {
  _key?: string
  url?: string
  customerName?: string
  city?: string
  /** Lo que escribió el cliente, textual. Nunca redactado por la tienda. */
  quote?: string
  alt?: string
}

/** «¿Es para ti?»: para quién sí y para quién no. Lo escribe la IA. */
export interface AudienceFit {
  forWho?: string[]
  notFor?: string[]
}

export interface SanityProduct {
  _id: string
  /** Fecha de creación en Sanity. La usa la sección de novedades. */
  _createdAt?: string
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
  aiLifestyleGallery?: LifestyleGalleryImage[]
  benefits?: Array<{ icon: string; title: string; description: string }>
  specifications?: Array<{ label: string; value: string }>
  testimonials?: Array<{ name?: string; role?: string; rating?: number; text: string }>
  reviewsCount?: number
  ctaHeadline?: string
  ctaText?: string
  articleSlug?: string
  articleTopic?: string
  offerName?: string
  offerEndsAt?: string
  faqs?: Array<{ _key?: string; question: string; answer: string }>
  /**
   * Fotos REALES que mandan los clientes al recibir el producto. Nada que ver
   * con `testimonials`, que los escribe la IA: estas son la única prueba
   * social auténtica de la ficha, y por eso se guardan y se pintan aparte.
   */
  customerPhotos?: CustomerPhoto[]
  quantityOffers?: QuantityOffer[]
  audienceFit?: AudienceFit
  // Destacados — manual
  isDestacado?: boolean
  destacadoHeadline?: string
  destacadoBanner?: DestacadoBanner
  destacadoHeroVideo?: DestacadoHeroVideo
  destacadoBeforeAfter?: DestacadoBeforeAfterPair[]
  destacadoSteps?: DestacadoStep[]
  destacadoBoxContents?: DestacadoBoxContents
  destacadoComparison?: DestacadoComparison
  destacadoStory?: DestacadoStory
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
  testimonials?: { name?: string; role?: string; rating?: number; text: string }[]
  reviewsCount?: number
  heroTitle?: string
  heroSubtitle?: string
  heroCta?: string
  ctaHeadline?: string
  ctaText?: string
  tags?: ProductTag[]
  quantityOffers?: QuantityOffer[]
  // Destacados — manual (igual que SanityProduct, replicado aquí para el shape adaptado del producto)
  isDestacado?: boolean
  destacadoHeadline?: string
  destacadoBanner?: DestacadoBanner
  destacadoHeroVideo?: DestacadoHeroVideo
  destacadoBeforeAfter?: DestacadoBeforeAfterPair[]
  destacadoSteps?: DestacadoStep[]
  destacadoBoxContents?: DestacadoBoxContents
  destacadoComparison?: DestacadoComparison
  destacadoStory?: DestacadoStory
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
