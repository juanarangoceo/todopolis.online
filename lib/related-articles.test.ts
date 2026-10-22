import assert from 'node:assert/strict'
import test from 'node:test'
import { relatedArticles } from './related-articles.ts'
import type { SanityArticle } from './types.ts'
const article = (slug: string, category = 'belleza', publishedAt = '2026-10-01'): SanityArticle => ({ _id: slug, slug, title: slug, category, publishedAt })
test('relaciona solo guías de la misma categoría, sin repetir la actual ni duplicados', () => {
  const current = article('actual')
  const candidates = [current, article('vieja'), article('nueva', 'belleza', '2026-10-22'), article('vieja'), article('otra', 'hogar'), article('')]
  assert.deepEqual(relatedArticles(current, candidates).map(a => a.slug), ['nueva', 'vieja'])
  assert.equal(candidates[1].slug, 'vieja')
})
test('respeta límite y no inventa relaciones cuando falta categoría', () => {
  assert.equal(relatedArticles(article('actual'), [article('a'), article('b')], 1).length, 1)
  assert.deepEqual(relatedArticles(article('actual', ''), [article('a')]), [])
  assert.deepEqual(relatedArticles(article('actual'), [article('a')], 0), [])
})
