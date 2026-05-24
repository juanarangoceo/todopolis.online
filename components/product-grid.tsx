'use client';

import { Fragment, ReactNode, useEffect, useRef, useState } from 'react';
import { Product } from '@/lib/types';
import { ProductCard } from './product-card';
import { Package, Sparkles } from 'lucide-react';

interface ProductGridProps {
  products: Product[];
  searchQuery?: string;
  // Slot opcional para insertar contenido (ej: banner promocional) después de la
  // 2ª fila de productos. Se renderiza dos veces con clases responsive para que
  // siempre aparezca cerca de la 2ª fila en cada breakpoint.
  rowTwoSlot?: ReactNode;
}

const PAGE_SIZE = 24;
// Posiciones donde insertar el slot. Mobile/sm: 2 cols → tras 4. lg+: 3-4 cols → tras 8.
const SLOT_AFTER_MOBILE = 4;
const SLOT_AFTER_DESKTOP = 8;

export function ProductGrid({ products, searchQuery, rowTwoSlot }: ProductGridProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Resetear visibleCount cuando cambia el set de productos (búsqueda/categoría).
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [products]);

  useEffect(() => {
    if (visibleCount >= products.length) return;
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, products.length));
        }
      },
      { rootMargin: '600px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visibleCount, products.length]);

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#FFD5E5]/50 to-[#EDD2F3]/50 flex items-center justify-center mb-6">
            <Package className="w-12 h-12 text-[#FFB4AC]" />
          </div>
          <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-[#A2D2FF]" />
        </div>
        <h3 className="text-2xl font-sans font-bold text-foreground mb-3">
          No encontramos resultados
        </h3>
        <p className="text-foreground/60 text-center max-w-md font-serif">
          {searchQuery
            ? `No hay productos que coincidan con "${searchQuery}". Intenta con otra busqueda.`
            : 'No hay productos disponibles en este momento.'
          }
        </p>
      </div>
    );
  }

  const visibleProducts = products.slice(0, visibleCount);
  const hasMore = visibleCount < products.length;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-8">
        {visibleProducts.map((product, index) => {
          // Solo emitimos los slots si tenemos slot y suficientes productos para no
          // dejar el banner colgando arriba del contenido.
          const showMobileSlot =
            rowTwoSlot && index === SLOT_AFTER_MOBILE - 1 && visibleProducts.length > SLOT_AFTER_MOBILE;
          const showDesktopSlot =
            rowTwoSlot && index === SLOT_AFTER_DESKTOP - 1 && visibleProducts.length > SLOT_AFTER_DESKTOP;
          return (
            <Fragment key={product.id}>
              <ProductCard product={product} index={index} />
              {showMobileSlot && (
                <div className="col-span-full lg:hidden my-2">{rowTwoSlot}</div>
              )}
              {showDesktopSlot && (
                <div className="hidden lg:block col-span-full my-4">{rowTwoSlot}</div>
              )}
            </Fragment>
          );
        })}
      </div>
      {hasMore && (
        <div ref={sentinelRef} className="h-10 mt-6 flex items-center justify-center">
          <div className="text-xs text-foreground/40 animate-pulse">Cargando más productos…</div>
        </div>
      )}
    </>
  );
}
