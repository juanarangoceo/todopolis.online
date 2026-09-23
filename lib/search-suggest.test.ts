import assert from 'node:assert/strict'
import test from 'node:test'
import { buildSuggestRequest, normalizeSuggestQuery, parseSuggestAnswers } from './search-suggest.ts'

const tags = [
  { slug: 'para-mamas', name: 'Para mamás', group: 'audiencia' },
  { slug: 'cocina-gourmet', name: 'Cocina gourmet', group: 'nicho' },
  { slug: 'navidad', name: 'Navidad', group: 'ocasion' },
]

test('normaliza y descarta búsquedas cortas', () => {
  assert.equal(normalizeSuggestQuery('  Cafetera   Italiana '), 'cafetera italiana')
  assert.equal(normalizeSuggestQuery('ab'), null)
  assert.equal(normalizeSuggestQuery(null), null)
})

test('no pregunta por etiquetas de ocasión ni promo', () => {
  const { keyToSlug } = buildSuggestRequest('regalo', tags)
  assert.deepEqual([...keyToSlug.values()].sort(), ['cocina-gourmet', 'para-mamas'])
})

test('sugiere categoría segura y etiquetas probables', () => {
  const { keyToSlug } = buildSuggestRequest('cafetera', tags)
  const s = parseSuggestAnswers(
    {
      category: { type: 'choice', choice: 'cocina' },
      cocina_gourmet: { type: 'boolean', probability: 0.9 },
      para_mamas: { type: 'boolean', probability: 0.3 },
    },
    keyToSlug, tags, 0.95,
  )
  assert.deepEqual(s, { category: { value: 'cocina', title: 'Cocina' }, tags: [{ slug: 'cocina-gourmet', name: 'Cocina gourmet' }] })
})

test('nunca sugiere adultos ni «otros», ni una categoría dudosa', () => {
  const { keyToSlug } = buildSuggestRequest('x', tags)
  for (const [choice, conf] of [['bienestar-intimo', 0.99], ['otros', 0.99], ['hogar', 0.3]] as const) {
    assert.equal(parseSuggestAnswers({ category: { type: 'choice', choice } }, keyToSlug, tags, conf).category, null)
  }
})
