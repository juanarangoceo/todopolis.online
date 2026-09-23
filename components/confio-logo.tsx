import Image from 'next/image'
import { cn } from '@/lib/utils'

// Logo oficial de Confío Pagos, bajado de confiopagos.com (sep 2026).
//
// Se muestra el logo real y no un escudo genérico porque la promesa del pago
// protegido descansa en QUIÉN guarda la plata: un ícono de escudo lo pone
// cualquier tienda, la marca de la pasarela es lo que el comprador puede ir a
// buscar y verificar. Ver CLAUDE.md → «En la interfaz se NOMBRA a Confío».
//
// `pill`: la pastilla azul con el nombre (768×137). `icon`: solo el símbolo.
export function ConfioLogo({
  variant = 'pill',
  className,
}: {
  variant?: 'pill' | 'icon'
  className?: string
}) {
  if (variant === 'icon') {
    return (
      <Image
        src="/brands/confio-icon.png"
        alt="Confío"
        width={192}
        height={192}
        className={cn('h-8 w-8', className)}
      />
    )
  }
  return (
    <Image
      src="/brands/confio-pagos.png"
      alt="Confío Pagos"
      width={768}
      height={137}
      className={cn('h-7 w-auto', className)}
    />
  )
}
