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
import { ProductSubscription } from '@/components/product/product-subscription'
import { SuggestedBlogs } from '@/components/product/suggested-blogs'
import { VipHeroVideo } from '@/components/product/vip/vip-hero-video'
import { VipBeforeAfter } from '@/components/product/vip/vip-before-after'
import { VipSteps } from '@/components/product/vip/vip-steps'
import { VipBoxContents } from '@/components/product/vip/vip-box-contents'
import { VipTestimonials } from '@/components/product/vip/vip-testimonials'
import { VipComparison } from '@/components/product/vip/vip-comparison'
import { VipQuoteBlock } from '@/components/product/vip/vip-quote'
import { OfferBanner } from '@/components/product/offer-banner'
import { ProductFaq } from '@/components/product/product-faq'
import { SuggestedProductsCarousel } from '@/components/product/suggested-products-carousel'
import { GlobalSearch } from '@/components/global-search'
import { StorePolicies } from '@/components/store-policies'
import { getAllProductSlugs, getSanityProductBySlug, getSanityProducts, getSanityStoreSettings, getArticles } from '@/lib/sanity/queries'
import Link from 'next/link'
import { SanityProduct } from '@/lib/types'
import { AgeGate } from '@/components/age-gate'
import { VoiceLucyMount } from '@/components/lucy/VoiceLucyMount'
import { ProductVariantProvider } from '@/components/product/product-variant-context'

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
  const uploadedImages: string[] = (product.images ?? []).filter((u: any): u is string => typeof u === 'string' && !!u)
  const mastershopImage: string | undefined = product.mastershopImageUrl ?? product.image
  const allImageUrls: string[] = mastershopImage
    ? [mastershopImage, ...uploadedImages.filter((u) => u !== mastershopImage)]
    : uploadedImages
  const images = allImageUrls.map((url) => ({ url, alt: product.name }))

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

  // Artículos sugeridos para mostrar al lado del formulario de suscripción.
  // Prioriza misma categoría que el producto, completa con más recientes.
  const allArticles = await getArticles().catch(() => [])
  const productCategory = product.category?.toLowerCase()
  const sameCategoryArticles = allArticles.filter(
    (a) => a.category?.toLowerCase() === productCategory,
  )
  const otherArticles = allArticles.filter(
    (a) => a.category?.toLowerCase() !== productCategory,
  )
  const suggestedArticles = [...sameCategoryArticles, ...otherArticles].slice(0, 3)

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
    images: (() => {
      const uploaded = (product.images ?? []).filter((u: any): u is string => typeof u === 'string' && !!u)
      const mastershop = product.mastershopImageUrl ?? product.image
      const all = mastershop ? [mastershop, ...uploaded.filter((u) => u !== mastershop)] : uploaded
      return all.length ? all : []
    })(),
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
    variants: product.variants ?? [],
    // VIP — contenido manual extendido
    isVip: product.isVip ?? false,
    vipHeroVideo: product.vipHeroVideo,
    vipBeforeAfter: product.vipBeforeAfter ?? [],
    vipSteps: product.vipSteps ?? [],
    vipBoxContents: product.vipBoxContents,
    vipTestimonials: product.vipTestimonials ?? [],
    vipComparison: product.vipComparison,
    vipQuotes: product.vipQuotes ?? [],
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

  // Link al artículo — compartido por ambos layouts y por el embudo VIP.
  const articleLink = adaptedProduct.articleSlug ? (
    <div className="container mx-auto px-4 py-4">
      <div className="flex items-center justify-between gap-4 bg-todopolis-lavender/15 border border-todopolis-lavender/40 rounded-2xl px-6 py-4">
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
          className="shrink-0 text-sm font-bold text-todopolis-lavender-deep hover:text-todopolis-blue-deep transition-colors whitespace-nowrap"
        >
          Leer artículo →
        </Link>
      </div>
    </div>
  ) : null

  // Cuerpo del embudo (todo lo que va después del hero). Se renderiza igual en
  // desktop (columna derecha que scrollea) y mobile. En productos VIP los
  // bloques manuales se intercalan estratégicamente con el contenido IA para
  // armar el embudo y se ocultan los carruseles de productos que distraen.
  const funnelBody = adaptedProduct.isVip ? (
    <>
      {adaptedProduct.vipHeroVideo?.url && (
        <VipHeroVideo video={adaptedProduct.vipHeroVideo} />
      )}
      <ProductLifestyleImage product={adaptedProduct} />
      {adaptedProduct.vipQuotes[0] && (
        <VipQuoteBlock quote={adaptedProduct.vipQuotes[0]} />
      )}
      <ProductBenefits product={adaptedProduct} />
      {adaptedProduct.vipBeforeAfter.length > 0 && (
        <VipBeforeAfter pairs={adaptedProduct.vipBeforeAfter} />
      )}
      <ProductDetails product={adaptedProduct} />
      {adaptedProduct.vipSteps.length > 0 && (
        <VipSteps steps={adaptedProduct.vipSteps} />
      )}
      {adaptedProduct.vipBoxContents && (
        <VipBoxContents data={adaptedProduct.vipBoxContents} />
      )}
      {adaptedProduct.vipComparison && (
        <VipComparison data={adaptedProduct.vipComparison} />
      )}
      <ProductTestimonials product={adaptedProduct} />
      {adaptedProduct.vipTestimonials.length > 0 && (
        <VipTestimonials testimonials={adaptedProduct.vipTestimonials} />
      )}
      {adaptedProduct.vipQuotes.slice(1).map((q) => (
        <VipQuoteBlock key={q._key ?? q.text} quote={q} />
      ))}
      {adaptedProduct.faqs?.length > 0 && <ProductFaq faqs={adaptedProduct.faqs} />}
      {articleLink}
      <ProductCTA product={adaptedProduct} />
    </>
  ) : (
    <>
      <ProductLifestyleImage product={adaptedProduct} />
      <ProductBenefits product={adaptedProduct} />
      <ProductDetails product={adaptedProduct} />
      <SuggestedSection
        products={suggestedProducts}
        title="También te podría interesar"
        subtitle="Productos seleccionados especialmente para ti que complementan perfectamente tu elección."
      />
      <ProductTestimonials product={adaptedProduct} />
      {adaptedProduct.faqs?.length > 0 && <ProductFaq faqs={adaptedProduct.faqs} />}
      {articleLink}
      <ProductCTA product={adaptedProduct} />
    </>
  )

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
  const productUrl = `${BASE_URL}/producto/${adaptedProduct.slug}`

  // Rating agregado: promedio real de los testimonios mostrados en la página.
  const testimonialRatings = (adaptedProduct.testimonials ?? [])
    .map((t: any) => Number(t.rating))
    .filter((n: number) => n > 0)
  const ratingValue = testimonialRatings.length
    ? Math.round(
        (testimonialRatings.reduce((a: number, b: number) => a + b, 0) /
          testimonialRatings.length) * 10,
      ) / 10
    : adaptedProduct.rating
  const reviewCount = adaptedProduct.reviewsCount ?? testimonialRatings.length

  // priceValidUntil: fin de la oferta si existe, si no ~1 año desde hoy.
  const priceValidUntil =
    (adaptedProduct.offerEndsAt as string | null) ||
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: adaptedProduct.name,
    description: adaptedProduct.shortDescription,
    image: adaptedProduct.images,
    url: productUrl,
    brand: { '@type': 'Brand', name: 'Todopolis' },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'COP',
      price: adaptedProduct.price,
      priceValidUntil,
      itemCondition: 'https://schema.org/NewCondition',
      availability: 'https://schema.org/InStock',
      url: productUrl,
    },
    ...(reviewCount > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue,
        reviewCount,
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

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: adaptedProduct.name, item: productUrl },
    ],
  }

  const faqJsonLd = adaptedProduct.faqs?.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: adaptedProduct.faqs.map((f: any) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: f.answer },
        })),
      }
    : null

  return (
    <div className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <Header />
      {product.category === 'bienestar-intimo' && <AgeGate />}
      <GlobalSearch products={searchableProducts} />

      <main className="flex-1">
        <ProductVariantProvider variants={adaptedProduct.variants}>
        {/* Desktop: Two-column layout with sticky image sidebar */}
        <div className="hidden lg:block">
          <div className="container mx-auto px-4 py-8">
            <div className="grid lg:grid-cols-2 gap-12 items-start">
              {/* Left column — sticky image gallery */}
              <div className="lg:sticky lg:top-24 lg:self-start">
                <ProductImageGallery product={adaptedProduct} />
              </div>

              {/* Right column — banner de oferta arriba, luego hero y el
                  embudo (contenido IA + bloques VIP intercalados). */}
              <div className="space-y-0">
                <OfferBanner product={adaptedProduct} />
                <ProductHero product={adaptedProduct} />
                {funnelBody}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile: Normal stacked layout */}
        <div className="lg:hidden">
          <div className="container mx-auto px-4 pt-4">
            <OfferBanner product={adaptedProduct} />
          </div>
          <ProductHero product={adaptedProduct} />
          {funnelBody}
        </div>
        </ProductVariantProvider>

        {/* Global Store Policies */}
        <div className="container mx-auto px-4 mt-8">
          <StorePolicies policies={storeSettings?.policies} />
        </div>

        {/* Second products section — below CTA, full width, both layouts.
            En productos VIP se oculta para no romper el embudo. */}
        {!adaptedProduct.isVip && moreProducts.length > 0 && (
          <section className="pt-6 pb-12 md:pb-16 bg-surface-soft">
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

        {/* Suscripción + blogs sugeridos.
            Desktop: dos tarjetas lado a lado al ancho completo del container.
            Mobile: blogs primero (engancha lectura), luego formulario. */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 items-stretch">
              <div className="order-1 md:order-2">
                <ProductSubscription
                  productSlug={adaptedProduct.slug}
                  productName={adaptedProduct.name}
                />
              </div>
              {suggestedArticles.length > 0 && (
                <div className="order-0 md:order-1">
                  <SuggestedBlogs articles={suggestedArticles} />
                </div>
              )}
            </div>
          </div>
        </section>
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
