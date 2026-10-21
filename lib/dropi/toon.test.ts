import test from 'node:test'
import assert from 'node:assert/strict'
import { decodeToon } from './toon.ts'

// Respuesta real de list_products (21-oct-2026), recortada.
const SAMPLE = `items[2]:
  - id: 1894181
    sku: ROMA-2079
    name: AMBEROUD+TONKA+BHARARAESTUCHE+PERFUMERO
    sale_price: 152000
    visible_start_sale_price: null
    stock: 98
    categories[3]: Moda,Belleza,Sex Shop
    gallery[1]{urlS3}:
      "https://d39ru7awumhhs2.cloudfront.net/colombia/products/1894181/1754517196NUEVOS%20DISEÑOS%20(77).jpg"
    variations[0]:
  - id: 2233738
    sku: null
    name: COBIJA NAVIDEÑA PIEL DE CONEJO
    stock: 0
    variations[2]:
      - id: 2366122
        sku: null-5
        stock: 987
        attributes[1]{name,value}:
          DISEÑOS,SANTA AZUL
      - id: 2366123
        attributes[2]{name,value}:
          TALLA,M
          COLOR,"ROJO, OSCURO"
count: 2`

test('decodifica la respuesta real de list_products', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- se recorre la forma decodificada
  const d = decodeToon(SAMPLE) as any
  assert.equal(d.count, 2)
  assert.equal(d.items.length, 2)
  const [simple, variable] = d.items
  assert.equal(simple.sku, 'ROMA-2079')
  assert.equal(simple.visible_start_sale_price, null)
  assert.deepEqual(simple.categories, ['Moda', 'Belleza', 'Sex Shop'])
  assert.equal(simple.gallery[0].urlS3.endsWith('(77).jpg'), true)
  assert.deepEqual(simple.variations, [])
  assert.equal(variable.sku, null)
  assert.equal(variable.variations[0].sku, 'null-5')
  assert.deepEqual(variable.variations[0].attributes, [{ name: 'DISEÑOS', value: 'SANTA AZUL' }])
  assert.deepEqual(variable.variations[1].attributes[1], { name: 'COLOR', value: 'ROJO, OSCURO' })
})

test('objetos anidados, delimitador barra y arreglo en la raíz', () => {
  assert.deepEqual(decodeToon('a:\n  b: 1\n  c[2|]: x|"y|z"'), { a: { b: 1, c: ['x', 'y|z'] } })
  assert.deepEqual(decodeToon('[2]: 1,2'), [1, 2])
})

test('una cuenta que no coincide es un error, no datos a medias', () => {
  assert.throws(() => decodeToon('items[3]:\n  - 1\n  - 2'))
})
