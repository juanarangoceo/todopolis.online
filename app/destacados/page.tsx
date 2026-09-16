import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { ProductGrid } from '@/components/product-grid'
import { GlobalSearch } from '@/components/global-search'
import { getSanityProducts } from '@/lib/sanity/queries'
import { Star } from 'lucide-react'
import { Product } from '@/lib/types'

export const metadata = {
  title: 'Productos Destacados',
  description:
    'Productos Destacados de Todópolis: ficha extendida con video en uso, antes y después, paso a paso y comparativas, más envío gratis y despacho prioritario.',
}

export default async function DestacadosPage() {
  const sanityProducts = await getSanityProducts().catch(() => [])

  const searchableProducts = sanityProducts
    .filter((p: { category?: string }) => p.category?.toLowerCase() !== 'bienestar-intimo')
    .map((p: { _id: string; name: string; slug: string; shortDescription?: string; price?: number; mastershopImageUrl?: string; image?: string; category?: string }) => ({
      id: p._id,
      name: p.name,
      slug: p.slug,
      shortDescription: p.shortDescription ?? '',
      price: p.price ?? 0,
      image: p.mastershopImageUrl ?? p.image ?? '/placeholder.jpg',
      category: p.category ?? '',
    }))

  const destacadoProducts: Product[] = sanityProducts
    .filter((p: { isDestacado?: boolean; category?: string }) =>
      p.isDestacado === true && p.category !== 'bienestar-intimo',
    )
    .map((p: {
      _id: string; name: string; slug: string; shortDescription?: string;
      price?: number; originalPrice?: number; image?: string;
      mastershopImageUrl?: string; category?: string; isNew?: boolean;
      isBestSeller?: boolean; isDestacado?: boolean;
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
      isDestacado: p.isDestacado ?? false,
      testimonials: p.testimonials ?? [],
      reviewsCount: p.reviewsCount,
    }))

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <Header />
      {/* Rellena el hueco de búsqueda del header (#header-search-slot). Sin
          esto, en escritorio la página se queda sin buscador: el hueco lo
          monta Header pero lo llena cada página. */}
      <GlobalSearch products={searchableProducts} />

      <main className="flex-1">
        <section className="pt-8 md:pt-10 pb-16 px-4">
          <div className="container mx-auto">
            {destacadoProducts.length > 0 ? (
              <ProductGrid products={destacadoProducts} />
            ) : (
              <div className="text-center py-24 px-4 bg-muted/20 rounded-3xl border border-dashed border-border">
                <Star className="w-16 h-16 text-amber-300 mx-auto mb-4" fill="currentColor" strokeWidth={1.5} />
                <h2 className="text-2xl font-bold text-foreground mb-2">Próximamente productos destacados</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Estamos armando una selección con ficha extendida. Vuelve pronto.
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
