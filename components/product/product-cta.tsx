'use client';

import { useState } from 'react';
import { ShoppingBag, Clock, ShieldCheck, Truck, CheckCircle2 } from 'lucide-react';
import { Product } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CheckoutModal } from '@/components/checkout-modal';

interface ProductCTAProps {
  product: Product;
}

export function ProductCTA({ product }: ProductCTAProps) {
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  return (
    <section className="py-8 md:py-12 relative overflow-hidden">
      {/* Background — neutro con un sutil acento aspiracional */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-r from-accent-aspirational/10 via-surface to-accent-trust/10" />
      </div>

      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Urgency Badge — usa color de oferta, no de CTA */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sale text-sale-fg mb-6">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-semibold">Oferta por tiempo limitado</span>
          </div>

          {/* Title */}
          <h2 className="font-serif text-3xl md:text-5xl font-bold text-foreground mb-6 text-balance">
            No dejes pasar esta oportunidad
          </h2>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {product.name} puede ser tuyo hoy. Miles de clientes ya lo aman.
          </p>

          {/* Price Card — block, full-width up to max-w */}
          <div className="block w-full max-w-lg mx-auto bg-card/80 backdrop-blur-xl rounded-3xl border border-white/20 p-6 md:p-10 shadow-2xl mb-8">
            
            {/* Price block — stacked vertically */}
            <div className="flex flex-col items-center gap-1 mb-6">
              {product.originalPrice && (
                <div className="flex items-center gap-3">
                  <span className="text-base md:text-xl text-muted-foreground line-through">
                    {formatPrice(product.originalPrice)}
                  </span>
                  {discount > 0 && (
                    <span className="px-2 py-0.5 bg-sale-soft text-sale text-sm font-bold rounded-full">
                      -{discount}%
                    </span>
                  )}
                </div>
              )}
              <span className="text-4xl md:text-6xl font-bold text-foreground">
                {formatPrice(product.price)}
              </span>
            </div>

            {/* Trust Block - Contraentrega Prominente */}
            <div className="mb-6 p-5 rounded-2xl bg-trust-bg border border-trust-border shadow-inner relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/40 rounded-full blur-3xl -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700" />

              <div className="relative z-10 flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-full bg-surface shadow-md flex items-center justify-center mb-1">
                  <ShieldCheck className="w-7 h-7 text-trust-fg" />
                </div>
                <div>
                  <h4 className="font-sans font-bold text-lg text-foreground mb-1">Pago 100% Contraentrega</h4>
                  <p className="text-sm text-foreground/70 font-medium">Solo pagas cuando el pedido llegue a tu puerta. Sin riesgos, sin sorpresas.</p>
                </div>

                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface/80 text-xs font-bold text-trust-fg shadow-sm border border-trust-border">
                    <Truck className="w-3.5 h-3.5" />
                    Envío a todo Colombia
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface/80 text-xs font-bold text-trust-fg shadow-sm border border-trust-border">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Compra Segura
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Button — salmón único, sin pulsación, contraste alto */}
            <button
              onClick={() => setIsCheckoutOpen(true)}
              className={cn(
                "w-full flex items-center justify-center gap-3 px-8 py-5 rounded-2xl font-bold text-xl transition-all duration-300",
                "bg-cta text-cta-fg hover:bg-cta-hover shadow-xl shadow-cta-ring hover:shadow-2xl",
                "hover:scale-[1.02] active:scale-[0.98]"
              )}
            >
              <ShoppingBag className="w-6 h-6" />
              Comprar ahora
            </button>

            <p className="mt-4 text-sm font-medium text-foreground">
              Solo pagas al recibir tu pedido
            </p>
          </div>

          {/* Trust Elements */}
          <div className="flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
            <span>30 días de garantía</span>
            <span>Envío en 24-48h</span>
            <span>Atención personalizada</span>
          </div>
        </div>
      </div>

      <CheckoutModal 
        isOpen={isCheckoutOpen} 
        onClose={() => setIsCheckoutOpen(false)} 
        product={product} 
      />
    </section>
  );
}
