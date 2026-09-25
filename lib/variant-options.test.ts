import assert from 'node:assert/strict'
import test from 'node:test'
import { isValueAvailable, normalizeSize, pick, variantOptions, type Picks } from './variant-options.ts'

let id = 0
const v = (name: string, stock = 5) => ({ idVariant: ++id, name, stock })

// Forma real de una faja del catálogo: tallas en minúsculas mezcladas y desorden.
const faja = [
  v('M/Beige'), v('2xl/Cocoa'), v('Xl/Cocoa'), v('L/Cocoa'), v('M/Cocoa'), v('S/Cocoa'),
  v('Xs/Cocoa'), v('2xl/Beige'), v('Xl/Beige'), v('L/Beige'), v('S/Beige'), v('Xs/Beige'),
  v('2xl/Negro'), v('Xl/Negro'), v('L/Negro'), v('M/Negro', 0), v('S/Negro'), v('Xs/Negro'),
]

test('normaliza tallas y reconoce lo que no es talla', () => {
  assert.equal(normalizeSize('2xl'), '2XL')
  assert.equal(normalizeSize('XXL'), '2XL')
  assert.equal(normalizeSize(' xs '), 'XS')
  assert.equal(normalizeSize('38'), '38')
  assert.equal(normalizeSize('Talla única'), 'Única')
  assert.equal(normalizeSize('NEGRO'), null)
  assert.equal(normalizeSize('500ml'), null)
})

test('parte «talla/color» en dos ejes con las tallas en orden', () => {
  const o = variantOptions(faja)
  assert.equal(o.mode, 'split')
  if (o.mode !== 'split') return
  assert.deepEqual(o.axes[0].values.map((x) => x.label), ['XS', 'S', 'M', 'L', 'XL', '2XL'])
  assert.deepEqual(o.axes[1].values.map((x) => x.label), ['Beige', 'Cocoa', 'Negro'])
})

test('limpia colores en mayúsculas y reconoce la talla en el segundo lado', () => {
  const o = variantOptions([v('MORADO UVA/S'), v('NEGRO/S'), v('MORADO UVA/M'), v('NEGRO/M')])
  assert.equal(o.mode, 'split')
  if (o.mode !== 'split') return
  assert.deepEqual(o.axes[0].values.map((x) => x.label), ['S', 'M'])
  assert.deepEqual(o.axes[1].values.map((x) => x.label), ['Morado uva', 'Negro'])
})

test('lista única si no se puede partir con seguridad', () => {
  assert.equal(variantOptions([v('Rojo'), v('Azul')]).mode, 'single')
  // Un nombre sin barra basta para no partir.
  assert.equal(variantOptions([v('S/Negro'), v('M/Negro'), v('Rojo')]).mode, 'single')
  // Ningún lado es talla.
  assert.equal(variantOptions([v('Rojo/Grande'), v('Azul/Pequeño')]).mode, 'single')
  // Un solo color: no hay nada que partir.
  assert.equal(variantOptions([v('S/Negro'), v('M/Negro')]).mode, 'single')
})

test('la lista única de tallas sale ordenada', () => {
  const o = variantOptions([v('XL'), v('s'), v('M')])
  assert.equal(o.mode, 'single')
  if (o.mode !== 'single') return
  assert.deepEqual(o.values.map((x) => x.label), ['S', 'M', 'XL'])
})

test('una combinación agotada apaga el color en esa talla, no en todas', () => {
  const o = variantOptions(faja)
  if (o.mode !== 'split') throw new Error('esperaba split')
  const none: Picks = [null, null]
  assert.equal(isValueAvailable(o, 1, 'NEGRO', ['M', null]), false)
  assert.equal(isValueAvailable(o, 1, 'NEGRO', ['L', null]), true)
  assert.equal(isValueAvailable(o, 1, 'NEGRO', none), true)
  assert.equal(isValueAvailable(o, 0, 'M', none), true)
})

test('elegir los dos ejes devuelve la variante REAL de Mastershop', () => {
  const o = variantOptions(faja)
  if (o.mode !== 'split') throw new Error('esperaba split')
  const a = pick(o, [null, null], 0, '2XL')
  assert.equal(a.variant, null)
  const b = pick(o, a.picks, 1, 'COCOA')
  assert.equal(b.variant?.name, '2xl/Cocoa')
})

test('cambiar a una talla sin ese color suelta el color', () => {
  const o = variantOptions(faja)
  if (o.mode !== 'split') throw new Error('esperaba split')
  const r = pick(o, ['L', 'NEGRO'], 0, 'M') // M/Negro está agotada
  assert.deepEqual(r.picks, ['M', null])
  assert.equal(r.variant, null)
})

test('tamaño de cama y color también se parten', () => {
  const o = variantOptions([v('Queen/Azul'), v('Sencillo/Azul'), v('Queen/Negro'), v('Sencillo/Negro')])
  assert.equal(o.mode, 'split')
  if (o.mode !== 'split') return
  assert.equal(o.axes[0].label, 'Tamaño')
  assert.deepEqual(o.axes[0].values.map((x) => x.label), ['Sencillo', 'Queen'])
})

test('la barra dentro de un paréntesis no parte, y el lado fijo se omite', () => {
  const o = variantOptions([v('Unica (8/10/12/14)/Verde'), v('Negro/Unica (8/10/12/14)')])
  assert.equal(o.mode, 'single')
  if (o.mode !== 'single') return
  assert.deepEqual(o.values.map((x) => x.label), ['Verde', 'Negro'])
})
