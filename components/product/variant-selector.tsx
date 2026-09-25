'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { isSoldOut, isValueAvailable, pick, variantOptions } from '@/lib/variant-options';
import { useProductVariant } from './product-variant-context';

interface VariantSelectorProps {
  className?: string;
  /** Muestra un texto de ayuda mientras no se haya elegido una variante. */
  showHint?: boolean;
}

// Chips compactos. Fueron píldoras de 44 px con borde doble, una por cada
// combinación de Mastershop («XS/NEGRO», «2xl/Beige»…): hasta 50 botones antes
// del precio. Ahora, cuando se puede, son dos filas cortas —Talla y Color—
// (`lib/variant-options.ts`).
//
// La elegida va en LAVANDA, el color de la interfaz. Iba rellena de rojo con
// sombra roja: el rojo es solo para comprar, y un chip rojo junto al botón
// rojo competía con él.
const chip =
  'inline-flex h-9 min-w-10 items-center justify-center rounded-full border px-3 text-sm font-semibold transition-colors duration-200';
const chipIdle = 'border-nav-inactive-border bg-surface text-foreground hover:border-todopolis-lavender-deep/50';
const chipOn = 'border-todopolis-lavender-deep bg-todopolis-lavender-deep/[0.06] text-todopolis-lavender-deep ring-1 ring-todopolis-lavender-deep';
const chipOff = 'border-nav-inactive-border bg-surface-soft text-muted-foreground/60 line-through cursor-not-allowed';
// Existe, pero no con lo elegido en la otra fila: se puede tocar (suelta la
// otra elección), solo se ve más apagado.
const chipDim = 'border-dashed border-nav-inactive-border bg-surface text-muted-foreground';

export function VariantSelector({ className, showHint = false }: VariantSelectorProps) {
  const { variants, selectedVariant, setSelectedVariant, picks, setPicks } = useProductVariant();
  const opts = useMemo(() => variantOptions(variants ?? []), [variants]);

  // Producto sin variantes → no se renderiza nada.
  if (!variants || variants.length === 0) return null;

  const hint = showHint && !selectedVariant && (
    <p className="text-xs font-semibold text-foreground">
      {opts.mode === 'split'
        ? `Elige ${opts.axes.map((x) => x.label.toLowerCase()).join(' y ')} para continuar.`
        : 'Selecciona una opción para continuar.'}
    </p>
  );

  if (opts.mode === 'single') {
    const current = opts.values.find((o) => o.variant.idVariant === selectedVariant?.idVariant);
    return (
      <div className={cn('space-y-2', className)}>
        <p className="text-sm font-bold text-ink-title">
          Elige una opción
          {current && <span className="ml-2 font-medium text-muted-foreground">{current.label}</span>}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {opts.values.map(({ variant, label }) => {
            const on = selectedVariant?.idVariant === variant.idVariant;
            const soldOut = isSoldOut(variant);
            return (
              <button
                key={variant._key ?? variant.idVariant}
                type="button"
                disabled={soldOut}
                onClick={() => setSelectedVariant(variant)}
                aria-pressed={on}
                aria-label={soldOut ? `${label}, agotado` : label}
                className={cn(chip, soldOut ? chipOff : on ? chipOn : chipIdle)}
              >
                {label}
              </button>
            );
          })}
        </div>
        {hint}
      </div>
    );
  }

  // Si la variante se eligió por otra vía, los picks la reflejan.
  const selectedPair = selectedVariant ? opts.pairOf.get(selectedVariant.idVariant) : undefined;
  const current = selectedPair ?? picks;

  return (
    <div className={cn('space-y-3', className)}>
      {opts.axes.map((axis, a) => {
        const axisIndex = a as 0 | 1;
        const chosen = axis.values.find((o) => o.key === current[axisIndex]);
        return (
          <div key={axis.label} className="space-y-2">
            <p className="text-sm font-bold text-ink-title">
              {axis.label}
              {chosen && <span className="ml-2 font-medium text-muted-foreground">{chosen.label}</span>}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {axis.values.map((o) => {
                const on = current[axisIndex] === o.key;
                const anyStock = isValueAvailable(opts, axisIndex, o.key, [null, null]);
                const withOther = isValueAvailable(opts, axisIndex, o.key, current);
                return (
                  <button
                    key={o.key}
                    type="button"
                    disabled={!anyStock}
                    onClick={() => {
                      const r = pick(opts, current, axisIndex, o.key);
                      setPicks(r.picks);
                      setSelectedVariant(r.variant);
                    }}
                    aria-pressed={on}
                    aria-label={!anyStock ? `${o.label}, agotado` : o.label}
                    className={cn(chip, !anyStock ? chipOff : on ? chipOn : withOther ? chipIdle : chipDim)}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {hint}
    </div>
  );
}
