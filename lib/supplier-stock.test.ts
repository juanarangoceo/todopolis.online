import test from 'node:test'
import assert from 'node:assert/strict'
import { changedFields, isSoldOut, mergeVariants } from './supplier-stock.ts'

test('agotado solo con dato del proveedor; sin dato se vende', () => {
  assert.equal(isSoldOut({ mastershopId: 1 }), false)
  assert.equal(isSoldOut({ mastershopId: 1, mastershopStock: 0 }), true)
  assert.equal(isSoldOut({ mastershopId: 1, mastershopStock: 5, mastershopAvailable: false }), true)
  assert.equal(isSoldOut({ dropiId: 2, dropiStock: 0 }), true)
  assert.equal(isSoldOut({ dropiId: 2, dropiStock: 3 }), false)
  assert.equal(isSoldOut({}), false)
})

test('las variantes se actualizan sin perder nombre ni _key, y las retiradas se apagan', () => {
  const merged = mergeVariants(
    [{ _key: 'a', idVariant: 1, name: 'XS/NEGRO', price: 37000, stock: 100, isEnable: true }, { _key: 'b', idVariant: 2, name: 'S/NEGRO', stock: 100, isEnable: true }],
    [{ _key: 'nuevo', idVariant: 1, name: 'xs/negro', price: 39000, stock: 4, isEnable: true }, { _key: 'c', idVariant: 3, name: 'M/NEGRO', stock: 7, isEnable: true }],
  )
  assert.deepEqual(merged[0], { _key: 'a', idVariant: 1, name: 'XS/NEGRO', price: 39000, stock: 4, isEnable: true })
  assert.equal(merged[1].isEnable, false)
  assert.equal(merged[1].stock, 0)
  assert.equal(merged[2].idVariant, 3)
})

test('no se escribe nada si nada cambió', () => {
  assert.equal(changedFields({ mastershopStock: 4, mastershopCost: 1 }, { mastershopStock: 4, mastershopCost: 1 }), null)
  assert.deepEqual(changedFields({ mastershopStock: 4 }, { mastershopStock: 0 }), { mastershopStock: 0 })
})
