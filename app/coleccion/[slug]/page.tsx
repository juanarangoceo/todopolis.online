import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowDown } from 'lucide-react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { GlobalSearch } from '@/components/global-search'
import { ProductGrid } from '@/components/product-grid'
import { SuggestedProductsCarousel } from '@/components/product/suggested-products-carousel'
import { DestacadoFaq } from '@/components/product/destacados/destacado-faq'
import {
  DestacadoSection,
  DestacadoSectionHeader,
  DestacadoSplit,
} from '@/components/product/destacados/destacado-section-header'
import { WhatsAppIcon } from '@/components/whatsapp-icon'
import { advancePaymentEnabled } from '@/lib/payments/config'
import { relatedProducts } from '@/lib/related-products'
import { resolveWhatsAppPhone } from '@/lib/whatsapp'
import {
  getAllCollectionSlugs,
  getCollectionLandingBySlug,
  getSanityProducts,
  getSanityStoreSettings,
} from '@/lib/sanity/queries'

export const revalidate = 86400

function sanityOptimized(url: string, width: number): string {
  if (!url || !url.includes('cdn.sanity.io')) return url
  return `${url}?w=${width}&auto=format&q=80`
}

export async function generateStaticParams() {
  const slugs = await getAllCollectionSlugs()
  return slugs.map((s) => ({ slug: s.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const collection = await getCollectionLandingBySlug(slug)
  if (!collection) {
    return { title: 'Colección' }
  }
  // La IA escribe el `seoTitle` con «| Todopolis» al final, y la plantilla del
  // layout añade otro «| Todópolis»: salía «… | Todopolis | Todópolis».
  const title = (collection.seoTitle || (collection.heroTitle ?? collection.title)).replace(/\s*[|·-]\s*Tod[oó]polis\s*$/i, '')
  const description =
    collection.seoDescription || collection.heroSubtitle || collection.brandIntro || ''
  return {
    title,
    description,
    alternates: { canonical: `/coleccion/${slug}` },
    openGraph: {
      type: 'website',
      url: `/coleccion/${slug}`,
      title,
      description,
    },
  }
}

// Landing de una colección (rehecha el 24-sep-2026).
//
// Una colección es una GUÍA PARA ELEGIR: 3 a 6 productos del mismo tipo,
// comparados, para que el comprador se quede con uno. La página cuenta eso en
// orden: qué es → los productos → cómo elegir → la comparativa → lo que tienen
// en común → preguntas → cierre con WhatsApp.
//
// Antes tenía manchas difuminadas, degradados, una barrita de colores bajo
// cada título, un ancho distinto por sección, emojis en los beneficios, un
// botón ROJO que solo bajaba a la cuadrícula (el rojo es comprar) y una
// promesa falsa: «Despacho 24-48h». La política es 3 a 7 días hábiles
// (`store-policies.tsx`). Ahora usa las secciones de la ficha
// (`DestacadoSection`, `DestacadoSplit`), el mismo contenedor y ningún
// `max-w-*` propio.

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const collection = await getCollectionLandingBySlug(slug)

  if (!collection) notFound()

  const sanityProducts = collection.products ?? []
  const collectionIds = new Set(sanityProducts.map((p: any) => p._id))

  // Adaptar al shape `Product` que consume ProductGrid/ProductCard.
  const products = sanityProducts.map((p: any) => ({
    id: p._id,
    name: p.name,
    slug: p.slug,
    shortDescription: p.shortDescription ?? '',
    description: p.shortDescription ?? '',
    price: p.price ?? 0,
    originalPrice: p.originalPrice,
    image: p.mastershopImageUrl ?? p.image ?? '/placeholder.jpg',
    category: p.category ?? 'Otros',
    rating: 4.8,
    isNew: p.isNew ?? false,
    isBestSeller: p.isBestSeller ?? false,
    isDestacado: p.isDestacado ?? false,
    testimonials: p.testimonials ?? [],
    reviewsCount: p.reviewsCount,
    tags: p.tags ?? [],
  }))

  const [allProducts, storeSettings] = await Promise.all([
    getSanityProducts().catch(() => []),
    getSanityStoreSettings(),
  ])
  const catalog = allProducts
    .filter((p: any) => p.category?.toLowerCase() !== 'bienestar-intimo')
    .map((p: any) => ({
      id: p._id,
      name: p.name,
      slug: p.slug,
      shortDescription: p.shortDescription ?? '',
      description: p.shortDescription ?? '',
      price: p.price ?? 0,
      originalPrice: p.originalPrice,
      image: p.mastershopImageUrl ?? p.image ?? '/placeholder.jpg',
      category: p.category ?? 'Otros',
      rating: 4.8,
      isNew: p.isNew ?? false,
      isBestSeller: p.isBestSeller ?? false,
      isDestacado: p.isDestacado ?? false,
      reviewsCount: p.reviewsCount,
      tags: p.tags ?? [],
    }))

  // «Te puede interesar»: lo más parecido a la colección (su categoría más
  // común y sus etiquetas), no los 12 primeros del catálogo.
  const categoryCounts = new Map<string, number>()
  for (const p of products) categoryCounts.set(p.category, (categoryCounts.get(p.category) ?? 0) + 1)
  const mainCategory = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  const suggestedProducts = relatedProducts<(typeof catalog)[number]>(
    {
      id: `collection:${slug}`,
      category: mainCategory,
      price: products.length ? products.reduce((sum: number, p: any) => sum + p.price, 0) / products.length : undefined,
      tags: products.flatMap((p: any) => p.tags ?? []),
    },
    catalog.filter((p: any) => !collectionIds.has(p.id)),
  )

  const searchableProducts = catalog.map((p: any) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    shortDescription: p.shortDescription,
    price: p.price,
    image: p.image,
    category: p.category,
  }))

  const productNames = sanityProducts.map((p: any) => p.name as string)
  const heroThumbs = sanityProducts
    .map((p: any) => p.mastershopImageUrl ?? p.image)
    .filter(Boolean) as string[]
  // La fila «Precio» que escribe la IA se descarta: es el precio del día en
  // que se generó. Al final va siempre el de hoy.
  const comparisonRows = (collection.comparisonRows ?? []).filter(
    (r) => r.feature && Array.isArray(r.values) && r.values.length > 0 && !/precio/i.test(r.feature)
  )
  const benefits = (collection.segmentBenefits ?? []).filter((b) => b.title || b.description)
  const guide = (collection.buyersGuide ?? []).filter((g) => g.title || g.body)

  const n = products.length
  const prices = products.map((p: any) => p.price).filter((v: number) => v > 0)
  const priceFrom = prices.length ? Math.min(...prices) : null
  const cop = (v: number) => `$${v.toLocaleString('es-CO')}`

  const whatsappPhone = resolveWhatsAppPhone(storeSettings?.whatsappPhone, process.env.NEXT_PUBLIC_WHATSAPP_PHONE)
  const whatsappHref = whatsappPhone
    ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(`Hola, estoy mirando la colección «${collection.title}» y no sé cuál elegir.`)}`
    : null

  // Hechos de la tienda, con las cifras de `store-policies.tsx`.
  const facts = [
    advancePaymentEnabled() ? 'Pagas al recibir, o con Confío' : 'Pagas al recibir',
    'Llega en 3 a 7 días hábiles',
    'Envío $12.000 a todo el país',
  ]

  // ItemList: le dice a Google qué productos forman la colección.
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: collection.heroTitle ?? collection.title,
    numberOfItems: n,
    itemListElement: products.map((p: any, i: number) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://todopolis.online'}/producto/${p.slug}`,
      name: p.name,
    })),
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <Header />
      <GlobalSearch products={searchableProducts} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />

      <main className="flex-1">
        {/* ── Qué es: una guía para elegir ── */}
        <section className="border-b border-nav-inactive-border bg-surface">
          <div className="container mx-auto grid gap-8 px-4 py-8 md:py-12 lg:grid-cols-12 lg:items-center lg:gap-16">
            <div className="lg:col-span-6">
              <p className="mb-3 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                <span aria-hidden className="h-px w-6 bg-todopolis-lavender-deep/60" />
                <Link href="/colecciones" className="hover:text-ink-title">Colección</Link>
                {collection.heroEyebrow && <span className="normal-case tracking-normal">· {collection.heroEyebrow}</span>}
              </p>
              <h1 className="font-serif text-[1.75rem] font-extrabold leading-[1.12] tracking-[-0.02em] text-ink-title text-balance md:text-[2.5rem]">
                {collection.heroTitle ?? collection.title}
              </h1>
              {collection.heroSubtitle && (
                <p className="mt-4 text-base leading-relaxed text-foreground/75 md:text-lg">{collection.heroSubtitle}</p>
              )}
              <p className="mt-5 text-sm font-bold text-ink-title">
                {n} {n === 1 ? 'producto' : 'productos'} comparados
                {priceFrom && <span className="font-normal text-muted-foreground"> · desde {cop(priceFrom)}</span>}
              </p>
              <a
                href="#productos"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink-title px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
              >
                Ver los {n} productos
                <ArrowDown className="h-4 w-4" />
              </a>
              <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-semibold text-trust-fg">
                {facts.map((f) => (
                  <li key={f} className="flex items-center gap-1.5">
                    <span aria-hidden className="h-1 w-1 rounded-full bg-trust-fg" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {heroThumbs.length > 0 && (
              <div className="grid grid-cols-3 gap-2 md:gap-3 lg:col-span-6">
                {heroThumbs.slice(0, 3).map((src, i) => (
                  <div
                    key={i}
                    className={`relative aspect-[4/5] overflow-hidden rounded-2xl bg-surface-muted ${heroThumbs.length <= 2 ? 'col-span-3 sm:col-span-1' : ''}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={sanityOptimized(src, 400)} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Por qué esta colección ── */}
        {collection.brandIntro && (
          <DestacadoSection>
            <DestacadoSplit header={<DestacadoSectionHeader eyebrow="Por qué esta colección" title="Lo que necesitas saber" />}>
              <p className="text-base leading-relaxed text-foreground/80 md:text-lg">{collection.brandIntro}</p>
            </DestacadoSplit>
          </DestacadoSection>
        )}

        {/* ── Los productos ── */}
        <DestacadoSection tone="soft" id="productos" className="scroll-mt-20">
          <DestacadoSectionHeader eyebrow="La colección" title={n === 1 ? 'El producto' : `Los ${n} productos`} />
          {n === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="mb-4 text-muted-foreground">Esta colección aún no tiene productos.</p>
              <Link href="/" className="rounded-full bg-ink-title px-5 py-2.5 text-sm font-bold text-white hover:opacity-90">
                Ir al catálogo
              </Link>
            </div>
          ) : (
            <ProductGrid products={products} />
          )}
        </DestacadoSection>

        {/* ── Cómo elegir ── */}
        {guide.length > 0 && (
          <DestacadoSection>
            <DestacadoSplit header={<DestacadoSectionHeader eyebrow="Guía" title="Cómo elegir el tuyo" />}>
              <ol className="divide-y divide-nav-inactive-border">
                {guide.map((g, i) => (
                  <li key={g._key ?? i} className="flex gap-5 py-5 first:pt-0 last:pb-0">
                    <span className="w-6 shrink-0 font-serif text-sm font-extrabold tabular-nums text-muted-foreground">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      {g.title && <h3 className="font-serif text-lg font-extrabold text-ink-title">{g.title}</h3>}
                      {g.body && <p className="mt-1 text-sm leading-relaxed text-foreground/75 md:text-base">{g.body}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </DestacadoSplit>
          </DestacadoSection>
        )}

        {/* ── Comparativa ── */}
        {comparisonRows.length > 0 && productNames.length > 0 && (
          <DestacadoSection tone="soft">
            <DestacadoSectionHeader eyebrow="Comparativa" title="Uno al lado del otro" />
            <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
              <table className="w-full min-w-[560px] border-collapse overflow-hidden rounded-3xl border border-nav-inactive-border bg-surface text-sm">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-surface px-4 py-4 text-left text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      &nbsp;
                    </th>
                    {productNames.map((name, i) => (
                      <th key={i} className="min-w-[140px] border-l border-nav-inactive-border px-4 py-4 text-left font-bold text-ink-title">
                        <Link href={`/producto/${products[i]?.slug}`} className="hover:text-todopolis-lavender-deep">{name}</Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, i) => (
                    <tr key={row._key ?? i}>
                      <td className="sticky left-0 z-10 whitespace-nowrap border-t border-nav-inactive-border bg-surface px-4 py-3.5 font-semibold text-foreground/70">
                        {row.feature}
                      </td>
                      {productNames.map((_, j) => (
                        <td key={j} className="border-l border-t border-nav-inactive-border px-4 py-3.5 text-foreground/80">
                          {row.values?.[j] ?? '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr>
                    <td className="sticky left-0 z-10 border-t border-nav-inactive-border bg-surface px-4 py-3.5 font-semibold text-foreground/70">Precio</td>
                    {products.map((p: any, j: number) => (
                      <td key={j} className="border-l border-t border-nav-inactive-border px-4 py-3.5 font-extrabold tabular-nums text-ink-title">
                        {p.price > 0 ? cop(p.price) : '—'}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </DestacadoSection>
        )}

        {/* ── Lo que tienen en común ── */}
        {benefits.length > 0 && (
          <DestacadoSection>
            <DestacadoSplit header={<DestacadoSectionHeader eyebrow="En común" title="Lo que tienen todos" />}>
              <ol className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
                {benefits.map((b, i) => (
                  <li key={b._key ?? i} className="border-t border-nav-inactive-border pt-4">
                    <span className="font-serif text-sm font-extrabold tabular-nums text-muted-foreground">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {b.title && <h3 className="mt-1 font-serif text-lg font-extrabold text-ink-title">{b.title}</h3>}
                    {b.description && <p className="mt-1 text-sm leading-relaxed text-foreground/75">{b.description}</p>}
                  </li>
                ))}
              </ol>
            </DestacadoSplit>
          </DestacadoSection>
        )}

        {/* ── Preguntas ── */}
        {collection.faqs && collection.faqs.length > 0 && <DestacadoFaq faqs={collection.faqs} />}

        {/* ── Cierre: si todavía no sabe cuál, que pregunte ── */}
        <DestacadoSection tone="soft">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-serif text-2xl font-extrabold leading-tight tracking-[-0.02em] text-ink-title text-balance md:text-[2rem]">
                {collection.ctaHeadline ?? '¿Todavía no sabes cuál?'}
              </h2>
              <p className="mt-2 max-w-xl text-base leading-relaxed text-foreground/75">
                {collection.ctaText ?? 'Cuéntanos para qué lo quieres y te decimos cuál te sirve.'}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
                >
                  <WhatsAppIcon className="h-4 w-4" />
                  Pregúntanos por WhatsApp
                </a>
              )}
              <a
                href="#productos"
                className="inline-flex items-center gap-2 rounded-full border border-nav-inactive-border bg-surface px-6 py-3 text-sm font-bold text-ink-title transition-shadow hover:shadow-sm"
              >
                Volver a los productos
              </a>
            </div>
          </div>
        </DestacadoSection>

        {/* ── Te puede interesar ── */}
        {suggestedProducts.length > 0 && (
          <DestacadoSection>
            <DestacadoSectionHeader eyebrow="Sigue mirando" title="Te puede interesar" />
            <SuggestedProductsCarousel products={suggestedProducts} />
          </DestacadoSection>
        )}
      </main>

      <Footer />
    </div>
  )
}
