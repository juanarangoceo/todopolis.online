'use client';

import { useRef, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Product } from '@/lib/types';
import { ProductCard } from '@/components/product-card';
import { cn } from '@/lib/utils';

/**
 * Ancho de las filas compactas del home (Novedades, «Eleva tu estilo»).
 *
 * En móvil son 40vw y no 44vw: con 44vw dos tarjetas llenaban justo los 390 px
 * y de la tercera asomaban ~7 px, así que la fila parecía una rejilla de dos y
 * nadie la deslizaba. A 40vw asoman ~40 px de la siguiente: se ve la foto
 * cortada y se entiende que sigue.
 */
export const COMPACT_ROW_ITEM = 'w-[40vw] max-w-[200px] sm:w-[240px] sm:max-w-none lg:w-[270px]';

interface SuggestedProductsCarouselProps {
  products: Product[];
  /** Ancho de cada tarjeta. Por defecto el de la ficha (70vw en móvil). */
  itemClassName?: string;
}

export function SuggestedProductsCarousel({ products, itemClassName = 'w-[70vw] md:w-[280px] lg:w-[300px]' }: SuggestedProductsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  const scroll = useCallback((dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.querySelector('[data-suggested]') as HTMLElement;
    const w = card?.clientWidth ?? 300;
    el.scrollBy({ left: dir === 'left' ? -w - 24 : w + 24, behavior: 'smooth' });
    setTimeout(updateButtons, 350);
  }, [updateButtons]);

  if (!products || products.length === 0) return null;

  return (
    <div className="relative">
      {/* Arrow buttons */}
      <button
        onClick={() => scroll('left')}
        className={cn(
          "hidden md:flex absolute -left-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full items-center justify-center transition-all duration-300",
          "bg-white/90 backdrop-blur-sm border border-border/50 shadow-lg hover:shadow-xl hover:scale-110",
          canScrollLeft ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        aria-label="Anterior producto"
      >
        <ChevronLeft className="w-5 h-5 text-foreground" />
      </button>
      <button
        onClick={() => scroll('right')}
        className={cn(
          "hidden md:flex absolute -right-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full items-center justify-center transition-all duration-300",
          "bg-white/90 backdrop-blur-sm border border-border/50 shadow-lg hover:shadow-xl hover:scale-110",
          canScrollRight ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        aria-label="Siguiente producto"
      >
        <ChevronRight className="w-5 h-5 text-foreground" />
      </button>

      {/* Scrollable container — always horizontal */}
      <div
        ref={scrollRef}
        onScroll={updateButtons}
        className="flex gap-3 md:gap-6 overflow-x-auto snap-x snap-mandatory scroll-px-4 pb-4 -mx-4 px-4 md:mx-0 md:px-0 md:scroll-px-0"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {products.map((product, index) => (
          <div key={product.id} data-suggested className={cn(itemClassName, 'shrink-0 snap-start')}>
            <ProductCard product={product} index={index} />
          </div>
        ))}
      </div>
    </div>
  );
}
