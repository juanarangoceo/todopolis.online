// Cálculos de /admin/profit (Nitro Profit de Todopolis). Puro: recibe las filas
// de `ai_usage` y devuelve el resumen, sin tocar la base. Vive aparte de la
// página para poder probarlo — es justo el tipo de número que, si sale mal,
// nadie lo nota hasta que llega la factura.

import {
  AI_MODELS,
  COST_SOURCES,
  ESTIMATED_PROFILES,
  MIN_MEASURED,
  PRODUCT_RECIPES,
  costUsd,
  type Usage,
} from './pricing.ts'

export interface UsageRow {
  created_at: string
  source: string
  model: string
  flow: string | null
  product_ref: string | null
  ok: boolean
  input_tokens: number
  output_tokens: number
  thoughts_tokens: number
  cached_tokens: number
  image_input_tokens: number
  units: number | string
  cost_usd: number | string
  estimated: boolean
}

export interface Bucket {
  key: string
  label: string
  calls: number
  failed: number
  usd: number
  inputTokens: number
  outputTokens: number
}

export interface UnitCost {
  source: string
  label: string
  model: string
  /** USD por llamada a tarifa de HOY. */
  usd: number
  /** USD por llamada con la tarifa del 1-ene-2027 (Gemini 3.8 se duplica). */
  usd2027: number
  basis: 'medido' | 'estimado' | 'no medible'
  samples: number
}

export interface FlowSummary {
  flow: string
  kind: string
  productRef: string | null
  at: string
  usd: number
  steps: string[]
}

const num = (v: number | string | null | undefined) => {
  const n = typeof v === 'string' ? Number(v) : v ?? 0
  return Number.isFinite(n) ? (n as number) : 0
}

/** `import:123` → `import`. Los tipos de operación que crean productos. */
export const FLOW_KINDS: Record<string, string> = {
  import: 'Importado a mano (Mastershop)',
  sync: 'Importado por el cron (Mastershop)',
  manual: 'Generado en el Studio',
  destacado: 'Completado como Destacado',
  image: 'Foto de estilo de vida',
  article: 'Artículo suelto',
  collection: 'Colección',
}
const PRODUCT_FLOW_KINDS = new Set(['import', 'sync', 'manual'])

function bucket(key: string, label: string): Bucket {
  return { key, label, calls: 0, failed: 0, usd: 0, inputTokens: 0, outputTokens: 0 }
}

function addTo(b: Bucket, r: UsageRow) {
  b.calls += 1
  if (!r.ok) b.failed += 1
  b.usd += num(r.cost_usd)
  b.inputTokens += num(r.input_tokens) + num(r.image_input_tokens)
  b.outputTokens += num(r.output_tokens) + num(r.thoughts_tokens)
}

const usageOf = (r: UsageRow): Usage => ({
  inputTokens: num(r.input_tokens),
  outputTokens: num(r.output_tokens),
  thoughtsTokens: num(r.thoughts_tokens),
  cachedTokens: num(r.cached_tokens),
  imageInputTokens: num(r.image_input_tokens),
})

const JAN_2027 = new Date('2027-01-15T12:00:00-05:00')

/**
 * Costo por llamada de cada fuente, a tarifa de hoy y de 2027.
 * Medido = promedio de las llamadas OK reales re-valoradas a la tarifa dada
 * (no el `cost_usd` congelado, que es el de su día). Con menos de
 * MIN_MEASURED llamadas se usa el perfil estimado de `pricing.ts`.
 */
export function unitCosts(rows: UsageRow[], now: Date = new Date()): UnitCost[] {
  return Object.entries(COST_SOURCES).map(([source, src]) => {
    const ok = rows.filter((r) => r.source === source && r.ok)
    if (src.unmeasured) {
      return { source, label: src.label, model: src.model, usd: 0, usd2027: 0, basis: 'no medible' as const, samples: ok.length }
    }
    if (ok.length >= MIN_MEASURED) {
      const avg = (d: Date) => ok.reduce((s, r) => s + costUsd(usageOf(r), r.model, d), 0) / ok.length
      return { source, label: src.label, model: ok[0].model, usd: avg(now), usd2027: avg(JAN_2027), basis: 'medido' as const, samples: ok.length }
    }
    const profile = ESTIMATED_PROFILES[source] ?? {}
    return {
      source,
      label: src.label,
      model: src.model,
      usd: costUsd(profile, src.model, now),
      usd2027: costUsd(profile, src.model, JAN_2027),
      basis: 'estimado' as const,
      samples: ok.length,
    }
  })
}

