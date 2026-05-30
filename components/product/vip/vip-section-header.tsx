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
      <span
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest border border-amber-300/70 shadow-sm mb-3"
        style={{
          background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
          color: '#92400E',
        }}
      >
        <Crown className="w-3 h-3" fill="currentColor" strokeWidth={1.5} />
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
