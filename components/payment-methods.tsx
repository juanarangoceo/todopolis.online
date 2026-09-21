'use client'

import { Banknote, CircleCheck, Landmark, ShieldCheck, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'

// Los medios de pago que aceptamos, en UN solo sitio. Antes cada bloque de la
// landing escribía "Pago 100% Contraentrega" por su cuenta, y al añadir Confío
// eso pasó a ser una media verdad repetida en tres lugares.
//
// La lista de medios NO es decorativa: esta tienda de Confío acepta PSE, Nequi
// y Bancolombia, y NO acepta tarjeta (comprobado contra la API real). Pintar un
// logo de Visa aquí sería prometer algo que el checkout no puede cobrar.
//
// El flag es el mismo que muestra el botón en el checkout: si el pago
// anticipado no está encendido, este componente vuelve a hablar solo de
// contraentrega y no hay nada que desmentir.

const CONFIO_METHODS = [
  { icon: Landmark, label: 'PSE' },
  { icon: Smartphone, label: 'Nequi' },
  { icon: Landmark, label: 'Bancolombia' },
] as const

export function advancePaymentVisible(): boolean {
  return process.env.NEXT_PUBLIC_CONFIO_ENABLED === 'true'
}

/**
 * Tira compacta de medios de pago. `variant="block"` es la versión destacada
 * que va junto al botón de compra; `variant="inline"` la que acompaña al hero.
 */
export function PaymentMethods({
  variant = 'inline',
  className,
}: {
  variant?: 'inline' | 'block'
  className?: string
}) {
  const advance = advancePaymentVisible()

  if (variant === 'inline') {
    return (
      <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-trust-bg border border-trust-border text-trust-fg text-xs font-bold">
          <Banknote className="w-3.5 h-3.5 shrink-0" />
          Contraentrega
        </span>
        {advance &&
          CONFIO_METHODS.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface border border-nav-inactive-border text-foreground/70 text-xs font-bold"
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {label}
            </span>
          ))}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-trust-border bg-gradient-to-br from-trust-bg via-surface to-todopolis-lavender/40 shadow-sm',
        className,
      )}
    >
      <div className="flex items-center gap-3 px-4 pb-3 pt-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-trust-fg text-white shadow-sm">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold leading-tight text-ink-title">
            {advance ? 'Tú eliges cuándo pagar' : 'Paga cuando llegue'}
          </p>
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
            {advance
              ? 'Dos formas claras de comprar, sin perder el control de tu dinero.'
              : 'No adelantas dinero: pagas en efectivo al recibir tu pedido.'}
          </p>
        </div>
      </div>

      <div className={cn('grid gap-2.5 px-3 pb-3', advance && 'sm:grid-cols-2')}>
        <div className="rounded-xl border border-trust-border/80 bg-surface/95 p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-trust-bg text-trust-fg">
              <Banknote className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-trust-fg/65">
                Contraentrega
              </p>
              <p className="text-sm font-bold leading-tight text-ink-title">Paga cuando llegue</p>
            </div>
          </div>
          <p className="mt-2 text-xs leading-snug text-muted-foreground">
            Entrega el efectivo cuando recibas el pedido en tu puerta.
          </p>
          <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-trust-fg">
            <CircleCheck className="h-3.5 w-3.5" />
            Sin pago anticipado
          </span>
        </div>

        {advance && (
          <div className="rounded-xl border border-todopolis-lavender bg-todopolis-lavender/25 p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface text-todopolis-lavender-deep shadow-sm">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-todopolis-lavender-deep/70">
                  Pago protegido
                </p>
                <p className="text-sm font-bold leading-tight text-ink-title">Paga ahora, libera después</p>
              </div>
            </div>
            {/* Confío protege el pago, no el despacho: la promesa se limita a
                la custodia real que ofrece la pasarela. */}
            <p className="mt-2 text-xs leading-snug text-muted-foreground">
              Confío guarda tu dinero y solo lo libera cuando confirmas que el pedido llegó.
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {CONFIO_METHODS.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1 rounded-full border border-todopolis-lavender bg-surface px-2 py-0.5 text-[10px] font-bold text-todopolis-lavender-deep"
                >
                  <Icon className="h-3 w-3 shrink-0" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
