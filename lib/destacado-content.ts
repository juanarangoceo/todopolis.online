// Contenido de texto para completar un Destacado con IA: titular de campaña,
// historia, pasos de uso y «qué viene en la caja».
//
// Lo usan el botón «🤖 Completar Destacado con IA» del Studio (vía
// `app/api/generate-destacado-content`) y `scripts/complete-destacados.ts`. Por
// eso llama a Gemini por REST con `fetch` y sus imports son relativos con
// extensión: tiene que correr también con `node` a secas, sin Next.
//
// Solo se pide lo que falta (`needs`): lo que el editor ya escribió no se
// regenera ni se sobreescribe.

import { CAMPAIGN_STORY_RULES } from './product-content-prompt.ts'
import type { UsageSink } from './ai/pricing.ts'

export const DESTACADO_MODEL = 'gemini-3.8-flash'

export interface DestacadoNeeds {
  headline?: boolean
  story?: boolean
  steps?: boolean
  box?: boolean
}

export interface DestacadoInput {
  name: string
  shortDescription?: string
  heroTitle?: string
  specifications?: Array<{ label?: string; value?: string }>
  benefits?: Array<{ title?: string; description?: string }>
}

export interface DestacadoStoryOut {
  eyebrow: string
  problemTitle: string
  problemText: string
  turningPointTitle: string
  turningPointText: string
  outcomeTitle: string
  outcomeText: string
}

export interface DestacadoContent {
  headline?: string
  story?: DestacadoStoryOut
  steps?: Array<{ title: string; description: string }>
  box?: { title: string; intro?: string; items: string[] }
}

export interface InlineImage {
  mimeType: string
  data: string
}

export function buildDestacadoPrompt(input: DestacadoInput, needs: DestacadoNeeds, imageCount: number): string {
  const specs = (input.specifications ?? [])
    .filter((s) => s?.label && s?.value)
    .map((s) => `- ${s.label}: ${s.value}`)
    .join('\n')
  const benefits = (input.benefits ?? [])
    .filter((b) => b?.title)
    .map((b) => `- ${b.title}${b.description ? `: ${b.description}` : ''}`)
    .join('\n')

  const blocks: string[] = []
  const shape: string[] = []

  if (needs.headline) {
    blocks.push(`TITULAR DE CAMPAÑA (headline):
- La frase que iría en el anuncio de Meta y se repite en la landing bajo el nombre del producto.
- Máximo 60 caracteres. Promesa concreta y verificable del producto, en segunda persona o impersonal.
- Sin emojis, sin signos de exclamación, sin superlativos ("el mejor"), sin urgencia inventada, sin promesas de salud.
- Bien: "Aprende a rodar sin caídas laterales". Mal: "¡El regalo perfecto que todos aman!"`)
    shape.push(`"headline": "..."`)
  }
  if (needs.story) {
    blocks.push(CAMPAIGN_STORY_RULES)
    shape.push(`"story": { "eyebrow": "...", "problemTitle": "...", "problemText": "...", "turningPointTitle": "...", "turningPointText": "...", "outcomeTitle": "...", "outcomeText": "..." }`)
  }
  if (needs.steps) {
    blocks.push(`CÓMO SE USA (steps, 3 o 4 pasos):
- Pasos reales y en orden para empezar a usar el producto desde que abre la caja.
- title: 2-5 palabras, empieza con verbo ("Arma la base", "Carga 2 horas").
- description: 1 oración de máximo 20 palabras con el detalle que evita el error típico.
- Solo pasos que se deducen del producto, sus especificaciones o sus fotos. Si no sabes un tiempo o una medida, no lo pongas.`)
    shape.push(`"steps": [ { "title": "...", "description": "..." } ]`)
  }
  if (needs.box) {
    blocks.push(`QUÉ VIENE EN LA CAJA (box):
- title: "Qué viene en la caja" o una variante corta.
- intro: 1 oración opcional que tranquilice (qué necesitas aparte, si algo). Vacía si no aplica.
- items: una línea por pieza, con cantidad ("1 bicicleta de equilibrio", "2 bases circulares").
- SOLO piezas que dicen el texto, las especificaciones o que se VEN en las fotos. Si no estás seguro de una pieza, no la pongas. Nunca pongas "manual de instrucciones" o "garantía" si no hay evidencia.`)
    shape.push(`"box": { "title": "...", "intro": "...", "items": ["..."] }`)
  }

  const photos = imageCount > 0
    ? `\n\nCon este mensaje van ${imageCount} foto(s) reales del producto. Son la fuente de verdad sobre qué es y qué trae: lo que contradicen, no se escribe.`
    : ''

  return `Eres copywriter senior de e-commerce en Colombia para Todópolis. Voz: una amiga que sabe del tema, cálida y directa, que tutea. Español de Colombia. Sin emojis. Nunca inventes datos: si no está en el texto ni en las fotos, no lo escribas. Nada de promesas de salud, curación o cambios corporales.${photos}

PRODUCTO: ${input.name}
${input.heroTitle ? `Gancho actual: ${input.heroTitle}\n` : ''}${input.shortDescription ? `Descripción: ${input.shortDescription}\n` : ''}${specs ? `Especificaciones:\n${specs}\n` : ''}${benefits ? `Beneficios ya escritos (no los repitas):\n${benefits}\n` : ''}
${blocks.join('\n\n')}

Responde ÚNICAMENTE con JSON válido, sin markdown:
{ ${shape.join(', ')} }`
}

