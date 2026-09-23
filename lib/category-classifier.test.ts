// El fallo que esto impide: que la categoría vuelva a caer en «otros» por
// defecto, o que se escriba una que no existe en la lista.

import assert from 'node:assert/strict'
import test from 'node:test'
import { buildCategoryRequest, classifyCategory, classifyFromSource, decideCategory, MIN_CONFIDENCE } from './category-classifier.ts'
import { PRODUCT_CATEGORY_VALUES } from './categories.ts'

test('JEV seguro gana a los respaldos', () => {
  const d = decideCategory({ category: 'mascotas', confidence: 0.92 }, ['hogar'])
  assert.deepEqual(d, { category: 'mascotas', confidence: 0.92, source: 'jev' })
})

test('JEV dudoso cede ante un respaldo concreto', () => {
  const d = decideCategory({ category: 'hogar', confidence: MIN_CONFIDENCE - 0.1 }, ['cocina'])
  assert.equal(d.category, 'cocina')
  assert.equal(d.source, 'respaldo')
})

test('un respaldo «otros» no gana a JEV aunque dude', () => {
  const d = decideCategory({ category: 'belleza', confidence: 0.3 }, ['otros'])
  assert.equal(d.category, 'belleza')
  assert.equal(d.source, 'jev-dudoso')
})

test('sin JEV: primer respaldo válido que no sea «otros»', () => {
  assert.equal(decideCategory(null, ['otros', 'no-existe', 'deportes', 'hogar']).category, 'deportes')
})

test('nada sirve: «otros», nunca un valor inventado', () => {
  assert.equal(decideCategory({ category: 'inventada', confidence: 0.99 }, ['tampoco']).category, 'otros')
  assert.equal(decideCategory(null).category, 'otros')
})

test('la pregunta ofrece exactamente las categorías de la lista', () => {
  const r = buildCategoryRequest({ name: 'Cama para perro', description: 'x', sourceCategory: 'Animales y Mascotas' })
  assert.deepEqual(Object.keys(r.questions.category.criteria).sort(), [...PRODUCT_CATEGORY_VALUES].sort())
  assert.equal(r.state.categoria_del_proveedor, 'Animales y Mascotas')
})

test('JEV caído no rompe: se usa el respaldo', async () => {
  const failing = (async () => { throw new Error('502') }) as never
  const d = await classifyCategory({ name: 'Termo' }, ['cocina'], { evaluateFn: failing })
  assert.equal(d.category, 'cocina')
})

test('lee la confianza que manda TypeSafe', async () => {
  const fake = (async () => ({
    answers: { category: { type: 'choice', choice: 'bebes' } },
    providerMetadata: { typesafe: { confidence: { category: 0.88 } } },
  })) as never
  const d = await classifyCategory({ name: 'Calentador de tetero' }, [], { evaluateFn: fake })
  assert.deepEqual(d, { category: 'bebes', confidence: 0.88, source: 'jev' })
})

test('adultos del proveedor no pasan por JEV', async () => {
  let called = false
  const spy = (async () => { called = true; throw new Error('no debería llamarse') }) as never
  const d = await classifyFromSource({ name: 'Aceite', sourceCategory: 'Adultos' }, undefined, [], { evaluateFn: spy })
  assert.equal(d.category, 'bienestar-intimo')
  assert.equal(called, false)
})

test('la tabla del proveedor es respaldo, JEV decide', async () => {
  const fake = (async () => ({
    answers: { category: { type: 'choice', choice: 'belleza' } },
    providerMetadata: { typesafe: { confidence: { category: 0.9 } } },
  })) as never
  const d = await classifyFromSource({ name: 'Shampoo', sourceCategory: 'Otros' }, undefined, [], { evaluateFn: fake })
  assert.equal(d.category, 'belleza')
})
