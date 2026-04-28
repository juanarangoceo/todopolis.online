'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { MagicSearchBar } from './magic-search-bar';
import { MobileSearchFab } from './mobile-search-fab';

export function GlobalSearch({ products }: { products: any[] }) {
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const slot = document.getElementById('header-search-slot');
    if (slot) setHeaderSlot(slot);
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim() || !products) return [];
    const searchTerms = searchQuery.toLowerCase().split(' ');
    return products
      .map(product => {
        let score = 0;
        const productText = `${product.name} ${product.shortDescription ?? ''} ${product.category}`.toLowerCase();
        
        searchTerms.forEach(term => {
          if (product.name.toLowerCase().includes(term)) score += 10;
          if (product.category?.toLowerCase().includes(term)) score += 5;
          if (productText.includes(term)) score += 1;
        });
        
        return { product, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.product)
      .slice(0, 5); // Limit to 5 suggestions
  }, [searchQuery, products]);

  const renderSearchContent = (compact: boolean) => (
    <div className="relative w-full z-50">
      <MagicSearchBar onSearch={handleSearch} compact={compact} />
      
      {/* Dropdown Results */}
      {searchQuery && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-[#EDD2F3]/40 p-2 z-[60] flex flex-col gap-1 max-h-[60vh] overflow-y-auto">
          {filteredProducts.length > 0 ? (
            filteredProducts.map(p => (
              <Link 
                key={p.id || p.slug} 
                href={`/producto/${p.slug}`}
                className="flex items-center gap-3 p-2 hover:bg-gradient-to-r hover:from-[#FFD5E5]/20 hover:to-[#EDD2F3]/20 rounded-xl transition-all border border-transparent hover:border-[#FFB4AC]/30"
              >
                <div className="w-12 h-12 relative rounded-lg overflow-hidden shrink-0 bg-muted/30">
                  <Image src={p.image} alt={p.name} fill className="object-cover" sizes="48px" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-sm text-foreground truncate">{p.name}</span>
                  <span className="text-xs font-semibold text-[#F43F5E]">
                    $ {(p.price ?? 0).toLocaleString('es-CO')}
                  </span>
                </div>
              </Link>
            ))
          ) : (
            <div className="p-4 text-center">
              <p className="text-sm text-muted-foreground">No encontramos productos mágicos para esta búsqueda.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Search Portal */}
      {headerSlot && createPortal(
        renderSearchContent(true),
        headerSlot
      )}
      
      {/* Mobile Search Bar (inline below header) */}
      <div className="md:hidden relative z-50 px-4 py-3 bg-white/40 backdrop-blur-md border-b border-[#EDD2F3]/20">
        {renderSearchContent(true)}
      </div>

      {/* Floating search button for mobile */}
      <MobileSearchFab />
    </>
  );
}
