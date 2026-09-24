'use client';

import { Fragment, ReactNode, useEffect, useRef, useState } from 'react';
import { Product } from '@/lib/types';
import { ProductCard } from './product-card';
import { ChevronDown, Package, Sparkles } from 'lucide-react';
import { PAGE_SIZE, listSignature, railAfterIndex, remaining, shouldAutoLoad } from '@/lib/catalog-paging';

interface ProductGridProps {
  products: Product[];
  searchQuery?: string;
  // Slot opcional para insertar contenido (ej: banner promocional) después de la
  // 2ª fila de productos. Se renderiza dos veces con clases responsive para que
  // siempre aparezca cerca de la 2ª fila en cada breakpoint.
  rowTwoSlot?: ReactNode;
  // Slot REPETIDO (carriles de inspiración). Recibe el número de aparición,
  // empezando en 0, para que el llamador decida qué contenido va en cada uno.
  // Sale en las posiciones de `RAIL_AFTER` (lib/catalog-paging.ts): dos.
  repeatingSlot?: (occurrence: number) => ReactNode;
  // Si llega, el estado vacío ofrece quitar los filtros: sin resultados, la
  // única salida útil es volver atrás, y no debería tocar buscarla arriba.
  onClearFilters?: () => void;
  /** Contenido extra bajo el estado vacío (p. ej. sugerencias de búsqueda). */
  emptyExtra?: ReactNode;
}

// Posiciones donde insertar el slot. Mobile/sm: 2 cols → tras 4. lg+: 3-4 cols → tras 8.
const SLOT_AFTER_MOBILE = 4;
const SLOT_AFTER_DESKTOP = 8;

// Lo cargado y la posición, guardados al abrir una ficha desde la cuadrícula.
const RESTORE_KEY = 'tp_grid_v1';

export function ProductGrid({ products, searchQuery, rowTwoSlot, repeatingSlot, onClearFilters, emptyExtra }: ProductGridProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const signature = listSignature(products.map((p) => p.id));

  // Otra lista (búsqueda, categoría, orden) vuelve a la primera tanda. Se
  // ajusta durante el render y no en un efecto: así no hay un render de más
  // pintando 200 productos de la lista anterior.
  const [shownFor, setShownFor] = useState(signature);
  if (shownFor !== signature) {
    setShownFor(signature);
    setVisibleCount(PAGE_SIZE);
  }

  // Al volver de una ficha: si la lista es la misma, recuperar lo que estaba
  // cargado y la posición. Next restaura el scroll, pero sobre una página que
  // ya solo tiene 24 productos, y el comprador aparecía en otra parte.
  useEffect(() => {
    let saved: { sig: string; visible: number; y: number } | null = null;
    try {
      saved = JSON.parse(sessionStorage.getItem(RESTORE_KEY) ?? 'null');
      sessionStorage.removeItem(RESTORE_KEY);
    } catch {
      return;
    }
    if (!saved || saved.sig !== signature) return;
    const { visible, y } = saved;
    const t = window.setTimeout(() => {
      setVisibleCount(visible);
      requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo({ top: y })));
    }, 0);
    return () => window.clearTimeout(t);
    // Solo al montar: después, la firma cambia por filtros del propio usuario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rememberPosition = (event: React.MouseEvent) => {
    if (!(event.target as HTMLElement).closest('a[href^="/producto/"]')) return;
    try {
      sessionStorage.setItem(RESTORE_KEY, JSON.stringify({ sig: signature, visible: visibleCount, y: window.scrollY }));
    } catch {
      // Sin almacenamiento (modo privado): se vuelve a la primera tanda.
    }
  };

  const autoLoad = shouldAutoLoad(visibleCount, products.length);
  useEffect(() => {
    if (!autoLoad) return;
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
  }, [autoLoad, visibleCount, products.length]);

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-surface-muted flex items-center justify-center mb-6">
            <Package className="w-12 h-12 text-todopolis-blue-deep" />
          </div>
          <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-todopolis-lavender-deep" />
        </div>
        <h3 className="text-2xl font-sans font-bold text-foreground mb-3">
          No encontramos resultados
        </h3>
        <p className="text-foreground/60 text-center max-w-md">
          {searchQuery
            ? `No hay productos que coincidan con «${searchQuery}». Prueba con otra palabra.`
            : 'No hay productos disponibles en este momento.'
          }
        </p>
        {onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="mt-6 rounded-full bg-ink-title px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            Quitar filtros y ver todo
          </button>
        )}
        {emptyExtra}
      </div>
    );
  }

  const visibleProducts = products.slice(0, visibleCount);
  const left = remaining(visibleCount, products.length);

  return (
    <>
      <div onClickCapture={rememberPosition} className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-8">
        {visibleProducts.map((product, index) => {
          // Solo emitimos los slots si tenemos slot y suficientes productos para no
          // dejar el banner colgando arriba del contenido.
          const showMobileSlot =
            rowTwoSlot && index === SLOT_AFTER_MOBILE - 1 && visibleProducts.length > SLOT_AFTER_MOBILE;
          const showDesktopSlot =
            rowTwoSlot && index === SLOT_AFTER_DESKTOP - 1 && visibleProducts.length > SLOT_AFTER_DESKTOP;
          const occurrence = repeatingSlot ? railAfterIndex(index, visibleProducts.length) : null;

          return (
            <Fragment key={product.id}>
              <ProductCard product={product} index={index} />
              {showMobileSlot && (
                <div className="col-span-full lg:hidden my-2">{rowTwoSlot}</div>
              )}
              {showDesktopSlot && (
                <div className="hidden lg:block col-span-full my-4">{rowTwoSlot}</div>
              )}
              {occurrence !== null && (
                <div className="col-span-full my-3 md:my-5 -mx-4 md:mx-0">
                  {repeatingSlot!(occurrence)}
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
      {autoLoad && (
        <div ref={sentinelRef} className="h-10 mt-6 flex items-center justify-center">
          <div className="text-xs text-foreground/40 animate-pulse">Cargando más productos…</div>
        </div>
      )}
      {!autoLoad && left > 0 && (
        <div className="mt-10 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => setVisibleCount((c) => Math.min(c + PAGE_SIZE, products.length))}
            className="inline-flex items-center gap-2 rounded-full border border-nav-inactive-border bg-surface px-6 py-3 text-sm font-bold text-ink-title shadow-sm transition-shadow hover:shadow-md"
          >
            Ver más productos
            <ChevronDown className="h-4 w-4" />
          </button>
          <p className="text-xs tabular-nums text-muted-foreground">
            Viste {visibleCount} de {products.length}
          </p>
        </div>
      )}
    </>
  );
}
