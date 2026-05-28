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
              className="flex items-center gap-4 px-6 py-5 rounded-2xl bg-surface border border-nav-inactive-border hover:border-trust-border hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="w-12 h-12 shrink-0 rounded-xl flex items-center justify-center bg-trust-bg border border-trust-border">
                <Icon className="w-6 h-6 text-trust-fg" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-foreground text-sm leading-none truncate">{policy.title}</p>
                <p className="text-xs text-foreground/55 mt-1 truncate">{policy.description}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Mobile: icon + name text inline, evenly spaced */}
      <div className="md:hidden flex justify-around items-center py-2">
        {displayPolicies.map((policy, i) => {
          const Icon = IconMap[policy.iconName] || CheckCircle
          return (
            <div key={i} className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-trust-bg border border-trust-border">
                <Icon className="w-5 h-5 text-trust-fg" />
              </div>
              <span className="text-xs font-bold text-foreground/80">{policy.title}</span>
            </div>
          )
        })}
      </div>

    </div>
  )
}
