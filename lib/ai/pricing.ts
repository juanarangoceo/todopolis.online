// Registro ÚNICO de tarifas de IA de Todopolis. Lo usan `lib/ai/usage.ts`
// (congela el costo de cada llamada al escribirla) y /admin/profit.
//
// Mismo patrón que `nitro_bot/lib/ai/pricing.ts`, y la misma regla: este
// módulo es de SOLO CÁLCULO. No lee la base ni llama a nada, así que un error
// de contabilidad no puede tumbar un import ni un checkout.
//
// ⚠️ TARIFAS VERIFICADAS EL 23-sep-2026 contra las páginas oficiales:
//   - ai.google.dev/gemini-api/docs/pricing
//   - vercel.com/ai-gateway/models/jev
//   - developers.openai.com/api/docs/pricing
// Si un proveedor cambia precios, se edita AQUÍ con la fecha en `effectiveFrom`
// (no se sobrescribe el tramo viejo: los informes de días pasados tienen que
// seguir saliendo con la tarifa de entonces).

export type Unit = 'token' | 'minute'

export interface ModelRate {
  /** Desde qué día (YYYY-MM-DD, hora Colombia) aplica este tramo. */
  effectiveFrom: string
  /** USD por token de entrada (texto). */
  input: number
  /** USD por token de salida. El «thinking» de Gemini se factura como salida. */
  output: number
  /** USD por token de entrada servido desde caché. */
  cachedInput: number
  /** USD por token de imagen de entrada, si el modelo la cobra aparte. */
  imageInput?: number
  /** USD por minuto (transcripción). */
  perMinute?: number
}

export interface ModelInfo {
  label: string
  provider: string
  unit: Unit
  /** Tramos en orden cronológico. */
  rates: ModelRate[]
  source: string
  note?: string
}

const M = 1 / 1_000_000

export const AI_MODELS: Record<string, ModelInfo> = {
  'gemini-3.8-flash': {
    label: 'Gemini 3.8 Flash',
    provider: 'Google',
    unit: 'token',
    rates: [
      { effectiveFrom: '2026-01-01', input: 0.75 * M, output: 3.75 * M, cachedInput: 0.075 * M },
      // Anunciado por Google: la promoción termina el 31-dic-2026.
      { effectiveFrom: '2027-01-01', input: 1.5 * M, output: 7.5 * M, cachedInput: 0.15 * M },
    ],
    source: 'ai.google.dev/gemini-api/docs/pricing — verificado 23-sep-2026',
    note: 'Sube al doble el 1-ene-2027 ($1,50 / $7,50 por millón).',
  },
  'gemini-3-flash-preview': {
    label: 'Gemini 3 Flash (preview)',
    provider: 'Google',
    unit: 'token',
    rates: [{ effectiveFrom: '2026-01-01', input: 0.5 * M, output: 3.0 * M, cachedInput: 0.05 * M }],
    source: 'ai.google.dev/gemini-api/docs/pricing — verificado 23-sep-2026',
  },
  'typesafe-ai/jev': {
    label: 'JEV (TypeSafe AI)',
    provider: 'Vercel AI Gateway',
    unit: 'token',
    // La página del modelo solo publica tarifa de ENTRADA; la salida que
    // reporta el SDK (~1.100 tokens por evaluación) no tiene precio publicado.
    rates: [{ effectiveFrom: '2026-01-01', input: 0.042 * M, output: 0, cachedInput: 0.042 * M }],
    source: 'vercel.com/ai-gateway/models/jev — verificado 23-sep-2026',
    note: 'Solo cobra entrada. Si Vercel publica tarifa de salida, súmala aquí.',
  },
  'gpt-image-2': {
    label: 'GPT Image 2',
    provider: 'OpenAI',
    unit: 'token',
    rates: [{ effectiveFrom: '2026-01-01', input: 5 * M, imageInput: 8 * M, output: 30 * M, cachedInput: 2 * M }],
    source: 'developers.openai.com/api/docs/pricing — verificado 23-sep-2026',
  },
  // GPT Image 2.5 salió en dos versiones con la misma tarifa: Flare (rápida) y
  // Sunburst (precisión al editar). Usamos Sunburst porque la foto se hace
  // EDITANDO las fotos reales del producto y lo primero es que se parezca.
  'gpt-image-2.5-sunburst': {
    label: 'GPT Image 2.5 Sunburst',
    provider: 'OpenAI',
    unit: 'token',
    rates: [{ effectiveFrom: '2026-09-08', input: 5 * M, imageInput: 8 * M, output: 30 * M, cachedInput: 2 * M }],
    source: 'developers.openai.com/api/docs/models/gpt-image-2.5-sunburst — verificado 25-sep-2026',
    note: 'Misma tarifa que GPT Image 2, pero OpenAI avisa que el consumo de tokens puede ser distinto: manda lo medido.',
  },
  'gpt-realtime': {
    label: 'GPT Realtime (voz)',
    provider: 'OpenAI',
    unit: 'token',
    // Tarifas de AUDIO: la voz de Lucy es audio de entrada y de salida.
    rates: [{ effectiveFrom: '2026-01-01', input: 32 * M, output: 64 * M, cachedInput: 0.4 * M }],
    source: 'developers.openai.com/api/docs/pricing — verificado 23-sep-2026',
    note: 'La sesión de voz ocurre entre el navegador y OpenAI: el servidor no ve los tokens. Se cuentan sesiones, no costo.',
  },
  'whisper-1': {
    label: 'Whisper (transcripción)',
    provider: 'OpenAI',
    unit: 'minute',
    rates: [{ effectiveFrom: '2026-01-01', input: 0, output: 0, cachedInput: 0, perMinute: 0.006 }],
    source: 'developers.openai.com/api/docs/pricing — verificado 23-sep-2026',
  },
}

