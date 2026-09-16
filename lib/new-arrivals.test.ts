// El fallo que esto impide es el de la sección anterior: llamar "recién
// llegados" a productos de hace meses porque se cortaban los N primeros en vez
// de mirar la fecha.

import assert from 'node:assert/strict'
import test from 'node:test'
import { bestColumns, newestCreatedAt, recentProductIds, NEW_ARRIVALS_WINDOW_DAYS } from './new-arrivals.ts'

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

test('solo entran los de la ventana', () => {
  const ids = recentProductIds(catalog, 7, NOW)
  assert.deepEqual([...ids].sort(), ['ayer', 'hace6', 'hoy'])
})

test('lo viejo queda fuera aunque sea lo primero del catálogo', () => {
  // El orden del catálogo es `_createdAt desc`, pero un catálogo estancado pone
  // cosas viejas arriba. Cortar los N primeros las habría llamado "nuevas".
  const estancado = [
    { _id: 'viejo1', _createdAt: daysAgo(200) },
    { _id: 'viejo2', _createdAt: daysAgo(300) },
  ]
  assert.equal(recentProductIds(estancado, 7, NOW).size, 0)
})

test('un producto sin fecha nunca cuenta como nuevo', () => {
  assert.equal(recentProductIds([{ _id: 'x' }], 7, NOW).size, 0)
})

test('una fecha corrupta no revienta ni cuela', () => {
  assert.equal(recentProductIds([{ _id: 'x', _createdAt: 'no-es-fecha' }], 7, NOW).size, 0)
})

test('el borde de la ventana no incluye el límite exacto', () => {
  const justo = [{ _id: 'limite', _createdAt: new Date(NOW - 7 * 86_400_000).toISOString() }]
  assert.equal(recentProductIds(justo, 7, NOW).size, 0)
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

test('la ventana por defecto es de una semana', () => {
  assert.equal(NEW_ARRIVALS_WINDOW_DAYS, 7)
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
