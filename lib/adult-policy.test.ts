import assert from 'node:assert/strict'
import test from 'node:test'
import { isAllowedAdultProduct } from './adult-policy.ts'

// Nombres reales del catálogo al 24-sep-2026.
const LENCERIA = [
  'Conjunto Íntimo Dos Piezas', 'Panty Íntimo Obsession', 'Set Íntimo Vega Negro',
  'Vestido Íntimo de Encaje', 'Body Temático Esqueleto Una Pieza', 'Tanga Íntima Metalizada',
  'Conjunto Íntimo Marie Negro', 'Set Íntimo Tres Piezas',
]
const JUGUETES = [
  'Masajeador Íntimo Dave — Edición Natural', 'Masajeador Íntimo Abel 7 Pulgadas',
  'Kit de Bienestar Íntimo Premium 1', 'Masajeador Vibratorio Splashrod Inalámbrico 8.8',
  'Cable de Carga para Masajeador Inalámbrico Domi', 'Masajeador Íntimo Realista Ballsy',
]

test('la lencería entra', () => {
  for (const name of LENCERIA) assert.equal(isAllowedAdultProduct(name), true, name)
})

test('los juguetes no entran', () => {
  for (const name of JUGUETES) assert.equal(isAllowedAdultProduct(name), false, name)
})

test('en duda, no entra', () => {
  assert.equal(isAllowedAdultProduct('Producto Íntimo Especial'), false)
})

test('una prenda que en la descripción habla de un juguete no entra', () => {
  assert.equal(isAllowedAdultProduct('Set Íntimo Rojo', 'Incluye bala vibradora de regalo'), false)
})
