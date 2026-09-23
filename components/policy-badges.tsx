import { Truck, ShieldCheck, WalletCards, Star, RefreshCw, Box, CheckCircle, Headphones } from 'lucide-react'
import { StorePolicy } from '@/lib/types'

const IconMap: Record<string, React.ElementType> = {
  Truck, ShieldCheck, WalletCards, Star, RefreshCw, Box, CheckCircle, Headphones,
}

interface PolicyBadgesProps {
  policies: StorePolicy[]
}

export function PolicyBadges({ policies }: PolicyBadgesProps) {
  // Filtramos legacy 'Lock' (privacidad) que ya no aplica para contraentrega.
  const displayPolicies = (policies?.length > 0 ? policies : [])
    .filter(p => p.iconName !== 'Lock')
    .slice(0, 3)

  if (displayPolicies.length === 0) return null

  return (
    <div className="container mx-auto px-4 py-4 md:py-6">

      {/* Desktop: 3-col grid, larger badges — sistema unificado de confianza */}
      <div className="hidden md:grid md:grid-cols-3 gap-4">
        {displayPolicies.map((policy, i) => {
          const Icon = IconMap[policy.iconName] || CheckCircle
          return (
            <div
              key={i}
              className="flex items-start gap-4 px-6 py-5 rounded-2xl bg-surface border border-nav-inactive-border"
            >
              <div className="w-12 h-12 shrink-0 rounded-xl flex items-center justify-center bg-trust-bg border border-trust-border">
                <Icon className="w-6 h-6 text-trust-fg" />
              </div>
              <div className="min-w-0">
                {/* Sin `truncate`: la frase que se cortaba con «…» era justo la
                    que explica Confío. Un recuadro de confianza a medio leer
                    no da confianza. */}
                <p className="font-bold text-foreground text-sm leading-snug">{policy.title}</p>
                <p className="text-xs text-foreground/60 mt-1 leading-relaxed">{policy.description}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Móvil: tres columnas, ícono sobre el título. En fila los tres
          títulos no cabían en 390 px y el tercero se salía de la pantalla. */}
      <div className="md:hidden grid grid-cols-3 gap-2">
        {displayPolicies.map((policy, i) => {
          const Icon = IconMap[policy.iconName] || CheckCircle
          return (
            <div key={i} className="flex flex-col items-center gap-2 rounded-2xl border border-nav-inactive-border px-2 py-3 text-center">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-trust-bg border border-trust-border">
                <Icon className="w-[18px] h-[18px] text-trust-fg" />
              </div>
              <span className="text-[11px] font-bold leading-tight text-foreground/80 text-balance">{policy.title}</span>
            </div>
          )
        })}
      </div>

    </div>
  )
}
