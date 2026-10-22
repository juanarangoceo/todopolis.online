import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DestacadoBadgeProps {
  size?: 'sm' | 'md' | 'lg'
  withText?: boolean
  className?: string
}

// Estrellita de Destacado reusable. El ámbar es la distinción comercial
// (guía de marca §4), en tono plano: sin degradado ni sombra en la estrella.
export function DestacadoBadge({ size = 'md', withText = true, className }: DestacadoBadgeProps) {
  const sizeMap = {
    sm: { wrap: 'px-2 py-0.5 text-[10px]', icon: 'w-3 h-3' },
    md: { wrap: 'px-2.5 py-1 text-[11px]', icon: 'w-3.5 h-3.5' },
    lg: { wrap: 'px-3 py-1.5 text-xs', icon: 'w-4 h-4' },
  }[size]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-black uppercase tracking-wider shadow-sm border border-amber-300 bg-amber-300 text-amber-950',
        sizeMap.wrap,
        className,
      )}
      aria-label="Producto Destacado"
      title="Producto Destacado — landing extendida"
    >
      <Star className={sizeMap.icon} fill="currentColor" strokeWidth={1.5} />
      {withText && <span>Destacado</span>}
    </span>
  )
}
