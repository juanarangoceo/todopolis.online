import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { ProductGrid } from '@/components/product-grid'
import { ProductFaq } from '@/components/product/product-faq'
import { getAllCollectionSlugs, getCollectionLandingBySlug } from '@/lib/sanity/queries'

export const revalidate = 86400

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

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const collection = await getCollectionLandingBySlug(slug)

  if (!collection) notFound()

  const sanityProducts = collection.products ?? []

  // Adaptar al shape `Product` que consume ProductGrid/ProductCard (igual que /temporada).
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

  const productNames = sanityProducts.map((p: any) => p.name as string)
  const comparisonRows = (collection.comparisonRows ?? []).filter(
    (r) => r.feature && Array.isArray(r.values) && r.values.length > 0
  )

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <Header />

      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="container mx-auto px-4 pt-8 md:pt-14 pb-6 text-center max-w-3xl">
          {collection.heroEyebrow && (
            <span className="inline-block mb-3 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-tag-active-bg text-tag-active-fg">
              {collection.heroEyebrow}
            </span>
          )}
          <h1 className="text-3xl md:text-5xl font-sans font-black text-foreground mb-4 leading-tight">
            {collection.heroTitle ?? collection.title}
          </h1>
          {collection.heroSubtitle && (
            <p className="text-foreground/70 text-base md:text-lg font-serif mb-6">
              {collection.heroSubtitle}
            </p>
          )}
          {collection.heroCta && (
            <a
              href="#productos"
              className="inline-block px-7 py-3 rounded-full bg-cta text-cta-fg font-bold shadow-md hover:bg-cta-hover transition-all"
            >
              {collection.heroCta}
            </a>
          )}
        </section>

        {/* ── Intro de marca ── */}
        {collection.brandIntro && (
          <section className="container mx-auto px-4 py-6 max-w-3xl text-center">
            <p className="text-foreground/80 text-base md:text-lg leading-relaxed">
              {collection.brandIntro}
            </p>
          </section>
        )}

        {/* ── Grid de productos ── */}
        <section id="productos" className="container mx-auto px-4 py-10 scroll-mt-24">
          <div className="flex flex-col items-center gap-1 mb-6 text-center">
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground">
              La colección
            </h2>
            <p className="text-foreground/70 text-xs md:text-sm">
              {products.length} {products.length === 1 ? 'producto seleccionado' : 'productos seleccionados'}
            </p>
          </div>
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
          <section className="container mx-auto px-4 py-10 max-w-5xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {collection.segmentBenefits.map((b, i) => (
                <div
                  key={b._key ?? i}
                  className="flex gap-4 p-5 rounded-2xl bg-white/60 border border-foreground/5 shadow-sm"
                >
                  {b.icon && <span className="text-3xl leading-none">{b.icon}</span>}
                  <div>
                    {b.title && (
                      <h3 className="font-bold text-foreground mb-1">{b.title}</h3>
                    )}
                    {b.description && (
                      <p className="text-foreground/70 text-sm leading-relaxed">{b.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Guía de compra ── */}
        {collection.buyersGuide && collection.buyersGuide.length > 0 && (
          <section className="container mx-auto px-4 py-10 max-w-3xl">
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground text-center mb-8">
              Cómo elegir
            </h2>
            <div className="space-y-6">
              {collection.buyersGuide.map((g, i) => (
                <div key={g._key ?? i} className="border-l-2 border-todopolis-lavender-deep/40 pl-5">
                  {g.title && (
                    <h3 className="font-bold text-foreground mb-1">{g.title}</h3>
                  )}
                  {g.body && (
                    <p className="text-foreground/70 text-sm md:text-base leading-relaxed">{g.body}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Tabla comparativa ── */}
        {comparisonRows.length > 0 && productNames.length > 0 && (
          <section className="container mx-auto px-4 py-10">
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground text-center mb-8">
              Compara los modelos
            </h2>
            <div className="max-w-5xl mx-auto overflow-x-auto rounded-2xl border border-foreground/10 shadow-sm">
              <table className="w-full text-sm border-collapse bg-white/70">
                <thead>
                  <tr className="bg-tag-active-bg">
                    <th className="text-left font-bold text-foreground/80 px-4 py-3 whitespace-nowrap">
                      Característica
                    </th>
                    {productNames.map((name, i) => (
                      <th
                        key={i}
                        className="text-left font-bold text-foreground px-4 py-3 min-w-[120px]"
                      >
                        {name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, i) => (
                    <tr key={row._key ?? i} className="border-t border-foreground/8">
                      <td className="font-semibold text-foreground/70 px-4 py-3 whitespace-nowrap">
                        {row.feature}
                      </td>
                      {productNames.map((_, j) => (
                        <td key={j} className="text-foreground/80 px-4 py-3">
                          {row.values?.[j] ?? '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── FAQ (componente reutilizado) ── */}
        {collection.faqs && collection.faqs.length > 0 && (
          <ProductFaq faqs={collection.faqs} />
        )}

        {/* ── CTA final ── */}
        {(collection.ctaHeadline || collection.ctaText) && (
          <section className="container mx-auto px-4 py-12 text-center max-w-2xl">
            {collection.ctaHeadline && (
              <h2 className="font-serif text-2xl md:text-4xl font-bold text-foreground mb-3">
                {collection.ctaHeadline}
              </h2>
            )}
            {collection.ctaText && (
              <p className="text-foreground/70 text-base md:text-lg mb-6">{collection.ctaText}</p>
            )}
            <a
              href="#productos"
              className="inline-block px-8 py-3.5 rounded-full bg-cta text-cta-fg font-bold shadow-md hover:bg-cta-hover transition-all"
            >
              {collection.heroCta ?? 'Ver la colección'}
            </a>
          </section>
        )}
      </main>

      <Footer />
    </div>
  )
}
