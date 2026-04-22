'use client';

import { useState, useCallback, useMemo, ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Product } from '@/lib/types';
import { MagicSearchBar } from './magic-search-bar';
import { ProductGrid } from './product-grid';
import { 
  Sparkles, Grid, Watch, HeartPulse, Sparkle, 
  Laptop, Home, Shirt, Dumbbell, Gamepad2, 
  Droplets, Utensils, Flame 
} from 'lucide-react';

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
}

export function ProductBrowser({ initialProducts, children }: ProductBrowserProps) {
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Find the header search slot once it mounts
    const slot = document.getElementById('header-search-slot');
    if (slot) setHeaderSlot(slot);
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
            {categories.map((cat) => (
              <button
                key={`desktop-cat-${cat}`}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${
                  activeCategory === cat 
                    ? 'bg-[#FFB4AC] text-white shadow-lg shadow-[#FFB4AC]/30' 
                    : 'bg-white text-foreground/70 border border-[#EDD2F3]/30 hover:border-[#FFB4AC]/50 hover:text-[#FFB4AC]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Search Bar - Moved below categories */}
      <div className="md:hidden px-6 py-4">
        <MagicSearchBar onSearch={handleSearch} compact />
      </div>

      {/* Se oculta el hero y los íconos de confianza si el usuario está buscando o filtrando por categoría */}
      {(!searchQuery && activeCategory === 'Todos') && children}

      <section id="productos" className="pt-4 pb-16 px-4 relative">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#FFD5E5]/10 to-transparent pointer-events-none" />
        
        <div className="container mx-auto relative">
          <div className="flex flex-col items-center gap-2 mb-6 text-center">
            {/* Product Count */}
            <p className="text-foreground/80 font-serif font-medium text-xs md:text-sm mt-1">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'producto encontrado' : 'productos para ti'}
            </p>
          </div>
          
          <ProductGrid products={filteredProducts} searchQuery={searchQuery} />
        </div>
      </section>
    </>
  );
}
