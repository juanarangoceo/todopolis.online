import { Product } from '@/lib/types';
import { ProductCard } from './product-card';
import { Package, Sparkles } from 'lucide-react';

interface ProductGridProps {
  products: Product[];
  searchQuery?: string;
}

export function ProductGrid({ products, searchQuery }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#FFD5E5]/50 to-[#EDD2F3]/50 flex items-center justify-center mb-6">
            <Package className="w-12 h-12 text-[#FFB4AC]" />
          </div>
          <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-[#A2D2FF]" />
        </div>
        <h3 className="text-2xl font-sans font-bold text-foreground mb-3">
          No encontramos resultados
        </h3>
        <p className="text-foreground/60 text-center max-w-md font-serif">
          {searchQuery 
            ? `No hay productos que coincidan con "${searchQuery}". Intenta con otra busqueda.`
            : 'No hay productos disponibles en este momento.'
          }
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} index={index} />
      ))}
    </div>
  );
}
