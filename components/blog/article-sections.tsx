import Link from 'next/link'
import { ArticleSection } from '@/lib/types'

// Renderer único de las secciones de un artículo. Lo comparten la página
// /blog/[slug] (server) y el modal de la landing de producto (client). Si
// cambias el shape de una sección, este es el único sitio que hay que tocar.
interface ArticleSectionsProps {
  sections?: ArticleSection[]
  productSlug?: string
  /** Slug del producto en cuya landing se está leyendo. Si coincide con el
   *  producto del artículo, el CTA cierra el modal en vez de navegar. */
  currentProductSlug?: string
  onSameProductCta?: () => void
}

export function ArticleSections({
  sections,
  productSlug = '',
  currentProductSlug,
  onSameProductCta,
}: ArticleSectionsProps) {
  if (!sections?.length) return null

  return (
    <>
      {sections.map((section, index) => {
        const key = section._key ?? String(index)

        switch (section.type) {
          case 'intro':
            return (
              <p key={key} className="text-lg leading-relaxed text-gray-700 mb-8 font-light">
                {section.content}
              </p>
            )

          case 'h2':
            return (
              <div key={key} className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-3">{section.heading}</h2>
                <p className="text-base leading-relaxed text-gray-700">{section.content}</p>
              </div>
            )

          case 'list':
            return (
              <div key={key} className="mb-8">
                {section.heading && (
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">{section.heading}</h2>
                )}
                <ul className="space-y-3">
                  {section.items?.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-2 w-2 h-2 rounded-full bg-gradient-to-r from-todopolis-blue to-todopolis-lavender shrink-0" />
                      <span className="text-gray-700 leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )

          case 'faq':
            return (
              <div key={key} className="mb-8">
                {section.heading && (
                  <h2 className="text-2xl font-bold text-gray-900 mb-5">{section.heading}</h2>
                )}
                <div className="space-y-3">
                  {section.faqs?.map((faq, i) => (
                    <details
                      key={faq._key ?? i}
                      className="border border-gray-200 rounded-xl overflow-hidden"
                    >
                      <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-semibold text-gray-800 list-none hover:bg-surface-soft transition-colors select-none">
                        <span>{faq.question}</span>
                        <span className="ml-3 text-todopolis-lavender text-lg shrink-0">＋</span>
                      </summary>
                      <p className="px-5 pb-4 pt-1 text-gray-600 leading-relaxed border-t border-gray-100">
                        {faq.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </div>
            )

          case 'cta': {
            if (!productSlug) return null
            const label = section.buttonText || 'Ver producto'
            const ctaClass =
              'inline-flex items-center gap-2 bg-cta text-cta-fg font-bold px-8 py-3 rounded-2xl hover:bg-cta-hover hover:shadow-lg hover:scale-105 transition-all duration-200'
            // Ya estás en la landing de ese producto: el CTA cierra el modal y te
            // devuelve al embudo en vez de recargar la misma página.
            const isSameProduct = !!currentProductSlug && currentProductSlug === productSlug

            return (
              <div
                key={key}
                className="bg-todopolis-lavender/15 border border-todopolis-lavender/40 rounded-2xl p-8 my-10 text-center"
              >
                {section.heading && (
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">{section.heading}</h2>
                )}
                {section.content && (
                  <p className="text-gray-700 mb-6 max-w-lg mx-auto leading-relaxed">
                    {section.content}
                  </p>
                )}
                {isSameProduct && onSameProductCta ? (
                  <button type="button" onClick={onSameProductCta} className={ctaClass}>
                    {label} →
                  </button>
                ) : (
                  <Link href={`/producto/${productSlug}`} className={ctaClass}>
                    {label} →
                  </Link>
                )}
              </div>
            )
          }

          default:
            return null
        }
      })}
    </>
  )
}