const clip = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/** Valida la respuesta del modelo campo por campo. Lo que no sirve se descarta. */
export function sanitizeDestacadoContent(raw: unknown, needs: DestacadoNeeds): DestacadoContent {
  const r = (raw ?? {}) as Record<string, any>
  const out: DestacadoContent = {}

  if (needs.headline) {
    const h = clip(r.headline, 80)
    if (h && h.length <= 60) out.headline = h
  }
  if (needs.story && r.story) {
    const keys = ['eyebrow', 'problemTitle', 'problemText', 'turningPointTitle', 'turningPointText', 'outcomeTitle', 'outcomeText'] as const
    const story = Object.fromEntries(keys.map((k) => [k, clip(r.story[k], 400)])) as unknown as DestacadoStoryOut
    if (keys.every((k) => story[k])) out.story = story
  }
  if (needs.steps && Array.isArray(r.steps)) {
    const steps = r.steps
      .map((s: any) => ({ title: clip(s?.title, 60), description: clip(s?.description, 200) }))
      .filter((s: { title: string }) => s.title)
      .slice(0, 4)
    if (steps.length >= 2) out.steps = steps
  }
  if (needs.box && r.box) {
    const items = (Array.isArray(r.box.items) ? r.box.items : [])
      .map((i: unknown) => clip(i, 120))
      .filter(Boolean)
      .slice(0, 12)
    if (items.length) {
      out.box = { title: clip(r.box.title, 60) || 'Qué viene en la caja', intro: clip(r.box.intro, 200) || undefined, items }
    }
  }
  return out
}

/** Baja fotos y las deja como `inlineData` para Gemini. Best-effort. */
export async function fetchInlineImages(urls: string[], timeoutMs = 8_000): Promise<InlineImage[]> {
  const settled = await Promise.all(
    urls.slice(0, 3).map(async (url): Promise<InlineImage | null> => {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
        if (!res.ok) return null
        const header = res.headers.get('content-type')?.split(';')[0].trim() ?? ''
        const mimeType = header.startsWith('image/') ? header : 'image/jpeg'
        return { mimeType, data: Buffer.from(await res.arrayBuffer()).toString('base64') }
      } catch {
        return null
      }
    }),
  )
  return settled.filter((i): i is InlineImage => i !== null)
}

/** Llama a Gemini y devuelve solo lo que pasó la validación. */
export async function generateDestacadoContent(opts: {
  apiKey: string
  input: DestacadoInput
  needs: DestacadoNeeds
  images?: InlineImage[]
  onUsage?: UsageSink
}): Promise<DestacadoContent> {
  const { apiKey, input, needs, images = [] } = opts
  if (!needs.headline && !needs.story && !needs.steps && !needs.box) return {}

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${DESTACADO_MODEL}:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [
          ...images.map((image) => ({ inlineData: image })),
          { text: buildDestacadoPrompt(input, needs, images.length) },
        ],
      }],
      generationConfig: { temperature: 0.7, responseMimeType: 'application/json' },
    }),
  })
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = await res.json()
  const um = data?.usageMetadata ?? {}
  opts.onUsage?.('destacado', {
    inputTokens: um.promptTokenCount,
    outputTokens: um.candidatesTokenCount,
    thoughtsTokens: um.thoughtsTokenCount,
    cachedTokens: um.cachedContentTokenCount,
  })
  const text = (data?.candidates?.[0]?.content?.parts ?? [])
    .filter((p: any) => !p.thought && typeof p.text === 'string')
    .map((p: any) => p.text)
    .join('')
    .replace(/```json\n?|```\n?/g, '')
    .trim()
  if (!text) throw new Error('El modelo no devolvió texto.')
  return sanitizeDestacadoContent(JSON.parse(text), needs)
}
