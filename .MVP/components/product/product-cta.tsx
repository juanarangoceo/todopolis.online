'use client';

import { ShoppingBag, Sparkles, Clock, Gift } from 'lucide-react';
import { Product } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ProductCTAProps {
  product: Product;
}

export function ProductCTA({ product }: ProductCTAProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(price);
  };

  return (
    <section className="py-16 md:py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Urgency Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground mb-6">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-semibold">Oferta por tiempo limitado</span>
          </div>

          {/* Title */}
          <h2 className="font-serif text-3xl md:text-5xl font-bold text-foreground mb-6 text-balance">
            No dejes pasar esta oportunidad
          </h2>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {product.name} puede ser tuyo hoy. Miles de mujeres ya lo aman.
          </p>

          {/* Price Card */}
          <div className="inline-block bg-card/80 backdrop-blur-xl rounded-3xl border border-white/20 p-8 md:p-12 shadow-2xl mb-8">
            <div className="flex items-center justify-center gap-4 mb-4">
              {product.originalPrice && (
                <span className="text-2xl text-muted-foreground line-through">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
              <span className="text-5xl md:text-6xl font-bold text-foreground">
                {formatPrice(product.price)}
              </span>
            </div>

            {/* Bonuses */}
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10">
                <Gift className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Envio gratis</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Muestra gratis incluida</span>
              </div>
            </div>

            {/* CTA Button */}
            <button 
              className={cn(
                "w-full flex items-center justify-center gap-3 px-12 py-5 rounded-2xl font-bold text-xl transition-all duration-300",
                "bg-primary text-primary-foreground hover:bg-primary/90",
                "shadow-xl shadow-primary/40 hover:shadow-2xl hover:shadow-primary/50",
                "hover:scale-[1.02] active:scale-[0.98]"
              )}
            >
              <ShoppingBag className="w-6 h-6" />
              Comprar ahora
            </button>

            <p className="mt-4 text-sm text-muted-foreground">
              Pago seguro con encriptacion SSL
            </p>
          </div>

          {/* Trust Elements */}
          <div className="flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
            <span>30 dias de garantia</span>
            <span>Envio en 24-48h</span>
            <span>Atencion personalizada</span>
          </div>
        </div>
      </div>
    </section>
  );
}
