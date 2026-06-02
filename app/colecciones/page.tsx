import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, LayoutGrid } from 'lucide-react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { getCollectionsList, type CollectionListItem } from '@/lib/sanity/queries'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Colecciones — Todopolis',
  description:
    'Colecciones curadas por segmento: encuentra los mejores productos agrupados y comparados para acertar con tu compra.',
  alternates: { canonical: '/colecciones' },
}

function sanityOptimized(url: string, width: number): string {
  if (!url || !url.includes('cdn.sanity.io')) return url
  return `${url}?w=${width}&auto=format&q=80`
}

// Collage de hasta 4 imágenes de producto para la portada del card.
function CoverCollage({ covers, title }: { covers: { image: string | null }[]; title: string }) {
  const images = covers.map((c) => c.image).filter(Boolean).slice(0, 4) as string[]
  if (images.length === 0) {
    return (
      <div className="aspect-[4/3] w-full bg-gradient-to-br from-todopolis-blue/20 to-todopolis-lavender/25 flex items-center justify-center">
        <LayoutGrid className="w-10 h-10 text-todopolis-lavender-deep/50" />
      </div>
    )
  }
  return (
    <div className="aspect-[4/3] w-full grid grid-cols-2 grid-rows-2 gap-0.5 bg-surface-muted">
      {images.map((src, i) => (
        <div
          key={i}
          className={`relative overflow-hidden bg-surface ${images.length === 1 ? 'col-span-2 row-span-2' : images.length === 3 && i === 0 ? 'row-span-2' : ''}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sanityOptimized(src, 400)} alt={title} className="w-full h-full object-cover" />
        </div>
      ))}
    </div>
  )
}

export default async function ColeccionesPage() {
  const collections: CollectionListItem[] = await getCollectionsList()

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <Header />

      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-b from-todopolis-lavender/25 via-surface to-surface" />
            <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-todopolis-blue/30 blur-3xl" />
            <div className="absolute -top-10 right-0 w-72 h-72 rounded-full bg-todopolis-pink/30 blur-3xl" />
          </div>
          <div className="container mx-auto px-4 pt-12 md:pt-16 pb-8 text-center max-w-2xl">
            <span className="inline-flex items-center gap-1.5 mb-4 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-tag-active-bg text-tag-active-fg shadow-sm">
              <LayoutGrid className="w-3.5 h-3.5" />
              Colecciones
            </span>
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight text-balance">
              Colecciones curadas para ti
            </h1>
            <p className="text-foreground/70 text-base md:text-lg leading-relaxed">
              Selecciones por segmento con guía de compra y comparativa para que elijas con confianza.
            </p>
          </div>
        </section>

        {/* ── Grid de colecciones ── */}
        <section className="container mx-auto px-4 py-10 pb-16">
          {collections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-foreground/60 mb-4">Aún no hay colecciones publicadas. Vuelve pronto.</p>
              <Link
                href="/"
                className="px-5 py-2.5 rounded-full bg-foreground/90 text-white font-bold text-sm hover:bg-foreground transition-colors"
              >
                Ir al catálogo
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 max-w-6xl mx-auto">
              {collections.map((c) => (
                <Link
                  key={c._id}
                  href={`/coleccion/${c.slug}`}
                  className="group flex flex-col rounded-3xl overflow-hidden bg-surface border border-nav-inactive-border shadow-sm hover:shadow-lg hover:border-todopolis-lavender/40 hover:-translate-y-1 transition-all duration-300"
                >
                  <CoverCollage covers={c.covers} title={c.heroTitle ?? c.title} />
                  <div className="flex flex-col flex-1 p-5">
                    {c.heroEyebrow && (
                      <span className="self-start mb-2 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-tag-active-bg text-tag-active-fg">
                        {c.heroEyebrow}
                      </span>
                    )}
                    <h2 className="font-serif text-lg font-bold text-foreground leading-snug mb-1.5">
                      {c.heroTitle ?? c.title}
                    </h2>
                    <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 flex-1">
                      {c.heroSubtitle ?? c.seoDescription ?? ''}
                    </p>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                      <span className="text-xs font-semibold text-foreground/60">
                        {c.productCount} {c.productCount === 1 ? 'producto' : 'productos'}
                      </span>
                      <span className="inline-flex items-center gap-1 text-sm font-bold text-todopolis-lavender-deep group-hover:gap-2 transition-all">
                        Ver
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  )
}
