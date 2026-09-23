'use client';

import { useState, useCallback, useMemo, ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { Product, TagTaxonomyEntry } from '@/lib/types';
import { MagicSearchBar } from './magic-search-bar';
import { MobileSearchFab } from './mobile-search-fab';
import { ProductGrid } from './product-grid';
import { InspirationRail } from './inspiration-rail';
import { railSlice, type AiImage } from '@/lib/inspiration';
import { TagFilterPanel } from './tag-filter-panel';
import { SearchSuggestions } from './search-suggestions';
import {
  Sparkles, Grid, Watch, HeartPulse,
  Laptop, Home, Shirt, Dumbbell, Gamepad2,
  Droplets, CookingPot, Baby, PawPrint, Car, Lock,
  SlidersHorizontal, X,
  ChevronLeft, ChevronRight, Check, Search,
  type LucideIcon,
} from 'lucide-react';
import { PRODUCT_CATEGORIES } from '@/lib/categories';
import {
  applyCatalogFilters, categoryCounts, isCleanListing as isCleanCatalog, panelFilterCount,
  CATALOG_SORTS, PRICE_RANGES, type CatalogFilters, type CatalogSort, type PriceRange,
} from '@/lib/catalog-filters';
import { AgeGate } from '@/components/age-gate';


// Ícono por categoría (por `value`, no por título: el título se puede
// cambiar —«Electrónica» pasó a «Tecnología»— sin romper el ícono).
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  belleza: Droplets,
  hogar: Home,
  cocina: CookingPot,
  electronica: Laptop,
  moda: Shirt,
  accesorios: Watch,
  'salud-bienestar': HeartPulse,
  deportes: Dumbbell,
  bebes: Baby,
  juguetes: Gamepad2,
  mascotas: PawPrint,
  'carro-moto': Car,
  'bienestar-intimo': Lock,
  otros: Sparkles,
};
const TITLE_TO_VALUE = new Map(PRODUCT_CATEGORIES.map((c) => [c.title, c.value]));
const getCategoryIcon = (title: string) =>
  title === 'Todos' ? Grid : CATEGORY_ICONS[TITLE_TO_VALUE.get(title) ?? ''] ?? Sparkles;

