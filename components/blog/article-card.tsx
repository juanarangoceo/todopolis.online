import Link from 'next/link'
import { categoryTitle } from '@/lib/categories'
import type { SanityArticle } from '@/lib/types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function ArticleCard({ article }: { article: SanityArticle }) {
  const category = categoryTitle(article.category) || 'General'

  return (
    <article className="group flex flex-col bg-surface border border-nav-inactive-border rounded-3xl overflow-hidden hover:shadow-md transition-shadow duration-200 motion-reduce:transition-none">
      <div className="flex flex-col flex-1 p-5 sm:p-6">
        {/* Category badge */}
        <span className="inline-block w-fit text-xs font-semibold px-2.5 py-1 rounded-full bg-todopolis-lavender/30 text-todopolis-lavender-deep mb-3">
          {category}
        </span>

        {/* Title */}
        <h2 className="font-bold text-lg text-gray-900 leading-snug mb-2 group-hover:text-todopolis-lavender-deep transition-colors line-clamp-2">
          <Link href={`/blog/${article.slug}`} className="rounded-sm focus-visible:outline-2 focus-visible:outline-todopolis-lavender-deep focus-visible:outline-offset-4">{article.title}</Link>
        </h2>

        {/* Topic */}
        {article.topic && (
          <p className="text-sm font-medium text-muted-foreground mb-3">{article.topic}</p>
        )}

        {/* Excerpt */}
        <p className="text-sm text-muted-foreground leading-relaxed flex-1 line-clamp-3">
          {article.seoDescription}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {article.readingTime && (
              <span>{article.readingTime} min lectura</span>
            )}
            {article.publishedAt && (
              <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
            )}
          </div>
          <Link
            href={`/blog/${article.slug}`}
            aria-label={`Leer: ${article.title}`}
            className="inline-flex min-h-11 items-center text-sm font-semibold text-todopolis-lavender-deep"
          >
            Leer →
          </Link>
        </div>
      </div>
    </article>
  )
}

