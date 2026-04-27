'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, Star, ShoppingBag, Sparkles } from 'lucide-react';
import { Product } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useFavorites } from '@/app/providers/favorites-provider';
import { useCart } from '@/app/providers/cart-provider';

interface ProductCardProps {
  product: Product;
  index?: number;
}

export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const { favoriteSlugs, toggleFavorite } = useFavorites();
  const { addToCart } = useCart();
  const slug = (product as any).slug || (product as any)._id || '';
  const isFavorited = favoriteSlugs.includes(slug);
  
  const discount = product.originalPrice 
    ? Math.round((1 - product.price / product.originalPrice) * 100) 
    : 0;

  const formatPrice = (price: number) => {
    return '$ ' + price.toLocaleString('es-CO');
  };

  // Assign different brand colors based on index
  const colorVariants = [
    { bg: 'from-[#FFD5E5]/20 to-[#FFB4AC]/10', border: 'border-[#FFD5E5]/30', accent: '#FFB4AC' },
    { bg: 'from-[#A2D2FF]/20 to-[#EDD2F3]/10', border: 'border-[#A2D2FF]/30', accent: '#A2D2FF' },
    { bg: 'from-[#EDD2F3]/20 to-[#FFD5E5]/10', border: 'border-[#EDD2F3]/30', accent: '#EDD2F3' },
    { bg: 'from-[#E7FBBE]/20 to-[#A2D2FF]/10', border: 'border-[#E7FBBE]/30', accent: '#E7FBBE' },
  ];
  const variant = colorVariants[index % colorVariants.length];

  return (
    <>
    <Link 
      href={`/producto/${(product as any).slug || product.id}`}
      className="group block"
      style={{ 
        animationDelay: `${index * 80}ms`,
        animation: 'fadeInUp 0.5s ease-out forwards',
        opacity: 0
      }}
    >
      <article className="relative h-full">
        {/* Card with glassmorphism */}
        <div 
          className={cn(
            "relative h-full rounded-3xl overflow-hidden transition-all duration-500",
            "bg-gradient-to-br", variant.bg,
            "backdrop-blur-xl border-2", variant.border,
            "shadow-lg hover:shadow-2xl",
            "hover:scale-[1.03] hover:-translate-y-2",
            "group-focus-visible:ring-2 group-focus-visible:ring-[#FFB4AC] group-focus-visible:ring-offset-2"
          )}
          style={{
            boxShadow: `0 10px 40px -10px ${variant.accent}30`
          }}
        >
          {/* Shine effect on hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          </div>

          {/* Image container */}
          <div className="relative w-full overflow-hidden bg-white/50 aspect-[4/5] min-h-[140px] sm:min-h-[200px]">
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover transition-transform duration-700 group-hover:scale-110"
              priority={index < 4}
            />
            
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Discount badge */}
            {discount > 0 && (
              <span 
                className="absolute top-4 left-4 px-3 py-1.5 text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-1 bg-[#1a1a2e]/90 backdrop-blur-sm border border-white/20"
              >
                <Sparkles className="w-3 h-3" />
                -{discount}%
              </span>
            )}
            
            {/* Favorite button */}
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFavorite(slug);
              }}
              className={cn(
                "absolute top-4 right-4 p-2.5 rounded-2xl transition-all duration-300",
                "bg-white/90 backdrop-blur-sm hover:bg-[#FFD5E5]",
                "opacity-100 translate-y-0",
                "shadow-lg"
              )}
              aria-label={isFavorited ? "Quitar de favoritos" : "Agregar a favoritos"}
            >
              <Heart className={cn("w-4 h-4 text-[#FFB4AC]", isFavorited && "fill-current")} />
            </button>
            
            {/* Quick add button */}
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                addToCart(product);
              }}
              className={cn(
                "absolute bottom-4 right-4 p-3.5 rounded-2xl transition-all duration-300",
                "bg-[#FFB4AC] text-white hover:bg-[#FF9A8A]",
                "opacity-100 translate-y-0",
                "shadow-xl shadow-[#FFB4AC]/40"
              )}
              aria-label="Agregar al carrito"
            >
              <ShoppingBag className="w-5 h-5" />
            </button>
          </div>
          
          {/* Content */}
          <div className="p-3 sm:p-5 bg-white/80 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              {/* Category */}
              <span 
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: variant.accent }}
              >
                {product.category}
              </span>

              {product.isBestSeller && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100/80 text-amber-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                  Más Vendido
                </span>
              )}
            </div>
            
            {/* Name */}
            <h3 className="mt-2 font-sans text-sm sm:text-lg font-bold text-foreground line-clamp-2 group-hover:text-[#FFB4AC] transition-colors leading-tight">
              {product.name}
            </h3>
            
            {/* Rating */}
            <div className="mt-3 flex items-center gap-1.5">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={cn(
                      "w-3.5 h-3.5",
                      i < Math.floor(product.rating) 
                        ? "fill-[#FFB4AC] text-[#FFB4AC]" 
                        : "fill-gray-200 text-gray-200"
                    )} 
                  />
                ))}
              </div>
              <span className="text-sm font-semibold text-foreground hidden sm:inline">{product.rating}</span>
              <span className="text-xs sm:text-sm text-foreground/50 hidden sm:inline">({product.reviewsCount ?? (product as any).testimonials?.length ?? product.reviews?.length ?? 15} reseñas)</span>
            </div>
            
            {/* Price */}
            <div className="mt-2 sm:mt-4 flex flex-col sm:flex-row items-start sm:items-baseline sm:gap-2">
              <span className="text-base sm:text-2xl font-black text-foreground">
                {formatPrice(product.price)}
              </span>
              {product.originalPrice && (
                <span className="text-[10px] sm:text-sm text-foreground/40 line-through">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>
          </div>
        </div>
      </article>
    </Link>
    </>
  );
}
