// Los fallos que esto impide: un informe que valora el pasado con la tarifa de
// hoy, el thinking cobrado como entrada, o la caché cobrada dos veces.

import assert from 'node:assert/strict'
import test from 'node:test'
import { AI_MODELS, COST_SOURCES, ESTIMATED_PROFILES, PRODUCT_RECIPES, costUsd, rateFor } from './pricing.ts'

const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`)

test('Gemini 3.8 sube el 1-ene-2027, en hora Colombia', () => {
  assert.equal(rateFor('gemini-3.8-flash', new Date('2026-12-31T23:00:00-05:00'))!.input, 0.75 / 1e6)
  assert.equal(rateFor('gemini-3.8-flash', new Date('2027-01-01T00:30:00-05:00'))!.input, 1.5 / 1e6)
})

test('el thinking se cobra como salida y la caché no se cobra dos veces', () => {
  const d = new Date('2026-09-23T12:00:00-05:00')
  close(costUsd({ inputTokens: 1_000_000, cachedTokens: 400_000, outputTokens: 100_000, thoughtsTokens: 100_000 }, 'gemini-3.8-flash', d),
    600_000 * 0.75e-6 + 400_000 * 0.075e-6 + 200_000 * 3.75e-6)
})

test('GPT Image cobra imagen de entrada aparte', () => {
  close(costUsd({ inputTokens: 1000, imageInputTokens: 1000, outputTokens: 1000 }, 'gpt-image-2'), 1000 * (5 + 8 + 30) / 1e6)
})

test('JEV solo cobra entrada', () => {
  close(costUsd({ inputTokens: 1_000_000, outputTokens: 1_000_000 }, 'typesafe-ai/jev'), 0.042)
})

test('modelo desconocido vale 0, no revienta', () => {
  assert.equal(costUsd({ inputTokens: 10 }, 'no-existe'), 0)
})

test('todo lo que se registra tiene modelo con tarifa y, si se mide, un perfil estimado', () => {
  for (const [key, src] of Object.entries(COST_SOURCES)) {
    assert.ok(AI_MODELS[src.model], `${key} usa ${src.model} sin tarifa`)
    if (!src.unmeasured) assert.ok(ESTIMATED_PROFILES[key], `${key} sin perfil estimado`)
  }
  for (const r of PRODUCT_RECIPES) for (const s of r.steps) assert.ok(COST_SOURCES[s.source], s.source)
})
