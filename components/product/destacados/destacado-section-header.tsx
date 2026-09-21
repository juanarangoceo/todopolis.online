import { Star } from 'lucide-react'

interface DestacadoSectionHeaderProps {
  eyebrow?: string
  title: string
  subtitle?: string
}

// Header reutilizable para todas las secciones de Destacados: chip dorado + título +
// subtítulo opcional. Mantiene consistencia visual entre los 7 bloques.
export function DestacadoSectionHeader({ eyebrow = 'Solo en Destacados', title, subtitle }: DestacadoSectionHeaderProps) {
  return (
    <div className="text-center mb-6 md:mb-7">
      <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-todopolis-lavender/60 bg-todopolis-lavender/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-todopolis-lavender-deep">
        <Star className="w-3 h-3 text-todopolis-lavender-deep" fill="currentColor" strokeWidth={1.5} />
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
