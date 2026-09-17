import { StorePolicy } from '@/lib/types'
import { advancePaymentEnabled } from '@/lib/payments/config'
import { Truck, ShieldCheck, WalletCards, Star, RefreshCw, Box, CheckCircle, Headphones } from 'lucide-react'

// Icon mapper from string to actual Lucide component
const IconMap: Record<string, React.ElementType> = {
  Truck,
  ShieldCheck,
  WalletCards,
  Star,
  RefreshCw,
  Box,
  CheckCircle,
  Headphones,
}

// Fallback policies in case Sanity document is missing
function defaultPolicies(): StorePolicy[] {
  return [
  {
    iconName: 'Truck',
    title: 'Llega en 3 a 7 días hábiles',
    description: 'Envío de $12.000 a todo el país, gratis en los productos Destacados. Te mandamos la guía por WhatsApp al despachar.',
  },
  {
    iconName: 'WalletCards',
    // El texto depende de si el pago anticipado está encendido. Antes decía
    // "Paga en efectivo ÚNICAMENTE cuando recibas", que con Confío activo
    // contradice al bloque de medios de pago que está más arriba en la misma
    // página. Un comprador que lea las dos cosas no sabe cuál creer.
    title: advancePaymentEnabled() ? 'Paga al recibir, o con Confío' : 'Pagas cuando lo recibes',
    description: advancePaymentEnabled()
      ? 'Contraentrega: pagas en efectivo cuando te lo entregan. Con Confío: pagas por PSE, Nequi o Bancolombia y la app retiene tu plata hasta que confirmes que llegó.'
      : 'Compra con total confianza. Paga en efectivo únicamente cuando recibas el producto en casa.',
  },
  {
    // "Garantía de Calidad / control estricto" no decía nada comprobable ni
    // resolvía una duda. El plazo real de devolución sí, y está en el footer.
    iconName: 'RefreshCw',
    title: '30 días para devolver',
    description: 'Si el producto llega con un defecto, escríbenos con fotos por WhatsApp y lo reponemos o te devolvemos el dinero.',
  },
  {
    iconName: 'Headphones',
    title: 'Atención Cercana',
    description: 'Lucy, nuestra IA, te acompaña 24/7. Y si necesitas un humano, también estamos.',
  },
  ]
}

export function StorePolicies({ policies }: { policies?: StorePolicy[] }) {
  const displayPolicies = policies && policies.length > 0 ? policies : defaultPolicies()

  return (
    <div className="w-full bg-surface rounded-2xl p-6 md:p-8 mt-12 mb-8 border border-nav-inactive-border shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {displayPolicies.map((policy, idx) => {
          const Icon = IconMap[policy.iconName] || CheckCircle

          return (
            <div key={idx} className="flex flex-col items-center text-center p-4">
              <div className="w-14 h-14 rounded-full bg-trust-bg border border-trust-border flex items-center justify-center mb-4 text-trust-fg">
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
