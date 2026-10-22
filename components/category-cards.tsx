'use client';

import { Fragment, useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import { ArrowRight, ChevronLeft, ChevronRight, SlidersHorizontal, type LucideIcon } from 'lucide-react';

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
  const railId = useId();
  const [edges, setEdges] = useState({ previous: false, next: false });
  const firstStore = categories.find((c) => c !== 'Todos' && !fashionTitles.has(c));

  // Si la activa quedó fuera de la vista (p. ej. al llegar con
  // `?categoria=Hogar`), se trae al centro.
  useEffect(() => {
    const nav = navRef.current;
    const el = nav?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!nav || !el) return;
    const target = el.offsetLeft - (nav.clientWidth - el.offsetWidth) / 2;
    nav.scrollTo({ left: Math.max(0, target), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }, [active]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const update = () => setEdges({
      previous: nav.scrollLeft > 2,
      next: nav.scrollWidth - nav.clientWidth - nav.scrollLeft > 2,
    });
    const observer = new ResizeObserver(update);
    observer.observe(nav);
    update();
    nav.addEventListener('scroll', update, { passive: true });
    return () => { observer.disconnect(); nav.removeEventListener('scroll', update); };
  }, [categories]);

  const scroll = (direction: number) => {
    const nav = navRef.current;
    if (!nav) return;
    nav.scrollBy({
      left: direction * nav.clientWidth * 0.75,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  };

  return (
    <div className="pt-2 md:hidden">
      <div className="flex min-h-11 items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-ink-title">Explora por categoría</p>
          <p id={`${railId}-hint`} className="flex items-center gap-1 text-[11px] text-muted-foreground">
            {edges.previous || edges.next ? <>Desliza para explorar <ArrowRight aria-hidden className="h-3 w-3" /></> : 'Elige lo que te gusta'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {onOpenFilters && (
            <button type="button" onClick={onOpenFilters} className="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-xs font-bold text-todopolis-lavender-deep focus-visible:outline-2 focus-visible:outline-offset-2">
              <SlidersHorizontal aria-hidden className="h-3.5 w-3.5" />
              Filtros{activeFilters > 0 && <span className="rounded-full bg-tag-active-bg px-1.5">{activeFilters}</span>}
            </button>
          )}
          {(edges.previous || edges.next) && <>
            <button type="button" aria-label="Ver categorías anteriores" aria-controls={railId} disabled={!edges.previous} onClick={() => scroll(-1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-nav-inactive-border text-todopolis-lavender-deep disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2">
              <ChevronLeft aria-hidden className="h-4 w-4" />
            </button>
            <button type="button" aria-label="Ver más categorías" aria-controls={railId} disabled={!edges.next} onClick={() => scroll(1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-nav-inactive-border text-todopolis-lavender-deep disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2">
              <ChevronRight aria-hidden className="h-4 w-4" />
            </button>
          </>}
        </div>
      </div>
      <div
        id={railId}
        ref={navRef}
        aria-describedby={`${railId}-hint`}
        className="rail-viewport relative -mx-4 flex snap-x snap-proximity gap-2.5 overflow-x-auto scroll-px-4 px-4 pb-3 pt-2"
      >
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
                className={`flex w-[74px] shrink-0 snap-start flex-col items-center gap-1.5 rounded-xl text-center transition-opacity focus-visible:outline-2 focus-visible:outline-todopolis-lavender-deep focus-visible:outline-offset-2 ${count === 0 && !isActive ? 'opacity-40' : ''}`}
              >
                <span
                  className={`relative flex h-[62px] w-[62px] items-center justify-center overflow-hidden rounded-2xl border-2 bg-surface-muted transition-colors ${
                    isActive ? 'border-todopolis-lavender-deep ring-2 ring-tag-active-bg ring-offset-2 ring-offset-surface' : 'border-nav-inactive-border'
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
    </div>
  );
}
