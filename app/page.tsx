import type { Metadata } from 'next'
import { Header } from '@/components/header';
import { SmartBanner } from '@/components/smart-banner';
import { ProductBrowser } from '@/components/product-browser';
import { Footer } from '@/components/footer';
import { getSanityProducts, getSanityStoreSettings, getSanityHeroBanner } from '@/lib/sanity/queries';
import { Sparkles, Gift, Truck, Shield, ShieldCheck, Lock, WalletCards, Star, RefreshCw, Box, CheckCircle } from 'lucide-react';

const IconMap: Record<string, React.ElementType> = {
  Truck, ShieldCheck, Lock, WalletCards, Star, RefreshCw, Box, CheckCircle, Sparkles, Gift, Shield
};

export const metadata: Metadata = {
  title: 'Todopolis - Tu Destino de Belleza',
  description: 'Descubre productos exclusivos de belleza y bienestar en Todopolis. Tu tienda de confianza con los mejores productos seleccionados para ti.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    title: 'Todopolis - Tu Destino de Belleza',
    description: 'Descubre productos exclusivos de belleza y bienestar en Todopolis.',
  },
}

export default async function Home() {
  // Fetch products from Sanity
  const sanityProducts = await getSanityProducts().catch(() => []);
  const initialProducts = sanityProducts.map((p: any) => ({
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
    testimonials: p.testimonials ?? [],
    reviewsCount: p.reviewsCount,
  }));

  const [storeSettings, heroBanner] = await Promise.all([
    getSanityStoreSettings(),
    getSanityHeroBanner()
  ]);

  const policies = storeSettings?.policies && storeSettings.policies.length > 0 
    ? storeSettings.policies 
    : [
        { iconName: 'Truck', title: 'Envío Rápido', description: 'A toda Colombia' },
        { iconName: 'WalletCards', title: 'Pago en Casa', description: 'Contra entrega' },
        { iconName: 'ShieldCheck', title: 'Garantía', description: 'Calidad 100%' },
        { iconName: 'Lock', title: 'Privacidad', description: 'Compra segura' }
      ];

  // Brand colors to assign to policies dynamically
  const badgeColors = ['#3B82F6', '#EC4899', '#10B981', '#8B5CF6'];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white via-[#FFFBFC] to-[#FFF8FA]">
      <Header />
      
      <main className="flex-1">
        {heroBanner && heroBanner.products?.length > 0 && (
          <SmartBanner banner={heroBanner} settings={storeSettings} />
        )}

        <ProductBrowser initialProducts={initialProducts}>
          
          {/* Features Banner */}
        <section className="py-4 md:py-8 overflow-hidden bg-transparent">
          <div className="container mx-auto px-4">
            
            {/* Mobile: Swipeable Horizontal Row (No autoplay, No lag) */}
            <div className="md:hidden flex overflow-x-auto snap-x snap-mandatory hide-scrollbar -mx-4 px-4 pb-4 gap-3">
              {policies.map((policy: any, i: number) => {
                const Icon = IconMap[policy.iconName] || CheckCircle;
                const color = badgeColors[i % badgeColors.length];
                return (
                  <div 
                    key={i}
                    className="w-[70vw] shrink-0 snap-center flex flex-row items-center text-left p-3 rounded-2xl bg-white/90 shadow-sm border border-neutral-100 gap-3"
                  >
                    <div 
                      className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${color}15` }}
                    >
                      <Icon className="w-5 h-5" style={{ color }} />
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="font-sans font-bold text-foreground text-xs truncate">{policy.title}</span>
                      <span className="text-[10px] text-foreground/60 mt-0.5 truncate">{policy.description}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop: Grid */}
            <div className="hidden md:grid md:grid-cols-4 gap-4">
              {policies.map((policy: any, i: number) => {
                const Icon = IconMap[policy.iconName] || CheckCircle;
                const color = badgeColors[i % badgeColors.length];
                return (
                  <div 
                    key={i}
                    className="flex flex-col items-center text-center p-5 rounded-2xl bg-white/80 backdrop-blur-sm border border-neutral-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                  >
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110"
                      style={{ backgroundColor: `${color}15` }}
                    >
                      <Icon className="w-6 h-6" style={{ color }} />
                    </div>
                    <span className="font-sans font-bold text-foreground text-sm">{policy.title}</span>
                    <span className="text-xs text-foreground/60 mt-1 px-2">{policy.description}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
        </ProductBrowser>
        
      </main>
      
      <Footer />
    </div>
  );
}
