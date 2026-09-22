import { Check, X } from 'lucide-react'
import { DestacadoComparison as VipComparisonData } from '@/lib/types'
import { DestacadoSection, DestacadoSectionHeader, DestacadoSplit } from './destacado-section-header'

interface Props {
  data: VipComparisonData
}

// Heurística para decidir si un valor de fila merece icono check/x. Si es
// corto y suena negativo ("no", "—", "nunca"), lo marca con X. Si es corto y
// afirmativo ("sí", "incluido"), lo marca con Check. Lo demás se renderiza
// como texto plano para no forzar la semántica.
function renderCell(value: string | undefined, accent: 'positive' | 'neutral'): React.ReactNode {
  if (!value) return <span className="text-foreground/30">—</span>
  const v = value.trim().toLowerCase()
  if (['si', 'sí', 'yes', 'incluido'].includes(v)) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span
          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
          style={accent === 'positive'
            ? { background: 'linear-gradient(135deg, var(--todopolis-blue), var(--todopolis-lavender))' }
            : { background: '#E5E7EB' }}
        >
          <Check className={`w-3 h-3 ${accent === 'positive' ? 'text-todopolis-blue-deep' : 'text-gray-600'}`} strokeWidth={3} />
        </span>
      </span>
    )
  }
  if (['no', 'nunca', 'no incluido', '—', '-'].includes(v)) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
          <X className="w-3 h-3 text-gray-400" strokeWidth={3} />
        </span>
      </span>
    )
  }
  return <span className="text-foreground/85 text-sm">{value}</span>
}

export function DestacadoComparison({ data }: Props) {
  const rows = data.rows?.filter((r) => r.feature) ?? []
  if (rows.length === 0) return null

  const ourLabel = data.ourLabel || 'Con Todópolis'
  const theirLabel = data.theirLabel || 'Otros'

  return (
    <DestacadoSection>
      <DestacadoSplit
        header={
          <DestacadoSectionHeader
            eyebrow="Frente a lo de siempre"
            title={data.title || 'No es lo mismo'}
            className="lg:mb-0"
          />
        }
      >
        <div className="rounded-2xl overflow-x-auto border border-nav-inactive-border bg-surface">
          <table className="w-full min-w-[420px] text-left">
            <thead>
              <tr className="border-b border-todopolis-lavender/40">
                <th className="px-4 md:px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-foreground/55">
                  Característica
                </th>
                <th
                  className="px-4 md:px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-todopolis-lavender-deep"
                  style={{ background: 'linear-gradient(135deg, rgba(162,210,255,.28) 0%, rgba(237,210,243,.5) 100%)' }}
                >
                  {ourLabel}
                </th>
                <th className="px-4 md:px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-foreground/55">
                  {theirLabel}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row._key ?? i} className="border-b border-todopolis-lavender/25 last:border-0">
                  <td className="px-4 md:px-6 py-3.5 font-semibold text-foreground text-sm">
                    {row.feature}
                  </td>
                  <td
                    className="px-4 md:px-6 py-3.5"
                    style={{ background: 'rgba(237, 210, 243, 0.2)' }}
                  >
                    {renderCell(row.ours, 'positive')}
                  </td>
                  <td className="px-4 md:px-6 py-3.5">
                    {renderCell(row.theirs, 'neutral')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DestacadoSplit>
    </DestacadoSection>
  )
}
