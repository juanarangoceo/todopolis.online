import { Banknote } from 'lucide-react'
import { PaymentLogos } from './payment-logos'
import { cn } from '@/lib/utils'

// Los medios de pago que aceptamos, en UN solo sitio. Antes cada bloque de la
// landing escribía "Pago 100% Contraentrega" por su cuenta, y al añadir Confío
// eso pasó a ser una media verdad repetida en tres lugares.
//
// Los medios de Confío y sus logos viven en `payment-logos.tsx` (PSE, Nequi y
// Bancolombia; NO tarjeta).
//
// El flag es el mismo que muestra el botón en el checkout: si el pago
// anticipado no está encendido, este componente vuelve a hablar solo de
// contraentrega y no hay nada que desmentir.

export function advancePaymentVisible(): boolean {
  return process.env.NEXT_PUBLIC_CONFIO_ENABLED === 'true'
}

/**
 * Tira compacta de medios de pago, junto al hero y al cierre: «Contraentrega»
 * y, con Confío encendido, los logos de lo que se puede usar para pagar ya.
 * (Había una variante `block` con degradado que nadie usaba; se quitó en
 * oct 2026.)
 */
export function PaymentMethods({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-2', className)}>
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-trust-bg border border-trust-border text-trust-fg text-xs font-bold">
        <Banknote className="w-3.5 h-3.5 shrink-0" />
        Contraentrega
      </span>
      {advancePaymentVisible() && (
        <>
          <span className="text-xs text-muted-foreground">o con Confío:</span>
          <PaymentLogos className="gap-x-2.5" logoClassName="h-6" />
        </>
      )}
    </div>
  )
}
