'use client';

import { useState } from 'react';
import { ShoppingBag, Clock, Truck, CheckCircle2 } from 'lucide-react';
import { PaymentMethods } from '@/components/payment-methods';
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

  // Hay oferta cuando el precio tachado es MAYOR que el actual. Un
  // `originalPrice` igual o menor no es una oferta: es un dato mal cargado.
  const originalPrice = product.originalPrice;
  const hasOffer = typeof originalPrice === 'number' && originalPrice > product.price;
  const discount = hasOffer ? Math.round((1 - product.price / originalPrice) * 100) : 0;

  return (
    <section className="py-8 md:py-12 relative overflow-hidden">
      {/* Background — neutro con un sutil acento aspiracional */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-r from-accent-aspirational/10 via-surface to-accent-trust/10" />
      </div>

      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* La chapa de oferta SOLO si hay oferta real. Antes salía en las 576
              publicaciones, tuvieran o no descuento: una urgencia que el
              comprador ya aprendió a ignorar, y que en las que no tienen
              descuento simplemente es falsa. Mismo criterio que OfferBanner. */}
          {hasOffer && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sale text-sale-fg mb-6">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-semibold">
                {discount > 0 ? `Oferta: −${discount}% por tiempo limitado` : 'Oferta por tiempo limitado'}
              </span>
            </div>
          )}

          {/* El cierre vende la DECISIÓN, no la logística.
              "Pídelo hoy y recíbelo esta semana" prometía un plazo que la
              tienda no cumple: la política real es 3 a 7 días HÁBILES, que
              pueden ser nueve corridos. Y "sale de nuestra bodega en 24-48
              horas" es un dato de operación: al comprador no le mueve nada
              saber cuándo sale de una bodega que no conoce.
              Lo que de verdad diferencia aquí es que el comprador elige cómo
              paga, y eso es lo que dice el titular. */}
          <h2 className="font-serif text-3xl md:text-5xl font-bold text-foreground mb-6 text-balance">
            {hasOffer ? 'Llévatelo antes de que suba' : 'Pídelo ahora y págalo a tu manera'}
          </h2>

          {/* El subtítulo cierra el recorrido de la landing: quien llega hasta
              aquí ya leyó beneficios, especificaciones y preguntas. No hay que
              darle un dato más, hay que quitarle el último freno. */}
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-balance">
            Ya sabes de qué está hecho, cómo se usa y qué trae. Lo único que falta es tenerlo en casa.
          </p>

          {/* Price Card — block, full-width up to max-w */}
          <div className="block w-full max-w-lg mx-auto bg-card/80 backdrop-blur-xl rounded-3xl border border-white/20 p-6 md:p-10 shadow-2xl mb-8">
            
            {/* Price block — stacked vertically */}
            <div className="flex flex-col items-center gap-1 mb-6">
              {hasOffer && (
                <div className="flex items-center gap-3">
                  <span className="text-base md:text-xl text-muted-foreground line-through">
                    {formatPrice(originalPrice)}
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

            {/* Bloque de confianza, justo antes del botón. El texto y los
                medios de pago salen de PaymentMethods para no desincronizarse
                con el checkout. */}
            <div className="mb-6">
              <PaymentMethods variant="block" />
              <div className="flex flex-wrap justify-center gap-2 mt-3">
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

            {/* CTA salmón único, sin pulsación, contraste alto.
                Una sola línea, siempre: `whitespace-nowrap` + tamaño que baja
                en móvil. El botón anterior podía partirse en dos renglones y
                empujaba el resto de la tarjeta fuera de la pantalla. */}
            <button
              onClick={() => setIsCheckoutOpen(true)}
              className={cn(
                "w-full flex items-center justify-center gap-2.5 px-5 py-4 md:px-8 md:py-5 rounded-2xl font-bold transition-all duration-300",
                "text-base md:text-xl whitespace-nowrap",
                "bg-cta text-cta-fg hover:bg-cta-hover shadow-xl shadow-cta-ring hover:shadow-2xl",
                "hover:scale-[1.02] active:scale-[0.98]"
              )}
            >
              <ShoppingBag className="w-5 h-5 md:w-6 md:h-6 shrink-0" />
              Lo quiero, pedir ahora
            </button>

            {/* Antes decía "Solo pagas al recibir tu pedido", que con Confío
                encendido es falso: también se puede pagar ahora con el dinero
                en custodia. El detalle de cómo se paga lo da PaymentMethods
                justo arriba, que es la única fuente. */}
            <p className="mt-4 text-sm font-medium text-foreground">
              Eliges cómo pagar en el siguiente paso
            </p>
          </div>

          {/* Los tres hechos, redactados como están en la política real
              (components/store-policies.tsx). Antes decía "Envío en 24-48h",
              que contradecía el "Llega en 3 a 7 días hábiles" del resto del
              sitio, y "30 días de garantía", que se lee como devolución libre
              cuando la cobertura real es por defecto de fábrica. */}
          <div className="flex flex-wrap justify-center gap-6 md:gap-8 text-sm text-muted-foreground">
            <span>Llega en 3 a 7 días hábiles</span>
            <span>30 días si llega con defecto</span>
            <span>Te acompañamos por WhatsApp</span>
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
