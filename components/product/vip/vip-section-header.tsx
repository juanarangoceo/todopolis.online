import { Crown } from 'lucide-react'

interface VipSectionHeaderProps {
  eyebrow?: string
  title: string
  subtitle?: string
}

// Header reutilizable para todas las secciones VIP: chip dorado + título +
// subtítulo opcional. Mantiene consistencia visual entre los 7 bloques.
export function VipSectionHeader({ eyebrow = 'Solo en VIP', title, subtitle }: VipSectionHeaderProps) {
  return (
    <div className="text-center mb-6 md:mb-7">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.16em] bg-amber-50 border border-amber-200/70 text-amber-700 mb-3">
        <Crown className="w-3 h-3 text-amber-500" fill="currentColor" strokeWidth={1.5} />
        {eyebrow}
      </span>
      <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground leading-tight text-balance">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-2.5 text-sm md:text-base text-foreground/65 max-w-2xl mx-auto leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  )
}
