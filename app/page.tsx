import type { Metadata } from 'next'
import { Header } from '@/components/header';
import { NewArrivalsBanner } from '@/components/new-arrivals-banner';
import { newestProductIds } from '@/lib/new-arrivals';
import { ProductBrowser } from '@/components/product-browser';
import { PolicyBadges } from '@/components/policy-badges';
import { Footer } from '@/components/footer';
import { PromoBanner } from '@/components/promo-banner';
import { advancePaymentEnabled } from '@/lib/payments/config';
import { getSanityProducts, getSanityStoreSettings, getSanityTags, getActivePromoCampaign } from '@/lib/sanity/queries';

export const metadata: Metadata = {
  title: 'Todópolis | Tienda Online en Colombia: Hogar, Moda y Tecnología',
  description: 'Tienda online colombiana con hogar, moda, tecnología, belleza y más. Pago contraentrega o pago protegido con PSE, Nequi y Bancolombia. Envío a todo el país en 3 a 7 días.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    title: 'Todópolis | Tienda Online en Colombia: Hogar, Moda y Tecnología',
    description: 'Tienda online colombiana con hogar, moda, tecnología, belleza y más. Pago contraentrega o pago protegido con PSE, Nequi y Bancolombia. Envío a todo el país en 3 a 7 días.',
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
    isDestacado: p.isDestacado ?? false,
    testimonials: p.testimonials ?? [],
    reviewsCount: p.reviewsCount,
    tags: p.tags ?? [],
  }));

  // Las 12 casillas de novedades: siempre los más recientes del catálogo.
  // Entra uno nuevo y desplaza al más viejo de la tanda.
  const recentIds = newestProductIds(sanityProducts);
  const newArrivals = initialProducts.filter((p: { id: string }) => recentIds.has(p.id));

  const aiImages = sanityProducts
    .filter((p: any) => p.aiLifestyleImage)
    .map((p: any) => ({
      image: p.aiLifestyleImage as string,
      name: p.name as string,
      slug: p.slug as string,
      price: (p.price ?? 0) as number,
    }));

  const [storeSettings, tagTaxonomy, promoCampaign] = await Promise.all([
    getSanityStoreSettings(),
    getSanityTags(),
    getActivePromoCampaign(),
  ]);

  const policies = storeSettings?.policies && storeSettings.policies.length > 0 
    ? storeSettings.policies 
    : [
        // Cada recuadro responde UNA objeción concreta con un DATO, no con un
        // adjetivo. "Envío rápido" y "Calidad 100%" no significaban nada y no
        // resolvían ninguna duda; un plazo y un número de días de devolución sí.
        // Todos los datos son ciertos: el envío y el plazo salen del checkout y
        // de los prompts de venta, y los 30 días de devolución del footer.
        { iconName: 'Truck', title: 'Llega en 3 a 7 días', description: '$12.000 a todo el país. Gratis en Destacados.' },
        {
          iconName: 'WalletCards',
          // "No pagas hasta recibir" era media verdad desde que hay prepago:
          // con Confío sí pagas antes, solo que la plata la retiene la app y no
          // nosotros. El título nombra las dos vías y a quién la custodia.
          title: advancePaymentEnabled() ? 'Paga al recibir, o con Confío' : 'Pagas cuando lo recibes',
          description: advancePaymentEnabled()
            ? 'En efectivo cuando te lo entregan, o por PSE, Nequi y Bancolombia: Confío retiene tu plata hasta que confirmes que llegó.'
            : 'En efectivo, en la puerta de tu casa. Sin tarjetas ni adelantos.',
        },
        { iconName: 'RefreshCw', title: '30 días para devolver', description: 'Si llega con un defecto, lo reponemos o te devolvemos.' },
        { iconName: 'Headphones', title: 'Te contestamos por WhatsApp', description: 'Lucy responde 24/7 y un humano cuando lo necesites.' }
      ];

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <Header />

      <main className="flex-1">
        <ProductBrowser
          initialProducts={initialProducts}
          aiImages={aiImages}
          tagTaxonomy={tagTaxonomy}
          // Lo que ya sale en "Llegaron N productos nuevos" no se repite en la
          // cuadrícula limpia. Con búsqueda o filtros vuelve a aparecer.
          featuredIds={newArrivals.map((p: { id: string }) => p.id)}
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
          <NewArrivalsBanner products={newArrivals} />

          <PolicyBadges policies={policies} />
        </ProductBrowser>
        
      </main>
      
      <Footer />
    </div>
  );
}
