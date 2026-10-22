import type { SanityArticle } from './types.ts'

/** Relaciona por categoría real; no rellena con temas ajenos ni repite la lectura. */
export function relatedArticles(article: SanityArticle, articles: SanityArticle[], limit = 3): SanityArticle[] {
  if (!article.category || limit <= 0) return []
  const seen = new Set([article.slug])
  return articles
    .filter((candidate) => {
      if (!candidate.slug || !candidate.title?.trim() || candidate.category !== article.category || seen.has(candidate.slug)) return false
      seen.add(candidate.slug)
      return true
    })
    .sort((a, b) => (Date.parse(b.publishedAt ?? '') || 0) - (Date.parse(a.publishedAt ?? '') || 0))
    .slice(0, limit)
}
