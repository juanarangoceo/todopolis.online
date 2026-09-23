// Clasifica un producto con la taxonomía de tags.
//
// Desde el 23-sep-2026 lo hace JEV (lib/jev.ts): una pregunta de sí/no por
// etiqueta, con su probabilidad, en una sola llamada de ~1 s. Gemini queda de
// respaldo si JEV no está configurado o no responde. Antes era solo Gemini,
// con un prompt que llevaba las 80 etiquetas y sus descripciones, y 92
// productos del catálogo quedaron sin ninguna.
//
// Lo usan el import y el sync de Mastershop, el botón del Studio y
// `scripts/retag-products.ts`.
//
// Usa la REST API directa (no el SDK) porque el script batch corre fuera del
// runtime de Next y mantener un solo camino simplifica la mantención.

import { experimental_evaluate as evaluate } from 'ai'
import { JEV_MODEL, jevConfigured, questionKey } from './jev.ts'
import type { UsageSink } from './ai/pricing.ts'

const GEMINI_MODEL = 'gemini-3.8-flash'
const MIN_TAGS = 3
const MAX_TAGS = 6
const TAG_RETRIES = 2

export interface TagDef {
  slug: string
  name: string
  group: string
  description?: string
}

interface ProductInput {
  name: string
  shortDescription?: string
  category?: string
}

function buildPrompt(tags: TagDef[], product: ProductInput): string {
  const grouped = tags.reduce<Record<string, TagDef[]>>((acc, t) => {
    ;(acc[t.group] ??= []).push(t)
    return acc
  }, {})

  const taxonomy = Object.entries(grouped)
    .map(
      ([group, items]) =>
        `## ${group.toUpperCase()}\n` +
        items.map((t) => `- ${t.slug}: ${t.name} — ${t.description ?? ''}`).join('\n'),
    )
    .join('\n\n')

  return `Eres un experto en e-commerce que clasifica productos con etiquetas para una tienda colombiana (Todópolis).

Tu trabajo: leer un producto y devolver entre ${MIN_TAGS} y ${MAX_TAGS} etiquetas (slugs) de la taxonomía siguiente.

REGLAS:
- Devuelve SOLO slugs que existan en la taxonomía. No inventes ninguno.
- Mezcla grupos: idealmente al menos una de "audiencia", una de "beneficio" o "nicho", y una de "atributo" cuando aplique.
- NO uses tags de "ocasion" estacionales (navidad, dia-de-la-madre, dia-del-padre, san-valentin, amor-y-amistad, halloween) salvo que el producto sea literalmente de esa temporada. Esos se asignan manualmente en campaña.
- NO uses tags de "promo" (nuevo, top-ventas, tendencia, oferta, exclusivo, agotandose). Esos se derivan de otros campos.
- Sé conservador: prefiere ${MIN_TAGS}-4 tags muy buenos antes que ${MAX_TAGS} forzados.

TAXONOMÍA:
${taxonomy}

PRODUCTO:
Nombre: ${product.name}
Categoría actual: ${product.category ?? 'sin categoría'}
Descripción: ${product.shortDescription ?? '(sin descripción)'}

Responde ÚNICAMENTE con JSON válido, sin markdown ni texto extra:
{"tags": ["slug1", "slug2", "slug3"]}`
}

// Trae la taxonomía completa desde Sanity (vía REST, sin cliente).
export async function fetchTagTaxonomy(opts: {
  projectId: string
  dataset: string
  apiVersion: string
  token: string
}): Promise<TagDef[]> {
  const q = encodeURIComponent(
    '*[_type=="tag" && defined(slug.current)]{ "slug": slug.current, name, group, description }',
  )
  const url = `https://${opts.projectId}.api.sanity.io/v${opts.apiVersion}/data/query/${opts.dataset}?query=${q}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${opts.token}` },
    // Server-side: cache la taxonomía 1h. Cambios manuales tardan máx 1h en propagarse.
    next: { revalidate: 3600, tags: ['tags'] },
  })
  if (!res.ok) throw new Error(`Sanity tags query: ${res.status} ${await res.text()}`)
  const data = (await res.json()) as { result: TagDef[] }
  return data.result ?? []
}

// Grupos que JEV NO asigna: las ocasiones (Navidad, Día de la Madre…) se ponen a
// mano en campaña y las de promo (nuevo, oferta, top ventas…) se derivan de
// otros campos. Misma regla que el prompt de Gemini.
export const AUTO_TAG_EXCLUDED_GROUPS = new Set(['ocasion', 'promo'])

export const TAG_MIN_PROBABILITY = 0.6
const TAG_FALLBACK_PROBABILITY = 0.5

/**
 * Elige etiquetas a partir de las probabilidades de JEV. Pura.
 * Toma las ≥ 0,6 (máximo 6); si quedan menos de 2, completa con las de 0,5–0,6
 * hasta llegar a 2. Mejor pocas y buenas: una etiqueta de más ensucia los
 * filtros y la venta cruzada.
 */
export function pickTags(probabilities: Record<string, number>): string[] {
  const ranked = Object.entries(probabilities)
    .filter(([, p]) => Number.isFinite(p))
    .sort((a, b) => b[1] - a[1])
  const strong = ranked.filter(([, p]) => p >= TAG_MIN_PROBABILITY).slice(0, MAX_TAGS).map(([s]) => s)
  if (strong.length >= 2) return strong
  const weak = ranked
    .filter(([, p]) => p >= TAG_FALLBACK_PROBABILITY && p < TAG_MIN_PROBABILITY)
    .map(([s]) => s)
  return [...strong, ...weak].slice(0, 2)
}

