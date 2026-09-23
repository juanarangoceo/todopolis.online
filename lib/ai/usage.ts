import { createAdminClient } from '@/lib/supabase/admin'
import { COST_SOURCES, costUsd, type Usage, type UsageSink } from './pricing'

// Registra UNA llamada a un modelo en `ai_usage` (lo lee /admin/profit).
//
// Best-effort y a propósito: NUNCA lanza ni hace esperar de más al que llama.
// Si Supabase falla, el import sigue; perder una fila de contabilidad es mejor
// que perder un producto.

export interface UsageRecord extends Usage {
  source: keyof typeof COST_SOURCES | string
  /** Por defecto, el modelo de la fuente en `COST_SOURCES`. */
  model?: string
  /** Agrupa las llamadas de una misma operación: `import:<id>`, `manual:<docId>`. */
  flow?: string | null
  productRef?: string | null
  ok?: boolean
  /** Llamadas, imágenes o sesiones cuando no hay tokens. */
  units?: number
  estimated?: boolean
  meta?: Record<string, unknown>
}

export async function recordAiUsage(r: UsageRecord): Promise<void> {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) return
    const model = r.model ?? COST_SOURCES[r.source]?.model ?? 'desconocido'
    const int = (v?: number) => Math.max(0, Math.round(v ?? 0))
    const { error } = await createAdminClient().from('ai_usage').insert({
      source: r.source,
      model,
      flow: r.flow ?? null,
      product_ref: r.productRef ?? null,
      ok: r.ok ?? true,
      input_tokens: int(r.inputTokens),
      output_tokens: int(r.outputTokens),
      thoughts_tokens: int(r.thoughtsTokens),
      cached_tokens: int(r.cachedTokens),
      image_input_tokens: int(r.imageInputTokens),
      units: Math.max(0, r.units ?? 1),
      cost_usd: costUsd(r, model),
      estimated: r.estimated ?? false,
      meta: r.meta ?? null,
    })
    if (error) console.warn('[ai-usage] no se pudo registrar:', error.message)
  } catch (err) {
    console.warn('[ai-usage] no se pudo registrar:', (err as Error)?.message ?? err)
  }
}

/** Tokens de una respuesta de Gemini (SDK o REST: los dos traen `usageMetadata`). */
export function geminiUsage(meta: unknown): Usage {
  const m = (meta ?? {}) as {
    promptTokenCount?: number
    candidatesTokenCount?: number
    thoughtsTokenCount?: number
    cachedContentTokenCount?: number
  }
  return {
    inputTokens: m.promptTokenCount,
    outputTokens: m.candidatesTokenCount,
    thoughtsTokens: m.thoughtsTokenCount,
    cachedTokens: m.cachedContentTokenCount,
  }
}

/** Tokens de una evaluación de JEV (`experimental_evaluate`). */
export function evaluateUsage(usage: unknown): Usage {
  const u = (usage ?? {}) as { inputTokens?: number; outputTokens?: number }
  return { inputTokens: u.inputTokens, outputTokens: u.outputTokens }
}

/** Tokens de una respuesta de GPT Image (`usage` de /images). */
export function openaiImageUsage(usage: unknown): Usage {
  const u = (usage ?? {}) as { input_tokens?: number; output_tokens?: number; input_tokens_details?: { text_tokens?: number; image_tokens?: number } }
  const image = u.input_tokens_details?.image_tokens ?? 0
  const text = u.input_tokens_details?.text_tokens ?? Math.max(0, (u.input_tokens ?? 0) - image)
  return { inputTokens: text, imageInputTokens: image, outputTokens: u.output_tokens }
}

/**
 * Junta el consumo de una operación (un import, un clic en «Generar Landing»)
 * y lo escribe en UN solo insert al final con `flush()`.
 *
 * Se hace así y no con una escritura por llamada sin esperar: en Vercel la
 * función se congela al responder y lo que quedó en el aire se pierde. La ruta
 * hace `await usage.flush()` antes de devolver, y flush nunca lanza.
 */
export function createUsageCollector(flow: string | null, productRef?: string | null) {
  const rows: UsageRecord[] = []
  const sink: UsageSink = (source, usage, extra) => {
    rows.push({ source, ...usage, model: extra?.model, ok: extra?.ok, flow, productRef })
  }
  return {
    sink,
    setProductRef(ref: string | null | undefined) {
      if (ref) for (const r of rows) r.productRef ??= ref
      productRef = ref ?? productRef
    },
    async flush(): Promise<void> {
      if (rows.length === 0) return
      const batch = rows.splice(0)
      try {
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) return
        const int = (v?: number) => Math.max(0, Math.round(v ?? 0))
        const { error } = await createAdminClient().from('ai_usage').insert(
          batch.map((r) => {
            const model = r.model ?? COST_SOURCES[r.source]?.model ?? 'desconocido'
            return {
              source: r.source,
              model,
              flow: r.flow ?? null,
              product_ref: r.productRef ?? productRef ?? null,
              ok: r.ok ?? true,
              input_tokens: int(r.inputTokens),
              output_tokens: int(r.outputTokens),
              thoughts_tokens: int(r.thoughtsTokens),
              cached_tokens: int(r.cachedTokens),
              image_input_tokens: int(r.imageInputTokens),
              units: Math.max(0, r.units ?? 1),
              cost_usd: costUsd(r, model),
              estimated: r.estimated ?? false,
              meta: r.meta ?? null,
            }
          }),
        )
        if (error) console.warn('[ai-usage] no se pudo registrar:', error.message)
      } catch (err) {
        console.warn('[ai-usage] no se pudo registrar:', (err as Error)?.message ?? err)
      }
    },
  }
}
