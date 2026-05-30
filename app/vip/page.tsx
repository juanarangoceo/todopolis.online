import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { ProductGrid } from '@/components/product-grid'
import { getSanityProducts } from '@/lib/sanity/queries'
import { Crown, Sparkles, Truck, Zap } from 'lucide-react'
import { Product } from '@/lib/types'

export const metadata = {
  title: 'Productos VIP | Todopolis',
  description:
    'Productos VIP de Todopolis: selección exclusiva con envío gratis, despacho prioritario y contenido extendido (video en uso, antes/después, comparativas). Lo mejor, primero para ti.',
}

export default async function VipPage() {
  const sanityProducts = await getSanityProducts().catch(() => [])

  const vipProducts: Product[] = sanityProducts
    .filter((p: { isVip?: boolean; category?: string }) =>
      p.isVip === true && p.category !== 'bienestar-intimo',
    )
    .map((p: {
      _id: string; name: string; slug: string; shortDescription?: string;
      price?: number; originalPrice?: number; image?: string;
      mastershopImageUrl?: string; category?: string; isNew?: boolean;
      isBestSeller?: boolean; isVip?: boolean;
      testimonials?: { name: string; role: string; rating: number; text: string }[];
      reviewsCount?: number;
    }) => ({
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
      isVip: p.isVip ?? false,
      testimonials: p.testimonials ?? [],
      reviewsCount: p.reviewsCount,
    }))

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <Header />

      <main className="flex-1">
        {/* Hero VIP — dorado puro, separado del resto de paletas */}
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(120deg, #92400E 0%, #B45309 40%, #F59E0B 100%)',
            }}
          />
          <div aria-hidden className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl pointer-events-none" />
          <div aria-hidden className="absolute bottom-0 right-0 w-[28rem] h-[28rem] bg-amber-300/30 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl pointer-events-none" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_4s_ease-in-out_infinite] pointer-events-none" />

          <div className="relative container mx-auto px-4 py-10 md:py-14 text-center">
            <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl font-black text-white mb-4 text-balance leading-[1.1] tracking-tight drop-shadow-sm">
              Exclusivos. Con envío gratis y despacho prioritario.
            </h1>
            <p className="text-amber-50/90 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
              Una selección curada de Todopolis: productos premium con envío 100% gratis, despacho prioritario y landing extendida —video en uso, antes y después, comparativas—. Lo mejor, primero para ti.
            </p>

            {/* Píldoras de valor VIP */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
              {[
                { icon: Truck, label: 'Envío gratis' },
                { icon: Zap, label: 'Despacho prioritario' },
                { icon: Sparkles, label: 'Contenido extendido' },
              ].map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/15 border border-white/25 text-white text-xs font-bold backdrop-blur-sm shadow-sm"
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
            <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
              <path d="M0 60L1440 60L1440 20C1200 60 240 0 0 40L0 60Z" fill="white" fillOpacity="0.08"/>
              <path d="M0 60L1440 60L1440 0C1100 50 340 10 0 50L0 60Z" fill="white" fillOpacity="0.06"/>
              <path d="M0 60L1440 60L1440 30C900 60 540 20 0 60Z" fill="#FFFFFF"/>
            </svg>
          </div>
        </section>

        <section className="pt-4 pb-16 px-4">
          <div className="container mx-auto">
            {vipProducts.length > 0 ? (
              <>
                <div className="flex items-center gap-3 mb-8 p-4 rounded-2xl border border-amber-200/60 shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)' }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-amber-300"
                    style={{ background: 'linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%)' }}
                  >
                    <Sparkles className="w-5 h-5 text-amber-900" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-foreground text-sm">
                      {vipProducts.length} {vipProducts.length === 1 ? 'producto VIP' : 'productos VIP'} disponibles
                    </p>
                    <p className="text-xs text-foreground/55">
                      Envío gratis · Despacho prioritario · Pago contraentrega · Contenido visual extra
                    </p>
                  </div>
                </div>

                <ProductGrid products={vipProducts} />
              </>
            ) : (
              <div className="text-center py-24 px-4 bg-muted/20 rounded-3xl border border-dashed border-border">
                <Crown className="w-16 h-16 text-amber-300 mx-auto mb-4" fill="currentColor" strokeWidth={1.5} />
                <h2 className="text-2xl font-bold text-foreground mb-2">Próximamente productos VIP</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Estamos curando una selección con contenido extendido. Vuelve pronto.
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
