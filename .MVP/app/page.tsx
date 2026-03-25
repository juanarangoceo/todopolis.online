'use client';

import { useState, useCallback } from 'react';
import { Header } from '@/components/header';
import { Hero } from '@/components/hero';
import { MagicSearchBar } from '@/components/magic-search-bar';
import { ProductGrid } from '@/components/product-grid';
import { Footer } from '@/components/footer';
import { products, searchProducts } from '@/lib/products';
import { Sparkles, Gift, Truck, Shield } from 'lucide-react';

export default function Home() {
  const [filteredProducts, setFilteredProducts] = useState(products);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    const results = searchProducts(query);
    setFilteredProducts(results);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white via-[#FFFBFC] to-[#FFF8FA]">
      <Header />
      
      <main className="flex-1">
        <Hero />
        
        {/* Search Section */}
        <section className="py-8 relative">
          <MagicSearchBar onSearch={handleSearch} />
        </section>
        
        {/* Features Banner */}
        <section className="py-8 px-4">
          <div className="container mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Truck, label: 'Envio gratis', desc: 'En pedidos +$100k', color: '#A2D2FF' },
                { icon: Gift, label: 'Miles de productos', desc: 'En todas las categorias', color: '#FFD5E5' },
                { icon: Shield, label: 'Compra segura', desc: 'Garantia de satisfaccion', color: '#E7FBBE' },
                { icon: Sparkles, label: 'Lo mejor', desc: 'Seleccion exclusiva', color: '#EDD2F3' },
              ].map((feature, i) => (
                <div 
                  key={i}
                  className="flex flex-col items-center text-center p-4 rounded-2xl bg-white/80 backdrop-blur-sm border border-[#EDD2F3]/20 hover:shadow-lg hover:shadow-[#FFD5E5]/20 transition-all duration-300"
                >
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                    style={{ backgroundColor: `${feature.color}30` }}
                  >
                    <feature.icon className="w-6 h-6" style={{ color: feature.color }} />
                  </div>
                  <span className="font-sans font-bold text-foreground text-sm">{feature.label}</span>
                  <span className="text-xs text-foreground/60 mt-1">{feature.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* Products Section */}
        <section id="productos" className="py-16 px-4 relative">
          {/* Background decoration */}
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#FFD5E5]/10 to-transparent pointer-events-none" />
          
          <div className="container mx-auto relative">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFB4AC]/10 border border-[#FFB4AC]/20 mb-4">
                  <Sparkles className="w-4 h-4 text-[#FFB4AC]" />
                  <span className="text-sm font-bold text-[#FFB4AC]">
                    {searchQuery ? 'Busqueda' : 'Coleccion'}
                  </span>
                </div>
                <h2 className="font-sans text-3xl md:text-4xl font-black text-foreground">
                  {searchQuery ? 'Resultados de busqueda' : 'Nuestros Productos'}
                </h2>
                <p className="mt-2 text-foreground/60 font-serif">
                  {filteredProducts.length} {filteredProducts.length === 1 ? 'producto encontrado' : 'productos para ti'}
                </p>
              </div>
              
              {/* Category filters */}
              <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
                {['Todos', 'Moda', 'Hogar', 'Tech', 'Belleza'].map((cat, i) => (
                  <button
                    key={cat}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                      i === 0 
                        ? 'bg-[#FFB4AC] text-white shadow-lg shadow-[#FFB4AC]/30' 
                        : 'bg-white text-foreground/70 border border-[#EDD2F3]/30 hover:border-[#FFB4AC]/50 hover:text-[#FFB4AC]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            
            <ProductGrid products={filteredProducts} searchQuery={searchQuery} />
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
