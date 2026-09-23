'use client';

import { useState, useCallback, useMemo, ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Product, TagTaxonomyEntry } from '@/lib/types';
import { MagicSearchBar } from './magic-search-bar';
import { MobileSearchFab } from './mobile-search-fab';
import { ProductGrid } from './product-grid';
import { InspirationRail } from './inspiration-rail';
import { railSlice, type AiImage } from '@/lib/inspiration';
import { TagFilterPanel } from './tag-filter-panel';
import {
  Sparkles, Grid, Watch, HeartPulse,
  Laptop, Home, Shirt, Dumbbell, Gamepad2,
  Droplets, Utensils, SlidersHorizontal, X,
  ChevronLeft, ChevronRight, Check, Search
} from 'lucide-react';
import { AgeGate } from '@/components/age-gate';


const getCategoryIcon = (cat: string) => {
  const lower = cat.toLowerCase();
  if (lower === 'todos') return Grid;
  if (lower.includes('accesorio')) return Watch;
  if (lower.includes('bienestar')) return HeartPulse;
  if (lower.includes('electrónica') || lower.includes('electronica')) return Laptop;
  if (lower.includes('hogar')) return Home;
  if (lower.includes('moda') || lower.includes('ropa')) return Shirt;
  if (lower.includes('deporte')) return Dumbbell;
  if (lower.includes('juguetes')) return Gamepad2;
  if (lower.includes('belleza')) return Droplets;
  if (lower.includes('alimento')) return Utensils;
  return Sparkles;
};

interface ProductBrowserProps {
  initialProducts: Product[];
  children?: ReactNode;
  aiImages?: AiImage[];
  tagTaxonomy?: TagTaxonomyEntry[];
  rowTwoSlot?: ReactNode;
  // Ids que la sección de novedades ya muestra arriba. Se ocultan de la
  // cuadrícula SOLO en la vista limpia, para no enseñarlos dos veces seguidas.
  // Con búsqueda, categoría o etiquetas vuelven a entrar: excluirlos siempre
  // los haría imposibles de encontrar, que es peor que verlos repetidos.
  featuredIds?: string[];
}

