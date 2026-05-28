import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { OffersBrowser } from '@/components/offers-browser'
import { getSanityProducts } from '@/lib/sanity/queries'

export const metadata = {
  title: 'Ofertas y Descuentos | Todopolis',
  description: 'Descubre los mejores descuentos y ofertas de Todopolis. Productos premium a precios increíbles por tiempo limitado.',
}

type DiscountedProduct = {
  id: string
  name: string
  slug: string
  shortDescription: string
  description: string
  price: number
  originalPrice: number
  image: string
  category: string
  rating: number
  isNew: boolean
  isBestSeller: boolean
  testimonials: unknown[]
  reviewsCount?: number
  _discount: number
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
      price?: number; originalPrice: number; image?: string; category?: string;
      isNew?: boolean; isBestSeller?: boolean; testimonials?: unknown[]; reviewsCount?: number;
    }) => {
      const discount = Math.round((1 - (p.price ?? 0) / p.originalPrice) * 100)
      return {
        id: p._id,
        name: p.name,
        slug: p.slug,
        shortDescription: p.shortDescription ?? '',
        description: p.shortDescription ?? '',
        price: p.price ?? 0,
        originalPrice: p.originalPrice,
        image: p.image ?? '/placeholder.jpg',
        category: p.category ?? 'Otros',
        rating: 4.8,
        isNew: p.isNew ?? false,
        isBestSeller: p.isBestSeller ?? false,
        testimonials: p.testimonials ?? [],
        reviewsCount: p.reviewsCount,
        _discount: discount,
      }
    })
    .sort((a: DiscountedProduct, b: DiscountedProduct) => b._discount - a._discount)

  // Hero compacto — el chip "Ofertas activas" y las dos bubbles de stats se
  // retiraron a propósito para reducir altura. El hero se renderiza dentro del
  // browser para que pueda ocultarse cuando hay búsqueda activa.
  const hero = (
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(120deg, var(--sale, #FF6B6B) 0%, var(--sale, #FF6B6B) 40%, #C77DFF 100%)',
        }}
      />
      <div aria-hidden className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl pointer-events-none" />
      <div aria-hidden className="absolute bottom-0 right-0 w-[28rem] h-[28rem] bg-todopolis-lavender/40 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl pointer-events-none" />
      <div aria-hidden className="absolute top-1/3 right-1/4 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_4s_ease-in-out_infinite] pointer-events-none" />

      <div className="relative container mx-auto px-4 py-8 md:py-12 text-center">
        <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl font-black text-white mb-3 text-balance leading-tight drop-shadow-sm">
          Lo bueno, ahora con descuento.
        </h1>
        <p className="text-white/85 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
          Selección curada a precios que solo duran lo que dura el cronómetro. Pago contraentrega, envío a toda Colombia.
        </p>
      </div>

      <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path d="M0 60L1440 60L1440 20C1200 60 240 0 0 40L0 60Z" fill="white" fillOpacity="0.08"/>
          <path d="M0 60L1440 60L1440 0C1100 50 340 10 0 50L0 60Z" fill="white" fillOpacity="0.06"/>
          <path d="M0 60L1440 60L1440 30C900 60 540 20 0 60Z" fill="#FFFFFF"/>
        </svg>
      </div>
    </section>
  )

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <Header />

      <main className="flex-1">
        <OffersBrowser products={discountedProducts} hero={hero} />
      </main>

      <Footer />
    </div>
  )
}
