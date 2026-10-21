import test from 'node:test'
import assert from 'node:assert/strict'
import { strategicPrice } from './supplier-pricing.ts'

test('margen por tramo y terminación 900', () => {
  assert.equal(strategicPrice(26_000), 44_900) // ×1,7 = 44.200
  assert.equal(strategicPrice(100_000), 150_900) // ×1,5
  assert.equal(strategicPrice(152_000), 197_900) // ×1,3 = 197.600
  assert.equal(strategicPrice(0), 0)
})
