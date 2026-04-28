'use client'

import { useEffect, useState } from 'react'
import { Heart, ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useFavorites } from '@/app/providers/favorites-provider'
import { Product } from '@/lib/types'

interface FavoritesPageProps {
  allProducts: Product[]
}

export function FavoritesPage({ allProducts }: FavoritesPageProps) {
  const { favoriteSlugs, toggleFavorite, loading } = useFavorites()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || loading) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <div className="w-10 h-10 rounded-full border-4 border-[#FFB4AC] border-t-transparent animate-spin" />
      </div>
    )
  }

  const favoriteProducts = allProducts.filter(p =>
    favoriteSlugs.includes((p as any).slug || p.id)
  )

  if (favoriteProducts.length === 0) {
    return (
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
    )
  }

  const formatPrice = (price: number) => '$ ' + price.toLocaleString('es-CO')

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {favoriteProducts.map((product) => {
        const slug = (product as any).slug || product.id
        const discount = product.originalPrice
          ? Math.round((1 - product.price / product.originalPrice) * 100)
          : 0
        return (
          <div key={product.id} className="group relative rounded-3xl overflow-hidden border border-[#FFD5E5]/30 bg-gradient-to-br from-[#FFD5E5]/20 to-[#FFB4AC]/10 shadow-lg hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-500">
            {/* Image */}
            <Link href={`/producto/${slug}`} className="block aspect-[4/5] relative bg-white/50">
              <Image
                src={product.image}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 50vw, 25vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              {discount > 0 && (
                <span className="absolute top-3 left-3 px-2 py-1 bg-[#F43F5E] text-white text-xs font-bold rounded-full">
                  -{discount}%
                </span>
              )}
            </Link>

            {/* Info */}
            <div className="p-3 md:p-4 bg-white/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#C2185B]">
                {product.category}
              </span>
              <Link href={`/producto/${slug}`}>
                <h3 className="mt-1 text-sm md:text-base font-bold text-foreground line-clamp-2 hover:text-[#FFB4AC] transition-colors">
                  {product.name}
                </h3>
              </Link>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div>
                  <span className="text-base font-black text-foreground">{formatPrice(product.price)}</span>
                  {product.originalPrice && (
                    <span className="ml-1 text-xs text-foreground/40 line-through">{formatPrice(product.originalPrice)}</span>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => toggleFavorite(slug)}
                    className="p-2 rounded-xl bg-[#FFD5E5]/60 hover:bg-[#FFD5E5] transition-colors"
                    aria-label="Quitar de favoritos"
                  >
                    <Heart className="w-4 h-4 text-[#FFB4AC] fill-[#FFB4AC]" />
                  </button>
                  <Link
                    href={`/producto/${slug}`}
                    className="p-2 rounded-xl bg-[#FFB4AC] hover:bg-[#FF9A8A] transition-colors"
                    aria-label="Ver producto"
                  >
                    <ShoppingBag className="w-4 h-4 text-white" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
