'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { ProductVariant } from '@/lib/types';

interface ProductVariantContextValue {
  variants: ProductVariant[];
  selectedVariant: ProductVariant | null;
  setSelectedVariant: (v: ProductVariant | null) => void;
  hasVariants: boolean;
}

// Default seguro: si un componente usa el hook fuera del provider
// (producto sin variantes), no truena — simplemente no hay variantes.
const ProductVariantContext = createContext<ProductVariantContextValue>({
  variants: [],
  selectedVariant: null,
  setSelectedVariant: () => {},
  hasVariants: false,
});

export function ProductVariantProvider({
  variants = [],
  children,
}: {
  variants?: ProductVariant[];
  children: ReactNode;
}) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

  return (
    <ProductVariantContext.Provider
      value={{
        variants,
        selectedVariant,
        setSelectedVariant,
        hasVariants: variants.length > 0,
      }}
    >
      {children}
    </ProductVariantContext.Provider>
  );
}

export function useProductVariant() {
  return useContext(ProductVariantContext);
}
