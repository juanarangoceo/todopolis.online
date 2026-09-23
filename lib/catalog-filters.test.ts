// Los fallos que esto impide: un conteo de pestaña que no coincide con lo que
// se ve al tocarla, adultos colándose en «Todos», un orden que se salta un filtro.

import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyCatalogFilters,
  categoryCounts,
  EMPTY_FILTERS,
  isCleanListing,
  panelFilterCount,
  type CatalogFilters,
} from './catalog-filters.ts'

const items = [
  { id: 'a', name: 'Shampoo anticaída', category: 'Belleza', price: 25_000, tags: [{ slug: 'capilar' }] },
  { id: 'b', name: 'Crema facial', category: 'Belleza', price: 45_000, originalPrice: 60_000, tags: [] },
  { id: 'c', name: 'Licuadora portátil', category: 'Cocina', price: 89_000, isDestacado: true, tags: [] },
  { id: 'd', name: 'Lubricante', category: 'Bienestar Íntimo', price: 30_000, tags: [] },
  { id: 'e', name: 'Sartén', category: 'Cocina', price: 120_000, originalPrice: 200_000, tags: [] },
]
const f = (patch: Partial<CatalogFilters>): CatalogFilters => ({ ...EMPTY_FILTERS, tags: new Set(), ...patch })
const ids = (list: { id: string }[]) => list.map((p) => p.id)

test('«Todos» nunca muestra adultos; su pestaña sí', () => {
  assert.deepEqual(ids(applyCatalogFilters(items, f({}))), ['a', 'b', 'c', 'e'])
  assert.deepEqual(ids(applyCatalogFilters(items, f({ category: 'Bienestar Íntimo' }))), ['d'])
})

test('el conteo de cada pestaña es lo que se ve al tocarla', () => {
  const filters = f({ price: '30-60' })
  const counts = categoryCounts(items, filters)
  for (const cat of ['Belleza', 'Cocina']) {
    assert.equal(counts.get(cat) ?? 0, applyCatalogFilters(items, { ...filters, category: cat }).length)
  }
  assert.equal(counts.get('Todos'), applyCatalogFilters(items, filters).length)
})

test('rango de precio: el límite superior no se incluye', () => {
  assert.deepEqual(ids(applyCatalogFilters(items, f({ price: 'hasta-30' }))), ['a'])
  assert.deepEqual(ids(applyCatalogFilters(items, f({ price: 'mas-100' }))), ['e'])
})

test('solo ofertas y envío gratis', () => {
  assert.deepEqual(ids(applyCatalogFilters(items, f({ onlyOffers: true }))), ['b', 'e'])
  assert.deepEqual(ids(applyCatalogFilters(items, f({ freeShipping: true }))), ['c'])
})

test('orden por descuento y por precio', () => {
  assert.deepEqual(ids(applyCatalogFilters(items, f({ sort: 'descuento' }))), ['e', 'b', 'a', 'c'])
  assert.deepEqual(ids(applyCatalogFilters(items, f({ sort: 'menor-precio' }))), ['a', 'b', 'c', 'e'])
})

test('búsqueda: sin coincidencia no hay resultados, con coincidencia va primero el nombre', () => {
  assert.equal(applyCatalogFilters(items, f({ query: 'cafetera' })).length, 0)
  assert.deepEqual(ids(applyCatalogFilters(items, f({ query: 'licuadora' }))), ['c'])
})

test('listado limpio y conteo de filtros del panel', () => {
  assert.equal(isCleanListing(f({})), true)
  assert.equal(isCleanListing(f({ sort: 'menor-precio' })), false)
  assert.equal(panelFilterCount(f({ onlyOffers: true, price: '30-60', tags: new Set(['x']) })), 3)
})
