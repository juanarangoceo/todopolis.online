import { createClient } from '@/lib/supabase/server'
import { getSanityProducts } from '@/lib/sanity/queries'
import { ProductBrowser } from '@/components/product-browser'
import { Heart } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Tus Favoritos | Todopolis',
  description: 'Explora y guarda tus productos favoritos.',
}

export default async function FavoritosPage() {
  const supabase = await createClient()
  
  // Middleware already protected this, but double check auth
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return null // Should redirect in middleware
  }

  // Fetch favorite slugs from Supabase
  const { data: favorites } = await supabase
    .from('favorites')
    .select('product_slug')
    .eq('user_id', user.id)

  const favoriteSlugs = favorites?.map(f => f.product_slug) || []

  // Fetch all products from Sanity to filter them
  // We fetch all because we want the ProductBrowser to function normally with dynamic categories,
  // but we will only pass the ones that are favorited.
  const allProducts = await getSanityProducts()
  
  const favoriteProducts = allProducts.filter((product: any) => 
    favoriteSlugs.includes(product.slug) || favoriteSlugs.includes(product._id)
  )

  return (
    <div className="container mx-auto px-4 py-12 md:py-24 max-w-7xl min-h-[70vh]">
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

      {favoriteProducts.length > 0 ? (
        <ProductBrowser initialProducts={favoriteProducts} />
      ) : (
        <div className="text-center py-20 px-4 bg-muted/30 rounded-3xl border border-dashed border-border flex flex-col items-center">
          <Heart className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Aún no tienes favoritos</h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-8">
            Explora nuestro catálogo y presiona el ❤️ en los productos que más te gusten para guardarlos aquí.
          </p>
          <Link 
            href="/"
            className="px-8 py-4 bg-primary text-primary-foreground font-bold rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
          >
            Ir a explorar productos
          </Link>
        </div>
      )}
    </div>
  )
}
