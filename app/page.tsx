import { Header } from '@/components/header';
import { Hero } from '@/components/hero';
import { ProductBrowser } from '@/components/product-browser';
import { Footer } from '@/components/footer';
import { getSanityProducts } from '@/lib/sanity/queries';
import { Sparkles, Gift, Truck, Shield } from 'lucide-react';

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
    image: p.image ?? '/placeholder.jpg',
    category: p.category ?? 'Otros',
    rating: 4.8,
    isNew: p.isNew ?? false,
    isBestSeller: p.isBestSeller ?? false,
    testimonials: p.testimonials ?? [],
    reviewsCount: p.reviewsCount,
  }));

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white via-[#FFFBFC] to-[#FFF8FA]">
      <Header />
      
      <main className="flex-1">
        <ProductBrowser initialProducts={initialProducts}>
          <Hero />
          
          {/* Features Banner */}
        <section className="py-2 md:py-4 overflow-hidden">
          <div className="container mx-auto px-4">
            
            {/* Mobile: Infinite Marquee Slider */}
            <div className="md:hidden flex overflow-hidden -mx-4 group">
              <div className="flex w-max animate-marquee gap-3 px-3 hover:[animation-play-state:paused]">
                {/* Doble render para que haga loop infinito suave */}
                {[
                  { icon: Truck, label: 'Envío gratis', desc: 'En pedidos +$100k', color: '#3B82F6' },
                  { icon: Gift, label: 'Miles de prod.', desc: 'En todas las categorías', color: '#EC4899' },
                  { icon: Shield, label: 'Compra segura', desc: 'Satisfacción 100%', color: '#10B981' },
                  { icon: Sparkles, label: 'Lo mejor', desc: 'Selección exclusiva', color: '#8B5CF6' },
                  // Repetición
                  { icon: Truck, label: 'Envío gratis', desc: 'En pedidos +$100k', color: '#3B82F6' },
                  { icon: Gift, label: 'Miles de prod.', desc: 'En todas las categorías', color: '#EC4899' },
                  { icon: Shield, label: 'Compra segura', desc: 'Satisfacción 100%', color: '#10B981' },
                  { icon: Sparkles, label: 'Lo mejor', desc: 'Selección exclusiva', color: '#8B5CF6' },
                ].map((feature, i) => (
                  <div 
                    key={i}
                    className="w-[60vw] shrink-0 flex flex-row items-center text-left p-3 rounded-2xl bg-white/90 backdrop-blur-sm border border-[#EDD2F3]/30 shadow-sm gap-3"
                  >
                    <div 
                      className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${feature.color}30` }}
                    >
                      <feature.icon className="w-5 h-5" style={{ color: feature.color }} />
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="font-sans font-bold text-foreground text-xs truncate">{feature.label}</span>
                      <span className="text-[10px] text-foreground/60 mt-0.5 truncate">{feature.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop: Grid */}
            <div className="hidden md:grid md:grid-cols-4 gap-4">
              {[
                { icon: Truck, label: 'Envío gratis', desc: 'En pedidos +$100k', color: '#3B82F6' },
                { icon: Gift, label: 'Miles de productos', desc: 'En todas las categorías', color: '#EC4899' },
                { icon: Shield, label: 'Compra segura', desc: 'Garantía de satisfacción', color: '#10B981' },
                { icon: Sparkles, label: 'Lo mejor', desc: 'Selección exclusiva', color: '#8B5CF6' },
              ].map((feature, i) => (
                <div 
                  key={i}
                  className="flex flex-col items-center text-center p-4 rounded-2xl bg-white/80 backdrop-blur-sm border border-[#EDD2F3]/20 hover:shadow-lg hover:shadow-[#FFD5E5]/20 transition-all duration-300"
                >
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                    style={{ backgroundColor: `${feature.color}30` }}
                  >
                    <feature.icon className="w-6 h-6" style={{ color: feature.color }} />
                  </div>
                  <span className="font-sans font-bold text-foreground text-sm">{feature.label}</span>
                  <span className="text-xs text-foreground/60 mt-1">{feature.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
        </ProductBrowser>
        
      </main>
      
      <Footer />
    </div>
  );
}