/** Qué gasta. La clave es la que se escribe en `ai_usage.source`. */
export interface CostSource {
  label: string
  group: 'Crear productos' | 'Contenido' | 'Imágenes' | 'Tienda' | 'Voz'
  model: string
  /** El servidor no ve el consumo: solo se cuentan llamadas. */
  unmeasured?: boolean
}

export const COST_SOURCES: Record<string, CostSource> = {
  product_category: { label: 'Categoría del producto', group: 'Crear productos', model: 'typesafe-ai/jev' },
  product_copy: { label: 'Landing del producto (copy)', group: 'Crear productos', model: 'gemini-3.8-flash' },
  product_tags: { label: 'Etiquetas del producto', group: 'Crear productos', model: 'typesafe-ai/jev' },
  product_tags_fallback: { label: 'Etiquetas (respaldo Gemini)', group: 'Crear productos', model: 'gemini-3.8-flash' },
  article: { label: 'Artículo de blog', group: 'Contenido', model: 'gemini-3.8-flash' },
  collection: { label: 'Landing de colección', group: 'Contenido', model: 'gemini-3.8-flash' },
  destacado: { label: 'Completar Destacado', group: 'Contenido', model: 'gemini-3.8-flash' },
  ai_image: { label: 'Foto de estilo de vida (IA)', group: 'Imágenes', model: 'gpt-image-2.5-sunburst' },
  search_suggest: { label: 'Sugerencias del buscador', group: 'Tienda', model: 'typesafe-ai/jev' },
  voice_prompt: { label: 'Guion de voz de Lucy', group: 'Voz', model: 'gemini-3-flash-preview' },
  voice_session: { label: 'Sesiones de voz de Lucy', group: 'Voz', model: 'gpt-realtime', unmeasured: true },
}

export interface Usage {
  inputTokens?: number
  outputTokens?: number
  /** Thinking de Gemini: se cobra a tarifa de salida. */
  thoughtsTokens?: number
  /** Parte de `inputTokens` servida desde caché. */
  cachedTokens?: number
  /** Tokens de imagen de entrada, para los modelos que la cobran aparte (GPT Image). */
  imageInputTokens?: number
  minutes?: number
}

/**
 * A quién avisarle el consumo de una llamada. Las funciones de `lib/` lo
 * reciben como callback en vez de escribir en la base: así siguen siendo
 * probables sin Supabase, y la ruta decide el `flow` (lib/ai/usage.ts).
 */
export type UsageSink = (source: string, usage: Usage, extra?: { ok?: boolean; model?: string }) => void

/** Día en Colombia (UTC−5) de una fecha: los tramos de tarifa van por día local. */
export function colombiaDay(date: Date): string {
  return new Date(date.getTime() - 5 * 3600 * 1000).toISOString().slice(0, 10)
}

