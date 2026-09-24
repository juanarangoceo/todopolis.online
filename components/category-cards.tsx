'use client';

import { Fragment, useEffect, useRef } from 'react';
import Image from 'next/image';
import { SlidersHorizontal, type LucideIcon } from 'lucide-react';

// Categorías en MÓVIL: tarjetas con la foto de un producto real y cuántos hay,
// en una fila deslizable, con un filete entre el grupo de moda y el resto.
// Con 14 categorías las píldoras dejaban ver 3 y escondían 11; una foto se
// reconoce sin leer y la tarjeta cortada al borde invita a deslizar. La usan
// el home y /ofertas. En escritorio va `CategoryBar`.

interface CategoryCardsProps {
  /** Categorías con productos, «Todos» incluido, en el orden de la lista. */
  categories: string[];
  fashionTitles: Set<string>;
  adultTitle: string;
  active: string;
  counts: Map<string, number>;
  /** Foto por categoría. La de adultos nunca se pinta: sería contenido sensible antes del aviso de edad. */
  images: Map<string, string>;
  getIcon: (title: string) => LucideIcon;
  onSelect: (title: string) => void;
  onOpenFilters?: () => void;
  activeFilters?: number;
}

export function CategoryCards({
  categories, fashionTitles, adultTitle, active, counts, images, getIcon, onSelect, onOpenFilters, activeFilters = 0,
}: CategoryCardsProps) {
  const navRef = useRef<HTMLDivElement | null>(null);
  const firstStore = categories.find((c) => c !== 'Todos' && !fashionTitles.has(c));

  // Si la activa quedó fuera de la vista (p. ej. al llegar con
  // `?categoria=Hogar`), se trae al centro.
  useEffect(() => {
    const nav = navRef.current;
    const el = nav?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!nav || !el) return;
    const target = el.offsetLeft - (nav.clientWidth - el.offsetWidth) / 2;
    nav.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  }, [active]);

  return (
        <div
          ref={navRef}
          className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-3 pt-3 md:hidden"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {onOpenFilters && (
            <button
              type="button"
              onClick={onOpenFilters}
              className="flex w-[74px] shrink-0 flex-col items-center gap-1.5 text-center"
            >
              <span className="relative flex h-[62px] w-[62px] items-center justify-center rounded-2xl bg-ink-title text-white">
                <SlidersHorizontal className="h-5 w-5" />
                {activeFilters > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-surface bg-todopolis-lavender-deep px-1 text-[10px] font-extrabold">
                    {activeFilters}
                  </span>
                )}
              </span>
              <span className="text-[11px] font-bold leading-tight text-ink-title">Filtros</span>
            </button>
          )}
          {categories.map((cat) => {
            const isActive = active === cat;
            const count = counts.get(cat) ?? 0;
            const img = cat === 'Todos' ? null : images.get(cat);
            const Icon = getIcon(cat);
            // Adultos sin foto: la miniatura sería contenido sensible antes
            // del aviso de edad.
            const showImg = img && cat !== adultTitle;
            // Filete entre el grupo de moda y el resto de la tienda.
            const startsStore = cat === firstStore;
            return (
              <Fragment key={cat}>
              {startsStore && <span aria-hidden className="mx-1 h-14 w-px shrink-0 self-start bg-nav-inactive-border mt-1" />}
              <button
                type="button"
                onClick={() => onSelect(cat)}
                aria-pressed={isActive}
                className={`flex w-[74px] shrink-0 flex-col items-center gap-1.5 text-center transition-opacity ${count === 0 && !isActive ? 'opacity-40' : ''}`}
              >
                <span
                  className={`relative flex h-[62px] w-[62px] items-center justify-center overflow-hidden rounded-2xl border-2 bg-surface-muted transition-colors ${
                    isActive ? 'border-todopolis-lavender-deep' : 'border-transparent'
                  }`}
                >
                  {showImg ? (
                    <Image src={img} alt="" fill sizes="62px" className="object-cover" />
                  ) : (
                    <Icon className={`h-6 w-6 ${isActive ? 'text-todopolis-lavender-deep' : 'text-foreground/60'}`} />
                  )}
                </span>
                <span className={`line-clamp-2 text-[11px] leading-tight ${isActive ? 'font-extrabold text-todopolis-lavender-deep' : 'font-bold text-ink-title'}`}>
                  {cat}
                </span>
                <span className="-mt-1 text-[10px] tabular-nums text-muted-foreground">{count}</span>
              </button>
              </Fragment>
            );
          })}
        </div>
  );
}
