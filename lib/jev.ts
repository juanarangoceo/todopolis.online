// JEV (TypeSafe AI): lo común a sus tres usos en Todopolis — categoría
// (`category-classifier.ts`), etiquetas (`auto-tag.ts`) y sugerencias del
// buscador (`app/api/search-suggest`).
//
// JEV no redacta: responde preguntas de opción múltiple, de puntaje o de sí/no
// sobre un estado, con su probabilidad. Mismo modelo que usa nitro_bot para la
// etapa comercial.
//
// DOS CAMINOS (22-oct-2026, como nitro_bot desde el 29-sep): con
// `TYPESAFE_API_KEY` va DIRECTO a la API de TypeSafe; sin ella, por Vercel AI
// Gateway. El Gateway exige créditos pagados para JEV y respondía «Free tier
// users do not have access to this model» a todas las llamadas, así que todo
// caía a Gemini sin que se notara. Privacidad: por el Gateway viaja con zero
// data retention; directo aplica el DPA de TypeSafe (encargado, sin
// entrenamiento). Aquí solo viajan nombres y descripciones de productos y
// búsquedas sueltas, nunca datos de un comprador.

import { experimental_evaluate as evaluate } from 'ai'

export const JEV_MODEL = 'typesafe-ai/jev'

export const TYPESAFE_API_URL = 'https://api.typesafe.ai/v1/systemone'
export const TYPESAFE_JEV_MODEL = 'jev-latest'

/** ¿Hay con qué llamar a JEV: llave directa o AI Gateway? Mismo criterio que nitro_bot. */
export function jevConfigured(): boolean {
  if (process.env.TYPESAFE_API_KEY?.trim()) return true
  if (process.env.AI_GATEWAY_API_KEY?.trim()) return true
  if (process.env.VERCEL_ENV) return true // En Vercel, OIDC sin clave estática.
  const token = process.env.VERCEL_OIDC_TOKEN
  if (!token) return false
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()) as { exp?: number }
    return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now() + 60_000
  } catch {
    return false
  }
}

/** Las claves de pregunta van sin guiones: `alivio-dolor` → `alivio_dolor`. */
export const questionKey = (slug: string) => slug.replace(/[^a-zA-Z0-9_]/g, '_')

const retryable = (status: number) => status === 429 || status === 529 || status >= 500

/**
 * Llamada directa a TypeSafe, devuelta con la MISMA forma que lee el código del
 * `evaluate` del paquete `ai` (`answers`, `usage`, `providerMetadata.typesafe.
 * confidence`). Así los tres usos no saben por qué camino fue la pregunta.
 */
async function evaluateDirect(params: Parameters<typeof evaluate>[0], apiKey: string) {
  const attempts = 1 + Math.max(0, params.maxRetries ?? 0)
  let lastError: Error = new Error('JEV directo: sin respuesta')
  for (let attempt = 0; attempt < attempts; attempt++) {
    let res: Response
    try {
      res = await fetch(TYPESAFE_API_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: TYPESAFE_JEV_MODEL, state: params.state, questions: params.questions }),
        signal: params.abortSignal,
      })
    } catch (err) {
      // Un timeout del llamador no se reintenta: ya se acabó su presupuesto.
      if (params.abortSignal?.aborted) throw err
      lastError = err as Error
      continue
    }
    if (!res.ok) {
      await res.body?.cancel()
      lastError = new Error(`JEV directo HTTP ${res.status}`)
      if (retryable(res.status)) continue
      throw lastError
    }
    const body = (await res.json()) as {
      answers?: Record<string, Record<string, unknown>>
      usage?: { input_tokens?: number; output_tokens?: number }
    }
    const answers = body.answers ?? {}
    const confidence: Record<string, unknown> = {}
    for (const [key, answer] of Object.entries(answers)) {
      if (typeof answer?.confidence === 'number') confidence[key] = answer.confidence
    }
    return {
      answers,
      usage: { inputTokens: body.usage?.input_tokens, outputTokens: body.usage?.output_tokens },
      providerMetadata: { typesafe: { confidence } },
    }
  }
  throw lastError
}

/**
 * Pregunta a JEV por el camino disponible. Lleva la firma de `evaluate` para que
 * los tests sigan inyectando un `evaluateFn` falso igual que antes; del
 * resultado solo se leen `answers`, `usage` y `providerMetadata`.
 */
export const evaluateJev = (async (params: Parameters<typeof evaluate>[0]) => {
  const apiKey = process.env.TYPESAFE_API_KEY?.trim()
  return apiKey ? evaluateDirect(params, apiKey) : evaluate(params)
}) as typeof evaluate
