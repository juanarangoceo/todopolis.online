import assert from 'node:assert/strict'
import test from 'node:test'
import { stylePickIds } from './style-picks.ts'

const NOW = Date.parse('2026-09-24T12:00:00Z')
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString()

const catalog = [
  { _id: 'blusa', category: 'moda', _createdAt: daysAgo(1) },
  { _id: 'cafetera', category: 'cocina', _createdAt: daysAgo(0) },
  { _id: 'bolso', category: 'accesorios', _createdAt: daysAgo(3) },
  { _id: 'tenis', category: 'moda', _createdAt: daysAgo(2) },
  { _id: 'gafas', category: 'accesorios', _createdAt: daysAgo(40) },
  { _id: 'sinFecha', category: 'moda' },
  { _id: 'faja', category: 'fajas', _createdAt: daysAgo(5) },
  { _id: 'set', category: 'bienestar-intimo', _createdAt: daysAgo(0) },
]

test('solo el grupo de moda, del más nuevo al más viejo', () => {
  assert.deepEqual(stylePickIds(catalog), ['blusa', 'tenis', 'bolso', 'faja', 'gafas'])
})

test('la lencería nunca: pasa por aviso de edad', () => {
  assert.ok(!stylePickIds(catalog).includes('set'))
})

test('no repite lo que ya sale en Novedades', () => {
  assert.deepEqual(stylePickIds(catalog, new Set(['blusa'])), ['tenis', 'bolso', 'faja', 'gafas'])
})

test('respeta el cupo', () => {
  assert.deepEqual(stylePickIds(catalog, new Set(), 2), ['blusa', 'tenis'])
})

test('sin fecha no entra: no se puede ordenar', () => {
  assert.ok(!stylePickIds(catalog).includes('sinFecha'))
})
