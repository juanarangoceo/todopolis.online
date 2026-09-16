import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DestacadoBadgeProps {
  size?: 'sm' | 'md' | 'lg'
  withText?: boolean
  className?: string
}

// Estrellita de Destacado reusable. Dorado sólido sobre fondo cristal para resaltar sin
// chocar con los demás badges de la tarjeta (sale a la izquierda, favorito
// arriba, carrito abajo). El tono dorado vive aparte de la paleta brand para
// que Destacados tenga su propia identidad inmediata.
export function DestacadoBadge({ size = 'md', withText = true, className }: DestacadoBadgeProps) {
  const sizeMap = {
    sm: { wrap: 'px-2 py-0.5 text-[10px]', icon: 'w-3 h-3' },
    md: { wrap: 'px-2.5 py-1 text-[11px]', icon: 'w-3.5 h-3.5' },
    lg: { wrap: 'px-3 py-1.5 text-xs', icon: 'w-4 h-4' },
  }[size]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-black uppercase tracking-wider shadow-sm border border-amber-300/70 backdrop-blur-sm',
        sizeMap.wrap,
        className,
      )}
      style={{
        background: 'linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%)',
        color: '#5A3A0A',
      }}
      aria-label="Producto Destacado"
      title="Producto Destacado — landing extendida"
    >
      <Star className={cn(sizeMap.icon, 'drop-shadow-sm')} fill="currentColor" strokeWidth={1.5} />
      {withText && <span>Destacado</span>}
    </span>
  )
}
