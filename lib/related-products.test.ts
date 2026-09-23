// El fallo que esto impide: que todas las fichas sugieran los mismos productos
// recién llegados, sin relación con el que se está mirando.

import assert from 'node:assert/strict'
import test from 'node:test'
import { relatedProducts } from './related-products.ts'

const tag = (...slugs: string[]) => slugs.map((slug) => ({ slug }))

// En orden de llegada, como viene del catálogo: los nuevos primero.
const catalog = [
  { id: 'cartas', category: 'juguetes', price: 35900, tags: tag('ideal-para-regalo', 'para-ninos') },
  { id: 'bici', category: 'juguetes', price: 129000, tags: tag('ideal-para-regalo', 'para-ninos') },
  { id: 'molino', category: 'hogar', price: 39900, tags: tag('cocina', 'cafe') },
  { id: 'tazas', category: 'hogar', price: 45000, tags: tag('cocina', 'ideal-para-regalo') },
  { id: 'sofa', category: 'hogar', price: 47900, tags: tag('sala') },
  { id: 'labial', category: 'belleza', price: 42900, tags: tag('ideal-para-regalo') },
]
const batidor = { id: 'batidor', category: 'hogar', price: 42900, tags: tag('cocina', 'cafe') }

test('lo más parecido va primero, no lo más nuevo', () => {
  const out = relatedProducts(batidor, catalog, 3).map((p) => p.id)
  assert.deepEqual(out, ['molino', 'tazas', 'sofa'])
})

test('una etiqueta común pesa menos que una rara', () => {
  const pool = [
    { id: 'comun', category: 'moda', price: 40000, tags: tag('ideal-para-regalo') },
    { id: 'rara', category: 'moda', price: 40000, tags: tag('cafe') },
    ...catalog,
  ]
  const cafe = { id: 'x', category: 'moda', price: 40000, tags: tag('cafe', 'ideal-para-regalo') }
  const out = relatedProducts(cafe, pool, 2).map((p) => p.id)
  assert.equal(out[0], 'rara')
})

test('nunca se sugiere a sí mismo', () => {
  const out = relatedProducts(batidor, [...catalog, batidor], 20)
  assert.ok(!out.some((p) => p.id === 'batidor'))
})

test('sin parecidos suficientes se rellena con el resto, detrás', () => {
  const out = relatedProducts(batidor, catalog, 6).map((p) => p.id)
  assert.equal(out.length, 6)
  assert.deepEqual(out.slice(0, 3), ['molino', 'tazas', 'sofa'])
  assert.deepEqual(new Set(out), new Set(catalog.map((p) => p.id)))
})

test('«otros» no hace parientes a dos productos', () => {
  const pool = [
    { id: 'a', category: 'otros', price: 10000, tags: [] },
    { id: 'b', category: 'hogar', price: 10000, tags: tag('cafe') },
  ]
  const out = relatedProducts({ id: 'z', category: 'otros', price: 10000, tags: tag('cafe') }, pool, 1)
  assert.equal(out[0].id, 'b')
})

test('producto sin etiquetas ni categoría: relleno en orden de llegada', () => {
  const out = relatedProducts({ id: 'z' }, catalog, 2).map((p) => p.id)
  assert.deepEqual(out, ['cartas', 'bici'])
})
