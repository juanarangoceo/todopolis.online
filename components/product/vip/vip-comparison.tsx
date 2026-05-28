import { Check, X } from 'lucide-react'
import { VipComparison as VipComparisonData } from '@/lib/types'
import { VipSectionHeader } from './vip-section-header'

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
            ? { background: 'linear-gradient(135deg, #FCD34D, #F59E0B)' }
            : { background: '#E5E7EB' }}
        >
          <Check className={`w-3 h-3 ${accent === 'positive' ? 'text-amber-900' : 'text-gray-600'}`} strokeWidth={3} />
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

export function VipComparison({ data }: Props) {
  const rows = data.rows?.filter((r) => r.feature) ?? []
  if (rows.length === 0) return null

  const ourLabel = data.ourLabel || 'Con Todopolis'
  const theirLabel = data.theirLabel || 'Otros'

  return (
    <section className="py-10 md:py-14 bg-surface-soft">
      <div className="container mx-auto px-4">
        <VipSectionHeader
          eyebrow="Cómo nos comparamos"
          title={data.title || 'No es lo mismo'}
        />

        <div className="max-w-3xl mx-auto rounded-2xl overflow-hidden border border-amber-200/60 shadow-md bg-surface">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-amber-200/50">
                <th className="px-4 md:px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-foreground/55">
                  Característica
                </th>
                <th
                  className="px-4 md:px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-amber-900"
                  style={{ background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)' }}
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
                <tr key={row._key ?? i} className="border-b border-amber-100/60 last:border-0">
                  <td className="px-4 md:px-6 py-3.5 font-semibold text-foreground text-sm">
                    {row.feature}
                  </td>
                  <td
                    className="px-4 md:px-6 py-3.5"
                    style={{ background: 'rgba(254, 243, 199, 0.35)' }}
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
      </div>
    </section>
  )
}
