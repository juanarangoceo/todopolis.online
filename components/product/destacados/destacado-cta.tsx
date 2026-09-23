'use client'

import Image from 'next/image'
import { MessageCircle, RotateCcw, ShoppingBag, Truck } from 'lucide-react'
import { PaymentMethods } from '@/components/payment-methods'
import { OfferCountdownInline } from '../offer-countdown-inline'
import { Product } from '@/lib/types'
import { DestacadoSection } from './destacado-section-header'

export function formatCop(price: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(price);
}

// Copy y oferta del cierre. Venía de `ProductCTA`, el cierre anterior de la
// ficha normal, que se retiró al unificar las dos fichas.
export function closingCopy(product: Product) {
  // Hay oferta cuando el precio tachado es MAYOR que el actual. Un
  // `originalPrice` igual o menor no es una oferta: es un dato mal cargado.
  const originalPrice = product.originalPrice;
  const hasOffer = typeof originalPrice === 'number' && originalPrice > product.price;
  const discount = hasOffer ? Math.round((1 - product.price / originalPrice) * 100) : 0;
  // Textos generados con prompts viejos que prometían lo que la tienda no
  // cumple: plazos de 24-48 h («rápido») o garantías de satisfacción. Se
  // descartan al renderizar, igual que `sanitizeHeroCta`, para no depender de
  // regenerar 577 productos.
  const unsafeLegacyClaim = /garantía de satisfacción|sin riesgos|devolución gratis|envío inmediato|envío rápido|despacho rápido|entrega rápida|24\s*-?\s*(a\s*)?48|esta semana/i;
  const headline = product.ctaHeadline?.trim()
    || (hasOffer ? 'Aprovecha mientras dure el precio' : 'Tú eliges cómo pagarlo');
  const customSupportingText = product.ctaText?.trim();
  const supportingText = customSupportingText && !unsafeLegacyClaim.test(customSupportingText)
    ? customSupportingText
    : 'Ya sabes de qué está hecho, cómo se usa y qué trae. Lo único que falta es elegir cómo pagarlo.';
  return { originalPrice: hasOffer ? originalPrice : undefined, hasOffer, discount, headline, supportingText };
}

interface Props {
  product: Product
  /** Enlace wa.me ya armado; sin número configurado llega null y el hecho se queda como texto. */
  whatsappHref?: string | null
}

// Cierre de la ficha (Destacados y normal): foto del producto a un lado, decisión al
// otro. El cierre genérico (`ProductCTA`) es una columna centrada de 512 px con
// dos márgenes vacíos, y al final de un recorrido largo el comprador llegaba a
// un precio sin ver ya QUÉ estaba comprando. La foto se lo recuerda en el
// momento exacto de decidir.
//
// El recuadro grande de medios de pago del cierre anterior no se repite aquí:
// la sección «Cómo pagas» está justo encima. Basta con los chips.
//
// El botón no monta otro checkout: dispara `product:buy`, el mismo evento que
// usa la cabecera de campaña, y abre el modal del hero, que es el que conoce
// la variante elegida.
export function DestacadoCTA({ product, whatsappHref }: Props) {
  const { originalPrice, hasOffer, discount, headline, supportingText } = closingCopy(product)
  const image = product.image || product.images?.[0]

  return (
    <DestacadoSection tone="soft">
      <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
        {image && (
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-surface shadow-sm sm:aspect-square lg:col-span-5">
            <Image
              src={image}
              alt={product.name}
              fill
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="object-cover"
            />
            {hasOffer && discount > 0 && (
              <span className="absolute left-4 top-4 rounded-full bg-sale px-3 py-1.5 text-sm font-bold text-sale-fg shadow">
                −{discount}%
              </span>
            )}
          </div>
        )}

        <div className={image ? 'lg:col-span-7' : 'lg:col-span-12'}>
          <p className="mb-3 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
            <span aria-hidden className="h-px w-6 bg-todopolis-lavender-deep/60" />
            Tu pedido
          </p>
          <h2 className="font-serif text-[1.75rem] font-extrabold leading-[1.12] tracking-[-0.02em] text-ink-title text-balance md:text-[2.75rem]">
            {headline}
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
            {supportingText}
          </p>

          <div className="mt-8 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-serif text-[2.5rem] font-extrabold leading-none tracking-[-0.02em] text-ink-title tabular-nums md:text-5xl">
              {formatCop(product.price)}
            </span>
            {originalPrice && (
              <span className="font-serif text-xl font-medium text-muted-foreground line-through tabular-nums">
                {formatCop(originalPrice)}
              </span>
            )}
          </div>

          {/* La misma cuenta regresiva del hero, y con los mismos datos: quien
              llega al cierre tras leer la página ya no tiene el reloj a la
              vista, y es justo cuando decide. Sin fecha o vencida no pinta
              nada. */}
          {(product as any).offerName && (product as any).offerEndsAt && (
            <div className="mt-5 max-w-md">
              <OfferCountdownInline
                offerName={(product as any).offerName}
                offerEndsAt={(product as any).offerEndsAt}
                price={product.price ?? 0}
                originalPrice={originalPrice ?? undefined}
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('product:buy'))}
            className="mt-6 flex w-full max-w-md items-center justify-center gap-2.5 whitespace-nowrap rounded-2xl bg-cta px-6 py-4 text-base font-bold text-cta-fg shadow-xl shadow-cta-ring transition-all duration-300 hover:scale-[1.02] hover:bg-cta-hover active:scale-[0.98] md:py-5 md:text-lg"
          >
            <ShoppingBag className="h-5 w-5 shrink-0" />
            Lo quiero, pedir ahora
          </button>
          <p className="mt-3 text-sm text-muted-foreground">Eliges cómo pagar en el siguiente paso.</p>
          <PaymentMethods variant="inline" className="mt-3" />

          {/* Los hechos, como están en la política real
              (components/store-policies.tsx). El envío sale del mismo flag
              que lo cobra en `checkout-modal.tsx`: gratis en Destacados,
              $12.000 en el resto. */}
          <ul className="mt-8 grid gap-4 border-t border-nav-inactive-border pt-6 text-sm sm:grid-cols-3">
            <li className="flex items-start gap-2.5">
              <Truck className="mt-0.5 h-4 w-4 shrink-0 text-trust-fg" />
              <span className="text-foreground/80">
                <strong className="font-semibold text-ink-title">{product.isDestacado ? 'Envío gratis.' : 'Envío $12.000.'}</strong> Llega en 3 a 7 días hábiles.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-trust-fg" />
              <span className="text-foreground/80">
                <strong className="font-semibold text-ink-title">30 días</strong> si llega con defecto.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-trust-fg" />
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground/80 underline decoration-nav-inactive-border underline-offset-4 transition-colors hover:text-ink-title hover:decoration-current"
                >
                  <strong className="font-semibold text-ink-title">¿Dudas?</strong> Escríbenos por WhatsApp.
                </a>
              ) : (
                <span className="text-foreground/80">
                  <strong className="font-semibold text-ink-title">Te acompañamos</strong> por WhatsApp.
                </span>
              )}
            </li>
          </ul>
        </div>
      </div>
    </DestacadoSection>
  )
}
