import assert from 'node:assert/strict'
import test from 'node:test'
import { AUTO_LOAD_LIMIT, listSignature, railAfterIndex, remaining, shouldAutoLoad } from './catalog-paging.ts'

test('carga sola hasta el límite y después pide el botón', () => {
  assert.equal(shouldAutoLoad(24, 560), true)
  assert.equal(shouldAutoLoad(AUTO_LOAD_LIMIT, 560), false)
  assert.equal(shouldAutoLoad(72, 560), false)
})

test('no carga más de lo que hay', () => {
  assert.equal(shouldAutoLoad(30, 30), false)
  assert.equal(remaining(48, 30), 0)
  assert.equal(remaining(48, 557), 509)
})

test('solo dos carriles: tras el 16 y tras el 48', () => {
  const rails = []
  for (let i = 0; i < 560; i++) if (railAfterIndex(i, 560) !== null) rails.push(i + 1)
  assert.deepEqual(rails, [16, 48])
})

test('un carril no queda colgando al final de lo cargado', () => {
  assert.equal(railAfterIndex(15, 16), null)
  assert.equal(railAfterIndex(15, 24), 0)
  assert.equal(railAfterIndex(47, 48), null)
  assert.equal(railAfterIndex(47, 72), 1)
})

test('la firma cambia si cambia la lista', () => {
  assert.equal(listSignature(['a', 'b', 'c', 'd']), listSignature(['a', 'b', 'c', 'd']))
  assert.notEqual(listSignature(['a', 'b', 'c', 'd']), listSignature(['a', 'b', 'c']))
  assert.notEqual(listSignature(['a', 'b', 'c', 'd']), listSignature(['b', 'a', 'c', 'd']))
})