/** Costo de crear UN producto por cada vía, sumando sus pasos. */
export function recipeCosts(units: UnitCost[]) {
  const by = new Map(units.map((u) => [u.source, u]))
  return PRODUCT_RECIPES.map((r) => {
    const sum = (withOptional: boolean, key: 'usd' | 'usd2027') =>
      r.steps.filter((s) => withOptional || !s.optional).reduce((t, s) => t + (by.get(s.source)?.[key] ?? 0), 0)
    const allMeasured = r.steps.every((s) => by.get(s.source)?.basis === 'medido')
    return {
      key: r.key,
      label: r.label,
      steps: r.steps.map((s) => ({ ...s, label: by.get(s.source)?.label ?? s.source, usd: by.get(s.source)?.usd ?? 0 })),
      base: sum(false, 'usd'),
      full: sum(true, 'usd'),
      base2027: sum(false, 'usd2027'),
      full2027: sum(true, 'usd2027'),
      basis: allMeasured ? ('medido' as const) : ('estimado' as const),
    }
  })
}

export function summarizeUsage(rows: UsageRow[]) {
  const total = bucket('total', 'Total')
  const bySource = new Map<string, Bucket>()
  const byModel = new Map<string, Bucket>()
  const byDay = new Map<string, number>()
  const flows = new Map<string, FlowSummary>()

  for (const r of rows) {
    addTo(total, r)
    const s = bySource.get(r.source) ?? bucket(r.source, COST_SOURCES[r.source]?.label ?? r.source)
    addTo(s, r)
    bySource.set(r.source, s)
    const m = byModel.get(r.model) ?? bucket(r.model, AI_MODELS[r.model]?.label ?? r.model)
    addTo(m, r)
    byModel.set(r.model, m)
    // Día en Colombia.
    const day = new Date(new Date(r.created_at).getTime() - 5 * 3600 * 1000).toISOString().slice(0, 10)
    byDay.set(day, (byDay.get(day) ?? 0) + num(r.cost_usd))

    if (r.flow) {
      const kind = r.flow.split(':')[0]
      const f = flows.get(r.flow) ?? { flow: r.flow, kind, productRef: r.product_ref, at: r.created_at, usd: 0, steps: [] }
      f.usd += num(r.cost_usd)
      f.productRef ??= r.product_ref
      if (r.created_at > f.at) f.at = r.created_at
      const label = COST_SOURCES[r.source]?.label ?? r.source
      if (!f.steps.includes(label)) f.steps.push(label)
      flows.set(r.flow, f)
    }
  }

  const flowList = [...flows.values()].sort((a, b) => b.at.localeCompare(a.at))
  const perKind = Object.entries(FLOW_KINDS)
    .map(([kind, label]) => {
      const list = flowList.filter((f) => f.kind === kind)
      const usd = list.reduce((t, f) => t + f.usd, 0)
      return { kind, label, count: list.length, usd, avg: list.length ? usd / list.length : 0 }
    })
    .filter((k) => k.count > 0)

  const productFlows = flowList.filter((f) => PRODUCT_FLOW_KINDS.has(f.kind))

  return {
    total,
    bySource: [...bySource.values()].sort((a, b) => b.usd - a.usd),
    byModel: [...byModel.values()].sort((a, b) => b.usd - a.usd),
    byDay: [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])),
    perKind,
    productsCreated: productFlows.length,
    avgPerProduct: productFlows.length ? productFlows.reduce((t, f) => t + f.usd, 0) / productFlows.length : null,
    recentFlows: flowList.slice(0, 25),
  }
}
