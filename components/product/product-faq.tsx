interface FaqItem {
  _key?: string
  question: string
  answer: string
}

interface ProductFaqProps {
  faqs: FaqItem[]
}

export function ProductFaq({ faqs }: ProductFaqProps) {
  if (!faqs?.length) return null

  return (
    <section className="py-10 md:py-14">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">

          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-2">
              Preguntas frecuentes
            </h2>
            <p className="text-muted-foreground text-sm">
              Todo lo que necesitas saber antes de comprar
            </p>
          </div>

          {/* FAQ items */}
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <details
                key={faq._key ?? index}
                className="group border border-todopolis-lavender/40 rounded-2xl overflow-hidden bg-white hover:border-todopolis-lavender/70 transition-colors"
              >
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none select-none hover:bg-surface-soft transition-colors">
                  <span className="font-semibold text-foreground text-sm md:text-base pr-4 leading-snug">
                    {faq.question}
                  </span>
                  {/* Plus/minus indicator via CSS */}
                  <span className="shrink-0 w-6 h-6 rounded-full bg-todopolis-lavender/30 flex items-center justify-center text-todopolis-lavender-deep font-bold text-sm transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <div className="px-5 pb-5 pt-1 border-t border-todopolis-lavender/30">
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </details>
            ))}
          </div>

        </div>
      </div>
    </section>
  )
}