/** La pregunta para JEV: un sí/no por etiqueta asignable. Pura. */
export function buildTagQuestions(tags: TagDef[]) {
  const assignable = tags.filter((t) => !AUTO_TAG_EXCLUDED_GROUPS.has(t.group))
  const keyToSlug = new Map(assignable.map((t) => [questionKey(t.slug), t.slug]))
  const questions = Object.fromEntries(
    assignable.map((t) => [
      questionKey(t.slug),
      {
        type: 'boolean' as const,
        instructions: `¿Le corresponde a este producto la etiqueta «${t.name}» (${t.group})? ${t.description ?? ''} Responde por lo que el producto ES y para quién es, no por palabras sueltas de la descripción.`.trim(),
      },
    ]),
  )
  return { questions, keyToSlug }
}

/** Etiquetas con JEV. null si JEV no está o falla: el llamador usa Gemini. */
export async function classifyProductTagsJev(
  tags: TagDef[],
  product: ProductInput,
  options: { evaluateFn?: typeof evaluate; timeoutMs?: number; onUsage?: UsageSink } = {},
): Promise<string[] | null> {
  if (!options.evaluateFn && !jevConfigured()) return null
  const { questions, keyToSlug } = buildTagQuestions(tags)
  if (keyToSlug.size === 0) return null
  try {
    const result = await (options.evaluateFn ?? evaluate)({
      model: JEV_MODEL,
      state: {
        producto: product.name.slice(0, 200),
        categoria: product.category ?? '',
        descripcion: (product.shortDescription ?? '').replace(/\s+/g, ' ').trim().slice(0, 1200),
      },
      questions,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(options.timeoutMs ?? 12000),
      providerOptions: { gateway: { zeroDataRetention: true } },
    })
    options.onUsage?.('product_tags', { inputTokens: result.usage?.inputTokens, outputTokens: result.usage?.outputTokens })
    const probabilities: Record<string, number> = {}
    for (const [key, answer] of Object.entries(result.answers as Record<string, { type: string; probability?: number }>)) {
      const slug = keyToSlug.get(key)
      if (slug && answer?.type === 'boolean' && typeof answer.probability === 'number') probabilities[slug] = answer.probability
    }
    const picked = pickTags(probabilities)
    return picked.length > 0 ? picked : null
  } catch (err) {
    console.warn('[auto-tag] JEV falló, se usa Gemini:', (err as Error)?.message ?? err)
    options.onUsage?.('product_tags', {}, { ok: false })
    return null
  }
}

/**
 * Etiquetas para un producto: JEV primero, Gemini si JEV no responde.
 * NO lanza: el auto-tagging es best-effort — un producto sin tags se puede
 * etiquetar después, no debe bloquear el import.
 */
export async function classifyProductTags(
  tags: TagDef[],
  product: ProductInput,
  geminiKey: string,
  options: { onUsage?: UsageSink } = {},
): Promise<string[]> {
  if (tags.length === 0) return []
  const viaJev = await classifyProductTagsJev(tags, product, { onUsage: options.onUsage })
  if (viaJev) return viaJev
  return classifyProductTagsGemini(tags, product, geminiKey, options.onUsage)
}

// Llama Gemini y devuelve slugs válidos. Si falla todos los reintentos, devuelve [].
export async function classifyProductTagsGemini(
  tags: TagDef[],
  product: ProductInput,
  geminiKey: string,
  onUsage?: UsageSink,
): Promise<string[]> {
  if (tags.length === 0) return []

  const validSlugs = new Set(tags.map((t) => t.slug))
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiKey}`

  for (let attempt = 1; attempt <= TAG_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: buildPrompt(tags, product) }] }],
          generationConfig: { temperature: 0.3 },
        }),
      })

      if (!res.ok) throw new Error(`Gemini ${res.status}`)
      const data = await res.json()
      const um = data?.usageMetadata ?? {}
      onUsage?.('product_tags_fallback', {
        inputTokens: um.promptTokenCount,
        outputTokens: um.candidatesTokenCount,
        thoughtsTokens: um.thoughtsTokenCount,
        cachedTokens: um.cachedContentTokenCount,
      })

      const parts = data?.candidates?.[0]?.content?.parts ?? []
      const rawText = parts
        .filter((p: any) => !p.thought && typeof p.text === 'string' && p.text.trim())
        .map((p: any) => p.text)
        .join('')

      if (!rawText) throw new Error('Respuesta vacía')

      const clean = rawText.replace(/```json/gi, '').replace(/```/g, '').trim()
      const parsed = JSON.parse(clean)
      const slugs: string[] = Array.isArray(parsed.tags) ? parsed.tags : []
      const filtered = slugs.filter((s) => validSlugs.has(s)).slice(0, MAX_TAGS)
      if (filtered.length === 0) throw new Error('Ningún slug válido')

      return filtered
    } catch (err) {
      if (attempt === TAG_RETRIES) {
        console.error('[auto-tag] falló para producto:', product.name, err)
        return []
      }
      await new Promise((r) => setTimeout(r, 500 * attempt))
    }
  }
  return []
}

// Helper: convierte slugs a referencias Sanity con _key estable.
export function tagSlugsToReferences(slugs: string[]): Array<{ _type: 'reference'; _ref: string; _key: string }> {
  return slugs.map((slug) => ({
    _type: 'reference' as const,
    _ref: `tag-${slug}`,
    _key: Math.random().toString(36).substring(2, 9),
  }))
}
