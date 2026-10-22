import assert from 'node:assert/strict'
import test from 'node:test'
import { evaluateJev, jevConfigured, TYPESAFE_API_URL, TYPESAFE_JEV_MODEL } from './jev.ts'

// Con TYPESAFE_API_KEY, JEV va directo a TypeSafe y la respuesta vuelve con la
// misma forma que el `evaluate` del Gateway: los tres usos no cambian.
const question = { category: { type: 'choice', instructions: 'x', criteria: { cocina: 'a', hogar: 'b' } } }

function withKey(fetchImpl: typeof fetch, run: () => Promise<void>) {
  return async () => {
    const original = { fetch: globalThis.fetch, key: process.env.TYPESAFE_API_KEY }
    globalThis.fetch = fetchImpl
    process.env.TYPESAFE_API_KEY = 'llave-de-prueba'
    try { await run() } finally {
      globalThis.fetch = original.fetch
      if (original.key === undefined) delete process.env.TYPESAFE_API_KEY
      else process.env.TYPESAFE_API_KEY = original.key
    }
  }
}

test('con llave directa: manda modelo, estado y preguntas, y traduce la respuesta', withKey((async (url: string, init: RequestInit) => {
  assert.equal(url, TYPESAFE_API_URL)
  assert.equal((init.headers as Record<string, string>).Authorization, 'Bearer llave-de-prueba')
  const body = JSON.parse(init.body as string)
  assert.equal(body.model, TYPESAFE_JEV_MODEL)
  assert.deepEqual(body.state, { producto: 'Olla' })
  return new Response(JSON.stringify({
    answers: { category: { type: 'choice', choice: 'cocina', probabilities: { cocina: 0.9, hogar: 0.1 }, confidence: 0.88 } },
    usage: { input_tokens: 120, output_tokens: 3 },
  }))
}) as never, async () => {
  assert.ok(jevConfigured())
  const r = await evaluateJev({ model: 'typesafe-ai/jev', state: { producto: 'Olla' }, questions: question } as never)
  assert.equal((r.answers as Record<string, { choice: string }>).category.choice, 'cocina')
  assert.deepEqual(r.usage, { inputTokens: 120, outputTokens: 3 })
  assert.deepEqual(r.providerMetadata?.typesafe?.confidence, { category: 0.88 })
}))

test('reintenta un 5xx y no reintenta un 401', withKey((() => {
  let calls = 0
  return (async () => {
    calls++
    if (calls === 1) return new Response('ocupado', { status: 503 })
    if (calls === 2) return new Response(JSON.stringify({ answers: {} }))
    return new Response('no', { status: 401 })
  }) as never
})(), async () => {
  const ok = await evaluateJev({ model: 'typesafe-ai/jev', state: {}, questions: question, maxRetries: 1 } as never)
  assert.deepEqual(ok.answers, {})
  await assert.rejects(evaluateJev({ model: 'typesafe-ai/jev', state: {}, questions: question, maxRetries: 3 } as never), /HTTP 401/)
}))
