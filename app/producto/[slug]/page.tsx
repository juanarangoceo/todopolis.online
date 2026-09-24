import { notFound } from 'next/navigation'
import { Header } from '@/components/header'
import { CampaignHeader } from '@/components/campaign-header'
import { Footer } from '@/components/footer'
import { ProductHero } from '@/components/product/product-hero'
import { ProductImageGallery } from '@/components/product/product-image-gallery'
import { lifestyleImages } from '@/lib/lifestyle'
import { relatedProducts } from '@/lib/related-products'
import { ProductDetails } from '@/components/product/product-details'
import { ProductTestimonials } from '@/components/product/product-testimonials'
import { DestacadoBanner } from '@/components/product/destacados/destacado-banner'
import { DestacadoBenefits } from '@/components/product/destacados/destacado-benefits'
import { DestacadoCustomerPhotos } from '@/components/product/destacados/destacado-customer-photos'
import { DestacadoPayment } from '@/components/product/destacados/destacado-payment'
import { DestacadoAudience } from '@/components/product/destacados/destacado-audience'
import { DestacadoFaq } from '@/components/product/destacados/destacado-faq'
import { DestacadoCTA } from '@/components/product/destacados/destacado-cta'
import { DestacadoHeroVideo } from '@/components/product/destacados/destacado-hero-video'
import { DestacadoBeforeAfter } from '@/components/product/destacados/destacado-before-after'
import { DestacadoSteps } from '@/components/product/destacados/destacado-steps'
import { DestacadoBoxContents } from '@/components/product/destacados/destacado-box-contents'
import { DestacadoComparison } from '@/components/product/destacados/destacado-comparison'
import { DestacadoStory } from '@/components/product/destacados/destacado-story'
import { SuggestedProductsCarousel } from '@/components/product/suggested-products-carousel'
import { GlobalSearch } from '@/components/global-search'
import { buildWhatsAppUrl, resolveWhatsAppPhone } from '@/lib/whatsapp'
import { TrackViewContent } from '@/components/analytics/track-view-content'
import { getAllProductSlugs, getSanityProductBySlug, getSanityProducts, getSanityStoreSettings } from '@/lib/sanity/queries'
import { SanityProduct } from '@/lib/types'
import { AgeGate } from '@/components/age-gate'
import { VoiceLucyMount } from '@/components/lucy/VoiceLucyMount'
import { ProductVariantProvider } from '@/components/product/product-variant-context'
import { ArticleModalProvider } from '@/components/product/article-modal'
import { DestacadoSection, DestacadoSectionHeader } from '@/components/product/destacados/destacado-section-header'

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

  // Los Destacados no tienen buscador ni venta cruzada: traer cientos de
  // productos en una visita de anuncio solo añadía datos y latencia. Ajustes y
  // catálogo son independientes, así que se resuelven en paralelo.
  const [storeSettings, sanityProducts] = await Promise.all([
    getSanityStoreSettings(),
    product.isDestacado ? Promise.resolve([]) : getSanityProducts().catch(() => []),
  ])
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
      tags: p.tags ?? [],
    }))

  // Venta cruzada: UN carrusel, después del cierre. Antes había otro de 4
  // productos a media ficha, entre las especificaciones y las preguntas: una
  // salida justo antes de que el comprador llegara al botón.
  // Parecidos a ESTE producto (etiquetas, categoría, precio), no los 12 más
  // nuevos: cortar los primeros del catálogo daba las mismas sugerencias en
  // todas las fichas. Ver lib/related-products.ts.
  // Las etiquetas salen de la fila del catálogo y no de la query de detalle,
  // que no las trae: el catálogo ya viene cargado para este carrusel.
  const ownTags = sanityProducts.find((p: any) => p._id === product._id)?.tags ?? []
  const moreProducts = relatedProducts<(typeof otherProducts)[number]>(
    { id: product._id, category: product.category, price: product.price, tags: ownTags },
    otherProducts,
  )

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
    // Principal + galería, ya sin huecos ni repetidos: es lo que pinta el
    // carrusel lifestyle en las dos variantes de la ficha.
    lifestyleImages: lifestyleImages(product.aiLifestyleImage, product.aiLifestyleGallery),
    articleSlug: (product as any).articleSlug ?? null,
    articleTopic: (product as any).articleTopic ?? null,
    offerName: (product as any).offerName ?? null,
    offerEndsAt: (product as any).offerEndsAt ?? null,
    faqs: (product as any).faqs ?? [],
    customerPhotos: product.customerPhotos ?? [],
    quantityOffers: product.quantityOffers ?? [],
    audienceFit: product.audienceFit,
    variants: product.variants ?? [],
    // Destacados — contenido manual extendido
    isDestacado: product.isDestacado ?? false,
    destacadoHeadline: product.destacadoHeadline,
    destacadoBanner: product.destacadoBanner,
    destacadoHeroVideo: product.destacadoHeroVideo,
    destacadoBeforeAfter: product.destacadoBeforeAfter ?? [],
    destacadoSteps: product.destacadoSteps ?? [],
    destacadoBoxContents: product.destacadoBoxContents,
    destacadoComparison: product.destacadoComparison,
    destacadoStory: product.destacadoStory,
  }

  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://todopolis.online'
  const productUrl = `${BASE_URL}/producto/${adaptedProduct.slug}`

  const whatsappHref = buildWhatsAppUrl({
    phone: resolveWhatsAppPhone(storeSettings?.whatsappPhone, process.env.NEXT_PUBLIC_WHATSAPP_PHONE),
    pageUrl: productUrl,
    productName: adaptedProduct.name,
  })
  const isDestacado = adaptedProduct.isDestacado

  // UN solo recorrido para todas las fichas (sep 2026). Antes la ficha normal
  // metía beneficios, pestañas, FAQ y cierre dentro de la columna derecha del
  // hero —600 px al lado de una foto pegajosa— y la de Destacados tenía el
  // suyo a todo el ancho. Ahora las dos comparten este orden y la misma
  // rejilla (`destacados/destacado-section-header.tsx`):
  //
  //   reconocimiento (banner) → contexto (historia) → beneficios con fotos →
  //   demostración → ¿es para ti? → contenido → datos → prueba →
  //   cómo se paga → cierre → preguntas frecuentes
  //
  // Los bloques manuales de Destacados solo salen si el producto es Destacado
  // y el editor los llenó. La historia no es exclusiva: la IA la escribe para
  // todos los productos, así que sale donde exista.
  const funnel = (
    <>
      {isDestacado && <DestacadoBanner banner={adaptedProduct.destacadoBanner} />}
      {isDestacado && adaptedProduct.destacadoHeroVideo?.url && (
        <DestacadoHeroVideo video={adaptedProduct.destacadoHeroVideo} />
      )}
      <DestacadoStory story={adaptedProduct.destacadoStory} />
      <DestacadoBenefits
        benefits={adaptedProduct.benefits}
        images={adaptedProduct.lifestyleImages}
        productName={adaptedProduct.name}
      />
      {isDestacado && adaptedProduct.destacadoBeforeAfter.length > 0 && (
        <DestacadoBeforeAfter pairs={adaptedProduct.destacadoBeforeAfter} />
      )}
      {isDestacado && adaptedProduct.destacadoSteps.length > 0 && (
        <DestacadoSteps steps={adaptedProduct.destacadoSteps} />
      )}
      {/* Escenarios de uso de la IA. En Destacados no: ahí la prueba es la
          manual (pasos, antes/después, testimonios con foto). */}
      {!isDestacado && <ProductTestimonials product={adaptedProduct} />}
      <DestacadoAudience fit={adaptedProduct.audienceFit} />
      {isDestacado && adaptedProduct.destacadoBoxContents && (
        <DestacadoBoxContents data={adaptedProduct.destacadoBoxContents} />
      )}
      {isDestacado && adaptedProduct.destacadoComparison && (
        <DestacadoComparison data={adaptedProduct.destacadoComparison} />
      )}
      <ProductDetails product={adaptedProduct} specificationsOnly />
      <DestacadoCustomerPhotos
        photos={adaptedProduct.customerPhotos}
        productName={adaptedProduct.name}
      />
      {/* «Cómo pagas» pegado al cierre: es la última duda antes del botón
          («¿y si pago y no llega?»), así que se resuelve justo antes de él y
          no dos secciones atrás. No va DENTRO del cierre: lo recargaría y le
          quitaría el foco al botón. */}
      <DestacadoPayment />
      <DestacadoCTA product={adaptedProduct} whatsappHref={whatsappHref} />
      {/* Las preguntas van DESPUÉS del cierre (sep 2026): son de consulta, y
          quien tiene una duda baja a buscarla; el que ya se decidió llega al
          botón una sección antes. «Cómo pagas» NO baja con ellas: «¿y si pago
          y no me llega?» es la duda que frena la compra, y se resuelve antes. */}
      <DestacadoFaq
        faqs={adaptedProduct.faqs}
        articleSlug={adaptedProduct.articleSlug}
        articleTopic={adaptedProduct.articleTopic}
      />
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


  // NO se emiten aggregateRating ni review en el JSON-LD.
  // Los testimonios de la landing los genera la IA (nombres y ciudades
  // inventados), así que publicarlos como reseñas incumple la política de
  // reseñas de Google —se pierden los rich results— y en Colombia la SIC lo
  // trata como publicidad engañosa. Vuelven cuando existan reseñas reales
  // atadas a un pedido. Ver "Reseñas reales — pendiente" en CLAUDE.md.

  // priceValidUntil: fin de la oferta si existe, si no ~1 año desde hoy.
  const priceValidUntil = adaptedProduct.offerEndsAt as string | null

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
      ...(priceValidUntil ? { priceValidUntil } : {}),
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
      {adaptedProduct.isDestacado ? <CampaignHeader /> : <Header />}
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
      {!adaptedProduct.isDestacado && <GlobalSearch products={searchableProducts} />}

      <main className="flex-1">
        <ArticleModalProvider currentProductSlug={adaptedProduct.slug}>
        <ProductVariantProvider variants={adaptedProduct.variants}>
        {/* Un solo árbol responsivo. Antes desktop y mobile duplicaban todo el
            hero y todo el embudo en el HTML; además de peso innecesario, eso
            duplicaba IDs, modales y contenido para lectores de pantalla. */}
        <div className="container mx-auto px-4 py-4 lg:py-8">
          <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
            <div className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
              <ProductImageGallery product={adaptedProduct} />
            </div>
            <div className="min-w-0 space-y-0">
              {/* Sin franja de descuento encima del hero (se quitó sep 2026):
                  repetía el −X% que ya dicen la foto y el precio, metía un
                  segundo «Comprar ya» que competía con el botón, en móvil
                  cortaba el texto y prometía «por tiempo limitado» aunque la
                  oferta no tuviera fecha. El descuento vive junto al precio y,
                  si hay fecha, en la cuenta regresiva. */}
              <ProductHero product={adaptedProduct} whatsappHref={whatsappHref} />
            </div>
          </div>
        </div>

        {funnel}
        </ProductVariantProvider>

        {/* Lo que va DESPUÉS del cierre, solo en la ficha normal. En Destacados
            no hay venta cruzada: es una salida del embudo en una visita que
            viene de un anuncio de ESTE producto. Tampoco va `StorePolicies` en
            ninguna de las dos: el cierre ya dice envío, devolución y WhatsApp,
            y «Cómo pagas» explica el pago.
            El formulario de «Acceso prioritario» que iba aquí se mudó al pie
            (`FooterSubscribe`): ocupaba una pantalla entera de móvil justo
            donde el comprador ya había decidido. */}
        {!isDestacado && moreProducts.length > 0 && (
          <DestacadoSection>
            <DestacadoSectionHeader eyebrow="Sigue mirando" title="Te puede interesar" />
            <SuggestedProductsCarousel products={moreProducts} />
          </DestacadoSection>
        )}
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

      <Footer showPaymentExplainer={false} flush productSlug={adaptedProduct.slug} />
    </div>
  )
}
