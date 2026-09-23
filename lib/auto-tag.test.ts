// El fallo que esto impide: etiquetas de más (ensucian filtros y venta
// cruzada), de campaña puestas solas, o un producto sin ninguna por un corte.

import assert from 'node:assert/strict'
import test from 'node:test'
import { buildTagQuestions, classifyProductTagsJev, pickTags } from './auto-tag.ts'

const taxonomy = [
  { slug: 'mascotas-audiencia', name: 'Mascotas', group: 'audiencia' },
  { slug: 'capilar', name: 'Capilar', group: 'nicho' },
  { slug: 'navidad', name: 'Navidad', group: 'ocasion' },
  { slug: 'oferta', name: 'Oferta', group: 'promo' },
]

test('toma las seguras, máximo 6', () => {
  const probs = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`t${i}`, 0.99 - i * 0.01]))
  assert.equal(pickTags(probs).length, 6)
  assert.deepEqual(pickTags({ a: 0.9, b: 0.7, c: 0.4 }), ['a', 'b'])
})

test('con menos de 2 seguras completa con las dudosas, hasta 2', () => {
  assert.deepEqual(pickTags({ a: 0.95, b: 0.55, c: 0.52, d: 0.2 }), ['a', 'b'])
  assert.deepEqual(pickTags({ a: 0.3, b: 0.2 }), [])
})

test('ocasión y promo no se preguntan', () => {
  const { keyToSlug } = buildTagQuestions(taxonomy)
  assert.deepEqual([...keyToSlug.values()].sort(), ['capilar', 'mascotas-audiencia'])
  assert.ok(keyToSlug.has('mascotas_audiencia'))
})

test('traduce las respuestas de JEV de vuelta a slugs', async () => {
  const fake = (async () => ({
    answers: {
      mascotas_audiencia: { type: 'boolean', probability: 0.97 },
      capilar: { type: 'boolean', probability: 0.61 },
    },
  })) as never
  assert.deepEqual(await classifyProductTagsJev(taxonomy, { name: 'Rascador' }, { evaluateFn: fake }), ['mascotas-audiencia', 'capilar'])
})

test('JEV caído devuelve null para que el llamador use Gemini', async () => {
  const failing = (async () => { throw new Error('502') }) as never
  assert.equal(await classifyProductTagsJev(taxonomy, { name: 'x' }, { evaluateFn: failing }), null)
})
