import { notFound } from 'next/navigation'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { ProductHero } from '@/components/product/product-hero'
import { ProductBenefits } from '@/components/product/product-benefits'
import { ProductDetails } from '@/components/product/product-details'
import { ProductTestimonials } from '@/components/product/product-testimonials'
import { ProductCTA } from '@/components/product/product-cta'
import { ProductGrid } from '@/components/product-grid'
import { getAllProductSlugs, getSanityProductBySlug, getSanityProducts } from '@/lib/sanity/queries'
import { SanityProduct } from '@/lib/types'

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

  return {
    title: `${product.name} | Todopolis`,
    description: product.shortDescription,
    openGraph: {
      images: product.image ? [product.image] : [],
    },
  }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product: SanityProduct | null = await getSanityProductBySlug(slug)

  if (!product) {
    notFound()
  }

  // Fetch suggested products
  const sanityProducts = await getSanityProducts().catch(() => [])
  const suggestedProducts = sanityProducts
    .filter((p: any) => p._id !== product._id)
    .slice(0, 4)
    .map((p: any) => ({
      id: p._id,
      name: p.name,
      slug: p.slug,
      shortDescription: p.shortDescription ?? '',
      description: p.shortDescription ?? '',
      price: p.price ?? 0,
      image: p.image ?? '/placeholder.jpg',
      category: p.category ?? 'Otros',
      rating: 4.8,
      isNew: p.isNew ?? false,
      isBestSeller: p.isBestSeller ?? false,
      reviewsCount: p.reviewsCount,
    }))

  // Adapt SanityProduct shape to the component interface
  const adaptedProduct = {
    id: product._id,
    name: product.name,
    slug: product.slug,
    shortDescription: product.shortDescription ?? '',
    description: product.shortDescription ?? '',
    price: product.price ?? 0,
    image: product.image ?? '',
    images: product.images ?? (product.image ? [product.image] : []),
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
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <ProductHero product={adaptedProduct} />
        <ProductBenefits product={adaptedProduct} />
        <ProductDetails product={adaptedProduct} />
        
        {/* Suggested Products Section */}
        {suggestedProducts.length > 0 && (
          <section className="py-8 md:py-16 bg-white">
            <div className="container mx-auto px-4">
              <div className="text-center mb-10">
                <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
                  También te podría interesar
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Productos seleccionados especialmente para ti que complementan perfectamente tu elección.
                </p>
              </div>
              <ProductGrid products={suggestedProducts} />
            </div>
          </section>
        )}

        <ProductTestimonials product={adaptedProduct} />
        <ProductCTA product={adaptedProduct} />
      </main>

      <Footer />
    </div>
  )
}
