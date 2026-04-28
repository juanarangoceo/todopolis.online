import { getSanityProducts } from '@/lib/sanity/queries'
import { Heart } from 'lucide-react'
import { FavoritesPage } from '@/components/favorites-page'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'

export const metadata = {
  title: 'Tus Favoritos | Todopolis',
  description: 'Explora y guarda tus productos favoritos en Todopolis. Tus selecciones guardadas localmente.',
}

export default async function FavoritosPage() {
  // Fetch all products from Sanity (server side)
  const sanityProducts = await getSanityProducts().catch(() => [])

  const allProducts = sanityProducts.map((p: any) => ({
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
  }))

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white via-[#FFFBFC] to-[#FFF8FA]">
      <Header />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-12 md:py-24 max-w-7xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-[#FFD5E5]/30 rounded-2xl">
              <Heart className="w-8 h-8 text-[#FFB4AC] fill-[#FFB4AC]" />
            </div>
            <div>
              <h1 className="text-3xl md:text-5xl font-black text-foreground font-serif text-balance">
                Tus Favoritos
              </h1>
              <p className="text-lg text-muted-foreground mt-2">
                Los productos que te enamoraron, guardados para ti.
              </p>
            </div>
          </div>

          {/* Client component handles filtering by localStorage slugs */}
          <FavoritesPage allProducts={allProducts} />
        </div>
      </main>

      <Footer />
    </div>
  )
}
