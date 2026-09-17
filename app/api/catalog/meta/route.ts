import { getSanityProducts } from '@/lib/sanity/queries'

// Feed de catálogo para Meta Commerce Manager (CSV).
//
// Lo consume Meta por «obtención programada»: se pega esta URL en el catálogo y
// Meta la descarga cada día. Habilita anuncios de catálogo (Advantage+), el
// retargeting dinámico de producto y las colecciones.
//
// CSV y no XML porque Meta acepta los dos y este se puede abrir en una hoja de
// cálculo cuando algo no cuadra.
//
// SE EXCLUYE BIENESTAR ÍNTIMO. Meta no permite anunciar productos para adultos:
// meterlos en el catálogo hace que rechacen artículos y, repetido, pone en
// riesgo la cuenta entera. Es el mismo criterio con el que esos productos ya
// están fuera del sitemap, de llms.txt y del Píxel.
//
// URL pública a propósito: Meta la descarga desde sus servidores sin
// autenticación posible. No expone nada que no esté ya en la tienda — son los
// mismos datos de las fichas, que son públicas e indexables.

export const revalidate = 3600

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://todopolis.online'

const HEADERS = [
  'id',
  'title',
  'description',
  'availability',
  'condition',
  'price',
  'sale_price',
  'link',
  'image_link',
  'brand',
  'product_type',
] as const

/** Escapa un campo para CSV: comillas dobladas y el valor entre comillas. */
function csv(value: unknown): string {
  const v = String(value ?? '').replace(/\s+/g, ' ').trim()
  return `"${v.replace(/"/g, '""')}"`
}

/** Meta quiere «129000.00 COP», con el importe y la divisa en el mismo campo. */
function money(cop: number): string {
  return `${cop.toFixed(2)} COP`
}

interface FeedProduct {
  _id: string
  name?: string
  slug?: string
  shortDescription?: string
  price?: number
  originalPrice?: number
  image?: string
  mastershopImageUrl?: string
  category?: string
}

export async function GET() {
  const products = (await getSanityProducts()) as FeedProduct[]

  const rows = products
    .filter((p) => {
      if (!p.slug || !p.name) return false
      // Adultos fuera, por política de Meta.
      if (p.category?.toLowerCase() === 'bienestar-intimo') return false
      // Meta rechaza artículos sin precio o sin imagen, y un artículo rechazado
      // cuenta en la tasa de errores del catálogo. Mejor no mandarlo.
      if (!p.price || p.price <= 0) return false
      if (!(p.mastershopImageUrl || p.image)) return false
      return true
    })
    .map((p) => {
      const hasDiscount = !!p.originalPrice && p.originalPrice > (p.price ?? 0)
      return [
        csv(p._id),
        csv(p.name),
        // Meta exige descripción; el nombre es el respaldo razonable cuando la
        // ficha no tiene texto corto.
        csv(p.shortDescription || p.name),
        csv('in stock'),
        csv('new'),
        // Con descuento, `price` es el de antes y `sale_price` el de ahora: así
        // Meta pinta el tachado. Sin descuento, `sale_price` va vacío.
        csv(money(hasDiscount ? (p.originalPrice as number) : (p.price as number))),
        csv(hasDiscount ? money(p.price as number) : ''),
        csv(`${BASE_URL}/producto/${p.slug}`),
        csv(p.mastershopImageUrl || p.image),
        csv('Todópolis'),
        csv(p.category ?? ''),
      ].join(',')
    })

  const body = [HEADERS.join(','), ...rows].join('\n')

  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'inline; filename="todopolis-meta-catalog.csv"',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
