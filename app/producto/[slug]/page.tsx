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
import { CustomerPhotos } from '@/components/product/customer-photos'
import { DestacadoHeroVideo } from '@/components/product/destacados/destacado-hero-video'
import { DestacadoBeforeAfter } from '@/components/product/destacados/destacado-before-after'
import { DestacadoSteps } from '@/components/product/destacados/destacado-steps'
import { DestacadoBoxContents } from '@/components/product/destacados/destacado-box-contents'
import { DestacadoTestimonials } from '@/components/product/destacados/destacado-testimonials'
import { DestacadoComparison } from '@/components/product/destacados/destacado-comparison'
import { DestacadoQuoteBlock } from '@/components/product/destacados/destacado-quote'
import { OfferBanner } from '@/components/product/offer-banner'
import { ProductFaq } from '@/components/product/product-faq'
import { SuggestedProductsCarousel } from '@/components/product/suggested-products-carousel'
import { GlobalSearch } from '@/components/global-search'
import { StorePolicies } from '@/components/store-policies'
import { TrackViewContent } from '@/components/analytics/track-view-content'
import { getAllProductSlugs, getSanityProductBySlug, getSanityProducts, getSanityStoreSettings } from '@/lib/sanity/queries'
import Link from 'next/link'
import { SanityProduct } from '@/lib/types'
import { AgeGate } from '@/components/age-gate'
import { VoiceLucyMount } from '@/components/lucy/VoiceLucyMount'
import { ProductVariantProvider } from '@/components/product/product-variant-context'
import { ArticleModalProvider, ArticleTrigger } from '@/components/product/article-modal'

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

  const title = product.name
  const description = product.shortDescription ?? `Compra ${product.name} en Todópolis. Envío rápido y los mejores precios.`
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
      siteName: 'Todópolis',
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

  const isAdultProduct = product.category === 'bienestar-intimo'

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
    customerPhotos: product.customerPhotos ?? [],
    variants: product.variants ?? [],
    // Destacados — contenido manual extendido
    isDestacado: product.isDestacado ?? false,
    destacadoHeroVideo: product.destacadoHeroVideo,
    destacadoBeforeAfter: product.destacadoBeforeAfter ?? [],
    destacadoSteps: product.destacadoSteps ?? [],
    destacadoBoxContents: product.destacadoBoxContents,
    destacadoTestimonials: product.destacadoTestimonials ?? [],
    destacadoComparison: product.destacadoComparison,
    destacadoQuotes: product.destacadoQuotes ?? [],
  }

  // Solo hay recuadro de fotos si alguna trae URL resuelta: un item de Sanity
  // al que le borraron el asset llega como objeto sin `url`, y contarlo pondría
  // la landing en dos columnas para no pintar nada en la derecha.
  const hasCustomerPhotos = adaptedProduct.customerPhotos.some((p) => !!p?.url)

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

  // Link al artículo — compartido por ambos layouts y por el embudo de Destacados.
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
        <ArticleTrigger
          slug={adaptedProduct.articleSlug}
          className="shrink-0 text-sm font-bold text-todopolis-lavender-deep hover:text-todopolis-blue-deep transition-colors whitespace-nowrap"
        >
          Leer artículo →
        </ArticleTrigger>
      </div>
    </div>
  ) : null

  // Cuerpo del embudo (todo lo que va después del hero). Se renderiza igual en
  // desktop (columna derecha que scrollea) y mobile. En productos destacados los
  // bloques manuales se intercalan estratégicamente con el contenido IA para
  // armar el embudo y se ocultan los carruseles de productos que distraen.
  const funnelBody = adaptedProduct.isDestacado ? (
    <>
      {adaptedProduct.destacadoHeroVideo?.url && (
        <DestacadoHeroVideo video={adaptedProduct.destacadoHeroVideo} />
      )}
      <ProductLifestyleImage product={adaptedProduct} />
      {adaptedProduct.destacadoQuotes[0] && (
        <DestacadoQuoteBlock quote={adaptedProduct.destacadoQuotes[0]} />
      )}
      <ProductBenefits product={adaptedProduct} />
      {adaptedProduct.destacadoBeforeAfter.length > 0 && (
        <DestacadoBeforeAfter pairs={adaptedProduct.destacadoBeforeAfter} />
      )}
      <ProductDetails product={adaptedProduct} />
      {adaptedProduct.destacadoSteps.length > 0 && (
        <DestacadoSteps steps={adaptedProduct.destacadoSteps} />
      )}
      {adaptedProduct.destacadoBoxContents && (
        <DestacadoBoxContents data={adaptedProduct.destacadoBoxContents} />
      )}
      {adaptedProduct.destacadoComparison && (
        <DestacadoComparison data={adaptedProduct.destacadoComparison} />
      )}
      {adaptedProduct.destacadoTestimonials.length > 0 && (
        <DestacadoTestimonials testimonials={adaptedProduct.destacadoTestimonials} />
      )}
      {adaptedProduct.destacadoQuotes.slice(1).map((q) => (
        <DestacadoQuoteBlock key={q._key ?? q.text} quote={q} />
      ))}
      {articleLink}
      {adaptedProduct.faqs?.length > 0 && <ProductFaq faqs={adaptedProduct.faqs} />}
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
      {articleLink}
      {adaptedProduct.faqs?.length > 0 && <ProductFaq faqs={adaptedProduct.faqs} />}
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

  // NO se emiten aggregateRating ni review en el JSON-LD.
  // Los testimonios de la landing los genera la IA (nombres y ciudades
  // inventados), así que publicarlos como reseñas incumple la política de
  // reseñas de Google —se pierden los rich results— y en Colombia la SIC lo
  // trata como publicidad engañosa. Vuelven cuando existan reseñas reales
  // atadas a un pedido. Ver "Reseñas reales — pendiente" en CLAUDE.md.

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
    brand: { '@type': 'Brand', name: 'Todópolis' },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'COP',
      price: adaptedProduct.price,
      priceValidUntil,
      itemCondition: 'https://schema.org/NewCondition',
      availability: 'https://schema.org/InStock',
      url: productUrl,
    },
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
      {/* Ni ViewContent ni ningún otro evento en bienestar íntimo: Meta prohíbe
          anunciar productos para adultos y esos eventos alimentarían audiencias
          publicitarias. El Píxel tampoco carga en estas rutas (ver el
          `blockedPaths` de `app/layout.tsx`); esto corta el evento que monta la
          propia ficha. */}
      {!isAdultProduct && (
        <TrackViewContent
          id={adaptedProduct.slug}
          name={adaptedProduct.name}
          price={adaptedProduct.price}
          category={adaptedProduct.category}
        />
      )}
      {isAdultProduct && <AgeGate />}
      {/* La lupa flotante que aparece al bajar es una salida del embudo, y en
          un producto Destacado el embudo es justamente lo que se cuida: por eso
          esta ficha ya oculta los carruseles de "otros productos". El buscador
          no desaparece —sigue en el header y en la barra de móvil—, lo que se
          quita es el botón que invita a irse a mitad de lectura. */}
      <GlobalSearch products={searchableProducts} showMobileFab={!adaptedProduct.isDestacado} />

      <main className="flex-1">
        <ArticleModalProvider currentProductSlug={adaptedProduct.slug}>
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
                  embudo (contenido IA + bloques de Destacados intercalados). */}
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

        {/* Reseñas — full width, debajo del último CTA, tanto en destacados como en el resto */}
        <ProductTestimonials product={adaptedProduct} />

        {/* Global Store Policies */}
        <div className="container mx-auto px-4 mt-8">
          <StorePolicies
            policies={storeSettings?.policies}
            whatsapp={{
              phone: storeSettings?.whatsappPhone ?? null,
              productName: adaptedProduct.name,
              pageUrl: productUrl,
            }}
          />
        </div>

        {/* Second products section — below CTA, full width, both layouts.
            En productos destacados se oculta para no romper el embudo. */}
        {!adaptedProduct.isDestacado && moreProducts.length > 0 && (
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

        {/* Suscripción.
            Aquí vivía también "Lecturas que aclaran dudas" (SuggestedBlogs), en
            dos columnas. Se quitó: el artículo del propio producto ya se abre
            en ventana emergente desde la ficha (ArticleTrigger) y el blog
            completo está en el menú, así que este bloque repetía una tercera
            entrada al mismo sitio y alargaba una página que ya es larga.
            De paso desaparece una consulta de artículos a Sanity por visita. */}
        {/* Suscripción, y a su derecha las fotos reales de clientes cuando las
            hay. El ancho del contenedor CAMBIA con el contenido: con fotos son
            dos columnas dentro de `max-w-6xl`; sin fotos vuelve a la columna
            única de `max-w-2xl` que había antes, porque estirar un formulario
            de tres campos a todo el ancho lo deja desangelado.
            `items-stretch` iguala la altura de las dos tarjetas. */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div
              className={
                hasCustomerPhotos
                  ? 'grid lg:grid-cols-2 gap-6 lg:gap-8 items-stretch max-w-6xl mx-auto'
                  : 'max-w-2xl mx-auto'
              }
            >
              <ProductSubscription
                productSlug={adaptedProduct.slug}
                productName={adaptedProduct.name}
              />
              {hasCustomerPhotos && (
                <CustomerPhotos
                  photos={adaptedProduct.customerPhotos}
                  productName={adaptedProduct.name}
                />
              )}
            </div>
          </div>
        </section>
        </ArticleModalProvider>
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
