import test from 'node:test'
import assert from 'node:assert/strict'
import { createEditorialModel, EDITORIAL_MODEL } from './gemini.ts'
import { PRODUCT_CONTENT_SCHEMA, validateProductContent } from './product-contract.ts'
import type { Usage, UsageSink } from './pricing.ts'

const input = { contents: [{ role: 'user', parts: [{ text: 'Datos del producto' }] }] }
function reply(text: string, finishReason = 'STOP') {
  return Response.json({ candidates: [{ finishReason, content: { parts: [{ text: 'razonamiento privado', thought: true }, { text }] } }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, thoughtsTokenCount: 5 } })
}

test('usa clave en cabecera, JSON, límite de salida y modelo explícito; excluye pensamientos', async () => {
  const rows: { usage: Usage; model?: string; ok?: boolean }[] = []
  const onUsage: UsageSink = (_source, usage, extra) => rows.push({ usage, ...extra })
  const model = createEditorialModel({ apiKey: 'secret', source: 'product_copy', onUsage, fetcher: async (url, init) => {
    assert.ok(String(url).includes(EDITORIAL_MODEL))
    assert.ok(!String(url).includes('secret'))
    assert.equal(new Headers(init?.headers).get('x-goog-api-key'), 'secret')
    const body = JSON.parse(String(init?.body))
    assert.equal(body.generationConfig.responseMimeType, 'application/json')
    assert.equal(body.generationConfig.maxOutputTokens, 16384)
    assert.ok(body.systemInstruction.parts[0].text.includes('No inventes'))
    return reply('{"name":"Cafetera"}')
  } })
  const result = await model.generateContent(input)
  assert.equal(result.response.text(), '{"name":"Cafetera"}')
  assert.equal(rows.length, 1)
  assert.equal(rows[0].usage.thoughtsTokens, 5)
  assert.equal(rows[0].model, EDITORIAL_MODEL)
  assert.equal(rows[0].ok, true)
})

test('rechaza JSON inválido, null, arrays y salida truncada; conserva el consumo fallido', async () => {
  for (const [text, finishReason] of [['{mal', 'STOP'], ['null', 'STOP'], ['[]', 'STOP'], ['{}', 'MAX_TOKENS']]) {
    let failed = false
    const model = createEditorialModel({ apiKey: 'key', source: 'product_copy', fetcher: async () => reply(text, finishReason), onUsage: (_s, usage, extra) => { failed = extra?.ok === false && usage.outputTokens === 20 } })
    await assert.rejects(model.generateContent(input))
    assert.equal(failed, true)
  }
})

test('reintenta una respuesta 503 una sola vez y respeta Retry-After largo', async () => {
  let calls = 0
  const model = createEditorialModel({ apiKey: 'key', source: 'copy', fetcher: async () => ++calls === 1 ? new Response('', { status: 503, headers: { 'retry-after': '0' } }) : reply('{}') })
  await model.generateContent(input)
  assert.equal(calls, 2)
  calls = 0
  const limited = createEditorialModel({ apiKey: 'key', source: 'copy', fetcher: async () => { calls++; return new Response('secret upstream details', { status: 429, headers: { 'retry-after': '90' } }) } })
  await assert.rejects(limited.generateContent(input), /límite de uso/)
  assert.equal(calls, 1)
})

test('no reintenta errores de credenciales ni transportes ambiguos; no filtra secretos', async () => {
  for (const mode of ['http', 'network']) {
    let calls = 0
    const model = createEditorialModel({ apiKey: 'secret', source: 'copy', fetcher: async () => {
      calls++
      if (mode === 'network') throw new Error('secret')
      return new Response('secret', { status: 403 })
    } })
    await assert.rejects(model.generateContent(input), (error: Error) => !error.message.includes('secret'))
    assert.equal(calls, 1)
  }
})

test('guion de voz admite texto libre sin exigir JSON', async () => {
  const model = createEditorialModel({ apiKey: 'key', source: 'voice_prompt', format: 'text', fetcher: async (_url, init) => {
    assert.equal(JSON.parse(String(init?.body)).generationConfig.responseMimeType, undefined)
    return reply('Hola, soy Lucy.')
  } })
  assert.equal((await model.generateContent(input)).response.text(), 'Hola, soy Lucy.')
})

test('contrato de ficha rechaza estructuras peligrosas y permite especificaciones desconocidas vacías', () => {
  assert.throws(() => validateProductContent({ improvedName: 'Producto' }))
  const value: Record<string, unknown> = {
    improvedName: 'Organizador', improvedDescription: 'Descripción', heroTitle: 'Ordena tu escritorio', heroSubtitle: 'Subtítulo', heroCta: 'Comprar ahora', ctaHeadline: 'Titular', ctaText: 'Texto',
    benefits: [], specifications: [], testimonials: [], faqs: [],
    campaignStory: { eyebrow: '', problemTitle: '', problemText: '', turningPointTitle: '', turningPointText: '', outcomeTitle: '', outcomeText: '' },
    audienceFit: { forWho: [], notFor: [] },
  }
  validateProductContent(value)
  assert.throws(() => validateProductContent({ ...value, benefits: ['texto sin estructura'] }))
  assert.throws(() => validateProductContent({ ...value, campaignStory: null }))
  assert.equal(PRODUCT_CONTENT_SCHEMA.additionalProperties, false)
})

test('la validación de ficha ocurre antes de aceptar la generación y marca el intento fallido', async () => {
  let ok: boolean | undefined
  const model = createEditorialModel({ apiKey: 'key', source: 'copy', responseJsonSchema: PRODUCT_CONTENT_SCHEMA, validate: validateProductContent, fetcher: async () => reply('{}'), onUsage: (_s, _u, extra) => { ok = extra?.ok } })
  await assert.rejects(model.generateContent(input), /incompleta/)
  assert.equal(ok, false)
})
