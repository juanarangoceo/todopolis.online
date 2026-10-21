import Image from 'next/image'
import { cn } from '@/lib/utils'

// Los medios con los que se paga en Confío, con su logo (oct 2026, la misma
// narrativa que Nitro Complete: «pagas con lo que ya tienes en el celular»).
//
// La lista NO es decorativa: esta tienda de Confío acepta PSE, Nequi y
// Bancolombia, y NO tarjeta ni Daviplata (comprobado contra la API real).
// Nitro muestra también Visa y Mastercard porque allá cada comercio conecta
// su propia cuenta; aquí pintarlos sería prometer lo que el checkout no cobra.
//
// En gris, como en Nitro: los colores de otras marcas competirían con los
// tres que significan algo en la tienda (ver identidad-de-marca §4).
export const CONFIO_PAYMENT_LOGOS = [
  { src: '/brands/pagos/pse.png', alt: 'PSE' },
  { src: '/brands/pagos/nequi.png', alt: 'Nequi' },
  { src: '/brands/pagos/bancolombia.png', alt: 'Bancolombia' },
] as const

export function PaymentLogos({ className, logoClassName }: { className?: string; logoClassName?: string }) {
  return (
    <ul className={cn('flex flex-wrap items-center gap-x-4 gap-y-2', className)} aria-label="Medios de pago con Confío">
      {CONFIO_PAYMENT_LOGOS.map((logo) => (
        <li key={logo.src} className="flex items-center">
          {/* Los PNG son 200×60 con aire alrededor del trazo. */}
          <Image src={logo.src} alt={logo.alt} width={200} height={60} className={cn('h-7 w-auto', logoClassName)} />
        </li>
      ))}
    </ul>
  )
}
