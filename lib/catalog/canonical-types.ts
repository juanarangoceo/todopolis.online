export type CatalogEventType =
  | 'product.upsert'
  | 'product.archive'
  | 'product.restore'

export type CatalogProductStatus = 'active' | 'draft' | 'archived'

export type CatalogVariant = {
  external_id: string
  title: string
  sku: string | null
  price: number | null
  stock: number | null
  enabled: boolean
}

export type CanonicalCatalogProduct = {
  external_id: string
  sanity_id: string
  mastershop_id: number | null
  slug: string
  title: string
  description: string | null
  currency: 'COP'
  price: number
  price_min: number
  price_max: number
  compare_at_price: number | null
  brand: string | null
  category: string | null
  tags: string[]
  sku: string | null
  stock_total: number | null
  track_stock: boolean
  variants: CatalogVariant[]
  image_url: string | null
  image_urls: string[]
  video_urls: string[]
  specifications: Array<{ label: string; value: string }>
  benefits: Array<{ title: string; description: string }>
  faqs: Array<{ question: string; answer: string }>
  testimonials: Array<{ name: string; role: string; rating: number | null; text: string }>
  sales_content: Record<string, unknown>
  status: CatalogProductStatus
  source_updated_at: string
  content_hash: string
}

export type CatalogEvent = {
  contract_version: 'catalog.v1'
  event_id: string
  event_type: CatalogEventType
  occurred_at: string
  product: CanonicalCatalogProduct & { source_version: number }
}
