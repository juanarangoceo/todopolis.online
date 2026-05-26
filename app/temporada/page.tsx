import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { ProductGrid } from '@/components/product-grid'
import { getActivePromoCampaign, getProductsByTags } from '@/lib/sanity/queries'

export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
  const campaign = await getActivePromoCampaign()
  if (!campaign) {
    return {
      title: 'Temporada — Todopolis',
      description: 'Productos seleccionados para esta temporada.',
    }
  }
  return {
    title: `${campaign.pageHeading} — Todopolis`,
    description: campaign.pageSubheading ?? `Productos seleccionados para ${campaign.pageHeading}.`,
    alternates: { canonical: '/temporada' },
    openGraph: {
      type: 'website',
      url: '/temporada',
      title: campaign.pageHeading,
      description: campaign.pageSubheading ?? '',
      images: campaign.desktopImage ? [{ url: campaign.desktopImage }] : undefined,
    },
  }
}

function sanityOptimized(url: string, width: number): string {
  if (!url || !url.includes('cdn.sanity.io')) return url
  return `${url}?w=${width}&auto=format&q=80`
}

export default async function TemporadaPage() {
  const campaign = await getActivePromoCampaign()

  // Si no hay campaña activa, mostramos un estado vacío con link al home (404 sería
  // confuso porque la ruta sí existe, solo no hay contenido configurado todavía).
  if (!campaign || !campaign.tagSlugs?.length) {
    return (
      <div className="min-h-screen flex flex-col bg-surface">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-3">Aún no hay campaña activa</h1>
          <p className="text-foreground/60 max-w-md mb-6">
            Pronto publicaremos una colección especial. Mientras tanto, explora el catálogo completo.
          </p>
          <Link
            href="/"
            className="px-6 py-3 rounded-full bg-cta text-cta-fg font-bold shadow-md hover:bg-cta-hover transition-all"
          >
            Ir al catálogo
          </Link>
        </main>
        <Footer />
      </div>
    )
  }

  const sanityProducts = await getProductsByTags(campaign.tagSlugs, campaign.tagMatchMode)

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
    testimonials: p.testimonials ?? [],
    reviewsCount: p.reviewsCount,
    tags: p.tags ?? [],
  }))

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <Header />

      <main className="flex-1">
        {/* Hero: banner de la campaña */}
        <section className="container mx-auto px-4 pt-4 md:pt-6">
          <div className="relative rounded-3xl overflow-hidden shadow-md">
            {/* Mobile */}
            <div className="md:hidden relative w-full aspect-square">
              <Image
                src={sanityOptimized(campaign.mobileImage, 800)}
                alt={campaign.imageAlt}
                fill
                sizes="100vw"
                className="object-cover"
                priority
              />
            </div>
            {/* Desktop */}
            <div className="hidden md:block relative w-full aspect-[16/5]">
              <Image
                src={sanityOptimized(campaign.desktopImage, 1600)}
                alt={campaign.imageAlt}
                fill
                sizes="(min-width: 1024px) 1200px, 100vw"
                className="object-cover"
                priority
              />
            </div>
          </div>
        </section>

        {/* Heading textual debajo del banner */}
        <section className="container mx-auto px-4 py-6 md:py-10 text-center max-w-3xl">
          <h1 className="text-3xl md:text-5xl font-sans font-black text-foreground mb-3 leading-tight">
            {campaign.pageHeading}
          </h1>
          {campaign.pageSubheading && (
            <p className="text-foreground/70 text-base md:text-lg font-serif">
              {campaign.pageSubheading}
            </p>
          )}

          {/* Chips informativos de los tags de la campaña */}
          {campaign.tags?.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
              {campaign.tags.map((t) => (
                <span
                  key={t.slug}
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-tag-active-bg text-tag-active-fg border border-todopolis-lavender-deep/20"
                >
                  {t.icon && <span className="mr-1">{t.icon}</span>}
                  {t.name}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Grid de productos */}
        <section className="container mx-auto px-4 pb-16">
          <div className="flex flex-col items-center gap-2 mb-6 text-center">
            <p className="text-foreground/80 font-serif font-medium text-xs md:text-sm">
              {products.length} {products.length === 1 ? 'producto en la colección' : 'productos en la colección'}
            </p>
          </div>

          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-foreground/60 mb-4">
                Todavía no hay productos con estas etiquetas. Vuelve pronto.
              </p>
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
      </main>

      <Footer />
    </div>
  )
}
