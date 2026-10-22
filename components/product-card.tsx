'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, Star, Truck } from 'lucide-react';
import { categoryTitle } from '@/lib/categories';
import { Product } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useFavorites } from '@/app/providers/favorites-provider';
import { DestacadoBadge } from '@/components/destacado-badge';

interface ProductCardProps {
  product: Product;
  index?: number;
}

export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const { favoriteSlugs, toggleFavorite } = useFavorites();
  const slug = product.slug || product.id;
  const isFavorited = favoriteSlugs.includes(slug);
  
  const discount = product.originalPrice 
    ? Math.round((1 - product.price / product.originalPrice) * 100) 
    : 0;

  const formatPrice = (price: number) => {
    return '$ ' + price.toLocaleString('es-CO');
  };

  return (
    <>
    <Link
      href={`/producto/${slug}`}
      className="product-card group block h-full"
      style={index < 8 ? {
        animation: `fadeInUp 0.45s ease-out ${index * 60}ms forwards`,
        opacity: 0
      } : undefined}
    >
      <article className="relative h-full">
        <div
          className={cn(
            // El contenido sigue su altura natural; el precio queda junto al nombre.
            "relative flex h-full flex-col rounded-3xl overflow-hidden transition-shadow duration-200 motion-reduce:transition-none",
            "bg-surface border border-nav-inactive-border",
            "shadow-sm hover:shadow-md",
            "group-focus-visible:ring-2 group-focus-visible:ring-todopolis-lavender-deep group-focus-visible:ring-offset-2"
          )}
        >
          {/* Image container */}
          <div className="relative w-full shrink-0 overflow-hidden bg-white/50 aspect-[4/5] min-h-[140px] sm:min-h-[200px]">
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none"
              priority={index < 4}
              loading={index < 4 ? undefined : 'lazy'}
            />
            
            {/* Discount badge — color de oferta, distinto del CTA */}
            {discount > 0 && (
              <span
                className="absolute top-3 left-3 sm:top-4 sm:left-4 px-2.5 py-1 text-sale-fg text-xs font-extrabold tabular-nums rounded-full shadow-sm bg-sale"
              >
                -{discount}%
              </span>
            )}

            {/* Badge de Destacado — coronita dorada, posicionada bajo el discount para
                no chocar; si no hay discount sube al top-left. */}
            {product.isDestacado && (
              <span className={cn('absolute left-4 z-10', discount > 0 ? 'top-14' : 'top-4')}>
                <DestacadoBadge size="sm" />
              </span>
            )}

            {/* Favorite button */}
            <button
              type="button"
              aria-pressed={isFavorited}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFavorite(slug);
              }}
              className={cn(
                "absolute top-2 right-2 sm:top-3 sm:right-3 min-h-11 min-w-11 flex items-center justify-center p-2.5 rounded-2xl transition-all duration-300",
                "bg-white/95 md:backdrop-blur-sm hover:bg-accent-feminine/60",
                "opacity-100 translate-y-0",
                "shadow-md"
              )}
              aria-label={isFavorited ? "Quitar de favoritos" : "Agregar a favoritos"}
            >
              <Heart className={cn("w-4 h-4 text-todopolis-pink-deep", isFavorited && "fill-current")} />
            </button>

            {/* Sin bolsa de «agregar al carrito» (22-oct-2026): el carrito
                guardaba solo el primer producto y fallaba con tallas (ver
                CLAUDE.md → «Carrito: retirado»). Toda la tarjeta lleva a la
                ficha, que es donde se elige talla y se compra. */}
          </div>

          {/* Content */}
          <div className="flex flex-col p-3 sm:p-4 bg-surface">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {/* Categoría en neutro: es metadato, no persuasión. El color se
                  reserva para lo que pide una acción o afirma un hecho. */}
              <span
                className="truncate text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground"
              >
                {categoryTitle(product.category)}
              </span>

              {product.isBestSeller && (
                <span className="flex shrink-0 items-center gap-1 whitespace-nowrap px-1.5 sm:px-2 py-0.5 bg-amber-100/80 text-amber-700 text-[9px] sm:text-[10px] font-bold rounded-full uppercase tracking-wide">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                  Más vendido
                </span>
              )}
            </div>
            
            {/* Name */}
            <h3 className="mt-1.5 font-sans text-sm sm:text-base font-semibold text-ink-title line-clamp-2 transition-colors leading-snug group-hover:text-foreground/70">
              {product.name}
            </h3>

            {/* Sin «Contraentrega · 3–7 días» en cada tarjeta (sep 2026): se
                repetía idéntico en los 578 productos, y lo que se repite en
                todas partes deja de leerse. Esos datos viven una vez, en los
                recuadros de políticas del home y en la ficha. Aquí solo queda
                lo que DISTINGUE a este producto: el envío gratis de los
                Destacados, que sale del mismo flag que lo cobra en el checkout. */}


            {/* Price */}
            <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="font-serif text-base sm:text-xl font-extrabold tabular-nums text-ink-title">
                {formatPrice(product.price)}
              </span>
              {product.originalPrice && (
                <span className="text-[10px] sm:text-sm text-muted-foreground line-through">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>
            {product.isDestacado && (
              <div className="mt-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-300/70 text-amber-800 text-[10px] sm:text-[11px] font-bold">
                  <Truck className="w-3 h-3 shrink-0" />
                  Envío gratis
                </span>
              </div>
            )}
          </div>
        </div>
      </article>
    </Link>
    </>
  );
}