// La categoría llega como `value` (`electronica`) y se muestra con su título.
// Los valores viejos del dataset (`sexshop`, «Electrónica») se traducen aquí.
const LEGACY_TITLES: Record<string, string> = { sexshop: 'Bienestar Íntimo', 'electrónica': 'Tecnología' };
function categoryTitleOf(raw: string): string {
  const v = (raw ?? '').trim().toLowerCase();
  return PRODUCT_CATEGORIES.find((c) => c.value === v)?.title ?? LEGACY_TITLES[v] ?? 'Otros';
}

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
  const [price, setPrice] = useState<PriceRange | null>(null);
  const [onlyOffers, setOnlyOffers] = useState(false);
  const [freeShipping, setFreeShipping] = useState(false);
  const [sort, setSort] = useState<CatalogSort>('recomendado');
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
      const precio = params.get('precio');
      if (PRICE_RANGES.some((r) => r.value === precio)) setPrice(precio as PriceRange);
      if (params.get('oferta') === '1') setOnlyOffers(true);
      if (params.get('envio') === 'gratis') setFreeShipping(true);
      const orden = params.get('orden');
      if (CATALOG_SORTS.some((o) => o.value === orden)) setSort(orden as CatalogSort);
      const tagsParam = params.get('tags');
      if (tagsParam) {
        setSelectedTags(new Set(tagsParam.split(',').filter(Boolean)));
      }
      // Bienestar Íntimo no se restaura desde la URL: pasa por el aviso de edad.
      const cat = params.get('categoria');
      // «Electrónica» se llamó así hasta sep 2026: los enlaces viejos siguen sirviendo.
      const title = cat === 'Electrónica' ? 'Tecnología' : cat;
      if (title && title !== 'Bienestar Íntimo') setActiveCategory(title);
    }

    // Listen for logo click to reset home state
    const handleResetHome = () => {
      setActiveCategory('Todos');
      setSearchQuery('');
      setSelectedTags(new Set());
      setPrice(null);
      setOnlyOffers(false);
      setFreeShipping(false);
      setSort('recomendado');
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
    const setOrDelete = (key: string, value: string | null) => (value ? params.set(key, value) : params.delete(key));
    setOrDelete('precio', price);
    setOrDelete('oferta', onlyOffers ? '1' : null);
    setOrDelete('envio', freeShipping ? 'gratis' : null);
    setOrDelete('orden', sort === 'recomendado' ? null : sort);
    const newSearch = params.toString();
    const newUrl = `${window.location.pathname}${newSearch ? '?' + newSearch : ''}`;
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (currentUrl === newUrl) return;
    window.history.replaceState(window.history.state, '', newUrl);
  }, [selectedTags, activeCategory, searchQuery, price, onlyOffers, freeShipping, sort]);

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

  // Pestañas desde la lista única (`lib/categories.ts`), en su orden, y solo
  // las que tienen productos: una pestaña que abre vacía es un callejón.
  // Antes eran nueve títulos escritos a mano aquí, que ya no coincidían con
  // el schema (faltaba «Alimentos», sobraba nada, y las nuevas no habrían
  // salido nunca).
  const categories = useMemo(() => {
    const present = new Set(initialProducts.map((p) => categoryTitleOf(p.category)));
    return ['Todos', ...PRODUCT_CATEGORIES.map((c) => c.title).filter((t) => present.has(t))];
  }, [initialProducts]);


  // Productos con la categoría ya en título, una sola vez.
  const catalog = useMemo(
    () => initialProducts.map((p) => ({ ...p, category: categoryTitleOf(p.category) })),
    [initialProducts],
  );

  // Todo lo que filtra, en un objeto. La lógica vive en lib/catalog-filters.ts.
  const filters: CatalogFilters = useMemo(
    () => ({ query: searchQuery, category: activeCategory, tags: selectedTags, price, onlyOffers, freeShipping, sort }),
    [searchQuery, activeCategory, selectedTags, price, onlyOffers, freeShipping, sort],
  );

  // ¿Estamos en el listado limpio? Es la misma condición que gobierna el banner
  // promocional y los carriles de inspiración.
  const isCleanListing = isCleanCatalog(filters);
  const activePanelFilters = panelFilterCount(filters);

  const filteredProducts = useMemo(() => {
    const base = applyCatalogFilters(catalog, filters);
    if (!isCleanListing || featuredIds.length === 0) return base;
    // Solo aquí: lo que ya sale en Novedades no se repite cuatro filas más abajo.
    const hidden = new Set(featuredIds);
    return base.filter((p) => !hidden.has(p.id));
  }, [catalog, filters, isCleanListing, featuredIds]);

  // Conteo por pestaña: cuántos verías si la tocas, con lo demás puesto.
  const countsByCategory = useMemo(() => categoryCounts(catalog, filters), [catalog, filters]);

  // Foto de cada categoría para las tarjetas de móvil: la del producto más
  // nuevo que tenga foto de verdad.
  const categoryImages = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of catalog) {
      if (!m.has(p.category) && p.image && p.image !== '/placeholder.jpg') m.set(p.category, p.image);
    }
    return m;
  }, [catalog]);

  // Lo que existe en el catálogo, para no sugerir una pestaña o etiqueta vacía.
  const availableCategories = useMemo(() => new Set(catalog.map((p) => p.category)), [catalog]);
  const availableTags = useMemo(() => new Set(catalog.flatMap((p) => (p.tags ?? []).map((t) => t.slug))), [catalog]);

  // Conteo por etiqueta en el panel: «si agregas esta, ¿cuántos quedan?».
  const tagMatchCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of applyCatalogFilters(catalog, { ...filters, tags: new Set() })) {
      for (const t of p.tags ?? []) counts.set(t.slug, (counts.get(t.slug) ?? 0) + 1);
    }
    return counts;
  }, [catalog, filters]);

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

  // El número dice cuánto hay detrás de la barra. «Busca tu producto mágico»
  // no decía nada.
  const searchPlaceholder = `Busca entre ${initialProducts.length} productos`;

  const clearPanel = useCallback(() => {
    setSelectedTags(new Set());
    setPrice(null);
    setOnlyOffers(false);
    setFreeShipping(false);
  }, []);

  const clearAll = useCallback(() => {
    setActiveCategory('Todos');
    clearPanel();
    setSort('recomendado');
    clearSearch();
  }, [clearSearch, clearPanel]);

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
        <MagicSearchBar onSearch={handleSearch} compact initialQuery={searchQuery} placeholder={searchPlaceholder} />,
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
          <MagicSearchBar onSearch={handleSearch} compact placeholder={searchPlaceholder} />
        </div>

        {/* ── Categorías ──
            Móvil: tarjetas con la foto de un producto real y cuántos hay.
            Con 14 categorías, las píldoras dejaban ver 3 y escondían 11 a la
            derecha; una foto se reconoce sin leer y la tarjeta cortada al
            borde invita a deslizar.
            Escritorio: píldoras con conteo que se reparten en dos filas, sin
            deslizamiento: ahí sí caben todas a la vista.
            El número es «cuántos verías si la tocas», con los demás filtros
            puestos (lib/catalog-filters.ts). */}
        <nav aria-label="Categorías" className="container mx-auto px-4">
          <div
            ref={categoryNavRef}
            className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-3 pt-3 md:hidden"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {tagTaxonomy.length > 0 && (
              <button
                type="button"
                onClick={() => setFilterPanelOpen(true)}
                className="flex w-[74px] shrink-0 flex-col items-center gap-1.5 text-center"
              >
                <span className="relative flex h-[62px] w-[62px] items-center justify-center rounded-2xl bg-ink-title text-white">
                  <SlidersHorizontal className="h-5 w-5" />
                  {activePanelFilters > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-surface bg-todopolis-lavender-deep px-1 text-[10px] font-extrabold">
                      {activePanelFilters}
                    </span>
                  )}
                </span>
                <span className="text-[11px] font-bold leading-tight text-ink-title">Filtros</span>
              </button>
            )}
            {categories.map((cat) => {
              const isActive = activeCategory === cat;
              const count = countsByCategory.get(cat) ?? 0;
              const img = cat === 'Todos' ? null : categoryImages.get(cat);
              const Icon = getCategoryIcon(cat);
              // Adultos sin foto: la miniatura sería contenido sensible antes
              // del aviso de edad.
              const showImg = img && cat !== 'Bienestar Íntimo';
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategoryClick(cat)}
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
              );
            })}
          </div>

          <div className="hidden flex-wrap justify-center gap-2 py-4 md:flex">
            {categories.map((cat) => {
              const Icon = getCategoryIcon(cat);
              const isActive = activeCategory === cat;
              const count = countsByCategory.get(cat) ?? 0;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategoryClick(cat)}
                  aria-pressed={isActive}
                  className={`flex shrink-0 items-center gap-2 rounded-full border py-2 pl-2.5 pr-3.5 text-sm font-bold transition-colors ${count === 0 && !isActive ? 'opacity-40' : ''} ${
                    isActive
                      ? 'border-todopolis-lavender-deep bg-todopolis-lavender-deep text-white shadow-sm'
                      : 'border-nav-inactive-border bg-surface text-foreground/75 hover:border-todopolis-lavender-deep/40 hover:text-ink-title'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-todopolis-lavender-deep'}`} />
                  {cat}
                  <span className={`text-xs font-semibold tabular-nums ${isActive ? 'text-white/75' : 'text-muted-foreground'}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {tagTaxonomy.length > 0 && (
          <div className="container relative mx-auto hidden px-4 pb-3 md:block">
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
                {activePanelFilters > 0 && (
                  <span className="ml-0.5 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-extrabold leading-none text-ink-title">
                    {activePanelFilters}
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
      {isCleanListing && children}

      {/* Cuadrícula de productos, con los carriles de inspiración intercalados.
          Mismo `container px-4` que las secciones de arriba: antes llevaba un
          `px-4` extra por fuera y sus bordes no coincidían con los del resto. */}
      <section id="productos" className="scroll-mt-20 pb-16">
        {isCleanListing ? (
          <div className="container mx-auto flex items-end justify-between gap-4 px-4 pb-6 pt-8 md:pt-12">
            <div>
              <p className="mb-2 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                <span aria-hidden className="h-px w-6 bg-todopolis-lavender-deep/60" />
                Catálogo
              </p>
              <h2 className="font-serif text-2xl font-extrabold leading-tight tracking-[-0.02em] text-ink-title md:text-[2rem]">
                Todo lo de Todópolis
              </h2>
            </div>
            <SortSelect value={sort} onChange={setSort} />
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
                {price && (
                  <ActiveChip onRemove={() => setPrice(null)} label="Quitar rango de precio">
                    {PRICE_RANGES.find((r) => r.value === price)?.label}
                  </ActiveChip>
                )}
                {onlyOffers && (
                  <ActiveChip onRemove={() => setOnlyOffers(false)} label="Quitar solo ofertas">
                    En oferta
                  </ActiveChip>
                )}
                {freeShipping && (
                  <ActiveChip onRemove={() => setFreeShipping(false)} label="Quitar envío gratis">
                    Envío gratis
                  </ActiveChip>
                )}
                {Array.from(selectedTags).map((slug) => (
                  <ActiveChip key={slug} onRemove={() => toggleTag(slug)} label={`Quitar ${taxonomyBySlug.get(slug)?.name ?? slug}`}>
                    {taxonomyBySlug.get(slug)?.name ?? slug}
                  </ActiveChip>
                ))}
              </div>
              {/* En móvil el orden vive en el panel «Filtros»: aquí se comía el
                  espacio de los chips, que son lo que hay que poder quitar. */}
              <div className="hidden md:block">
                <SortSelect value={sort} onChange={setSort} compact />
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
            emptyExtra={
              searchQuery.trim() ? (
                <SearchSuggestions
                  query={searchQuery}
                  availableCategories={availableCategories}
                  availableTags={availableTags}
                  onPickCategory={(title) => { clearSearch(); clearPanel(); setActiveCategory(title); }}
                  onPickTag={(slug) => { clearSearch(); setActiveCategory('Todos'); setSelectedTags(new Set([slug])); }}
                />
              ) : null
            }
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
        onClear={clearPanel}
        extras={{
          sort, onSort: setSort,
          price, onPrice: setPrice,
          onlyOffers, onOnlyOffers: setOnlyOffers,
          freeShipping, onFreeShipping: setFreeShipping,
        }}
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

// Orden del catálogo. Nativo a propósito: en móvil abre la ruleta del sistema,
// que es lo que el pulgar ya sabe usar.
function SortSelect({ value, onChange, compact = false }: { value: CatalogSort; onChange: (v: CatalogSort) => void; compact?: boolean }) {
  return (
    <label className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
      <span className={compact ? 'sr-only' : 'hidden sm:inline'}>Ordenar por</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as CatalogSort)}
        aria-label="Ordenar productos"
        className={`rounded-full border border-nav-inactive-border bg-surface pl-3 pr-8 font-semibold text-ink-title focus:border-todopolis-lavender-deep/50 focus:outline-none ${compact ? 'py-1 text-xs' : 'py-1.5 text-sm'}`}
      >
        {CATALOG_SORTS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}
