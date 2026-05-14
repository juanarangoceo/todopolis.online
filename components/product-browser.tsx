'use client';

import { useState, useCallback, useMemo, ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { Product } from '@/lib/types';
import { MagicSearchBar } from './magic-search-bar';
import { MobileSearchFab } from './mobile-search-fab';
import { ProductGrid } from './product-grid';
import {
  Sparkles, Grid, Watch, HeartPulse, Sparkle,
  Laptop, Home, Shirt, Dumbbell, Gamepad2,
  Droplets, Utensils, Flame
} from 'lucide-react';

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
  if (lower.includes('sex')) return Flame;
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
}

export function ProductBrowser({ initialProducts, children, aiImages = [] }: ProductBrowserProps) {
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Find the header search slot once it mounts
    const slot = document.getElementById('header-search-slot');
    if (slot) setHeaderSlot(slot);

    // Read initial search query from URL if available
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('q');
      if (q) setSearchQuery(q);
    }

    // Listen for logo click to reset home state
    const handleResetHome = () => {
      setActiveCategory('Todos');
      setSearchQuery('');
    };
    window.addEventListener('todopolis:reset-home', handleResetHome);
    return () => window.removeEventListener('todopolis:reset-home', handleResetHome);
  }, []);

  const categories = useMemo(() => {
    const masterCategories = [
      'Accesorios',
      'Belleza',
      'Deportes',
      'Electrónica',
      'Hogar',
      'Juguetes',
      'Moda',
      'Sexshop',
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
    return cat.charAt(0).toUpperCase() + cat.slice(1);
  };

  const filterProducts = useCallback((query: string, category: string) => {
    let results = initialProducts.map(p => ({
      ...p,
      category: normalizeCategory(p.category)
    }));

    if (category === 'Todos') {
      results = results.filter(p => p.category !== 'Sexshop');
    }

    if (category !== 'Todos') {
      results = results.filter(p => p.category === category);
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
    return filterProducts(searchQuery, activeCategory);
  }, [searchQuery, activeCategory, filterProducts]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  return (
    <>
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
                onClick={() => setActiveCategory(cat)}
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
                  onClick={() => setActiveCategory(cat)}
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

      {/* Hero y políticas — se ocultan al buscar o filtrar */}
      {(!searchQuery && activeCategory === 'Todos') && children}

      {/* Mobile AI carousel — solo en home sin filtro */}
      {(!searchQuery && activeCategory === 'Todos') && aiImages.length > 0 && (
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
    </>
  );
}
