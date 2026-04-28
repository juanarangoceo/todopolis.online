import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { ProductGrid } from '@/components/product-grid'
import { getSanityProducts } from '@/lib/sanity/queries'
import { Zap, Percent, Tag } from 'lucide-react'

export const metadata = {
  title: 'Ofertas y Descuentos | Todopolis',
  description: 'Descubre los mejores descuentos y ofertas de Todopolis. Productos premium a precios increíbles por tiempo limitado.',
}

export default async function OfertasPage() {
  const sanityProducts = await getSanityProducts().catch(() => [])

  // Filter only products with an original price (= they have a discount)
  const discountedProducts = sanityProducts
    .filter((p: any) => p.originalPrice && p.originalPrice > (p.price ?? 0))
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
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white via-[#FFFBFC] to-[#FFF8FA]">
      <Header />

      <main className="flex-1">
        {/* Hero Banner */}
        <section className="relative overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#F43F5E] via-[#FF6B6B] to-[#E11D48]" />
          <div className="absolute inset-0">
            <div className="absolute top-0 left-0 w-96 h-96 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl" />
            {/* Shimmer */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_4s_ease-in-out_infinite]" />
          </div>

          <div className="relative container mx-auto px-4 py-10 md:py-16 text-center">
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 text-balance leading-tight">
              Grandes descuentos en un solo lugar.
            </h1>

            <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto mb-8 leading-relaxed">
              Productos seleccionados con los mejores precios del mercado. ¡No dejes pasar estas oportunidades únicas!
            </p>

            {/* Stats */}
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12">
              <div className="flex flex-col items-center">
                <span className="text-3xl md:text-4xl font-black text-white">{discountedProducts.length}</span>
                <span className="text-white/70 text-sm font-medium mt-1">productos en oferta</span>
              </div>
              <div className="w-px h-10 bg-white/20 hidden md:block" />
              <div className="flex flex-col items-center">
                <span className="text-3xl md:text-4xl font-black text-white">
                  {discountedProducts.length > 0
                    ? `${Math.max(...discountedProducts.map((p: any) => p._discount))}%`
                    : '0%'}
                </span>
                <span className="text-white/70 text-sm font-medium mt-1">descuento máximo</span>
              </div>
            </div>
          </div>

          {/* Bottom wave */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
              <path d="M0 60L1440 60L1440 20C1200 60 240 0 0 40L0 60Z" fill="white" fillOpacity="0.08"/>
              <path d="M0 60L1440 60L1440 0C1100 50 340 10 0 50L0 60Z" fill="white" fillOpacity="0.06"/>
              <path d="M0 60L1440 60L1440 30C900 60 540 20 0 60Z" fill="#FFFBFC"/>
            </svg>
          </div>
        </section>

        {/* Products Section */}
        <section className="pt-4 pb-16 px-4">
          <div className="container mx-auto">
            {discountedProducts.length > 0 ? (
              <>
                {/* Info bar */}
                <div className="flex items-center gap-3 mb-8 p-4 rounded-2xl bg-[#FFF0F3] border border-[#FFB4AC]/30">
                  <div className="w-10 h-10 rounded-xl bg-[#F43F5E]/10 flex items-center justify-center shrink-0">
                    <Tag className="w-5 h-5 text-[#F43F5E]" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-sm">
                      {discountedProducts.length} {discountedProducts.length === 1 ? 'producto' : 'productos'} en oferta ahora mismo
                    </p>
                    <p className="text-xs text-muted-foreground">Ordenados por mayor descuento · Precios válidos por tiempo limitado</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F43F5E] text-white text-xs font-bold">
                    <Percent className="w-3.5 h-3.5" />
                    Hasta {discountedProducts.length > 0 ? Math.max(...discountedProducts.map((p: any) => p._discount)) : 0}% off
                  </div>
                </div>

                <ProductGrid products={discountedProducts} />
              </>
            ) : (
              <div className="text-center py-24 px-4 bg-muted/20 rounded-3xl border border-dashed border-border">
                <Zap className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-foreground mb-2">No hay ofertas disponibles ahora</h2>
                <p className="text-muted-foreground max-w-md mx-auto mb-8">
                  Vuelve pronto, actualizamos nuestras ofertas constantemente con los mejores precios.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
