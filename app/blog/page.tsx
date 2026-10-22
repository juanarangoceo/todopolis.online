import Link from 'next/link'
import type { Metadata } from 'next'
import type { SanityProduct } from '@/lib/types'
import { notFound } from 'next/navigation'
import { ArticleCard } from '@/components/blog/article-card'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { getArticles, getSanityProducts } from '@/lib/sanity/queries'
import { COMPACT_ROW_ITEM, SuggestedProductsCarousel } from '@/components/product/suggested-products-carousel'

export const revalidate = 3600

const PAGE_SIZE = 18
interface BlogProps { searchParams: Promise<{ page?: string | string[] }> }

function pageNumber(raw: string | string[] | undefined) {
  if (raw === undefined) return 1
  if (typeof raw !== 'string' || !/^[1-9]\d*$/.test(raw)) notFound()
  const page = Number(raw)
  if (!Number.isSafeInteger(page)) notFound()
  return page
}

export async function generateMetadata({ searchParams }: BlogProps): Promise<Metadata> {
  const page = pageNumber((await searchParams).page)
  return {
    title: `Guías de moda, belleza y compras${page > 1 ? ` — Página ${page}` : ''}`,
    description: 'Guías de moda, belleza, accesorios y hogar. Encuentra consejos para elegir, combinar y cuidar tus productos con el equipo Todópolis.',
    alternates: { canonical: page > 1 ? `/blog?page=${page}` : '/blog' },
    openGraph: {
      title: 'Blog — Guías y Consejos de Compra',
      description: 'Artículos informativos, guías de compra y consejos prácticos del equipo Todópolis.',
      type: 'website',
      url: page > 1 ? `/blog?page=${page}` : '/blog',
      images: [{ url: '/opengraph-image', alt: 'Todópolis: guías de moda, belleza y compras' }],
      locale: 'es_CO',
      siteName: 'Todópolis',
    },
    twitter: { card: 'summary_large_image', title: `Guías de moda, belleza y compras — Página ${page}`, description: 'Consejos del equipo Todópolis para elegir y cuidar tus productos.', images: ['/opengraph-image'] },
  }
}


export default async function BlogPage({ searchParams }: BlogProps) {
  const page = pageNumber((await searchParams).page)
  const [articles, sanityProducts] = await Promise.all([
    getArticles(),
    page === 1 ? getSanityProducts().catch(() => []) : Promise.resolve([]),
  ])

  const readable = articles.filter((article) => article.slug?.trim() && article.title?.trim())
  const totalPages = Math.max(1, Math.ceil(readable.length / PAGE_SIZE))
  if (page > totalPages) notFound()
  const shown = readable.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const pageHref = (number: number) => number === 1 ? '/blog' : `/blog?page=${number}`

  // Últimos productos subidos — PRODUCTS_LIST_QUERY ya ordena por _createdAt desc.
  const latestProducts = sanityProducts
    .filter((p: SanityProduct) => p.slug && p.category?.toLowerCase() !== 'bienestar-intimo')
    .slice(0, 12)
    .map((p: SanityProduct & { originalPrice?: number }) => ({
      id: p._id,
      name: p.name,
      slug: p.slug,
      shortDescription: p.shortDescription ?? '',
      description: p.shortDescription ?? '',
      price: p.price ?? 0,
      originalPrice: p.originalPrice,
      image: p.mastershopImageUrl ?? p.image ?? '/placeholder.jpg',
      category: p.category ?? 'Otros',
      rating: 4.8,
      isNew: p.isNew ?? false,
      isBestSeller: p.isBestSeller ?? false,
      reviewsCount: p.reviewsCount,
    }))

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1">
        {/* Hero section */}
        <section className="bg-surface-soft py-8 md:py-12">
          <div className="container mx-auto px-4 text-center">
            {/* Antetítulo gris con filete y titular, como el resto de la tienda
                (guía §5). El titular ya dice qué hay: sin subtítulo. */}
            <p className="mb-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              <span aria-hidden className="h-px w-6 bg-todopolis-lavender-deep/60" />
              Blog Todópolis
            </p>
            <h1 className="font-serif text-3xl md:text-4xl font-extrabold tracking-[-0.02em] text-ink-title">
              Guías y consejos para comprar mejor
            </h1>
          </div>
        </section>

        {/* Articles grid */}
        <section className="container mx-auto px-4 py-8 md:py-12">
          {shown.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-lg">Pronto publicaremos nuestros primeros artículos.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {shown.map((article) => (
                <ArticleCard key={article._id} article={article} />
              ))}
            </div>
          )}
          {totalPages > 1 && (
            <nav aria-label="Páginas del blog" className="mt-8 flex flex-wrap items-center justify-center gap-2">
              {page > 1 && <Link href={pageHref(page - 1)} rel="prev" className="inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-bold text-todopolis-lavender-deep">← Anterior</Link>}
              <span className="px-3 text-sm text-muted-foreground">Página {page} de {totalPages}</span>
              {page < totalPages && <Link href={pageHref(page + 1)} rel="next" className="inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-bold text-todopolis-lavender-deep">Siguiente →</Link>}
            </nav>
          )}
        </section>
        {/* Últimos productos — oportunidad de venta */}
        {page === 1 && latestProducts.length > 0 && (
          <section className="border-b border-gray-100 bg-surface-soft py-10 md:py-12">
            <div className="container mx-auto px-4">
              <div className="flex items-end justify-between gap-4 mb-6">
                <div>
                  <span className="inline-block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                    Recién llegados
                  </span>
                  <h2 className="font-serif text-2xl md:text-3xl font-bold text-gray-900">
                    Lo último en Todópolis
                  </h2>
                </div>
                <Link
                  href="/"
                  className="shrink-0 text-sm font-semibold text-todopolis-lavender-deep hover:text-todopolis-blue-deep transition-colors whitespace-nowrap"
                >
                  Ver todo →
                </Link>
              </div>
              <SuggestedProductsCarousel products={latestProducts} itemClassName={COMPACT_ROW_ITEM} />
            </div>
          </section>
        )}

      </main>

      <Footer />
    </div>
  )
}
