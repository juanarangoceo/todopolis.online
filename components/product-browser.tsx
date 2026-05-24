'use client';

import { useState, useCallback, useMemo, ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { Product, TagTaxonomyEntry } from '@/lib/types';
import { MagicSearchBar } from './magic-search-bar';
import { MobileSearchFab } from './mobile-search-fab';
import { ProductGrid } from './product-grid';
import { TagFilterPanel } from './tag-filter-panel';
import {
  Sparkles, Grid, Watch, HeartPulse,
  Laptop, Home, Shirt, Dumbbell, Gamepad2,
  Droplets, Utensils, SlidersHorizontal, X
} from 'lucide-react';
import { AgeGate } from '@/components/age-gate';

function sanityOptimized(url: string, width: number): string {
  if (!url || !url.includes('cdn.sanity.io')) return url;
  return `${url}?w=${width}&auto=format&q=80`;
}

interface AiImage {
  image: string;
  name: string;
  slug: string;
}

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
}

export function ProductBrowser({ initialProducts, children, aiImages = [], tagTaxonomy = [] }: ProductBrowserProps) {
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);
  const [ageGatePending, setAgeGatePending] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  useEffect(() => {
    // Find the header search slot once it mounts
    const slot = document.getElementById('header-search-slot');
    if (slot) setHeaderSlot(slot);

    // Read initial state from URL (?q=&tags=slug1,slug2)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('q');
      if (q) setSearchQuery(q);
      const tagsParam = params.get('tags');
      if (tagsParam) {
        setSelectedTags(new Set(tagsParam.split(',').filter(Boolean)));
      }
    }

    // Listen for logo click to reset home state
    const handleResetHome = () => {
      setActiveCategory('Todos');
      setSearchQuery('');
      setSelectedTags(new Set());
    };
    window.addEventListener('todopolis:reset-home', handleResetHome);
    return () => window.removeEventListener('todopolis:reset-home', handleResetHome);
  }, []);

  // Persistir selección de tags en la URL sin recargar (compartible/bookmarkable).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (selectedTags.size > 0) {
      params.set('tags', Array.from(selectedTags).join(','));
    } else {
      params.delete('tags');
    }
    const newSearch = params.toString();
    const newUrl = `${window.location.pathname}${newSearch ? '?' + newSearch : ''}`;
    window.history.replaceState(null, '', newUrl);
  }, [selectedTags]);

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

  const filteredProducts = useMemo(() => {
    return filterProducts(searchQuery, activeCategory, selectedTags);
  }, [searchQuery, activeCategory, selectedTags, filterProducts]);

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
    setActiveCategory(cat);
  }, []);

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
        <MagicSearchBar onSearch={handleSearch} compact />,
        headerSlot
      )}

      {/* Top Categories Navigation (Desktop & Mobile) */}
      <div className="w-full relative z-30 bg-white/40 backdrop-blur-md border-b border-[#EDD2F3]/20">
        {/* Mobile Categories */}
        <div className="md:hidden w-full flex overflow-x-auto gap-3 pt-4 pb-4 px-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {categories.map((cat) => {
            const Icon = getCategoryIcon(cat);
            const isActive = activeCategory === cat;
            return (
              <button
                key={`mobile-cat-${cat}`}
                onClick={() => handleCategoryClick(cat)}
                className="flex flex-col items-center gap-2 shrink-0"
              >
                <div className={`w-15 h-15 md:w-16 md:h-16 rounded-full flex items-center justify-center border-[3px] p-0.5 transition-all ${isActive ? 'border-[#FFB4AC]' : 'border-transparent'}`}>
                  <div className={`w-12 h-12 md:w-full md:h-full rounded-full flex items-center justify-center ${isActive ? 'bg-gradient-to-br from-[#FFB4AC] to-[#EDD2F3] text-white shadow-md' : 'bg-[#FFD5E5]/40 text-[#F43F5E]'}`}>
                    <Icon className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                </div>
                <span className={`text-[10px] md:text-[11px] font-bold text-center w-16 md:w-20 truncate px-1 ${isActive ? 'text-foreground' : 'text-foreground/60'}`}>
                  {cat}
                </span>
              </button>
            )
          })}
          <div className="shrink-0 w-2" />
        </div>

        {/* Desktop Categories */}
        <div className="hidden md:flex container mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-center gap-2 w-full">
            {categories.map((cat) => {
              const Icon = getCategoryIcon(cat);
              const isActive = activeCategory === cat;
              return (
                <button
                  key={`desktop-cat-${cat}`}
                  onClick={() => handleCategoryClick(cat)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 hover:scale-105 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#FFB4AC] to-[#EDD2F3] text-white shadow-lg shadow-[#FFB4AC]/40'
                      : 'bg-[#FFD5E5]/40 text-foreground/70 border border-[#FFB4AC]/30 hover:border-[#FFB4AC]/70 hover:bg-[#FFD5E5]/70 hover:text-[#E11D48]'
                  }`}
                >
                  <span className={`flex items-center justify-center w-6 h-6 rounded-full transition-all ${
                    isActive ? 'bg-white/30' : 'bg-[#FFB4AC]/30'
                  }`}>
                    <Icon className={`w-3.5 h-3.5 transition-colors ${isActive ? 'text-white' : 'text-[#F43F5E]'}`} />
                  </span>
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile Search Bar - Moved below categories */}
      <div className="md:hidden px-6 py-4">
        <MagicSearchBar onSearch={handleSearch} compact />
      </div>

      {/* Featured tag chips + "Más filtros" — desktop y mobile */}
      {tagTaxonomy.length > 0 && (
        <div className="w-full border-b border-[#EDD2F3]/20 bg-white/30 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-2.5 flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <button
              onClick={() => setFilterPanelOpen(true)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-foreground/90 text-white hover:bg-foreground transition-colors shadow-sm"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filtros</span>
              {selectedTags.size > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-[#FFB4AC] text-white text-[10px] font-bold leading-none">
                  {selectedTags.size}
                </span>
              )}
            </button>
            <div className="shrink-0 h-5 w-px bg-foreground/10" />
            {featuredTags.map((tag) => {
              const isActive = selectedTags.has(tag.slug);
              return (
                <button
                  key={tag.slug}
                  onClick={() => toggleTag(tag.slug)}
                  className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-[#FFB4AC] to-[#EDD2F3] text-white shadow-sm'
                      : 'bg-[#FFD5E5]/40 text-foreground/70 hover:bg-[#FFD5E5]/70 border border-[#FFB4AC]/30'
                  }`}
                >
                  {tag.icon && <span>{tag.icon}</span>}
                  <span>{tag.name}</span>
                </button>
              );
            })}
            <div className="shrink-0 w-2" />
          </div>
        </div>
      )}

      {/* Hero y políticas — se ocultan al buscar o filtrar */}
      {(!searchQuery && activeCategory === 'Todos' && selectedTags.size === 0) && children}

      {/* Mobile AI carousel — solo en home sin filtro */}
      {(!searchQuery && activeCategory === 'Todos' && selectedTags.size === 0) && aiImages.length > 0 && (
        <div className="md:hidden px-4 pt-2 pb-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#8b5cf6]" />
            <p className="text-xs font-bold text-[#8b5cf6] uppercase tracking-wider">Inspiración</p>
          </div>
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-2.5 pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {aiImages.map((item) => (
              <Link key={item.slug} href={`/producto/${item.slug}`} className="shrink-0 snap-start w-[130px]">
                <div className="rounded-xl overflow-hidden shadow-sm border border-[#EDD2F3]/40 hover:border-[#EDD2F3] transition-all">
                  <div className="relative w-[130px] h-[175px]">
                    <Image src={sanityOptimized(item.image, 280)} alt={item.name} fill className="object-cover" unoptimized />
                  </div>
                  <div className="px-1.5 py-1.5 bg-white/95">
                    <p className="text-[9px] font-medium text-foreground/70 leading-tight line-clamp-2">{item.name}</p>
                  </div>
                </div>
              </Link>
            ))}
            <div className="shrink-0 w-2" />
          </div>
        </div>
      )}

      {/* Desktop: sidebar AI + product grid / Mobile: solo product grid */}
      <div className="md:flex md:items-start">

        <section id="productos" className="flex-1 pt-4 pb-16 px-4 relative">
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#FFD5E5]/10 to-transparent pointer-events-none" />
          <div className="container mx-auto relative">

            {/* Desktop: sidebar + grid dentro del mismo contenedor */}
            <div className="md:flex md:items-start md:gap-4">

              {aiImages.length > 0 && (
                <aside className="hidden md:flex flex-col w-52 xl:w-60 shrink-0 sticky top-0 self-start max-h-screen overflow-y-auto pb-10">
                  {/* Sidebar header */}
                  <div className="flex items-center gap-1.5 mb-3 pt-1 px-1">
                    <Sparkles className="w-3 h-3 text-[#8b5cf6]" />
                    <p className="text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-[#8b5cf6] to-[#EC4899] bg-clip-text text-transparent">
                      Inspiración
                    </p>
                  </div>
                  {/* Cards */}
                  <div className="flex flex-col gap-2 pr-2 border-r border-[#EDD2F3]/30">
                    {aiImages.map((item) => (
                      <Link key={item.slug} href={`/producto/${item.slug}`} className="group block">
                        <div className="rounded-xl overflow-hidden border border-[#EDD2F3]/30 group-hover:border-[#EDD2F3] group-hover:shadow-sm transition-all duration-200">
                          <div className="relative w-full" style={{ aspectRatio: '3/4' }}>
                            <Image
                              src={sanityOptimized(item.image, 480)}
                              alt={item.name}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                              unoptimized
                            />
                          </div>
                          <div className="px-2 py-1.5 bg-white/95">
                            <p className="text-[9px] font-medium text-foreground/70 leading-tight line-clamp-2 group-hover:text-[#8b5cf6] transition-colors">
                              {item.name}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </aside>
              )}

              <div className="flex-1 min-w-0">
                {/* Tags activos como chips removibles */}
                {selectedTags.size > 0 && (
                  <div className="flex flex-wrap items-center gap-2 mb-4 pb-3 border-b border-[#EDD2F3]/30">
                    <span className="text-xs font-bold text-foreground/60 uppercase tracking-wider">Filtros:</span>
                    {Array.from(selectedTags).map((slug) => {
                      const tag = taxonomyBySlug.get(slug);
                      const label = tag?.name ?? slug;
                      const icon = tag?.icon;
                      return (
                        <button
                          key={slug}
                          onClick={() => toggleTag(slug)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-[#FFB4AC] to-[#EDD2F3] text-white shadow-sm hover:opacity-90 transition-opacity"
                        >
                          {icon && <span>{icon}</span>}
                          <span>{label}</span>
                          <X className="w-3 h-3" />
                        </button>
                      );
                    })}
                    <button
                      onClick={clearTags}
                      className="text-xs font-bold text-[#E11D48] hover:underline ml-1"
                    >
                      Limpiar todo
                    </button>
                  </div>
                )}

                <div className="flex flex-col items-center gap-2 mb-6 text-center">
                  <p className="text-foreground/80 font-serif font-medium text-xs md:text-sm mt-1">
                    {filteredProducts.length} {filteredProducts.length === 1 ? 'producto encontrado' : 'productos para ti'}
                  </p>
                </div>
                <ProductGrid products={filteredProducts} searchQuery={searchQuery} />
              </div>

            </div>
          </div>
        </section>

      </div>

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
      />
    </>
  );
}
