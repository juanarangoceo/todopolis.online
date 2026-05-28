import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { OffersBrowser } from '@/components/offers-browser'
import { getSanityProducts } from '@/lib/sanity/queries'
import { Zap } from 'lucide-react'

export const metadata = {
  title: 'Ofertas y Descuentos | Todopolis',
  description: 'Descubre los mejores descuentos y ofertas de Todopolis. Productos premium a precios increíbles por tiempo limitado.',
}

export default async function OfertasPage() {
  const sanityProducts = await getSanityProducts().catch(() => [])

  // Filter only products with an original price (= they have a discount)
  const discountedProducts = sanityProducts
    .filter((p: any) => p.originalPrice && p.originalPrice > (p.price ?? 0) && p.category !== 'bienestar-intimo')
    .map((p: any) => {
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
    // Sort by biggest discount first
    .sort((a: any, b: any) => b._discount - a._discount)

  const totalSavings = discountedProducts.reduce((acc: number, p: any) => {
    return acc + (p.originalPrice - p.price)
  }, 0)

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <Header />

      <main className="flex-1">
        {/* Hero Banner — gradiente coral → lila alineado a la paleta */}
        <section className="relative overflow-hidden">
          {/* Background gradient: sale → lavender (paleta Todopolis) */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(120deg, var(--sale, #FF6B6B) 0%, var(--sale, #FF6B6B) 40%, #C77DFF 100%)',
            }}
          />
          {/* Blobs decorativos */}
          <div aria-hidden className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl pointer-events-none" />
          <div aria-hidden className="absolute bottom-0 right-0 w-[28rem] h-[28rem] bg-todopolis-lavender/40 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl pointer-events-none" />
          <div aria-hidden className="absolute top-1/3 right-1/4 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          {/* Shimmer */}
          <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_4s_ease-in-out_infinite] pointer-events-none" />

          <div className="relative container mx-auto px-4 py-12 md:py-20 text-center">
            {/* Eyebrow chip */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/25 mb-5 shadow-sm">
              <Zap className="w-3.5 h-3.5 text-white" />
              <span className="text-white text-xs font-bold uppercase tracking-widest">Ofertas activas</span>
            </div>

            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-black text-white mb-5 text-balance leading-tight drop-shadow-sm">
              Lo bueno, ahora con descuento.
            </h1>

            <p className="text-white/85 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              Selección curada del catálogo Todopolis a precios que solo duran lo que dura el cronómetro. Pago contraentrega, envío a toda Colombia.
            </p>

            {/* Stats */}
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
              <div className="flex flex-col items-center px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-sm">
                <span className="text-3xl md:text-4xl font-black text-white tabular-nums">{discountedProducts.length}</span>
                <span className="text-white/80 text-xs font-semibold uppercase tracking-wider mt-1">en oferta</span>
              </div>
              <div className="flex flex-col items-center px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-sm">
                <span className="text-3xl md:text-4xl font-black text-white tabular-nums">
                  {discountedProducts.length > 0
                    ? `${Math.max(...discountedProducts.map((p: { _discount: number }) => p._discount))}%`
                    : '0%'}
                </span>
                <span className="text-white/80 text-xs font-semibold uppercase tracking-wider mt-1">máximo</span>
              </div>
            </div>
          </div>

          {/* Bottom wave */}
          <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
            <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
              <path d="M0 60L1440 60L1440 20C1200 60 240 0 0 40L0 60Z" fill="white" fillOpacity="0.08"/>
              <path d="M0 60L1440 60L1440 0C1100 50 340 10 0 50L0 60Z" fill="white" fillOpacity="0.06"/>
              <path d="M0 60L1440 60L1440 30C900 60 540 20 0 60Z" fill="#FFFFFF"/>
            </svg>
          </div>
        </section>

        {/* Products Section — búsqueda + grid manejados por OffersBrowser
            (cliente que portea su barra al slot del header). */}
        <section className="pt-4 pb-16 px-4">
          <div className="container mx-auto">
            <OffersBrowser products={discountedProducts} />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
