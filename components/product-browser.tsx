'use client';

import { useState, useCallback, useMemo, ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Product, TagTaxonomyEntry } from '@/lib/types';
import { MagicSearchBar } from './magic-search-bar';
import { MobileSearchFab } from './mobile-search-fab';
import { ProductGrid } from './product-grid';
import { InspirationRail } from './inspiration-rail';
import { railSlice, type AiImage } from '@/lib/inspiration';
import { TagFilterPanel } from './tag-filter-panel';
import { SearchSuggestions } from './search-suggestions';
import { X, Search } from 'lucide-react';
import { FASHION_TITLES, getCategoryIcon } from './category-icons';
import { PRODUCT_CATEGORIES } from '@/lib/categories';
import {
  applyCatalogFilters, categoryCounts, isCleanListing as isCleanCatalog, panelFilterCount, ADULT_TITLE,
  CATALOG_SORTS, PRICE_RANGES, type CatalogFilters, type CatalogSort, type PriceRange,
} from '@/lib/catalog-filters';
import { AgeGate } from '@/components/age-gate';
import { CategoryBar } from './category-bar';
import { CategoryCards } from './category-cards';


// La categoría llega como `value` (`electronica`) y se muestra con su título.
// Los valores viejos del dataset (`sexshop`, «Electrónica») se traducen aquí.
const LEGACY_TITLES: Record<string, string> = { sexshop: ADULT_TITLE, 'electrónica': 'Tecnología' };
// Títulos viejos que pueden llegar en enlaces `?categoria=`: «Electrónica»
// (hasta sep 2026) y «Moda», que desde el 24-sep-2026 se llama Ropa.
const LEGACY_URL_TITLES: Record<string, string> = { 'Electrónica': 'Tecnología', Moda: 'Ropa' };
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
  /** Arriba del todo, antes del buscador y las categorías. Solo en el listado
   *  limpio: con una búsqueda o un filtro puesto, estorba. */
  intro?: ReactNode;
  // Ids que la sección de novedades ya muestra arriba. Se ocultan de la
  // cuadrícula SOLO en la vista limpia, para no enseñarlos dos veces seguidas.
  // Con búsqueda, categoría o etiquetas vuelven a entrar: excluirlos siempre
  // los haría imposibles de encontrar, que es peor que verlos repetidos.
  featuredIds?: string[];
}

export function ProductBrowser({ initialProducts, children, aiImages = [], tagTaxonomy = [], rowTwoSlot, intro, featuredIds = [] }: ProductBrowserProps) {
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
      // Lencería (adultos) no se restaura desde la URL: pasa por el aviso de edad.
      const cat = params.get('categoria');
      const title = cat ? LEGACY_URL_TITLES[cat] ?? cat : null;
      if (title && title !== ADULT_TITLE && title !== 'Bienestar Íntimo') setActiveCategory(title);
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

    // «Ver toda la moda» y cualquier enlace del home que abra una categoría.
    // Con un <Link> a `?categoria=` no basta: el home ya está montado y la URL
    // solo se lee al montar. Lencería no entra por aquí (aviso de edad).
    const handleShowCategory = (event: Event) => {
      const title = (event as CustomEvent<string>).detail;
      if (!title || title === ADULT_TITLE) return;
      setActiveCategory(title);
      requestAnimationFrame(() => document.getElementById('productos')?.scrollIntoView({ behavior: 'smooth' }));
    };
    window.addEventListener('todopolis:show-category', handleShowCategory);
    return () => {
      window.removeEventListener('todopolis:reset-home', handleResetHome);
      window.removeEventListener('todopolis:show-category', handleShowCategory);
    };
  }, []);

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
    if (activeCategory !== 'Todos' && activeCategory !== ADULT_TITLE) {
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
    if (cat === ADULT_TITLE && typeof window !== 'undefined' && !sessionStorage.getItem('ageVerified')) {
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
          onConfirm={() => { setAgeGatePending(false); setActiveCategory(ADULT_TITLE); }}
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
        {isCleanListing && intro}

        {/* Búsqueda en móvil: primero, que es lo que más se usa con el pulgar */}
        <div className="md:hidden px-4 pt-3">
          <MagicSearchBar onSearch={handleSearch} compact placeholder={searchPlaceholder} />
        </div>

        {/* ── Categorías ──
            Móvil: tarjetas con la foto de un producto real y cuántos hay.
            Con 14 categorías, las píldoras dejaban ver 3 y escondían 11 a la
            derecha; una foto se reconoce sin leer y la tarjeta cortada al
            borde invita a deslizar.
            Escritorio: una sola barra (`category-bar.tsx`): pestañas de moda,
            «Más categorías» para el resto y el botón Filtros a la derecha.
            El número es «cuántos verías si la tocas», con los demás filtros
            puestos (lib/catalog-filters.ts). */}
        <nav aria-label="Categorías" className="container mx-auto px-4">
          <CategoryCards
            categories={categories}
            fashionTitles={FASHION_TITLES}
            adultTitle={ADULT_TITLE}
            active={activeCategory}
            counts={countsByCategory}
            images={categoryImages}
            getIcon={getCategoryIcon}
            onSelect={handleCategoryClick}
            onOpenFilters={tagTaxonomy.length > 0 ? () => setFilterPanelOpen(true) : undefined}
            activeFilters={activePanelFilters}
          />
          <CategoryBar
            categories={categories}
            fashionTitles={FASHION_TITLES}
            adultTitle={ADULT_TITLE}
            active={activeCategory}
            counts={countsByCategory}
            getIcon={getCategoryIcon}
            onSelect={handleCategoryClick}
            onOpenFilters={tagTaxonomy.length > 0 ? () => setFilterPanelOpen(true) : undefined}
            activeFilters={activePanelFilters}
          />
        </nav>
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
