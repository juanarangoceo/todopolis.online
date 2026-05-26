'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProductVariant } from './product-variant-context';

interface VariantSelectorProps {
  className?: string;
  /** Muestra un texto de ayuda mientras no se haya elegido una variante. */
  showHint?: boolean;
}

export function VariantSelector({ className, showHint = false }: VariantSelectorProps) {
  const { variants, selectedVariant, setSelectedVariant } = useProductVariant();

  // Producto sin variantes → no se renderiza nada.
  if (!variants || variants.length === 0) return null;

  return (
    <div className={cn('space-y-3', className)}>
      <p className="text-sm font-bold text-foreground">
        Elige una opción
        {selectedVariant && (
          <span className="ml-2 font-medium text-muted-foreground">
            {selectedVariant.name}
          </span>
        )}
      </p>

      <div className="flex flex-wrap gap-2">
        {variants.map((variant) => {
          const isSelected = selectedVariant?.idVariant === variant.idVariant;
          const soldOut = typeof variant.stock === 'number' && variant.stock <= 0;

          return (
            <button
              key={variant._key ?? variant.idVariant}
              type="button"
              disabled={soldOut}
              onClick={() => setSelectedVariant(variant)}
              aria-pressed={isSelected}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold border-2 transition-all duration-200',
                soldOut
                  ? 'border-border bg-muted/40 text-muted-foreground/50 line-through cursor-not-allowed'
                  : isSelected
                    ? 'border-primary bg-primary text-primary-foreground shadow-md shadow-primary/30'
                    : 'border-border bg-white text-foreground hover:border-primary/50 hover:bg-primary/5',
              )}
            >
              {isSelected && !soldOut && <Check className="w-3.5 h-3.5" />}
              <span>{variant.name}</span>
              {soldOut && (
                <span className="text-[10px] font-bold uppercase tracking-wide">Agotado</span>
              )}
            </button>
          );
        })}
      </div>

      {showHint && !selectedVariant && (
        <p className="text-xs font-medium text-todopolis-pink-deep">
          Selecciona una opción para continuar.
        </p>
      )}
    </div>
  );
}