export function rateFor(model: string, date: Date = new Date()): ModelRate | null {
  const info = AI_MODELS[model]
  if (!info) return null
  const day = colombiaDay(date)
  let current: ModelRate | null = null
  for (const r of info.rates) if (r.effectiveFrom <= day) current = r
  return current
}

const nn = (v: number | undefined) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0)

/** Costo en USD de una llamada. Modelo desconocido = 0 (y el panel lo marca). */
export function costUsd(usage: Usage, model: string, date: Date = new Date()): number {
  const r = rateFor(model, date)
  if (!r) return 0
  const input = nn(usage.inputTokens)
  const cached = Math.min(nn(usage.cachedTokens), input)
  return (
    (input - cached) * r.input +
    cached * r.cachedInput +
    nn(usage.imageInputTokens) * (r.imageInput ?? r.input) +
    (nn(usage.outputTokens) + nn(usage.thoughtsTokens)) * r.output +
    nn(usage.minutes) * (r.perMinute ?? 0)
  )
}

// ─── Costo por operación cuando todavía no hay nada medido ──────────────────
// Perfiles de tokens ESTIMADOS (sep 2026). En cuanto `ai_usage` tenga al menos
// MIN_MEASURED llamadas de una fuente, el panel usa el promedio real y marca la
// cifra como «medida». Estos números solo existen para que el panel diga algo
// útil el primer día.
//   - Copy de producto: prompt de ~9.000 tokens y ~4.300 de salida + thinking;
//     cuadra con los ~$88 COP por producto medidos al migrar a 3.8 (CLAUDE.md).
//   - JEV: tokens reportados por el SDK en las pruebas del 23-sep-2026
//     (categoría ~900; etiquetas y sugerencias ~2.800 de entrada).
//   - GPT Image 2 a 1024×1536 «high»: ~5.500 tokens de salida (≈ US$0,165 según
//     varias fuentes) + hasta 3 fotos de referencia. Desde el 25-sep-2026 es
//     GPT Image 2.5 Sunburst, misma tarifa; el consumo real lo dirá lo medido.
export const MIN_MEASURED = 3

export const ESTIMATED_PROFILES: Record<string, Usage> = {
  product_category: { inputTokens: 900 },
  product_copy: { inputTokens: 9_000, outputTokens: 1_800, thoughtsTokens: 2_500 },
  product_tags: { inputTokens: 2_800 },
  product_tags_fallback: { inputTokens: 3_500, outputTokens: 150, thoughtsTokens: 800 },
  article: { inputTokens: 2_500, outputTokens: 2_500, thoughtsTokens: 2_000 },
  collection: { inputTokens: 4_000, outputTokens: 3_000, thoughtsTokens: 2_000 },
  destacado: { inputTokens: 5_000, outputTokens: 2_000, thoughtsTokens: 2_000 },
  ai_image: { inputTokens: 400, imageInputTokens: 3_000, outputTokens: 5_500 },
  search_suggest: { inputTokens: 3_000 },
  voice_prompt: { inputTokens: 2_000, outputTokens: 1_500 },
}

/** Qué operaciones componen crear UN producto por cada vía. */
export const PRODUCT_RECIPES: { key: string; label: string; steps: { source: string; optional?: boolean }[] }[] = [
  {
    key: 'import',
    label: 'Importar de Mastershop',
    steps: [{ source: 'product_category' }, { source: 'product_copy' }, { source: 'product_tags' }, { source: 'article' }],
  },
  {
    key: 'manual',
    label: 'Crear a mano con el botón del Studio',
    steps: [
      { source: 'product_copy' },
      { source: 'product_tags' },
      { source: 'product_category' },
      { source: 'ai_image', optional: true },
      { source: 'article', optional: true },
    ],
  },
  {
    key: 'destacado',
    label: 'Convertir en Destacado',
    steps: [{ source: 'destacado' }, { source: 'ai_image', optional: true }],
  },
]

// ─── Pesos ──────────────────────────────────────────────────────────────────
/**
 * Respaldo si no se puede leer la TRM: el valor real sale de datos.gov.co
 * (`lib/ai/trm.ts`). Es la TRM del 23-sep-2026 ($3.208,66); el 4.000 que usa
 * nitro_bot por defecto inflaría todo un 25 %.
 */
export const FALLBACK_USD_COP = 3208.66
