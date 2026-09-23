import { cn } from '@/lib/utils'

// ─── Rejilla común de la landing de Destacados ─────────────────────────────
// Todas las secciones usan el MISMO contenedor que el hero (`container px-4`)
// y ningún `max-w-*` propio. Antes cada bloque elegía su ancho —historia en
// 6xl, beneficios en 4xl, imagen IA en md, especificaciones en 5xl, FAQ en 2xl,
// cierre en lg— y en escritorio la página era una escalera de bordes que no
// coincidían entre sí. Ahora los bordes izquierdo y derecho son los del hero
// de principio a fin, y lo que necesita una medida de lectura más corta la
// consigue con columnas (`split`), no encogiendo la sección.
//
// Casi todo va en blanco y se separa por aire, no por tarjetas. El gris suave
// (`tone="soft"`) queda para dos momentos: la historia, que abre el recorrido,
// y el cierre. No se alterna sección a sección porque casi todas son
// opcionales y la alternancia se rompería según qué haya llenado el editor.

interface DestacadoSectionProps {
  children: React.ReactNode
  tone?: 'white' | 'soft'
  className?: string
  id?: string
}

export function DestacadoSection({ children, tone = 'white', className, id }: DestacadoSectionProps) {
  return (
    <section
      id={id}
      // 56 px por lado en escritorio. Con 80 px, dos secciones blancas
      // seguidas quedaban separadas por 160 px de nada y la landing se leía
      // como bloques sueltos en vez de un recorrido.
      className={cn('py-10 md:py-14', tone === 'soft' ? 'bg-surface-soft' : 'bg-surface', className)}
    >
      <div className="container mx-auto px-4">{children}</div>
    </section>
  )
}

/**
 * Encabezado a la izquierda (4 columnas) y contenido a la derecha (8). Para
 * bloques de lectura —ficha técnica, comparativa, preguntas, pago— que a todo
 * el ancho quedarían con renglones de 150 caracteres.
 */
export function DestacadoSplit({ header, children }: { header: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:gap-16">
      <div className="lg:col-span-4">
        <div className="lg:sticky lg:top-28">{header}</div>
      </div>
      <div className="min-w-0 lg:col-span-8">{children}</div>
    </div>
  )
}

interface DestacadoSectionHeaderProps {
  eyebrow?: string
  title: string
  subtitle?: string
  align?: 'left' | 'center'
  className?: string
}

// El antetítulo es texto gris con un filete corto, NO una pastilla con
// estrella. Las pastillas de colores encima de cada título eran lo que más
// delataba la plantilla: siete secciones seguidas con el mismo adorno se leen
// como relleno, y la lavanda en todas dejaba de significar nada.
export function DestacadoSectionHeader({
  eyebrow,
  title,
  subtitle,
  align = 'left',
  className,
}: DestacadoSectionHeaderProps) {
  const centered = align === 'center'
  return (
    <div className={cn('mb-8 md:mb-10', centered && 'mx-auto max-w-2xl text-center', className)}>
      {eyebrow && (
        <p
          className={cn(
            'mb-3 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground',
            centered && 'justify-center',
          )}
        >
          <span aria-hidden className="h-px w-6 bg-todopolis-lavender-deep/60" />
          {eyebrow}
        </p>
      )}
      <h2 className="font-serif text-[1.75rem] font-extrabold leading-[1.12] tracking-[-0.02em] text-ink-title text-balance md:text-[2.5rem]">
        {title}
      </h2>
      {subtitle && (
        <p className={cn('mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg', centered && 'mx-auto')}>
          {subtitle}
        </p>
      )}
    </div>
  )
}
