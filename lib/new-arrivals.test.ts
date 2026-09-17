// El fallo que esto impide es el de la sección anterior: llamar "recién
// llegados" a productos de hace meses porque se cortaban los N primeros del
// array en vez de mirar la fecha.

import assert from 'node:assert/strict'
import test from 'node:test'
import { bestColumns, newestCreatedAt, newestProductIds, NEW_ARRIVALS_COUNT } from './new-arrivals.ts'

const NOW = Date.parse('2026-09-16T12:00:00Z')
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString()

const catalog = [
  { _id: 'hoy', _createdAt: daysAgo(0) },
  { _id: 'ayer', _createdAt: daysAgo(1) },
  { _id: 'hace6', _createdAt: daysAgo(6) },
  { _id: 'hace8', _createdAt: daysAgo(8) },
  { _id: 'hace90', _createdAt: daysAgo(90) },
  { _id: 'sinFecha' },
]

test('entran los N más recientes, por fecha', () => {
  const ids = newestProductIds(catalog, 3)
  assert.deepEqual([...ids].sort(), ['ayer', 'hace6', 'hoy'])
})

test('el cupo se llena aunque el catálogo esté estancado', () => {
  // Diferencia con la ventana de 7 días que había antes: si no entró nada en la
  // semana, la sección se quedaba vacía. Ahora siempre muestra lo más reciente
  // que haya, y la fecha que se pinta al lado es la que dice la verdad.
  const estancado = [
    { _id: 'viejo1', _createdAt: daysAgo(200) },
    { _id: 'viejo2', _createdAt: daysAgo(300) },
  ]
  assert.deepEqual([...newestProductIds(estancado, 12)].sort(), ['viejo1', 'viejo2'])
})

test('no se fía del orden del array', () => {
  // Si alguien le cambia el `order()` a la query de Sanity, cortar los N
  // primeros volvería a colar productos viejos como novedades.
  const desordenado = [
    { _id: 'viejo', _createdAt: daysAgo(300) },
    { _id: 'nuevo', _createdAt: daysAgo(1) },
    { _id: 'medio', _createdAt: daysAgo(30) },
  ]
  assert.deepEqual([...newestProductIds(desordenado, 2)].sort(), ['medio', 'nuevo'])
})

test('un producto sin fecha nunca ocupa una casilla', () => {
  assert.equal(newestProductIds([{ _id: 'x' }], 12).size, 0)
})

test('una fecha corrupta no revienta ni cuela', () => {
  assert.equal(newestProductIds([{ _id: 'x', _createdAt: 'no-es-fecha' }], 12).size, 0)
})

test('un catálogo más corto que el cupo devuelve lo que hay', () => {
  assert.equal(newestProductIds(catalog, 12).size, 5) // 6 menos el que no tiene fecha
})

test('cupo cero o negativo no devuelve nada', () => {
  assert.equal(newestProductIds(catalog, 0).size, 0)
  assert.equal(newestProductIds(catalog, -3).size, 0)
})

test('newestCreatedAt devuelve la más reciente, no la primera', () => {
  // Desordenado a propósito: no debe fiarse del orden del array.
  const desordenado = [
    { _id: 'a', _createdAt: daysAgo(10) },
    { _id: 'b', _createdAt: daysAgo(1) },
    { _id: 'c', _createdAt: daysAgo(5) },
  ]
  assert.equal(newestCreatedAt(desordenado), daysAgo(1))
  assert.equal(newestCreatedAt([{ _id: 'x' }]), null)
  assert.equal(newestCreatedAt([]), null)
})

test('el cupo por defecto es de 12, que es lo que cabe en la rejilla', () => {
  assert.equal(NEW_ARRIVALS_COUNT, 12)
})

test('las columnas evitan que la última fila quede coja', () => {
  // El caso real de hoy: 6 novedades. Con 4 columnas serían 4 + 2 y dos huecos.
  assert.equal(bestColumns(6), 3) // 2 filas de 3, exactas
  assert.equal(bestColumns(8), 4) // 2 filas de 4
  assert.equal(bestColumns(5), 5) // 1 fila de 5
  assert.equal(bestColumns(12), 4) // 3 filas de 4
  assert.equal(bestColumns(9), 3) // 3 filas de 3
})

test('pocas novedades ocupan una sola fila, sin estirarse', () => {
  for (const n of [1, 2, 3, 4]) assert.equal(bestColumns(n), n)
})

test('una cantidad sin divisor cómodo cae a 4 y no revienta', () => {
  assert.equal(bestColumns(7), 4)
  assert.equal(bestColumns(11), 4)
  assert.equal(bestColumns(0), 1)
})
