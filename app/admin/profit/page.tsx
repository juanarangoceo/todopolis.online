import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTrm } from '@/lib/ai/trm'
import { AI_MODELS, COST_SOURCES, rateFor } from '@/lib/ai/pricing'
import { FLOW_KINDS, recipeCosts, summarizeUsage, unitCosts, type UsageRow } from '@/lib/ai/profit'
import { AdminPage, Card, Section, StatCard, StatusPill, daysAgoIso } from '../_components/ui'

// Nitro Profit de Todopolis: a dónde se va la plata de la IA.
//
// Lee `ai_usage` (una fila por llamada, escrita por `lib/ai/usage.ts` desde
// cada ruta que usa un modelo) y la resume con `lib/ai/profit.ts`. El costo de
// cada fila está CONGELADO con la tarifa de su día; el «costo por operación»
// se recalcula con la tarifa de HOY para responder «¿cuánto me cuesta crear
// un producto ahora?». Tarifas en `lib/ai/pricing.ts`.

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Nitro Profit · Panel' }

const PERIODS = [7, 30, 90] as const

export default async function ProfitPage({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const sp = await searchParams
  const days = PERIODS.find((d) => String(d) === sp.dias) ?? 30
  const since = daysAgoIso(days)
  // Para el costo por operación se miran 90 días: más muestras, promedio más firme.
  const sinceUnits = daysAgoIso(90)

  const [trm, { data, error }] = await Promise.all([
    getTrm(),
    createAdminClient()
      .from('ai_usage')
      .select('created_at, source, model, flow, product_ref, ok, input_tokens, output_tokens, thoughts_tokens, cached_tokens, image_input_tokens, units, cost_usd, estimated')
      .gte('created_at', sinceUnits)
      .order('created_at', { ascending: false })
      .limit(20000),
  ])
  const all = (data ?? []) as UsageRow[]
  const rows = all.filter((r) => r.created_at >= since)

  const summary = summarizeUsage(rows)
  const units = unitCosts(all)
  const recipes = recipeCosts(units)
  const voiceSessions = rows.filter((r) => r.source === 'voice_session').length

  const cop = (usd: number) => {
    const v = usd * trm.rate
    return v >= 10 ? `$ ${Math.round(v).toLocaleString('es-CO')}` : `$ ${v.toLocaleString('es-CO', { maximumFractionDigits: 1 })}`
  }
  const usd = (v: number) => `US$ ${v < 0.01 && v > 0 ? v.toFixed(4) : v.toFixed(2)}`
  const tokens = (v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)} M` : v >= 1000 ? `${Math.round(v / 1000)} k` : String(v))
  const perDay = summary.total.usd / days

  return (
    <AdminPage
      eyebrow="Costos de IA"
      title="Nitro Profit"
      description="Cuánto se va en IA en Todópolis: por producto creado, por función y por modelo, a tarifas actuales."
      actions={
        <div className="flex rounded-full border border-nav-inactive-border bg-surface p-1">
          {PERIODS.map((d) => (
            <Link
              key={d}
              href={`/admin/profit?dias=${d}`}
              className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${d === days ? 'bg-todopolis-lavender-deep text-white' : 'text-foreground/65 hover:text-ink-title'}`}
            >
              {d} días
            </Link>
          ))}
        </div>
      }
    >
      {error && (
        <p className="mb-6 rounded-2xl border border-sale/30 bg-sale-soft px-4 py-3 text-sm font-semibold text-sale">
          No se pudo leer el consumo: {error.message}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={`Gasto en ${days} días`} value={cop(summary.total.usd)} hint={usd(summary.total.usd)} />
        <StatCard
          label="Productos creados con IA"
          value={String(summary.productsCreated)}
          hint={summary.avgPerProduct !== null ? `${cop(summary.avgPerProduct)} en promedio cada uno` : 'aún sin medir'}
        />
        <StatCard label="Al mes, a este ritmo" value={cop(perDay * 30)} hint={`${cop(perDay)} por día`} />
        <StatCard
          label="Llamadas a modelos"
          value={summary.total.calls.toLocaleString('es-CO')}
          hint={summary.total.failed ? `${summary.total.failed} fallaron (${Math.round((summary.total.failed / summary.total.calls) * 100)} %)` : 'ninguna falló'}
          tone={summary.total.calls && summary.total.failed / summary.total.calls > 0.2 ? 'warn' : undefined}
        />
      </div>

      <Section
        title="Crear un producto cuesta"
        description="A tarifas de hoy. «Medido» sale del promedio de llamadas reales; «estimado», de un perfil de tokens mientras no haya suficientes."
      >
        <div className="grid gap-3 md:grid-cols-3">
          {recipes.map((r) => (
            <Card key={r.key} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-ink-title">{r.label}</p>
                <StatusPill tone={r.basis === 'medido' ? 'ok' : 'muted'}>{r.basis}</StatusPill>
              </div>
              <p className="mt-2 font-serif text-3xl font-extrabold tabular-nums text-ink-title">{cop(r.base)}</p>
              <p className="text-xs text-muted-foreground">
                {usd(r.base)}
                {r.full > r.base && <> · con lo opcional {cop(r.full)}</>}
              </p>
              <ul className="mt-4 space-y-1.5 border-t border-nav-inactive-border pt-3 text-sm">
                {r.steps.map((s) => (
                  <li key={s.source} className="flex justify-between gap-3">
                    <span className="text-foreground/75">
                      {s.label}
                      {s.optional && <span className="text-muted-foreground"> (opcional)</span>}
                    </span>
                    <span className="shrink-0 tabular-nums text-ink-title">{cop(s.usd)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-auto pt-4 text-xs text-muted-foreground">
                Desde el 1-ene-2027: <strong className="text-amber-700">{cop(r.base2027)}</strong>
                {r.full2027 > r.base2027 && <> · {cop(r.full2027)} completo</>}
              </p>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="En qué se va" description={`Por función, últimos ${days} días.`}>
        {summary.bySource.length === 0 ? (
          <EmptyState />
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-nav-inactive-border text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Función</th>
                  <th className="px-4 py-3">Modelo</th>
                  <th className="px-4 py-3 text-right">Llamadas</th>
                  <th className="px-4 py-3 text-right">Tokens (entrada / salida)</th>
                  <th className="px-4 py-3 text-right">Por llamada</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {summary.bySource.map((b) => {
                  const src = COST_SOURCES[b.key]
                  return (
                    <tr key={b.key} className="border-b border-nav-inactive-border/70 last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-ink-title">{b.label}</p>
                        <p className="text-xs text-muted-foreground">{src?.group ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground/70">{AI_MODELS[src?.model ?? '']?.label ?? src?.model ?? '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {b.calls.toLocaleString('es-CO')}
                        {b.failed > 0 && <span className="block text-xs text-sale">{b.failed} fallidas</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-xs tabular-nums text-muted-foreground">
                        {tokens(b.inputTokens)} / {tokens(b.outputTokens)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{src?.unmeasured ? '—' : cop(b.calls ? b.usd / b.calls : 0)}</td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums text-ink-title">{src?.unmeasured ? 'no medible' : cop(b.usd)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Card>
        )}
      </Section>

      {summary.byModel.length > 0 && (
        <Section title="Por modelo">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {summary.byModel.map((m) => (
              <StatCard
                key={m.key}
                label={m.label}
                value={cop(m.usd)}
                hint={`${m.calls.toLocaleString('es-CO')} llamadas · ${summary.total.usd ? Math.round((m.usd / summary.total.usd) * 100) : 0} %`}
              />
            ))}
          </div>
        </Section>
      )}

      {summary.perKind.length > 0 && (
        <Section title="Por tipo de operación" description="Una operación agrupa todas las llamadas de un import o de un clic en el Studio.">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {summary.perKind.map((k) => (
              <StatCard key={k.kind} label={k.label} value={cop(k.avg)} hint={`promedio · ${k.count} operaciones · ${cop(k.usd)} en total`} />
            ))}
          </div>
        </Section>
      )}

      <Section title="Últimas operaciones">
        {summary.recentFlows.length === 0 ? (
          <EmptyState />
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-nav-inactive-border text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Cuándo</th>
                  <th className="px-4 py-3">Operación</th>
                  <th className="px-4 py-3">Pasos</th>
                  <th className="px-4 py-3 text-right">Costo</th>
                </tr>
              </thead>
              <tbody>
                {summary.recentFlows.map((f) => (
                  <tr key={f.flow} className="border-b border-nav-inactive-border/70 last:border-0 align-top">
                    <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums text-muted-foreground">{bogota(f.at)}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink-title">{FLOW_KINDS[f.kind] ?? f.kind}</p>
                      {f.productRef && (
                        <a href={`/studio/desk/product;${f.productRef}`} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-todopolis-lavender-deep hover:underline">
                          Ver en el Studio
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-foreground/70">{f.steps.join(' · ')}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-ink-title">{cop(f.usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </Section>

      <Section title="Tarifas vigentes" description="Precio oficial por millón de tokens, en dólares. Se editan en lib/ai/pricing.ts.">
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-nav-inactive-border text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Modelo</th>
                <th className="px-4 py-3 text-right">Entrada</th>
                <th className="px-4 py-3 text-right">Salida</th>
                <th className="px-4 py-3">Notas</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(AI_MODELS).map(([id, m]) => {
                const r = rateFor(id)
                const per = (v?: number) => (v === undefined ? '—' : `$${(v * 1e6).toLocaleString('en-US', { maximumFractionDigits: 3 })}`)
                return (
                  <tr key={id} className="border-b border-nav-inactive-border/70 last:border-0 align-top">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink-title">{m.label}</p>
                      <p className="text-xs text-muted-foreground">{m.provider}</p>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {m.unit === 'minute' ? `$${r?.perMinute}/min` : per(r?.input)}
                      {r?.imageInput !== undefined && <span className="block text-xs text-muted-foreground">imagen {per(r.imageInput)}</span>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{m.unit === 'minute' ? '—' : per(r?.output)}</td>
                    <td className="px-4 py-3 text-xs text-foreground/70">
                      {m.note && <p>{m.note}</p>}
                      <p className="text-muted-foreground">{m.source}</p>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
          <li>
            Pesos a la TRM {trm.day ? `del ${trm.day}` : 'de respaldo'}: ${' '}
            {trm.rate.toLocaleString('es-CO', { maximumFractionDigits: 2 })} por dólar
            {trm.day ? ' (datos.gov.co).' : ' — no se pudo leer la TRM oficial.'}
          </li>
          <li>
            La voz de Lucy ({voiceSessions} sesiones en el período) se paga directo a OpenAI desde el navegador: el
            servidor no ve sus tokens. Revísala en el panel de uso de OpenAI.
          </li>
          <li>Los costos de cada fila quedan congelados con la tarifa de su día: cambiar una tarifa no reescribe el pasado.</li>
          <li>Las pruebas locales y los scripts de mantenimiento no se registran aquí.</li>
        </ul>
      </Section>
    </AdminPage>
  )
}

function EmptyState() {
  return (
    <Card className="px-6 py-10 text-center text-sm text-muted-foreground">
      Todavía no hay consumo registrado en este período. Se empieza a medir con el próximo producto que se importe o se genere.
    </Card>
  )
}

function bogota(iso: string): string {
  const d = new Date(new Date(iso).getTime() - 5 * 3600 * 1000)
  const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic']
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} · ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}
