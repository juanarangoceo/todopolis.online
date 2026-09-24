'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Lock, SlidersHorizontal, type LucideIcon } from 'lucide-react';

// Barra de categorías del home en ESCRITORIO (24-sep-2026). Una sola fila,
// alineada a la izquierda como en una tienda de moda:
//
//   Todos · Ropa · Fajas · Calzado · Accesorios · Lencería | Más categorías ▾      [Filtros]
//
// Antes eran tres franjas centradas antes del primer producto: dos filas de
// píldoras con ícono y conteo (16 cajas) y una tercera de etiquetas con su
// propio «Más filtros». Todo pesaba lo mismo, así que nada se leía primero.
// Ahora el grupo de moda son pestañas de texto con subrayado, el resto de la
// tienda vive en el desplegable y las etiquetas en el panel de Filtros, como
// ya estaban en móvil. En móvil siguen las tarjetas con foto
// (`product-browser.tsx`).

interface CategoryBarProps {
  /** Categorías con productos, «Todos» incluido, en el orden de la lista. */
  categories: string[];
  fashionTitles: Set<string>;
  adultTitle: string;
  active: string;
  counts: Map<string, number>;
  getIcon: (title: string) => LucideIcon;
  onSelect: (title: string) => void;
  /** Sin panel (sin etiquetas), sin botón. */
  onOpenFilters?: () => void;
  activeFilters: number;
}

export function CategoryBar({
  categories, fashionTitles, adultTitle, active, counts, getIcon, onSelect, onOpenFilters, activeFilters,
}: CategoryBarProps) {
  const [open, setOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const primary = categories.filter((c) => c === 'Todos' || fashionTitles.has(c));
  const rest = categories.filter((c) => c !== 'Todos' && !fashionTitles.has(c));
  const activeInRest = rest.includes(active);

  // Cerrar el desplegable al tocar fuera o con Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!moreRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const tab = (isActive: boolean, dim: boolean) =>
    `relative flex h-14 shrink-0 items-center gap-1.5 px-3 text-sm font-bold transition-colors ${
      isActive
        ? 'text-ink-title after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-todopolis-lavender-deep'
        : 'text-foreground/60 hover:text-ink-title'
    } ${dim && !isActive ? 'opacity-40' : ''}`;

  return (
    <div className="hidden items-center md:flex">
      <div className="-ml-3 flex min-w-0 items-center">
        {primary.map((cat) => {
          const isActive = active === cat;
          const count = counts.get(cat) ?? 0;
          return (
            <button key={cat} type="button" onClick={() => onSelect(cat)} aria-pressed={isActive} className={tab(isActive, count === 0)}>
              {cat === adultTitle && <Lock className="h-3.5 w-3.5" aria-label="Pide confirmar la edad" />}
              {cat}
              <span className="text-xs font-semibold tabular-nums text-muted-foreground">{count}</span>
            </button>
          );
        })}

        {rest.length > 0 && (
          <>
            <span aria-hidden className="mx-2 h-5 w-px shrink-0 bg-nav-inactive-border" />
            <div ref={moreRef} className="relative">
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                aria-haspopup="true"
                className={tab(activeInRest, false)}
              >
                {activeInRest ? active : 'Más categorías'}
                <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>

              {open && (
                <div className="absolute left-0 top-full z-40 mt-1 grid w-[440px] grid-cols-2 gap-1 rounded-3xl border border-nav-inactive-border bg-surface p-3 shadow-lg">
                  {rest.map((cat) => {
                    const Icon = getIcon(cat);
                    const isActive = active === cat;
                    const count = counts.get(cat) ?? 0;
                    return (
                      <button
                        key={cat}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => { onSelect(cat); setOpen(false); }}
                        className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition-colors ${
                          isActive ? 'bg-tag-active-bg text-tag-active-fg' : 'text-foreground/75 hover:bg-surface-soft hover:text-ink-title'
                        } ${count === 0 && !isActive ? 'opacity-40' : ''}`}
                      >
                        <Icon className="h-4 w-4 shrink-0 text-todopolis-lavender-deep" />
                        <span className="min-w-0 flex-1 truncate">{cat}</span>
                        <span className="text-xs font-semibold tabular-nums text-muted-foreground">{count}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {onOpenFilters && (
        <button
          type="button"
          onClick={onOpenFilters}
          className="ml-auto flex shrink-0 items-center gap-2 rounded-full border border-nav-inactive-border bg-surface px-4 py-2 text-sm font-bold text-ink-title transition-shadow hover:shadow-sm"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
          {activeFilters > 0 && (
            <span className="rounded-full bg-todopolis-lavender-deep px-1.5 py-0.5 text-[10px] font-extrabold leading-none text-white">
              {activeFilters}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
