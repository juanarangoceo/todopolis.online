import type { Metadata } from 'next'
import type { SanityProduct, ProductTag } from '@/lib/types'
import { Header } from '@/components/header';
import { NewArrivalsBanner } from '@/components/new-arrivals-banner';
import { newestProductIds } from '@/lib/new-arrivals';
import { StyleSpotlight } from '@/components/style-spotlight';
import { CategorySpotlight } from '@/components/category-spotlight';
import { inspirationImages } from '@/lib/inspiration';
import { categoryTitle } from '@/lib/categories';
import { HomeGreeting } from '@/components/home-greeting';
import { HomeBlogSuggestions } from '@/components/home-blog-suggestions';
import { homeArticlePicks } from '@/lib/home-articles';
import { stylePickIds } from '@/lib/style-picks';
import { ProductBrowser } from '@/components/product-browser';
import { PolicyBadges } from '@/components/policy-badges';
import { Footer } from '@/components/footer';
import { advancePaymentEnabled } from '@/lib/payments/config';
import { resolveWhatsAppPhone } from '@/lib/whatsapp';
import { getArticles, getSanityProducts, getSanityStoreSettings, getSanityTags } from '@/lib/sanity/queries';

// El título del home lleva el slogan y el sector al que se enfoca la tienda
// (moda y accesorios, sep 2026), sin dejar de decir que hay más.
const HOME_TITLE = 'Todópolis | Eleva tu estilo: moda, accesorios y más en Colombia'
const HOME_DESCRIPTION =
  'Moda, accesorios, belleza y hogar en una tienda online colombiana. Pagas al recibir o con Confío por PSE, Nequi o Bancolombia. Llega a todo el país en 3 a 7 días hábiles.'

interface HomeCatalogProduct extends SanityProduct {
  originalPrice?: number
  tags?: ProductTag[]
  aiLifestyleImageCreatedAt?: string
}

export const metadata: Metadata = {
  // `absolute`: la plantilla del layout añadiría otro «| Todópolis».
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
  },
}

export default async function Home() {
  const catalogPromise: Promise<HomeCatalogProduct[]> = getSanityProducts().catch(() => []);
  const [sanityProducts, articles, storeSettings, tagTaxonomy] = await Promise.all([
    catalogPromise,
    getArticles(),
    getSanityStoreSettings(),
    getSanityTags(),
  ]);
  const suggestedArticles = homeArticlePicks(articles);
  const initialProducts = sanityProducts.map((p) => ({
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

  // «Eleva tu estilo»: moda y accesorios más recientes, sin repetir Novedades.
  const byId = new Map(initialProducts.map((p: { id: string }) => [p.id, p]));
  const stylePicks = stylePickIds(sanityProducts, recentIds)
    .map((id) => byId.get(id))
    .filter((p): p is (typeof initialProducts)[number] => Boolean(p));

  const beautyIds = newestProductIds(sanityProducts.filter((p: { _id: string; category?: string }) => p.category === 'belleza' && !recentIds.has(p._id)));
  const beautyPicks = [...beautyIds]
    .map((id) => byId.get(id))
    .filter((p): p is (typeof initialProducts)[number] => Boolean(p));

  const aiImages = inspirationImages(sanityProducts);

  const whatsappPhone = resolveWhatsAppPhone(storeSettings?.whatsappPhone, process.env.NEXT_PUBLIC_WHATSAPP_PHONE)
  const whatsappHref = whatsappPhone
    ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent('Hola, tengo una pregunta antes de pedir en Todópolis.')}`
    : null

  const policies = storeSettings?.policies && storeSettings.policies.length > 0 
    ? storeSettings.policies 
    : [
        // En el ORDEN de una compra (sep 2026): cómo pago → cuándo llega → y
        // si llega mal. Es la duda del que llega desde un anuncio, contada de
        // principio a fin. Cada paso responde con un DATO, no con un adjetivo,
        // y las cifras son las de `store-policies.tsx`.
        {
          iconName: 'WalletCards',
          // "No pagas hasta recibir" era media verdad desde que hay prepago. El
          // título nombra las dos vías; Confío se cuenta por rapidez y medios de
          // pago, sin decir que guarda el dinero (lib/payments/narrative.ts).
          title: advancePaymentEnabled() ? 'Pagas al recibir, o con Confío' : 'Pagas cuando lo recibes',
          description: advancePaymentEnabled()
            ? 'En efectivo cuando te lo entregan, o en segundos desde tu celular con Confío: PSE, Nequi o Bancolombia.'
            : 'En efectivo, en la puerta de tu casa. Sin tarjetas ni adelantos.',
        },
        { iconName: 'Truck', title: 'Llega en 3 a 7 días hábiles', description: 'Envío $12.000 a todo el país. Gratis en Destacados.' },
        { iconName: 'RefreshCw', title: '30 días si llega con un defecto', description: 'Lo reponemos o te devolvemos la plata.' },
        // Se quitó un cuarto recuadro, «Lucy responde 24/7»: el chat de Lucy se
        // retiró y el recuadro solo no se veía porque se cortaba en tres.
      ];

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <Header />

      <main className="flex-1">
        <ProductBrowser
          initialProducts={initialProducts}
          aiImages={aiImages}
          tagTaxonomy={tagTaxonomy}
          // Lo que ya sale en Moda, Belleza y Novedades no se repite en
          // la cuadrícula limpia. Con búsqueda o filtros vuelve a aparecer.
          featuredIds={[...newArrivals, ...stylePicks, ...beautyPicks].map((p: { id: string }) => p.id)}
          intro={
            <div key="intro" className="container mx-auto px-4 pt-4 md:pt-6">
              <div className={`grid gap-2 ${suggestedArticles.length ? 'md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] md:items-center md:gap-10' : ''}`}>
                <HomeGreeting key="saludo" embedded />
                <HomeBlogSuggestions key="lecturas" articles={suggestedArticles} />
              </div>
            </div>
          }
          // Sin banner de temporada en el home (22-oct-2026): la pieza traía
          // degradado, texto pintado y dos botones, y chocaba con la marca.
          // La campaña sigue viva en /temporada.
        >
          {/* Claves estables al pasar las secciones de servidor al navegador. */}
          <>
            <NewArrivalsBanner key="novedades" products={newArrivals} />

            <PolicyBadges key="politicas" policies={policies} whatsappHref={whatsappHref} showPayments={advancePaymentEnabled()} />

            <CategorySpotlight
              key="belleza"
              products={beautyPicks}
              id="belleza-titulo"
              eyebrow="Cuidado personal"
              title="Tu rutina de belleza"
              category={categoryTitle('belleza')}
              linkLabel="Ver toda la belleza"
            />

            <StyleSpotlight key="moda" products={stylePicks} />
          </>
        </ProductBrowser>
        
      </main>
      
      <Footer />
    </div>
  );
}
