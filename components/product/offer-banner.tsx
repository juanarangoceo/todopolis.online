'use client';

import { Zap } from 'lucide-react';
import { Product } from '@/lib/types';

interface OfferBannerProps {
  product: Product;
}

// Banner de oferta — vive al inicio de la columna de contenido (derecha en
// desktop, arriba en mobile). Rediseñado on-brand: gradiente sale → coral-deep
// de la paleta, esbelto, con urgencia. El botón dispara el mismo evento
// 'product:buy' que escucha el hero para abrir el checkout.
export function OfferBanner({ product }: OfferBannerProps) {
  const originalPrice = (product as any).originalPrice as number | undefined;
  const price = product.price ?? 0;

  if (!originalPrice || originalPrice <= price) return null;

  const discount = Math.round((1 - price / originalPrice) * 100);
  const savings = originalPrice - price;
  const formatPrice = (n: number) => '$ ' + n.toLocaleString('es-CO');

  return (
    <div
      className="relative overflow-hidden rounded-2xl px-3.5 py-2.5 md:px-4 md:py-3 shadow-md shadow-sale/20 mb-4"
      style={{
        background:
          'linear-gradient(110deg, var(--sale) 0%, var(--sale) 42%, var(--todopolis-coral-deep) 100%)',
      }}
    >
      {/* Blobs decorativos para profundidad */}
      <div aria-hidden className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      <div aria-hidden className="absolute -bottom-10 left-1/4 w-28 h-28 bg-white/8 rounded-full blur-2xl pointer-events-none" />

      <div className="relative flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="relative flex items-center justify-center w-9 h-9 shrink-0 rounded-xl bg-white/20 backdrop-blur-md border border-white/25 shadow-inner">
            <Zap className="w-[18px] h-[18px] text-white" fill="currentColor" />
            <span aria-hidden className="absolute inset-0 rounded-xl bg-white/30 animate-ping opacity-40" />
          </span>
          <div className="leading-tight min-w-0">
            <p className="text-white font-black text-sm md:text-base uppercase tracking-wide drop-shadow-sm">
              −{discount}% de descuento
            </p>
            <p className="text-white/85 text-[11px] md:text-xs font-medium truncate">
              Ahorras {formatPrice(savings)} · por tiempo limitado
            </p>
          </div>
        </div>

        <button
          onClick={() => window.dispatchEvent(new CustomEvent('product:buy'))}
          className="shrink-0 px-3.5 py-2 bg-white text-todopolis-coral-deep text-[11px] md:text-xs font-black rounded-xl hover:bg-white/95 hover:scale-[1.03] active:scale-95 transition-all shadow-md whitespace-nowrap uppercase tracking-wider"
        >
          Comprar ya
        </button>
      </div>
    </div>
  );
}
