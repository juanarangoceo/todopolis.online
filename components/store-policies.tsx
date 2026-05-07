import { StorePolicy } from '@/lib/types'
import { Truck, ShieldCheck, Lock, WalletCards, Star, RefreshCw, Box, CheckCircle } from 'lucide-react'

// Icon mapper from string to actual Lucide component
const IconMap: Record<string, React.ElementType> = {
  Truck,
  ShieldCheck,
  Lock,
  WalletCards,
  Star,
  RefreshCw,
  Box,
  CheckCircle,
}

// Fallback policies in case Sanity document is missing
const DEFAULT_POLICIES: StorePolicy[] = [
  {
    iconName: 'Truck',
    title: 'Envío Rápido y Seguro',
    description: 'Despachamos tu pedido en tiempo récord. Entregas a toda Colombia con transportadoras aliadas.',
  },
  {
    iconName: 'WalletCards',
    title: 'Pago Contra Entrega',
    description: 'Compra con total confianza. Paga en efectivo únicamente cuando recibas el producto en casa.',
  },
  {
    iconName: 'ShieldCheck',
    title: 'Garantía de Calidad',
    description: 'Todos nuestros productos pasan por un estricto control. Garantía total por defectos de fábrica.',
  },
  {
    iconName: 'Lock',
    title: 'Privacidad Protegida',
    description: 'Tus datos están 100% seguros con nosotros y no los compartimos con terceros.',
  },
]

export function StorePolicies({ policies }: { policies?: StorePolicy[] }) {
  const displayPolicies = policies && policies.length > 0 ? policies : DEFAULT_POLICIES

  return (
    <div className="w-full bg-white/50 backdrop-blur-sm rounded-2xl p-6 md:p-8 mt-12 mb-8 border border-neutral-100 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {displayPolicies.map((policy, idx) => {
          const Icon = IconMap[policy.iconName] || CheckCircle

          return (
            <div key={idx} className="flex flex-col items-center text-center p-4">
              <div className="w-14 h-14 rounded-full bg-yellow-100 flex items-center justify-center mb-4 text-yellow-600">
                <Icon className="w-7 h-7" />
              </div>
              <h3 className="font-semibold text-neutral-900 mb-2">{policy.title}</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">
                {policy.description}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
