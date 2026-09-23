import assert from 'node:assert/strict'
import test from 'node:test'
import { recipeCosts, summarizeUsage, unitCosts, type UsageRow } from './profit.ts'
import { MIN_MEASURED } from './pricing.ts'

const row = (p: Partial<UsageRow>): UsageRow => ({
  created_at: '2026-09-23T15:00:00Z', source: 'product_copy', model: 'gemini-3.8-flash', flow: null, product_ref: null,
  ok: true, input_tokens: 0, output_tokens: 0, thoughts_tokens: 0, cached_tokens: 0, image_input_tokens: 0,
  units: 1, cost_usd: 0, estimated: false, ...p,
})

test('un import son varias filas con el mismo flow: cuenta como UN producto', () => {
  const rows = [
    row({ flow: 'import:1', source: 'product_category', model: 'typesafe-ai/jev', cost_usd: 0.0001 }),
    row({ flow: 'import:1', source: 'product_copy', cost_usd: '0.02' }),
    row({ flow: 'import:1', source: 'article', cost_usd: 0.01 }),
    row({ flow: 'manual:abc', source: 'product_copy', cost_usd: 0.03 }),
    row({ flow: 'collection:x', source: 'collection', cost_usd: 0.5 }),
  ]
  const s = summarizeUsage(rows)
  assert.equal(s.productsCreated, 2)
  assert.ok(Math.abs(s.avgPerProduct! - (0.0301 + 0.03) / 2) < 1e-9)
  assert.ok(Math.abs(s.total.usd - 0.5601) < 1e-9)
  assert.equal(s.recentFlows.find((f) => f.flow === 'import:1')!.steps.length, 3)
})

test('con pocas muestras usa el estimado; con suficientes, el promedio medido', () => {
  const few = unitCosts([row({ input_tokens: 1_000_000 })]).find((u) => u.source === 'product_copy')!
  assert.equal(few.basis, 'estimado')
  const many = unitCosts(Array.from({ length: MIN_MEASURED }, () => row({ input_tokens: 1_000_000 }))).find((u) => u.source === 'product_copy')!
  assert.equal(many.basis, 'medido')
  assert.ok(Math.abs(many.usd - 0.75) < 1e-9)
  // En 2027 Gemini 3.8 cuesta el doble.
  assert.ok(Math.abs(many.usd2027 - 1.5) < 1e-9)
})

test('las llamadas fallidas no bajan el promedio medido', () => {
  const rows = [...Array.from({ length: MIN_MEASURED }, () => row({ input_tokens: 1_000_000 })), row({ ok: false })]
  assert.ok(Math.abs(unitCosts(rows).find((u) => u.source === 'product_copy')!.usd - 0.75) < 1e-9)
})

test('receta: lo opcional (foto IA) solo entra en «completo»', () => {
  const manual = recipeCosts(unitCosts([])).find((r) => r.key === 'manual')!
  assert.ok(manual.full > manual.base)
  assert.ok(manual.full2027 > manual.full)
})
