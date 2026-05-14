import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { getArticleBySlug, getAllArticleSlugs } from '@/lib/sanity/queries'
import { SanityArticle, ArticleSection } from '@/lib/types'

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
    title: `${article.title} | Blog Todopolis`,
    description: article.seoDescription,
    keywords: article.seoKeywords?.join(', '),
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title: article.title,
      description: article.seoDescription ?? '',
      type: 'article',
      url: `${BASE_URL}/blog/${slug}`,
      locale: 'es_CO',
      siteName: 'Todopolis',
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

function renderSection(section: ArticleSection, productSlug: string, index: number) {
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
                <span className="mt-2 w-2 h-2 rounded-full bg-gradient-to-r from-[#FFB4AC] to-[#EDD2F3] shrink-0" />
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
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-semibold text-gray-800 list-none hover:bg-[#FFF8FA] transition-colors select-none">
                  <span>{faq.question}</span>
                  <span className="ml-3 text-[#EDD2F3] text-lg shrink-0">＋</span>
                </summary>
                <p className="px-5 pb-4 pt-1 text-gray-600 leading-relaxed border-t border-gray-100">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      )

    case 'cta':
      return (
        <div
          key={key}
          className="bg-gradient-to-br from-[#EDD2F3]/25 to-[#FFB4AC]/20 border border-[#EDD2F3]/50 rounded-2xl p-8 my-10 text-center"
        >
          {section.heading && (
            <h2 className="text-2xl font-bold text-gray-900 mb-3">{section.heading}</h2>
          )}
          {section.content && (
            <p className="text-gray-700 mb-6 max-w-lg mx-auto leading-relaxed">{section.content}</p>
          )}
          {productSlug && (
            <Link
              href={`/producto/${productSlug}`}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-[#FFB4AC] to-[#EDD2F3] text-gray-900 font-bold px-8 py-3 rounded-2xl hover:shadow-lg hover:scale-105 transition-all duration-200"
            >
              {section.buttonText || 'Ver producto'} →
            </Link>
          )}
        </div>
      )

    default:
      return null
  }
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article: SanityArticle | null = await getArticleBySlug(slug)

  if (!article) notFound()

  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://todopolis.online'
  const category = CATEGORY_LABELS[article.category ?? ''] ?? article.category ?? 'General'

  // Schema.org Article JSON-LD
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.seoDescription,
    keywords: article.seoKeywords?.join(', '),
    datePublished: article.publishedAt,
    author: { '@type': 'Organization', name: 'Todopolis', url: BASE_URL },
    publisher: { '@type': 'Organization', name: 'Todopolis', url: BASE_URL },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${BASE_URL}/blog/${slug}` },
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
      {faqJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      )}

      <Header />

      <main className="flex-1">
        {/* Article header */}
        <header className="bg-gradient-to-b from-[#FFF8FA] to-white pt-10 pb-8">
          <div className="container mx-auto px-4 max-w-3xl">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
              <Link href="/blog" className="hover:text-[#8b5cf6] transition-colors">Blog</Link>
              <span>/</span>
              <span className="text-[#8b5cf6] font-medium">{category}</span>
            </nav>

            {/* Category badge */}
            <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-[#EDD2F3]/30 text-[#8b5cf6] mb-4">
              {category}
            </span>

            {/* Title */}
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-4">
              {article.title}
            </h1>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
              {article.topic && (
                <span className="font-medium text-[#FFB4AC]">{article.topic}</span>
              )}
              {article.readingTime && (
                <span>{article.readingTime} min de lectura</span>
              )}
              {article.publishedAt && (
                <span>{formatDate(article.publishedAt)}</span>
              )}
              <span>Por Equipo Todopolis</span>
            </div>
          </div>
        </header>

        {/* Divider */}
        <div className="container mx-auto px-4 max-w-3xl">
          <hr className="border-gray-100 mb-8" />
        </div>

        {/* Article body */}
        <article className="container mx-auto px-4 max-w-3xl pb-16">
          {article.sections?.map((section, index) =>
            renderSection(section, article.productSlug ?? '', index)
          )}
        </article>

        {/* Back to blog */}
        <div className="container mx-auto px-4 max-w-3xl pb-12">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-[#8b5cf6] transition-colors"
          >
            ← Volver al blog
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  )
}
