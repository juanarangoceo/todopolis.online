import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ShieldCheck, Truck, Clock, ArrowRight } from 'lucide-react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { GlobalSearch } from '@/components/global-search'
import { ProductGrid } from '@/components/product-grid'
import { ProductFaq } from '@/components/product/product-faq'
import { SuggestedProductsCarousel } from '@/components/product/suggested-products-carousel'
import { getAllCollectionSlugs, getCollectionLandingBySlug, getSanityProducts } from '@/lib/sanity/queries'

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
    return { title: 'Colección — Todopolis' }
  }
  const title = collection.seoTitle || `${collection.heroTitle ?? collection.title} — Todopolis`
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

// Encabezado de sección con la barra-gradiente de marca.
function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="text-center mb-10">
      <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground">{title}</h2>
      <div className="mx-auto mt-3 h-1 w-16 rounded-full bg-gradient-to-r from-todopolis-blue to-todopolis-lavender" />
      {subtitle && (
        <p className="text-muted-foreground text-sm md:text-base mt-3 max-w-2xl mx-auto">{subtitle}</p>
      )}
    </div>
  )
}

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
    isVip: p.isVip ?? false,
    testimonials: p.testimonials ?? [],
    reviewsCount: p.reviewsCount,
    tags: p.tags ?? [],
  }))

  // Todos los productos → búsqueda del header + carrusel de sugerencias.
  const allProducts = await getSanityProducts().catch(() => [])
  const otherProducts = allProducts
    .filter((p: any) => !collectionIds.has(p._id) && p.category?.toLowerCase() !== 'bienestar-intimo')
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
      reviewsCount: p.reviewsCount,
    }))
  const suggestedProducts = otherProducts.slice(0, 12)

  const searchableProducts = allProducts
    .filter((p: any) => p.category?.toLowerCase() !== 'bienestar-intimo')
    .map((p: any) => ({
      id: p._id,
      name: p.name,
      slug: p.slug,
      shortDescription: p.shortDescription ?? '',
      price: p.price ?? 0,
      image: p.mastershopImageUrl ?? p.image ?? '/placeholder.jpg',
      category: p.category ?? 'Otros',
    }))

  const productNames = sanityProducts.map((p: any) => p.name as string)
  const heroThumbs = sanityProducts
    .map((p: any) => p.mastershopImageUrl ?? p.image)
    .filter(Boolean) as string[]
  const comparisonRows = (collection.comparisonRows ?? []).filter(
    (r) => r.feature && Array.isArray(r.values) && r.values.length > 0
  )

  // ── Bloques reutilizables (desktop dos columnas / mobile apilado) ──

  // Collage de productos (columna visual del hero).
  const heroCollage = heroThumbs.length > 0 && (
    <div className="grid grid-cols-2 gap-3">
      {heroThumbs.slice(0, 4).map((src, i) => (
        <div
          key={i}
          className={`relative overflow-hidden rounded-2xl bg-surface-muted border border-border shadow-sm aspect-square ${heroThumbs.length === 3 && i === 0 ? 'col-span-2 aspect-[2/1]' : ''}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sanityOptimized(src, 500)} alt="" className="w-full h-full object-cover" />
        </div>
      ))}
    </div>
  )

  // Info del hero (eyebrow, título, subtítulo, conteo, CTA, confianza).
  const heroInfo = (
    <div>
      {collection.heroEyebrow && (
        <span className="inline-block mb-4 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-tag-active-bg text-tag-active-fg shadow-sm">
          {collection.heroEyebrow}
        </span>
      )}
      <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4 leading-[1.08] text-balance">
        {collection.heroTitle ?? collection.title}
      </h1>
      {collection.heroSubtitle && (
        <p className="text-foreground/70 text-base md:text-lg mb-6 leading-relaxed">
          {collection.heroSubtitle}
        </p>
      )}
      <p className="text-sm font-semibold text-foreground/60 mb-6">
        {products.length} {products.length === 1 ? 'producto curado' : 'productos curados'} en esta colección
      </p>
      {collection.heroCta && (
        <a
          href="#productos"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-cta text-cta-fg font-bold shadow-lg shadow-cta-ring hover:bg-cta-hover hover:-translate-y-0.5 transition-all"
        >
          {collection.heroCta}
          <ArrowRight className="w-4 h-4" />
        </a>
      )}
      <div className="flex flex-wrap items-center gap-2.5 mt-7">
        {[
          { icon: ShieldCheck, label: 'Pago contraentrega' },
          { icon: Truck, label: 'Envío a todo Colombia' },
          { icon: Clock, label: 'Despacho 24-48h' },
        ].map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-trust-bg text-xs font-bold text-trust-fg border border-trust-border shadow-sm"
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </div>
        ))}
      </div>
    </div>
  )

  // Intro de marca.
  const brandIntroBlock = collection.brandIntro && (
    <div className="relative rounded-3xl bg-gradient-to-br from-todopolis-blue/10 to-todopolis-lavender/15 border border-border p-7 md:p-9 shadow-sm">
      <p className="text-foreground/80 text-base md:text-lg leading-relaxed">{collection.brandIntro}</p>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <Header />
      <GlobalSearch products={searchableProducts} />

      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="relative overflow-hidden">
          {/* Blobs decorativos de marca */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-b from-todopolis-lavender/20 via-surface to-surface" />
            <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-todopolis-blue/25 blur-3xl" />
            <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-todopolis-pink/25 blur-3xl" />
          </div>

          <div className="container mx-auto px-4 pt-8 md:pt-12 pb-10">
            {/* Desktop: dos columnas — collage sticky + info */}
            <div className="hidden lg:grid lg:grid-cols-2 gap-12 items-start">
              <div className="lg:sticky lg:top-24 lg:self-start">{heroCollage}</div>
              <div>{heroInfo}</div>
            </div>

            {/* Mobile: apilado — collage arriba, info abajo */}
            <div className="lg:hidden space-y-7 max-w-xl mx-auto text-center">
              {heroCollage && <div className="text-left">{heroCollage}</div>}
              <div className="[&_h1]:text-balance">{heroInfo}</div>
            </div>
          </div>
        </section>

        {/* ── Intro de marca ── */}
        {brandIntroBlock && (
          <section className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">{brandIntroBlock}</div>
          </section>
        )}

        {/* ── Grid de productos ── */}
        <section id="productos" className="container mx-auto px-4 py-12 scroll-mt-24">
          <SectionHeading
            title="La colección"
            subtitle={`${products.length} ${products.length === 1 ? 'producto seleccionado' : 'productos seleccionados'} para ti`}
          />
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-foreground/60 mb-4">Esta colección aún no tiene productos.</p>
              <Link
                href="/"
                className="px-5 py-2.5 rounded-full bg-foreground/90 text-white font-bold text-sm hover:bg-foreground transition-colors"
              >
                Ir al catálogo
              </Link>
            </div>
          ) : (
            <ProductGrid products={products} />
          )}
        </section>

        {/* ── Beneficios del segmento ── */}
        {collection.segmentBenefits && collection.segmentBenefits.length > 0 && (
          <section className="py-12 bg-surface-soft">
            <div className="container mx-auto px-4">
              <SectionHeading title="Por qué comprar aquí" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5 max-w-4xl mx-auto">
                {collection.segmentBenefits.map((b, i) => (
                  <div
                    key={b._key ?? i}
                    className="group flex items-start gap-4 p-5 md:p-6 rounded-2xl bg-surface border border-nav-inactive-border shadow-sm hover:shadow-md hover:border-todopolis-lavender/40 hover:-translate-y-0.5 transition-all duration-300"
                  >
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-todopolis-blue/15 to-todopolis-lavender/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300">
                      {b.icon || '✨'}
                    </div>
                    <div className="min-w-0 flex-1">
                      {b.title && <h3 className="font-bold text-foreground mb-1 leading-snug">{b.title}</h3>}
                      {b.description && (
                        <p className="text-muted-foreground text-sm leading-relaxed">{b.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Guía de compra ── */}
        {collection.buyersGuide && collection.buyersGuide.length > 0 && (
          <section className="container mx-auto px-4 py-12">
            <SectionHeading title="Cómo elegir" subtitle="La guía rápida para acertar con tu compra" />
            <div className="max-w-3xl mx-auto space-y-4">
              {collection.buyersGuide.map((g, i) => (
                <div
                  key={g._key ?? i}
                  className="flex gap-5 p-5 md:p-6 rounded-2xl bg-surface border border-nav-inactive-border shadow-sm"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-todopolis-blue to-todopolis-lavender text-white font-bold flex items-center justify-center shadow-sm">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1 pt-1">
                    {g.title && (
                      <h3 className="font-serif font-bold text-lg text-foreground mb-1">{g.title}</h3>
                    )}
                    {g.body && (
                      <p className="text-muted-foreground text-sm md:text-base leading-relaxed">{g.body}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Tabla comparativa ── */}
        {comparisonRows.length > 0 && productNames.length > 0 && (
          <section className="py-12 bg-surface-soft">
            <div className="container mx-auto px-4">
              <SectionHeading title="Compara los modelos" subtitle="Encuentra el que mejor encaja contigo" />
              <div className="max-w-5xl mx-auto overflow-x-auto rounded-3xl border border-border shadow-sm bg-surface">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-10 bg-surface-muted text-left font-bold text-foreground/70 px-4 py-4 whitespace-nowrap">
                        Característica
                      </th>
                      {productNames.map((name, i) => (
                        <th
                          key={i}
                          className="text-left font-bold text-foreground px-4 py-4 min-w-[130px] bg-gradient-to-br from-todopolis-blue/15 to-todopolis-lavender/20 border-l border-border"
                        >
                          {name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map((row, i) => (
                      <tr key={row._key ?? i} className={i % 2 === 1 ? 'bg-surface-soft/60' : ''}>
                        <td className="sticky left-0 z-10 bg-inherit font-semibold text-foreground/70 px-4 py-3.5 whitespace-nowrap border-t border-border">
                          {row.feature}
                        </td>
                        {productNames.map((_, j) => (
                          <td key={j} className="text-foreground/80 px-4 py-3.5 border-t border-l border-border">
                            {row.values?.[j] ?? '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ── FAQ (componente de marca reutilizado) ── */}
        {collection.faqs && collection.faqs.length > 0 && <ProductFaq faqs={collection.faqs} />}

        {/* ── CTA final ── */}
        {(collection.ctaHeadline || collection.ctaText) && (
          <section className="py-12 md:py-16 relative overflow-hidden">
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-accent-aspirational/10 via-surface to-accent-trust/10" />
            <div className="container mx-auto px-4">
              <div className="max-w-2xl mx-auto text-center">
                {collection.ctaHeadline && (
                  <h2 className="font-serif text-3xl md:text-5xl font-bold text-foreground mb-4 text-balance">
                    {collection.ctaHeadline}
                  </h2>
                )}
                {collection.ctaText && (
                  <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">{collection.ctaText}</p>
                )}
                <a
                  href="#productos"
                  className="inline-flex items-center gap-2 px-9 py-4 rounded-full bg-cta text-cta-fg font-bold text-lg shadow-lg shadow-cta-ring hover:bg-cta-hover hover:-translate-y-0.5 transition-all"
                >
                  {collection.heroCta ?? 'Ver la colección'}
                  <ArrowRight className="w-5 h-5" />
                </a>
              </div>
            </div>
          </section>
        )}

        {/* ── Sugerencias: productos que te pueden interesar ── */}
        {suggestedProducts.length > 0 && (
          <section className="pt-6 pb-14 md:pb-20 bg-surface-soft">
            <div className="container mx-auto px-4">
              <div className="text-center mb-8">
                <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-3">
                  Productos que te pueden interesar
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Sigue explorando nuestra selección de productos de alta calidad.
                </p>
              </div>
              <SuggestedProductsCarousel products={suggestedProducts} />
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  )
}
