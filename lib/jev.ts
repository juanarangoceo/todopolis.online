// JEV (TypeSafe AI) por Vercel AI Gateway: lo común a sus tres usos en
// Todopolis — categoría (`category-classifier.ts`), etiquetas (`auto-tag.ts`)
// y sugerencias del buscador (`app/api/search-suggest`).
//
// JEV no redacta: responde preguntas de opción múltiple, de puntaje o de sí/no
// sobre un estado, con su probabilidad. Mismo modelo que usa nitro_bot para la
// etapa comercial. Siempre con `zeroDataRetention`.

export const JEV_MODEL = 'typesafe-ai/jev'

/** ¿Hay con qué autenticarse en AI Gateway? Mismo criterio que nitro_bot. */
export function jevConfigured(): boolean {
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
