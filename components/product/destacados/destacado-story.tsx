import { DestacadoStory as DestacadoStoryData } from '@/lib/types'
import { DestacadoSection, DestacadoSectionHeader } from './destacado-section-header'

interface Props {
  story?: DestacadoStoryData
}

// Los tres momentos como columnas editoriales, no como tarjetas con flechas.
//
// El titular es el antetítulo que escribió el editor (o la IA) para ESTE
// producto. Antes todas las landings decían lo mismo —«Del problema cotidiano
// a una solución concreta»—, una frase que describe la sección en vez de
// hablarle al comprador y que se repetía idéntica en cada Destacado.
export function DestacadoStory({ story }: Props) {
  const acts = [
    { label: 'Antes', title: story?.problemTitle, text: story?.problemText },
    { label: 'Lo que cambia', title: story?.turningPointTitle, text: story?.turningPointText },
    { label: 'Después', title: story?.outcomeTitle, text: story?.outcomeText },
  ].filter((act) => act.title && act.text)

  if (acts.length < 2) return null

  return (
    <DestacadoSection tone="soft">
      <DestacadoSectionHeader
        eyebrow="La historia"
        title={story?.eyebrow?.trim() || 'Del día a día a algo que por fin funciona'}
      />

      <div className={`grid gap-10 md:gap-8 ${acts.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'} lg:gap-12`}>
        {acts.map((act, index) => (
          <article
            key={act.label}
            className={`border-t-2 pt-6 ${index === acts.length - 1 ? 'border-todopolis-lavender-deep' : 'border-nav-inactive-border'}`}
          >
            <p className="mb-4 flex items-baseline gap-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              <span className="font-serif text-sm tabular-nums text-todopolis-lavender-deep">
                {String(index + 1).padStart(2, '0')}
              </span>
              {act.label}
            </p>
            <h3 className="mb-3 font-serif text-xl font-bold leading-tight text-ink-title md:text-2xl">
              {act.title}
            </h3>
            <p className="leading-relaxed text-foreground/70">{act.text}</p>
          </article>
        ))}
      </div>
    </DestacadoSection>
  )
}
