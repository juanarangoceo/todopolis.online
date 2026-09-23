import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { OffersBrowser, type DiscountedProduct } from '@/components/offers-browser'
import { getSanityProducts } from '@/lib/sanity/queries'

export const metadata = {
  title: 'Ofertas y Descuentos',
  // Sin «por tiempo limitado»: el listado no tiene fecha de fin, y afirmarlo
  // sin sostenerlo es publicidad engañosa para la SIC.
  description: 'Productos de Todópolis con precio rebajado: hogar, belleza, tecnología y más. Pagas al recibir o con Confío, envío a toda Colombia.',
  alternates: { canonical: '/ofertas' },
}

export default async function OfertasPage() {
  const sanityProducts = await getSanityProducts().catch(() => [])

  // Filter only products with an original price (= they have a discount)
  const discountedProducts: DiscountedProduct[] = sanityProducts
    .filter((p: { originalPrice?: number; price?: number; category?: string }) =>
      p.originalPrice && p.originalPrice > (p.price ?? 0) && p.category !== 'bienestar-intimo',
    )
    .map((p: {
      _id: string; name: string; slug: string; shortDescription?: string;
      price?: number; originalPrice: number; image?: string; mastershopImageUrl?: string; category?: string;
      isNew?: boolean; isBestSeller?: boolean; isDestacado?: boolean;
      testimonials?: { name: string; role: string; rating: number; text: string }[];
      reviewsCount?: number;
    }): DiscountedProduct => {
      const discount = Math.round((1 - (p.price ?? 0) / p.originalPrice) * 100)
      return {
        id: p._id,
        name: p.name,
        slug: p.slug,
        shortDescription: p.shortDescription ?? '',
        description: p.shortDescription ?? '',
        price: p.price ?? 0,
        originalPrice: p.originalPrice,
        // Mismo orden que el home: la foto de Mastershop primero.
        image: p.mastershopImageUrl ?? p.image ?? '/placeholder.jpg',
        category: p.category ?? 'otros',
        rating: 4.8,
        isNew: p.isNew ?? false,
        isBestSeller: p.isBestSeller ?? false,
        isDestacado: p.isDestacado ?? false,
        testimonials: p.testimonials ?? [],
        reviewsCount: p.reviewsCount,
        _discount: discount,
      }
    })
    .sort((a: DiscountedProduct, b: DiscountedProduct) => b._discount - a._discount)

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <Header />

      <main className="flex-1">
        <OffersBrowser products={discountedProducts} />
      </main>

      <Footer />
    </div>
  )
}
