'use client'

import { Banknote, Landmark, ShieldCheck, Smartphone } from 'lucide-react'
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
    <div className={cn('rounded-2xl bg-trust-bg border border-trust-border p-4', className)}>
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 shrink-0 rounded-full bg-surface shadow-sm flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-trust-fg" />
        </span>
        <div className="min-w-0">
          {/* El titular nombra LAS DOS VÍAS y nombra a Confío.
              "Tu dinero está protegido" dejaba dos preguntas sin responder
              —¿protegido por quién? ¿y la contraentrega dónde quedó?— y un
              comprador que no sabe quién retiene su plata no se siente más
              seguro, se siente confundido.

              OJO con lo que Confío hace y lo que NO: retiene el PAGO, no
              garantiza la ENTREGA. Confío no despacha nada. Escribir "Confío
              garantiza que te llega" sería prometer algo que el proveedor no
              cubre, y el que responde por el despacho somos nosotros. */}
          <p className="font-bold text-sm text-trust-fg leading-tight">
            {advance ? 'Paga al recibir, o paga con Confío' : 'Pago 100% contraentrega'}
          </p>
          <p className="text-xs text-trust-fg/75 leading-snug mt-1">
            {advance
              ? 'Contraentrega: pagas en efectivo cuando te lo entregan en la puerta. Con Confío: pagas por PSE, Nequi o Bancolombia y la app retiene tu plata hasta que confirmes que el pedido llegó.'
              : 'Solo pagas cuando el pedido llegue a tu puerta. Sin riesgos, sin sorpresas.'}
          </p>
        </div>
      </div>

      {advance && (
        <div className="mt-3 pt-3 border-t border-trust-border/60">
          <p className="text-[11px] font-bold uppercase tracking-wider text-trust-fg/60 mb-2">
            Medios de pago
          </p>
          <div className="flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface border border-trust-border text-trust-fg text-xs font-bold">
              <Banknote className="w-3.5 h-3.5 shrink-0" />
              Efectivo contraentrega
            </span>
            {CONFIO_METHODS.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface border border-trust-border text-trust-fg text-xs font-bold"
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
