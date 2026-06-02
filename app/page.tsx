import type { Metadata } from 'next'
import { Header } from '@/components/header';
import { NewArrivalsBanner } from '@/components/new-arrivals-banner';
import { ProductBrowser } from '@/components/product-browser';
import { PolicyBadges } from '@/components/policy-badges';
import { Footer } from '@/components/footer';
import { PromoBanner } from '@/components/promo-banner';
import { getSanityProducts, getSanityStoreSettings, getSanityTags, getActivePromoCampaign } from '@/lib/sanity/queries';

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
    isVip: p.isVip ?? false,
    testimonials: p.testimonials ?? [],
    reviewsCount: p.reviewsCount,
    tags: p.tags ?? [],
  }));

  const aiImages = sanityProducts
    .filter((p: any) => p.aiLifestyleImage)
    .map((p: any) => ({
      image: p.aiLifestyleImage as string,
      name: p.name as string,
      slug: p.slug as string,
    }));

  const [storeSettings, tagTaxonomy, promoCampaign] = await Promise.all([
    getSanityStoreSettings(),
    getSanityTags(),
    getActivePromoCampaign(),
  ]);

  const policies = storeSettings?.policies && storeSettings.policies.length > 0 
    ? storeSettings.policies 
    : [
        { iconName: 'Truck', title: 'Envío Rápido', description: 'A toda Colombia' },
        { iconName: 'WalletCards', title: 'Pago en Casa', description: 'Contra entrega' },
        { iconName: 'ShieldCheck', title: 'Garantía', description: 'Calidad 100%' },
        { iconName: 'Headphones', title: 'Atención 24/7', description: 'Lucy IA + humanos' }
      ];

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <Header />

      <main className="flex-1">
        <ProductBrowser
          initialProducts={initialProducts}
          aiImages={aiImages}
          tagTaxonomy={tagTaxonomy}
          rowTwoSlot={
            promoCampaign ? (
              <>
                <div className="md:hidden">
                  <PromoBanner campaign={promoCampaign} variant="mobile" />
                </div>
                <div className="hidden md:block">
                  <PromoBanner campaign={promoCampaign} variant="desktop" />
                </div>
              </>
            ) : undefined
          }
        >
          <NewArrivalsBanner products={initialProducts} />

          <PolicyBadges policies={policies} />
        </ProductBrowser>
        
      </main>
      
      <Footer />
    </div>
  );
}
