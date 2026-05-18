import { notFound } from 'next/navigation'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { ProductHero } from '@/components/product/product-hero'
import { ProductImageGallery } from '@/components/product/product-image-gallery'
import { ProductLifestyleImage } from '@/components/product/product-lifestyle-image'
import { ProductBenefits } from '@/components/product/product-benefits'
import { ProductDetails } from '@/components/product/product-details'
import { ProductTestimonials } from '@/components/product/product-testimonials'
import { ProductCTA } from '@/components/product/product-cta'
import { ProductOfferTimer } from '@/components/product/product-offer-timer'
import { ProductFaq } from '@/components/product/product-faq'
import { SuggestedProductsCarousel } from '@/components/product/suggested-products-carousel'
import { GlobalSearch } from '@/components/global-search'
import { StorePolicies } from '@/components/store-policies'
import { getAllProductSlugs, getSanityProductBySlug, getSanityProducts, getSanityStoreSettings } from '@/lib/sanity/queries'
import Link from 'next/link'
import { SanityProduct } from '@/lib/types'
import { AgeGate } from '@/components/age-gate'
import { VoiceLucyMount } from '@/components/lucy/VoiceLucyMount'

export async function generateStaticParams() {
  const slugs = await getAllProductSlugs()
  return slugs.map(({ slug }) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product: SanityProduct | null = await getSanityProductBySlug(slug)

  if (!product) {
    return { title: 'Producto no encontrado' }
  }

  const title = `${product.name} | Todopolis`
  const description = product.shortDescription ?? `Compra ${product.name} en Todopolis. Envío rápido y los mejores precios.`
  const images = product.images?.length
    ? product.images.map((url: string) => ({ url, alt: product.name }))
    : (product.mastershopImageUrl || product.image)
    ? [{ url: (product.mastershopImageUrl || product.image), alt: product.name }]
    : []

  const isAdult = product.category === 'bienestar-intimo'

  return {
    title,
    description,
    ...(isAdult && { robots: { index: false, follow: false } }),
    alternates: { canonical: `/producto/${slug}` },
    openGraph: {
      type: 'website',
      url: `/producto/${slug}`,
      title,
      description,
      images,
      locale: 'es_CO',
      siteName: 'Todopolis',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: images[0]?.url ? [images[0].url] : [],
    },
  }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product: SanityProduct | null = await getSanityProductBySlug(slug)

  if (!product) {
    notFound()
  }

  const storeSettings = await getSanityStoreSettings()

  // Fetch all products to build suggested + more sections
  const sanityProducts = await getSanityProducts().catch(() => [])
  const otherProducts = sanityProducts
    .filter((p: any) => p._id !== product._id && p.category?.toLowerCase() !== 'bienestar-intimo')
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

  // First carousel: 4 products right after product details
  const suggestedProducts = otherProducts.slice(0, 4)
  // Second carousel: next 4 different products at the end
  const moreProducts = otherProducts.slice(4, 16)

  // Adapt SanityProduct shape to the component interface
  const adaptedProduct = {
    id: product._id,
    name: product.name,
    slug: product.slug,
    shortDescription: product.shortDescription ?? '',
    description: product.shortDescription ?? '',
    price: product.price ?? 0,
    originalPrice: (product as any).originalPrice,
    image: product.mastershopImageUrl ?? product.image ?? '',
    images: product.images ?? (product.mastershopImageUrl ? [product.mastershopImageUrl] : product.image ? [product.image] : []),
    category: product.category ?? 'Otros',
    rating: 4.8,
    isNew: product.isNew,
    isBestSeller: product.isBestSeller,
    heroTitle: product.heroTitle,
    heroSubtitle: product.heroSubtitle,
    heroCta: product.heroCta ?? 'Comprar ahora',
    benefits: product.benefits ?? [],
    specifications: product.specifications ?? [],
    testimonials: product.testimonials ?? [],
    reviewsCount: product.reviewsCount,
    ctaHeadline: product.ctaHeadline,
    ctaText: product.ctaText,
    aiLifestyleImage: product.aiLifestyleImage,
    articleSlug: (product as any).articleSlug ?? null,
    articleTopic: (product as any).articleTopic ?? null,
    offerName: (product as any).offerName ?? null,
    offerEndsAt: (product as any).offerEndsAt ?? null,
    faqs: (product as any).faqs ?? [],
  }

  const SuggestedSection = ({ products, title, subtitle }: { products: typeof suggestedProducts, title: string, subtitle: string }) =>
    products.length > 0 ? (
      <section className="py-8 md:py-16">
        <div className="text-center mb-10">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
            {title}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {subtitle}
          </p>
        </div>
        <SuggestedProductsCarousel products={products} />
      </section>
    ) : null

  const searchableProducts = sanityProducts
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

  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://todopolis.online'
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: adaptedProduct.name,
    description: adaptedProduct.shortDescription,
    image: adaptedProduct.images,
    url: `${BASE_URL}/producto/${adaptedProduct.slug}`,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'COP',
      price: adaptedProduct.price,
      availability: 'https://schema.org/InStock',
      url: `${BASE_URL}/producto/${adaptedProduct.slug}`,
    },
    ...(adaptedProduct.reviewsCount && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: adaptedProduct.rating,
        reviewCount: adaptedProduct.reviewsCount,
        bestRating: 5,
        worstRating: 1,
      },
    }),
    ...(adaptedProduct.testimonials?.length && {
      review: adaptedProduct.testimonials.map((t: any) => ({
        '@type': 'Review',
        author: { '@type': 'Person', name: t.name },
        reviewRating: { '@type': 'Rating', ratingValue: t.rating ?? 5 },
        reviewBody: t.text,
      })),
    }),
  }

  return (
    <div className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      {product.category === 'bienestar-intimo' && <AgeGate />}
      <GlobalSearch products={searchableProducts} />

      <main className="flex-1">
        {/* Desktop: Two-column layout with sticky image sidebar */}
        <div className="hidden lg:block">
          <div className="container mx-auto px-4 py-8">
            <div className="grid lg:grid-cols-2 gap-12 items-start">
              {/* Left column — sticky image gallery */}
              <div className="lg:sticky lg:top-24 lg:self-start">
                <ProductImageGallery product={adaptedProduct} />
              </div>

              {/* Right column — all content flows naturally */}
              <div className="space-y-0">
                <ProductHero product={adaptedProduct} />
                {adaptedProduct.offerName && adaptedProduct.offerEndsAt && (
                  <ProductOfferTimer offerName={adaptedProduct.offerName} offerEndsAt={adaptedProduct.offerEndsAt} />
                )}
                <ProductLifestyleImage product={adaptedProduct} />
                <ProductBenefits product={adaptedProduct} />
                <ProductDetails product={adaptedProduct} />
                
                <SuggestedSection
                  products={suggestedProducts}
                  title="También te podría interesar"
                  subtitle="Productos seleccionados especialmente para ti que complementan perfectamente tu elección."
                />

                <ProductTestimonials product={adaptedProduct} />
                {adaptedProduct.faqs?.length > 0 && (
                  <ProductFaq faqs={adaptedProduct.faqs} />
                )}
                {adaptedProduct.articleSlug && (
                  <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between gap-4 bg-gradient-to-r from-[#EDD2F3]/20 to-[#FFB4AC]/15 border border-[#EDD2F3]/40 rounded-2xl px-6 py-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">¿Aún tienes dudas?</p>
                        <p className="font-semibold text-sm text-foreground">
                          {adaptedProduct.articleTopic
                            ? `Lee: ${adaptedProduct.articleTopic}`
                            : 'Lee nuestro artículo completo'}
                        </p>
                      </div>
                      <Link
                        href={`/blog/${adaptedProduct.articleSlug}`}
                        className="shrink-0 text-sm font-bold text-[#8b5cf6] hover:text-[#FFB4AC] transition-colors whitespace-nowrap"
                      >
                        Leer artículo →
                      </Link>
                    </div>
                  </div>
                )}
                <ProductCTA product={adaptedProduct} />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile: Normal stacked layout */}
        <div className="lg:hidden">
          <ProductHero product={adaptedProduct} />
          {adaptedProduct.offerName && adaptedProduct.offerEndsAt && (
            <ProductOfferTimer offerName={adaptedProduct.offerName} offerEndsAt={adaptedProduct.offerEndsAt} />
          )}
          <ProductLifestyleImage product={adaptedProduct} />
          <ProductBenefits product={adaptedProduct} />
          <ProductDetails product={adaptedProduct} />

          {suggestedProducts.length > 0 && (
            <section className="py-8 bg-white">
              <div className="container mx-auto px-4">
                <div className="text-center mb-10">
                  <h2 className="font-serif text-3xl font-bold text-foreground mb-4">
                    También te podría interesar
                  </h2>
                  <p className="text-muted-foreground max-w-2xl mx-auto">
                    Productos seleccionados especialmente para ti.
                  </p>
                </div>
                <SuggestedProductsCarousel products={suggestedProducts} />
              </div>
            </section>
          )}

          <ProductTestimonials product={adaptedProduct} />
          {adaptedProduct.faqs?.length > 0 && (
            <ProductFaq faqs={adaptedProduct.faqs} />
          )}
          {adaptedProduct.articleSlug && (
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between gap-4 bg-gradient-to-r from-[#EDD2F3]/20 to-[#FFB4AC]/15 border border-[#EDD2F3]/40 rounded-2xl px-6 py-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">¿Aún tienes dudas?</p>
                  <p className="font-semibold text-sm text-foreground">
                    {adaptedProduct.articleTopic
                      ? `Lee: ${adaptedProduct.articleTopic}`
                      : 'Lee nuestro artículo completo'}
                  </p>
                </div>
                <Link
                  href={`/blog/${adaptedProduct.articleSlug}`}
                  className="shrink-0 text-sm font-bold text-[#8b5cf6] hover:text-[#FFB4AC] transition-colors whitespace-nowrap"
                >
                  Leer artículo →
                </Link>
              </div>
            </div>
          )}
          <ProductCTA product={adaptedProduct} />
        </div>

        {/* Global Store Policies */}
        <div className="container mx-auto px-4 mt-8">
          <StorePolicies policies={storeSettings?.policies} />
        </div>

        {/* Second products section — below CTA, full width, both layouts */}
        {moreProducts.length > 0 && (
          <section className="pt-6 pb-12 md:pb-16 bg-gradient-to-b from-[#FFF8FA] to-[#FFD5E5]/20">
            <div className="container mx-auto px-4">
              <div className="text-center mb-8">
                <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-3">
                  Otros productos que te encantarán
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Sigue explorando nuestra selección de productos de alta calidad.
                </p>
              </div>
              <SuggestedProductsCarousel products={moreProducts} />
            </div>
          </section>
        )}
      </main>

      <VoiceLucyMount
        product={{
          slug: adaptedProduct.slug,
          name: adaptedProduct.name,
          price: adaptedProduct.price,
          image: adaptedProduct.image || null,
          shortDescription: adaptedProduct.shortDescription || null,
        }}
      />

      <Footer />
    </div>
  )
}
