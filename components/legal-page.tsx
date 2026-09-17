import { Header } from '@/components/header'
import { Footer } from '@/components/footer'

// Maqueta compartida de las páginas legales (/privacidad, /terminos).
//
// Son páginas con URL PROPIA y no ventanas emergentes, y eso no es un capricho
// de diseño: Meta pide una dirección enlazable de la política de privacidad
// para el Business Manager y para los Términos de Herramientas de Negocio, y
// una ventana que se abre con JavaScript no se puede pegar en un formulario ni
// la puede visitar un revisor. Antes este contenido vivía solo en un modal del
// pie de página.
export function LegalPage({
  title,
  updatedAt,
  intro,
  children,
}: {
  title: string
  /** Fecha de última actualización, en texto ya legible. */
  updatedAt: string
  intro?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <article className="container mx-auto px-4 py-10 md:py-16">
          <div className="max-w-3xl mx-auto">
            <header className="mb-8 md:mb-10">
              <h1 className="font-serif text-3xl md:text-[2.5rem] leading-[1.1] font-extrabold text-ink-title tracking-[-0.02em] text-pretty">
                {title}
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Última actualización: {updatedAt}
              </p>
              {intro && (
                <div className="mt-5 rounded-2xl border border-trust-border bg-trust-bg px-5 py-4 text-sm leading-relaxed text-foreground/80">
                  {intro}
                </div>
              )}
            </header>

            {/* `legal-body` da los estilos de texto corrido sin repetir clases en
                cada párrafo; está definido en globals.css. */}
            <div className="legal-body">{children}</div>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  )
}

/** Sección numerada de una página legal. */
export function LegalSection({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2>{title}</h2>
      {children}
    </section>
  )
}
