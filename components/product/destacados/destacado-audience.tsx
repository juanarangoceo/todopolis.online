import { Check, X } from 'lucide-react'
import { AudienceFit } from '@/lib/types'
import { DestacadoSection, DestacadoSectionHeader } from './destacado-section-header'

interface Props {
  fit?: AudienceFit
}

// «¿Es para ti?» — para quién sí y, sobre todo, para quién NO.
//
// Decir con honestidad a quién no le sirve da más confianza que otra lista de
// beneficios (el comprador nota que no le están vendiendo a toda costa) y
// baja las devoluciones de quien compró esperando otra cosa, que en
// contraentrega son paquetes rechazados en la puerta. Lo escribe la IA con el
// resto de la landing (`audienceFit` en lib/product-content-prompt.ts).
export function DestacadoAudience({ fit }: Props) {
  const forWho = (fit?.forWho ?? []).map((s) => s?.trim()).filter(Boolean) as string[]
  const notFor = (fit?.notFor ?? []).map((s) => s?.trim()).filter(Boolean) as string[]
  if (forWho.length === 0) return null

  return (
    <DestacadoSection>
      <DestacadoSectionHeader eyebrow="Antes de decidir" title="¿Es para ti?" />
      <div className={`grid gap-10 ${notFor.length ? 'md:grid-cols-2 lg:gap-16' : ''}`}>
        <div>
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.16em] text-trust-fg">Es para ti si…</p>
          <ul className="divide-y divide-nav-inactive-border border-y border-nav-inactive-border">
            {forWho.map((item, i) => (
              <li key={i} className="flex gap-3 py-4">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-trust-fg" strokeWidth={2.5} />
                <span className="leading-relaxed text-ink-title">{item}</span>
              </li>
            ))}
          </ul>
        </div>
        {notFor.length > 0 && (
          <div>
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.16em] text-muted-foreground">Mejor busca otra cosa si…</p>
            <ul className="divide-y divide-nav-inactive-border border-y border-nav-inactive-border">
              {notFor.map((item, i) => (
                <li key={i} className="flex gap-3 py-4">
                  <X className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={2.5} />
                  <span className="leading-relaxed text-foreground/75">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </DestacadoSection>
  )
}
