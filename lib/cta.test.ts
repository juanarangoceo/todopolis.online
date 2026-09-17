// El fallo que esto impide es silencioso: un botón que dice "Ver mi pedido" o
// que se parte en dos renglones no rompe la página, solo vende menos.

import assert from 'node:assert/strict'
import test from 'node:test'
import { sanitizeHeroCta, DEFAULT_CTA, MAX_CTA_LENGTH } from './cta.ts'

test('un CTA bueno se respeta tal cual', () => {
  assert.equal(sanitizeHeroCta('Lo quiero ya'), 'Lo quiero ya')
  assert.equal(sanitizeHeroCta('Pídelo hoy'), 'Pídelo hoy')
  assert.equal(sanitizeHeroCta('¡LO QUIERO!'), '¡LO QUIERO!')
})

test('los verbos de exploración caen al de compra', () => {
  // "Ver mi pedido" es el más repetido del catálogo: 151 productos.
  for (const malo of ['Ver mi pedido', 'Ver mi estilo', 'Descubrir más', 'Conocer producto', 'Saber más', 'Explorar ahora', 'Mira esto']) {
    assert.equal(sanitizeHeroCta(malo), DEFAULT_CTA, malo)
  }
})

test('el medio de pago se arranca y se conserva el verbo', () => {
  // Con pago protegido encendido el botón no puede casarse con la contraentrega.
  assert.equal(sanitizeHeroCta('Comprar ahora contraentrega'), 'Comprar ahora')
  assert.equal(sanitizeHeroCta('Comprar contra entrega ahora'), 'Comprar ahora')
  assert.equal(sanitizeHeroCta('Pedir contraentrega hoy'), 'Pedir hoy')
  assert.equal(sanitizeHeroCta('Pídela hoy contraentrega'), 'Pídela hoy')
})

test('si al quitar el medio de pago no queda verbo, va el de compra', () => {
  assert.equal(sanitizeHeroCta('Contraentrega'), DEFAULT_CTA)
  assert.equal(sanitizeHeroCta('contra entrega'), DEFAULT_CTA)
})

test('lo que no cabe en una línea se reemplaza, no se corta', () => {
  // Cortar a la mitad ("¡Quiero sentirme irres…") es peor que un CTA neutro.
  assert.equal(sanitizeHeroCta('¡Quiero sentirme irresistible hoy!'), DEFAULT_CTA)
  assert.equal(sanitizeHeroCta('QUIERO MI ALMOHADA RELAJANTE'), DEFAULT_CTA)
})

test('el límite exacto pasa y uno más no', () => {
  const justo = 'a'.repeat(MAX_CTA_LENGTH)
  assert.equal(sanitizeHeroCta(justo), justo)
  assert.equal(sanitizeHeroCta('a'.repeat(MAX_CTA_LENGTH + 1)), DEFAULT_CTA)
})

test('vacío, espacios y no-textos caen al de compra', () => {
  for (const v of ['', '   ', null, undefined, 42, {}]) {
    assert.equal(sanitizeHeroCta(v), DEFAULT_CTA)
  }
})

test('los espacios de sobra no cuentan para el largo', () => {
  assert.equal(sanitizeHeroCta('  Lo   quiero ya  '), 'Lo quiero ya')
})
