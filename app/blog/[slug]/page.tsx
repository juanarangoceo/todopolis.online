import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { getArticleBySlug, getAllArticleSlugs } from '@/lib/sanity/queries'
import { ArticleSections } from '@/components/blog/article-sections'
import { SanityArticle } from '@/lib/types'

export const revalidate = 86400

export async function generateStaticParams() {
  const slugs = await getAllArticleSlugs()
  return slugs.map(({ slug }) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article: SanityArticle | null = await getArticleBySlug(slug)
  if (!article) return { title: 'Artículo no encontrado' }

  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://todopolis.online'
  return {
    title: `${article.title} | Blog`,
    description: article.seoDescription,
    keywords: article.seoKeywords?.join(', '),
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title: article.title,
      description: article.seoDescription ?? '',
      type: 'article',
      url: `${BASE_URL}/blog/${slug}`,
      locale: 'es_CO',
      siteName: 'Todópolis',
      publishedTime: article.publishedAt,
    },
    twitter: {
      card: 'summary',
      title: article.title,
      description: article.seoDescription ?? '',
    },
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  belleza: 'Belleza', hogar: 'Hogar', electronica: 'Electrónica',
  moda: 'Moda', accesorios: 'Accesorios', juguetes: 'Juguetes',
  deportes: 'Deportes', otros: 'Otros',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article: SanityArticle | null = await getArticleBySlug(slug)

  if (!article) notFound()

  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://todopolis.online'
  const category = CATEGORY_LABELS[article.category ?? ''] ?? article.category ?? 'General'

  // Schema.org BlogPosting JSON-LD
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.seoDescription,
    ...(article.productImage && { image: article.productImage }),
    keywords: article.seoKeywords?.join(', '),
    datePublished: article.publishedAt,
    dateModified: article._updatedAt ?? article.publishedAt,
    author: { '@type': 'Organization', name: 'Todópolis', url: BASE_URL },
    publisher: { '@type': 'Organization', name: 'Todópolis', url: BASE_URL },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${BASE_URL}/blog/${slug}` },
  }

  // Schema.org BreadcrumbList JSON-LD
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${BASE_URL}/blog` },
      { '@type': 'ListItem', position: 3, name: article.title, item: `${BASE_URL}/blog/${slug}` },
    ],
  }

  // Schema.org FAQPage JSON-LD
  const faqSection = article.sections?.find(s => s.type === 'faq')
  const faqJsonLd = faqSection?.faqs?.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqSection.faqs.map(f => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: f.answer },
        })),
      }
    : null

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {faqJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      )}

      <Header />

      <main className="flex-1">
        {/* Article header */}
        <header className="bg-surface-soft pt-10 pb-8">
          <div className="container mx-auto px-4 max-w-3xl">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
              <Link href="/blog" className="hover:text-todopolis-lavender-deep transition-colors">Blog</Link>
              <span>/</span>
              <span className="text-todopolis-lavender-deep font-medium">{category}</span>
            </nav>

            {/* Category badge */}
            <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-todopolis-lavender/30 text-todopolis-lavender-deep mb-4">
              {category}
            </span>

            {/* Title */}
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-4">
              {article.title}
            </h1>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
              {article.topic && (
                <span className="font-medium text-todopolis-pink-deep">{article.topic}</span>
              )}
              {article.readingTime && (
                <span>{article.readingTime} min de lectura</span>
              )}
              {article.publishedAt && (
                <span>{formatDate(article.publishedAt)}</span>
              )}
              <span>Por Equipo Todópolis</span>
            </div>
          </div>
        </header>

        {/* Divider */}
        <div className="container mx-auto px-4 max-w-3xl">
          <hr className="border-gray-100 mb-8" />
        </div>

        {/* Article body */}
        <article className="container mx-auto px-4 max-w-3xl pb-16">
          <ArticleSections
            sections={article.sections}
            productSlug={article.productSlug ?? ''}
          />
        </article>

        {/* Back to blog */}
        <div className="container mx-auto px-4 max-w-3xl pb-12">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-todopolis-lavender-deep transition-colors"
          >
            ← Volver al blog
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  )
}
