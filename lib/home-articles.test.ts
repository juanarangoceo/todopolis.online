import assert from 'node:assert/strict'
import test from 'node:test'
import { homeArticlePicks } from './home-articles.ts'
import type { SanityArticle } from './types.ts'

const article = (slug: string, category: string, date: number, topic = slug): SanityArticle => ({
  _id: slug, slug, title: `Guía ${slug}`, category, topic, readingTime: 3,
  publishedAt: `2026-10-${String(date).padStart(2, '0')}T12:00:00Z`,
})

test('prioriza artículos recientes de categorías distintas y no modifica el origen', () => {
  const articles = [article('hogar', 'hogar', 18), article('ropa-vieja', 'moda', 20), article('belleza', 'belleza', 19), article('ropa', 'moda', 22)]
  assert.deepEqual(homeArticlePicks(articles, 3).map((a) => a.slug), ['ropa', 'belleza', 'hogar'])
  assert.equal(articles[0].slug, 'hogar')
})

test('completa el cupo sin repetir enlaces ni temas y entrega solo datos de la sugerencia', () => {
  const articles = [article('a', 'moda', 22, 'Tenis'), article('b', 'moda', 21, 'tenis'), article('c', 'moda', 20)]
  assert.deepEqual(homeArticlePicks([...articles, articles[0]], 6), [
    { slug: 'a', title: 'Guía a', readingTime: 3 },
    { slug: 'c', title: 'Guía c', readingTime: 3 },
  ])
})

test('omite enlaces incompletos y contenido de adultos; soporta cero o ninguna lectura', () => {
  const valid = article('a', 'belleza', 22)
  assert.deepEqual(homeArticlePicks([article('adulto', 'bienestar-intimo', 22), { ...valid, slug: '' }, { ...valid, title: ' ' }]), [])
  assert.deepEqual(homeArticlePicks([valid], 0), [])
  assert.deepEqual(homeArticlePicks([], 6), [])
})
