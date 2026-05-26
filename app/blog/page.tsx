import Link from 'next/link'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { getArticles, getSanityProducts } from '@/lib/sanity/queries'
import { SanityArticle } from '@/lib/types'
import { SuggestedProductsCarousel } from '@/components/product/suggested-products-carousel'

export const revalidate = 3600

export const metadata = {
  title: 'Blog Todopolis | Guías y Consejos de Compra',
  description: 'Descubre artículos informativos, guías de compra y consejos prácticos para elegir los mejores productos. Contenido de calidad del equipo Todopolis.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'Blog Todopolis | Guías y Consejos de Compra',
    description: 'Artículos informativos, guías de compra y consejos prácticos del equipo Todopolis.',
    type: 'website',
    locale: 'es_CO',
    siteName: 'Todopolis',
  },
}

const CATEGORY_LABELS: Record<string, string> = {
  belleza: 'Belleza',
  hogar: 'Hogar',
  electronica: 'Electrónica',
  moda: 'Moda',
  accesorios: 'Accesorios',
  juguetes: 'Juguetes',
  deportes: 'Deportes',
  otros: 'Otros',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
}

function ArticleCard({ article }: { article: SanityArticle }) {
  const category = CATEGORY_LABELS[article.category ?? ''] ?? article.category ?? 'General'

  return (
    <article className="group flex flex-col bg-surface border border-gray-100 rounded-2xl overflow-hidden hover:shadow-lg hover:border-todopolis-lavender/60 transition-all duration-300">
      <div className="flex flex-col flex-1 p-6">
        {/* Category badge */}
        <span className="inline-block w-fit text-xs font-semibold px-2.5 py-1 rounded-full bg-todopolis-lavender/30 text-todopolis-lavender-deep mb-3">
          {category}
        </span>

        {/* Title */}
        <h2 className="font-bold text-lg text-gray-900 leading-snug mb-2 group-hover:text-todopolis-lavender-deep transition-colors line-clamp-2">
          {article.title}
        </h2>

        {/* Topic */}
        {article.topic && (
          <p className="text-sm font-medium text-todopolis-pink-deep mb-3">{article.topic}</p>
        )}

        {/* Excerpt */}
        <p className="text-sm text-gray-500 leading-relaxed flex-1 line-clamp-3">
          {article.seoDescription}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-3 text-xs text-gray-400">
            {article.readingTime && (
              <span>{article.readingTime} min lectura</span>
            )}
            {article.publishedAt && (
              <span>{formatDate(article.publishedAt)}</span>
            )}
          </div>
          <Link
            href={`/blog/${article.slug}`}
            className="text-sm font-semibold text-todopolis-lavender-deep hover:text-todopolis-blue-deep transition-colors"
          >
            Leer →
          </Link>
        </div>
      </div>
    </article>
  )
}

export default async function BlogPage() {
  const [articles, sanityProducts] = await Promise.all([
    getArticles(),
    getSanityProducts().catch(() => []),
  ])

  // Últimos productos subidos — PRODUCTS_LIST_QUERY ya ordena por _createdAt desc.
  const latestProducts = sanityProducts
    .filter((p: any) => p.slug && p.category?.toLowerCase() !== 'bienestar-intimo')
    .slice(0, 12)
    .map((p: any) => ({
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
        <section className="bg-surface-soft py-14 md:py-20">
          <div className="container mx-auto px-4 text-center">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-todopolis-lavender-deep mb-4">
              Blog Todopolis
            </span>
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Guías y consejos para{' '}
              <span className="bg-gradient-to-r from-todopolis-blue-deep to-todopolis-lavender-deep bg-clip-text text-transparent">
                comprar mejor
              </span>
            </h1>
            <p className="text-gray-500 max-w-xl mx-auto text-lg">
              Artículos informativos del equipo Todopolis para ayudarte a tomar las mejores decisiones de compra.
            </p>
          </div>
        </section>

        {/* Últimos productos — oportunidad de venta */}
        {latestProducts.length > 0 && (
          <section className="border-b border-gray-100 bg-surface-soft py-10 md:py-12">
            <div className="container mx-auto px-4">
              <div className="flex items-end justify-between gap-4 mb-6">
                <div>
                  <span className="inline-block text-xs font-bold uppercase tracking-widest text-todopolis-pink-deep mb-1">
                    Recién llegados
                  </span>
                  <h2 className="font-serif text-2xl md:text-3xl font-bold text-gray-900">
                    Lo último en Todopolis
                  </h2>
                </div>
                <Link
                  href="/"
                  className="shrink-0 text-sm font-semibold text-todopolis-lavender-deep hover:text-todopolis-blue-deep transition-colors whitespace-nowrap"
                >
                  Ver todo →
                </Link>
              </div>
              <SuggestedProductsCarousel products={latestProducts} />
            </div>
          </section>
        )}

        {/* Articles grid */}
        <section className="container mx-auto px-4 py-12 md:py-16">
          {articles.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-5xl mb-4">✍️</p>
              <p className="text-lg">Pronto publicaremos nuestros primeros artículos.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article) => (
                <ArticleCard key={article._id} article={article} />
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  )
}