export function ProductBrowser({ initialProducts, children, aiImages = [], tagTaxonomy = [], rowTwoSlot, featuredIds = [] }: ProductBrowserProps) {
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);
  const [ageGatePending, setAgeGatePending] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const tagsScrollRef = useRef<HTMLDivElement | null>(null);
  const [tagsScrollState, setTagsScrollState] = useState<{ left: boolean; right: boolean }>({ left: false, right: false });

  // Recalcula si hay overflow visible a izquierda/derecha en el slider de tags,
  // para mostrar fades + flechas solo cuando aplica.
  const updateTagsScrollState = useCallback(() => {
    const el = tagsScrollRef.current;
    if (!el) return;
    const left = el.scrollLeft > 4;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setTagsScrollState((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
  }, []);

  const scrollTagsBy = useCallback((delta: number) => {
    const el = tagsScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    // Find the header search slot once it mounts
    const slot = document.getElementById('header-search-slot');
    if (slot) setHeaderSlot(slot);

    // Read initial state from URL (?q=&tags=slug1,slug2)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('q');
      if (q) {
        setSearchQuery(q);
        // Las barras de búsqueda montan vacías: se les dice qué mostrar.
        window.dispatchEvent(new CustomEvent('magic-search:set', { detail: q }));
      }
      const tagsParam = params.get('tags');
      if (tagsParam) {
        setSelectedTags(new Set(tagsParam.split(',').filter(Boolean)));
      }
      // Bienestar Íntimo no se restaura desde la URL: pasa por el aviso de edad.
      const cat = params.get('categoria');
      if (cat && cat !== 'Bienestar Íntimo') setActiveCategory(cat);
    }

    // Listen for logo click to reset home state
    const handleResetHome = () => {
      setActiveCategory('Todos');
      setSearchQuery('');
      setSelectedTags(new Set());
      window.dispatchEvent(new CustomEvent('magic-search:set', { detail: '' }));
    };
    window.addEventListener('todopolis:reset-home', handleResetHome);
    return () => window.removeEventListener('todopolis:reset-home', handleResetHome);
  }, []);

  // Recalcular fades del slider cuando cambian las tags o el viewport.
  useEffect(() => {
    updateTagsScrollState();
    window.addEventListener('resize', updateTagsScrollState);
    return () => window.removeEventListener('resize', updateTagsScrollState);
  }, [updateTagsScrollState, tagTaxonomy]);

  // Persistir búsqueda, categoría y etiquetas en la URL sin recargar
  // (compartible, y el botón «atrás» desde una ficha vuelve al mismo listado).
  // IMPORTANTE: preservar window.history.state — pasar null rompe el router de
  // Next.js (back navigation sale del sitio). Y evitar replaceState innecesarios
  // cuando la URL no cambió.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (selectedTags.size > 0) {
      params.set('tags', Array.from(selectedTags).join(','));
    } else {
      params.delete('tags');
    }
    if (searchQuery.trim()) {
      params.set('q', searchQuery.trim());
    } else {
      params.delete('q');
    }
    if (activeCategory !== 'Todos' && activeCategory !== 'Bienestar Íntimo') {
      params.set('categoria', activeCategory);
    } else {
      params.delete('categoria');
    }
    const newSearch = params.toString();
    const newUrl = `${window.location.pathname}${newSearch ? '?' + newSearch : ''}`;
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (currentUrl === newUrl) return;
    window.history.replaceState(window.history.state, '', newUrl);
  }, [selectedTags, activeCategory, searchQuery]);

  // En móvil la fila de categorías se desliza: si la activa quedó fuera de la
  // vista (p. ej. al llegar con `?categoria=Hogar`), se trae al centro.
  const categoryNavRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const nav = categoryNavRef.current;
    const active = nav?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!nav || !active) return;
    const target = active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2;
    nav.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  }, [activeCategory]);

  const categories = useMemo(() => {
    const masterCategories = [
      'Accesorios',
      'Belleza',
      'Deportes',
      'Electrónica',
      'Hogar',
      'Juguetes',
      'Moda',
      'Bienestar Íntimo',
      'Otros'
    ];
    return ['Todos', ...masterCategories];
  }, []);

  const normalizeCategory = (cat: string) => {
    const c = cat.toLowerCase();
    if (c === 'electronica') return 'Electrónica';
    if (c === 'hogar') return 'Hogar';
    if (c === 'moda') return 'Moda';
    if (c === 'deportes') return 'Deportes';
    if (c === 'juguetes') return 'Juguetes';
    if (c === 'belleza') return 'Belleza';
    if (c === 'alimentos') return 'Alimentos';
    if (c === 'sexshop' || c === 'bienestar-intimo') return 'Bienestar Íntimo';
    return cat.charAt(0).toUpperCase() + cat.slice(1);
  };

  const filterProducts = useCallback((query: string, category: string, tags: Set<string>) => {
    let results = initialProducts.map(p => ({
      ...p,
      category: normalizeCategory(p.category)
    }));

    if (category === 'Todos') {
      results = results.filter(p => p.category !== 'Bienestar Íntimo');
    }

    if (category !== 'Todos') {
      results = results.filter(p => p.category === category);
    }

    // AND-mode: el producto debe tener TODOS los tags seleccionados.
    if (tags.size > 0) {
      results = results.filter((p) => {
        const productSlugs = new Set((p.tags ?? []).map((t) => t.slug));
        for (const slug of tags) if (!productSlugs.has(slug)) return false;
        return true;
      });
    }

    if (query.trim()) {
      const searchTerms = query.toLowerCase().split(' ');
      results = results
        .map(product => {
          let score = 0;
          const productText = `${product.name} ${product.shortDescription ?? ''} ${product.category}`.toLowerCase();

          searchTerms.forEach(term => {
            if (product.name.toLowerCase().includes(term)) score += 10;
            if (product.category.toLowerCase().includes(term)) score += 5;
            if (productText.includes(term)) score += 1;
          });

          return { product, score };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(item => item.product);
    }

    return results;
  }, [initialProducts]);

  // ¿Estamos en el listado limpio? Es la misma condición que gobierna el banner
  // promocional y los carriles de inspiración.
  const isCleanListing = !searchQuery && activeCategory === 'Todos' && selectedTags.size === 0;


  const filteredProducts = useMemo(() => {
    const base = filterProducts(searchQuery, activeCategory, selectedTags);
    if (!isCleanListing || featuredIds.length === 0) return base;
    // Solo aquí: lo que ya sale en "Llegaron N productos nuevos" no se repite
    // cuatro filas más abajo.
    const hidden = new Set(featuredIds);
    return base.filter((p) => !hidden.has(p.id));
  }, [searchQuery, activeCategory, selectedTags, filterProducts, isCleanListing, featuredIds]);

  // Cuenta cuántos productos del set "sin tag filter pero con categoría/búsqueda actual"
  // tendría cada tag, para mostrar conteos vivos en el panel. Esto refleja "si agregas
  // este tag, ¿cuántos resultados quedan?" — ayuda a no clickear filtros muertos.
  const tagMatchCounts = useMemo(() => {
    const baseSet = filterProducts(searchQuery, activeCategory, new Set());
    const counts = new Map<string, number>();
    for (const p of baseSet) {
      for (const t of p.tags ?? []) {
        counts.set(t.slug, (counts.get(t.slug) ?? 0) + 1);
      }
    }
    return counts;
  }, [searchQuery, activeCategory, filterProducts]);

  // Mapa slug → entrada de taxonomía, para renderizar nombres/iconos de los chips activos.
  const taxonomyBySlug = useMemo(() => {
    const m = new Map<string, TagTaxonomyEntry>();
    for (const t of tagTaxonomy) m.set(t.slug, t);
    return m;
  }, [tagTaxonomy]);

  const featuredTags = useMemo(
    () => tagTaxonomy.filter((t) => t.isFeatured).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0)),
    [tagTaxonomy],
  );

  const toggleTag = useCallback((slug: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }, []);

  const clearTags = useCallback(() => setSelectedTags(new Set()), []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleCategoryClick = useCallback((cat: string) => {
    if (cat === 'Bienestar Íntimo' && typeof window !== 'undefined' && !sessionStorage.getItem('ageVerified')) {
      setAgeGatePending(true);
      return;
    }
    // Tocar la categoría activa la quita: es lo que se espera de un filtro, y
    // antes la única salida era encontrar «Todos» al principio de la fila.
    setActiveCategory((prev) => (prev === cat ? 'Todos' : cat));
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    window.dispatchEvent(new CustomEvent('magic-search:set', { detail: '' }));
  }, []);

  const clearAll = useCallback(() => {
    setActiveCategory('Todos');
    setSelectedTags(new Set());
    clearSearch();
  }, [clearSearch]);

  return (
    <>
      {ageGatePending && (
        <AgeGate
          open={true}
          onConfirm={() => { setAgeGatePending(false); setActiveCategory('Bienestar Íntimo'); }}
          onReject={() => setAgeGatePending(false)}
        />
      )}

      {/* Portal: desktop search bar into header slot */}
      {headerSlot && createPortal(
        <MagicSearchBar onSearch={handleSearch} compact initialQuery={searchQuery} />,
        headerSlot
      )}

      {/* ─── Filtros del catálogo ────────────────────────────────────────
          Dos filas con UN solo estilo en móvil y escritorio:
            1. Categorías — excluyentes, en lavanda (interfaz).
            2. «Filtros» + etiquetas destacadas — acumulables, en contorno.
          Antes las categorías eran círculos en móvil y botones en escritorio
          (en escritorio partían en dos renglones con «Otros» solo en el
          segundo), y lo activo no se podía quitar desde donde se veía.
          Quitar vive ahora en «Filtros aplicados», justo sobre la cuadrícula. */}
      <div className="w-full border-b border-nav-inactive-border bg-surface">
        {/* Búsqueda en móvil: primero, que es lo que más se usa con el pulgar */}
        <div className="md:hidden px-4 pt-3">
          <MagicSearchBar onSearch={handleSearch} compact />
        </div>

        <nav aria-label="Categorías" className="container mx-auto px-4">
          <div
            ref={categoryNavRef}
            className="-mx-4 overflow-x-auto px-4 py-3 md:py-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <div className="relative mx-auto flex w-max gap-2">
              {categories.map((cat) => {
                const Icon = getCategoryIcon(cat);
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategoryClick(cat)}
                    aria-pressed={isActive}
                    className={`flex shrink-0 items-center gap-2 rounded-full border py-2 pl-2.5 pr-4 text-sm font-bold transition-colors ${
                      isActive
                        ? 'border-todopolis-lavender-deep bg-todopolis-lavender-deep text-white shadow-sm'
                        : 'border-nav-inactive-border bg-surface text-foreground/75 hover:border-todopolis-lavender-deep/40 hover:text-ink-title'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-todopolis-lavender-deep'}`} />
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {tagTaxonomy.length > 0 && (
          <div className="container relative mx-auto px-4 pb-3">
            <div
              ref={tagsScrollRef}
              onScroll={updateTagsScrollState}
              className="-mx-4 flex items-center gap-2 overflow-x-auto px-4"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <button
                type="button"
                onClick={() => setFilterPanelOpen(true)}
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-ink-title px-3.5 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Más filtros
                {selectedTags.size > 0 && (
                  <span className="ml-0.5 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-extrabold leading-none text-ink-title">
                    {selectedTags.size}
                  </span>
                )}
              </button>
              <span aria-hidden className="h-5 w-px shrink-0 bg-nav-inactive-border" />
              {featuredTags.map((tag) => {
                const isActive = selectedTags.has(tag.slug);
                return (
                  <button
                    key={tag.slug}
                    type="button"
                    onClick={() => toggleTag(tag.slug)}
                    aria-pressed={isActive}
                    className={`flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      isActive
                        ? 'border-todopolis-lavender-deep/40 bg-tag-active-bg text-tag-active-fg'
                        : 'border-nav-inactive-border bg-surface text-foreground/70 hover:border-todopolis-lavender-deep/40 hover:text-ink-title'
                    }`}
                  >
                    {isActive && <Check className="h-3 w-3" strokeWidth={3} />}
                    {tag.name}
                  </button>
                );
              })}
              <span aria-hidden className="w-2 shrink-0" />
            </div>

            <div
              aria-hidden
              className={`pointer-events-none absolute bottom-3 left-0 top-0 w-12 bg-gradient-to-r from-surface to-transparent transition-opacity ${tagsScrollState.left ? 'opacity-100' : 'opacity-0'}`}
            />
            <button
              type="button"
              aria-label="Ver etiquetas anteriores"
              onClick={() => scrollTagsBy(-220)}
              className={`absolute left-1 top-[calc(50%-6px)] hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-nav-inactive-border bg-surface text-foreground/70 shadow-sm transition-opacity md:flex ${tagsScrollState.left ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div
              aria-hidden
              className={`pointer-events-none absolute bottom-3 right-0 top-0 w-12 bg-gradient-to-l from-surface to-transparent transition-opacity ${tagsScrollState.right ? 'opacity-100' : 'opacity-0'}`}
            />
            <button
              type="button"
              aria-label="Ver más etiquetas"
              onClick={() => scrollTagsBy(220)}
              className={`absolute right-1 top-[calc(50%-6px)] hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-nav-inactive-border bg-surface text-foreground/70 shadow-sm transition-opacity md:flex ${tagsScrollState.right ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Hero y políticas — se ocultan al buscar o filtrar */}
      {(!searchQuery && activeCategory === 'Todos' && selectedTags.size === 0) && children}

      {/* Cuadrícula de productos, con los carriles de inspiración intercalados.
          Mismo `container px-4` que las secciones de arriba: antes llevaba un
          `px-4` extra por fuera y sus bordes no coincidían con los del resto. */}
      <section id="productos" className="scroll-mt-20 pb-16">
        {isCleanListing ? (
          <div className="container mx-auto px-4 pb-6 pt-8 md:pt-12">
            <div>
              <p className="mb-2 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                <span aria-hidden className="h-px w-6 bg-todopolis-lavender-deep/60" />
                Catálogo
              </p>
              <h2 className="font-serif text-2xl font-extrabold leading-tight tracking-[-0.02em] text-ink-title md:text-[2rem]">
                Todo lo de Todópolis
              </h2>
            </div>
          </div>
        ) : (
          /* Filtros aplicados. Se queda pegada bajo la cabecera mientras se
             baja por los resultados: quitar un filtro no debería exigir
             volver arriba. Todo lo que filtra sale aquí —búsqueda, categoría y
             etiquetas— con su ×, y «Borrar todo» al final. */
          <div className="sticky top-16 z-30 mb-6 border-b border-nav-inactive-border bg-surface/95 backdrop-blur-md">
            <div className="container mx-auto flex items-center gap-3 px-4 py-3">
              <p className="shrink-0 text-sm font-bold tabular-nums text-ink-title">
                {filteredProducts.length}
                <span className="font-normal text-muted-foreground">
                  {' '}{filteredProducts.length === 1 ? 'producto' : 'productos'}
                </span>
              </p>
              <span aria-hidden className="h-5 w-px shrink-0 bg-nav-inactive-border" />
              <div
                className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {searchQuery && (
                  <ActiveChip onRemove={clearSearch} label={`Quitar búsqueda ${searchQuery}`}>
                    <Search className="h-3 w-3" />
                    “{searchQuery}”
                  </ActiveChip>
                )}
                {activeCategory !== 'Todos' && (
                  <ActiveChip onRemove={() => setActiveCategory('Todos')} label={`Quitar categoría ${activeCategory}`}>
                    {activeCategory}
                  </ActiveChip>
                )}
                {Array.from(selectedTags).map((slug) => (
                  <ActiveChip key={slug} onRemove={() => toggleTag(slug)} label={`Quitar ${taxonomyBySlug.get(slug)?.name ?? slug}`}>
                    {taxonomyBySlug.get(slug)?.name ?? slug}
                  </ActiveChip>
                ))}
              </div>
              <button
                type="button"
                onClick={clearAll}
                className="shrink-0 text-xs font-bold text-foreground/60 underline-offset-4 hover:text-ink-title hover:underline"
              >
                Borrar todo
              </button>
            </div>
          </div>
        )}

        <div className="container mx-auto px-4">
          <ProductGrid
            products={filteredProducts}
            searchQuery={searchQuery}
            onClearFilters={isCleanListing ? undefined : clearAll}
            // El banner solo tiene sentido en el listado "limpio". Cuando hay búsqueda,
            // filtros activos o una categoría específica, lo ocultamos para no romper foco.
            rowTwoSlot={isCleanListing ? rowTwoSlot : undefined}
            // Los carriles solo en el listado limpio: con búsqueda o
            // filtros activos partirían el foco del usuario.
            repeatingSlot={
              isCleanListing && aiImages.length > 0
                ? (occurrence) => <InspirationRail images={railSlice(aiImages, occurrence)} />
                : undefined
            }
          />
        </div>
      </section>

      {/* Floating search button for mobile */}
      <MobileSearchFab />

      {/* Panel de filtros (drawer desktop / bottom sheet mobile) */}
      <TagFilterPanel
        open={filterPanelOpen}
        onClose={() => setFilterPanelOpen(false)}
        tags={tagTaxonomy}
        selected={selectedTags}
        onToggle={toggleTag}
        onClear={clearTags}
        matchCounts={tagMatchCounts}
        resultCount={filteredProducts.length}
      />
    </>
  );
}

function ActiveChip({ children, onRemove, label }: { children: ReactNode; onRemove: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={label}
      className="group flex shrink-0 items-center gap-1.5 rounded-full border border-todopolis-lavender-deep/30 bg-tag-active-bg py-1 pl-3 pr-1.5 text-xs font-semibold text-tag-active-fg transition-colors hover:border-todopolis-lavender-deep/60"
    >
      {children}
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-todopolis-lavender-deep/15 transition-colors group-hover:bg-todopolis-lavender-deep group-hover:text-white">
        <X className="h-2.5 w-2.5" strokeWidth={3} />
      </span>
    </button>
  );
}
