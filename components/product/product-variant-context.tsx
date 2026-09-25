'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { ProductVariant } from '@/lib/types';
import type { Picks } from '@/lib/variant-options';

interface ProductVariantContextValue {
  variants: ProductVariant[];
  selectedVariant: ProductVariant | null;
  setSelectedVariant: (v: ProductVariant | null) => void;
  hasVariants: boolean;
  /** Talla y color elegidos a medias. Viven aquí y no en el selector para que
   *  la ficha y el checkout muestren lo mismo. */
  picks: Picks;
  setPicks: (p: Picks) => void;
}

// Default seguro: si un componente usa el hook fuera del provider
// (producto sin variantes), no truena — simplemente no hay variantes.
const ProductVariantContext = createContext<ProductVariantContextValue>({
  variants: [],
  selectedVariant: null,
  setSelectedVariant: () => {},
  hasVariants: false,
  picks: [null, null],
  setPicks: () => {},
});

export function ProductVariantProvider({
  variants = [],
  children,
}: {
  variants?: ProductVariant[];
  children: ReactNode;
}) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [picks, setPicks] = useState<Picks>([null, null]);

  return (
    <ProductVariantContext.Provider
      value={{
        variants,
        selectedVariant,
        setSelectedVariant,
        hasVariants: variants.length > 0,
        picks,
        setPicks,
      }}
    >
      {children}
    </ProductVariantContext.Provider>
  );
}

export function useProductVariant() {
  return useContext(ProductVariantContext);
}
