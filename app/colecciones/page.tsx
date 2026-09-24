import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { getCollectionsList, type CollectionListItem } from '@/lib/sanity/queries'
import { PRODUCT_CATEGORIES } from '@/lib/categories'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Colecciones: guías para elegir',
  description:
    'Productos del mismo tipo comparados uno al lado del otro, con una guía corta para elegir el tuyo. Pagas al recibir, llega en 3 a 7 días hábiles.',
  alternates: { canonical: '/colecciones' },
}

// Índice de colecciones (rehecho el 24-sep-2026).
//
// La narrativa: una colección NO es «una selección curada para ti» (eso lo
// dice cualquier tienda y no se puede comprobar). Es una guía para elegir:
// productos del mismo tipo, comparados, con los criterios para quedarse con
// uno. Eso sí se comprueba entrando.
//
// Antes: manchas difuminadas y degradado de fondo, pastilla con ícono sobre
// el titular, texto centrado, `max-w-6xl` propio y tarjetas que subían 4 px.
// Ahora: el mismo encabezado que el resto del sitio, el contenedor único, y
// las colecciones de moda primero («Eleva tu estilo»).

const FASHION = new Set(PRODUCT_CATEGORIES.filter((c) => c.group === 'moda').map((c) => c.value))

/** Parte de productos de moda en la colección, 0 a 1. */
function fashionShare(c: CollectionListItem): number {
  const cats = (c.categories ?? []).filter(Boolean) as string[]
  if (cats.length === 0) return 0
  return cats.filter((v) => FASHION.has(v)).length / cats.length
}

function sanityOptimized(url: string, width: number): string {
  if (!url || !url.includes('cdn.sanity.io')) return url
  return `${url}?w=${width}&auto=format&q=80`
}

const cop = (v: number) => `$${v.toLocaleString('es-CO')}`

// Portada: hasta 3 fotos en fila, 4:5 como la tarjeta de producto. El collage
// 2×2 de antes metía cuatro fotos de proveedor (con sus letreros) en un
// cuadro pequeño y no se reconocía ninguna.
function Cover({ covers }: { covers: { image: string | null }[] }) {
  const images = covers.map((c) => c.image).filter(Boolean).slice(0, 3) as string[]
  if (images.length === 0) return <div className="aspect-[12/5] w-full bg-surface-muted" />
  return (
    <div className="grid grid-cols-3 gap-0.5 bg-surface-muted">
      {images.map((src, i) => (
        <div key={i} className={`relative aspect-[4/5] overflow-hidden bg-surface ${images.length === 1 ? 'col-span-3 aspect-[12/5]' : ''}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sanityOptimized(src, 400)} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        </div>
      ))}
    </div>
  )
}

export default async function ColeccionesPage() {
  const collections = (await getCollectionsList())
    // Moda primero; entre iguales, el orden de la consulta (más nueva primero).
    .map((c, i) => ({ c, i, share: fashionShare(c) }))
    .sort((a, b) => b.share - a.share || a.i - b.i)
    .map(({ c }) => c)

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <Header />

      <main className="flex-1">
        <section className="border-b border-nav-inactive-border bg-surface">
          <div className="container mx-auto px-4 py-8 md:py-12">
            <p className="mb-3 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              <span aria-hidden className="h-px w-6 bg-todopolis-lavender-deep/60" />
              Colecciones
            </p>
            <h1 className="font-serif text-[1.75rem] font-extrabold leading-[1.12] tracking-[-0.02em] text-ink-title text-balance md:text-[2.5rem]">
              Compara y elige el tuyo
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-foreground/75 md:text-lg">
              Juntamos los productos de un mismo tipo, los ponemos uno al lado del otro y te decimos en qué
              fijarte para quedarte con el que te sirve.
            </p>
          </div>
        </section>

        <section className="container mx-auto px-4 py-10 pb-16">
          {collections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="mb-4 text-muted-foreground">Todavía no hay colecciones publicadas.</p>
              <Link href="/" className="rounded-full bg-ink-title px-5 py-2.5 text-sm font-bold text-white hover:opacity-90">
                Ir al catálogo
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
              {collections.map((c) => (
                <Link
                  key={c._id}
                  href={`/coleccion/${c.slug}`}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-nav-inactive-border bg-surface shadow-sm transition-shadow duration-200 hover:shadow-md"
                >
                  <Cover covers={c.covers} />
                  <div className="flex flex-1 flex-col p-5">
                    <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      {c.title}
                    </p>
                    <h2 className="font-serif text-lg font-extrabold leading-snug text-ink-title text-balance">
                      {c.heroTitle ?? c.title}
                    </h2>
                    {(c.heroSubtitle ?? c.seoDescription) && (
                      <p className="mt-1.5 line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                        {c.heroSubtitle ?? c.seoDescription}
                      </p>
                    )}
                    <div className="mt-4 flex items-center justify-between border-t border-nav-inactive-border pt-3">
                      <span className="text-xs font-semibold text-foreground/60">
                        {c.productCount} {c.productCount === 1 ? 'producto' : 'productos'}
                        {c.minPrice ? ` · desde ${cop(c.minPrice)}` : ''}
                      </span>
                      <span className="inline-flex items-center gap-1 text-sm font-bold text-todopolis-lavender-deep transition-all group-hover:gap-2">
                        Comparar
                        <ArrowRight className="h-4 w-4" />
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
