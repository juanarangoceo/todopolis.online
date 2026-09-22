import { ArrowRight } from 'lucide-react'
import { ArticleTrigger } from '@/components/product/article-modal'
import { DestacadoSection, DestacadoSectionHeader, DestacadoSplit } from './destacado-section-header'

interface FaqItem {
  _key?: string
  question: string
  answer: string
}

interface Props {
  faqs: FaqItem[]
  articleSlug?: string | null
  articleTopic?: string | null
}

// Preguntas en dos columnas: encabezado a la izquierda —con el artículo del
// producto debajo, que es la respuesta larga a la misma duda— y la lista a la
// derecha. Antes el artículo era una franja suelta a todo el ancho justo
// encima de las preguntas, y las preguntas una columna de 672 px centrada:
// dos anchos distintos para un mismo tema.
//
// Lista con filetes, sin tarjetas: son para leer, no para destacar.
// `<details>` nativo, igual que `product-faq.tsx`.
export function DestacadoFaq({ faqs, articleSlug, articleTopic }: Props) {
  if (!faqs?.length && !articleSlug) return null

  return (
    <DestacadoSection>
      <DestacadoSplit
        header={
          <>
            <DestacadoSectionHeader
              eyebrow="Antes de pedirlo"
              title="Lo que más nos preguntan"
              className="mb-6"
            />
            {articleSlug && (
              <ArticleTrigger
                slug={articleSlug}
                className="group block rounded-2xl border border-nav-inactive-border p-5 transition-colors hover:border-todopolis-lavender-deep/40 hover:bg-surface-soft"
              >
                <span className="block text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Para leer con calma
                </span>
                <span className="mt-1.5 block font-semibold leading-snug text-ink-title">
                  {articleTopic || 'La guía completa de este producto'}
                </span>
                <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-todopolis-lavender-deep">
                  Leer artículo
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </ArticleTrigger>
            )}
          </>
        }
      >
        {faqs?.length > 0 && (
          <div className="divide-y divide-nav-inactive-border border-y border-nav-inactive-border">
            {faqs.map((faq, index) => (
              <details key={faq._key ?? index} className="group" open={index === 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 select-none">
                  <span className="font-semibold leading-snug text-ink-title md:text-lg">{faq.question}</span>
                  <span
                    aria-hidden
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-nav-inactive-border text-muted-foreground transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="max-w-2xl pb-6 leading-relaxed text-muted-foreground">{faq.answer}</p>
              </details>
            ))}
          </div>
        )}
      </DestacadoSplit>
    </DestacadoSection>
  )
}
