import { ArrowRight, Sparkles } from 'lucide-react'
import { DestacadoStory as DestacadoStoryData } from '@/lib/types'

interface Props {
  story?: DestacadoStoryData
}

export function DestacadoStory({ story }: Props) {
  const acts = [
    { label: 'El momento', title: story?.problemTitle, text: story?.problemText },
    {
      label: 'Lo que cambia',
      title: story?.turningPointTitle,
      text: story?.turningPointText,
    },
    { label: 'El resultado', title: story?.outcomeTitle, text: story?.outcomeText },
  ].filter((act) => act.title && act.text)

  if (acts.length < 2) return null

  return (
    <section className="relative overflow-hidden py-14 md:py-20">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-todopolis-blue/10 via-surface to-todopolis-lavender/20" />
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-9 max-w-3xl text-center md:mb-12">
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-todopolis-lavender/60 bg-surface px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-todopolis-lavender-deep">
            <Sparkles className="h-3.5 w-3.5" />
            {story?.eyebrow || 'Una historia que se siente conocida'}
          </span>
          <h2 className="font-serif text-3xl font-extrabold tracking-tight text-ink-title md:text-5xl">
            Del problema cotidiano a una solución concreta
          </h2>
        </div>

        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-stretch">
          {acts.map((act, index) => (
            <div key={act.label} className="contents">
              <article className="rounded-3xl border border-nav-inactive-border bg-surface p-6 shadow-sm md:p-8">
                <span className="mb-4 block text-xs font-extrabold uppercase tracking-[0.16em] text-todopolis-lavender-deep">
                  {act.label}
                </span>
                <h3 className="mb-3 font-serif text-xl font-bold leading-tight text-ink-title md:text-2xl">
                  {act.title}
                </h3>
                <p className="leading-relaxed text-foreground/70">{act.text}</p>
              </article>
              {index < acts.length - 1 && (
                <div className="flex items-center justify-center py-1 text-todopolis-blue-deep md:py-0">
                  <ArrowRight className="h-5 w-5 rotate-90 md:rotate-0" aria-hidden />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
