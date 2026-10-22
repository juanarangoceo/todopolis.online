import type { SanityArticle } from './types.ts'

export type HomeArticle = Pick<SanityArticle, 'slug' | 'title' | 'readingTime'>

/** Lecturas recientes y variadas: primero una por categoría, después completa
 * el cupo. Evita llenar la sugerencia con seis guías casi iguales de tenis. */
export function homeArticlePicks(articles: SanityArticle[], count = 6): HomeArticle[] {
  const sorted = articles
    .filter((article) => article.slug?.trim() && article.title?.trim() && !['bienestar-intimo', 'sexshop'].includes(article.category ?? ''))
    .sort((a, b) => (Date.parse(b.publishedAt ?? '') || 0) - (Date.parse(a.publishedAt ?? '') || 0))
  const picked: SanityArticle[] = []
  const categories = new Set<string>()
  const slugs = new Set<string>()
  const topics = new Set<string>()
  const topic = (article: SanityArticle) => (article.topic || article.title).trim().toLocaleLowerCase('es')
  const add = (article: SanityArticle) => {
    if (picked.length >= Math.max(0, count) || slugs.has(article.slug) || topics.has(topic(article))) return
    picked.push(article)
    slugs.add(article.slug)
    topics.add(topic(article))
    categories.add(article.category ?? '')
  }
  for (const article of sorted) if (!categories.has(article.category ?? '')) add(article)
  for (const article of sorted) add(article)
  return picked.map(({ slug, title, readingTime }) => ({ slug, title, readingTime }))
}
