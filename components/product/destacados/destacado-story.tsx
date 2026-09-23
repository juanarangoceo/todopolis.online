import Image from 'next/image'
import { DestacadoStory as DestacadoStoryData } from '@/lib/types'
import { sanityCdnImage } from '@/lib/sanity/cdn-image'
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
    { label: 'Antes', title: story?.problemTitle, text: story?.problemText, image: story?.problemImage, alt: story?.problemImageAlt },
    { label: 'Lo que cambia', title: story?.turningPointTitle, text: story?.turningPointText, image: story?.turningPointImage, alt: story?.turningPointImageAlt },
    { label: 'Después', title: story?.outcomeTitle, text: story?.outcomeText, image: story?.outcomeImage, alt: story?.outcomeImageAlt },
  ].filter((act) => act.title && act.text)

  if (acts.length < 2) return null

  // Las imágenes son opcionales y por momento. Van ARRIBA del filete, así el
  // número y el titular quedan alineados entre columnas aunque solo algunos
  // momentos tengan foto: la que no tiene deja su hueco vacío en escritorio en
  // vez de subir el texto y romper la fila.
  const anyImage = acts.some((act) => act.image)

  return (
    <DestacadoSection tone="soft">
      <DestacadoSectionHeader
        eyebrow="La historia"
        title={story?.eyebrow?.trim() || 'Del día a día a algo que por fin funciona'}
      />

      {/* Con fotos, en móvil los momentos se deslizan de lado: tres fotos a
          todo el ancho una bajo otra alargaban la historia a tres pantallas.
          Sin fotos se apilan, que el texto solo es corto. */}
      <div
        className={`${
          anyImage
            ? '-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden'
            : 'grid gap-10'
        } md:gap-8 ${acts.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'} lg:gap-12`}
      >
        {acts.map((act, index) => (
          <article
            key={act.label}
            className={anyImage ? 'w-[82%] shrink-0 snap-start md:w-auto' : undefined}
          >
            {anyImage && (
              <div
                className={`relative mb-6 aspect-[4/3] overflow-hidden rounded-2xl ${act.image ? 'bg-surface-muted' : 'hidden md:block'}`}
              >
                {act.image && (
                  <Image
                    src={sanityCdnImage(act.image, 800)}
                    alt={act.alt || act.title || ''}
                    fill
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="object-cover"
                    unoptimized
                  />
                )}
              </div>
            )}
            <div
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
            </div>
          </article>
        ))}
      </div>
    </DestacadoSection>
  )
}
