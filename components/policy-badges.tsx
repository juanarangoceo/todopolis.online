import { Truck, ShieldCheck, WalletCards, Star, RefreshCw, Box, CheckCircle, Headphones, ArrowRight } from 'lucide-react'
import { StorePolicy } from '@/lib/types'

const IconMap: Record<string, React.ElementType> = {
  Truck, ShieldCheck, WalletCards, Star, RefreshCw, Box, CheckCircle, Headphones,
}

interface PolicyBadgesProps {
  policies: StorePolicy[]
  /** Enlace de WhatsApp para el cierre de la sección. Sin número, no se pinta. */
  whatsappHref?: string | null
}

// «Así compras en Todópolis»: el recorrido de una compra en tres pasos, en el
// home entre Novedades y el catálogo.
//
// Fueron tres recuadros sueltos sin encabezado, con el ícono en su propia caja
// dentro de la tarjeta (cajas dentro de cajas), y en móvil solo el título a
// 11 px. Eran tres datos, no una respuesta. Ahora se leen en orden, que es
// justo la duda del comprador que llega del anuncio: ¿cómo pago?, ¿cuándo me
// llega?, ¿y si llega mal? Listas con filetes, no tarjetas, igual que la ficha.
export function PolicyBadges({ policies, whatsappHref }: PolicyBadgesProps) {
  // Filtramos legacy 'Lock' (privacidad) que ya no aplica para contraentrega.
  const displayPolicies = (policies?.length > 0 ? policies : [])
    .filter(p => p.iconName !== 'Lock')
    .slice(0, 3)

  if (displayPolicies.length === 0) return null

  return (
    <section className="w-full border-y border-nav-inactive-border bg-surface py-8 md:py-12" aria-labelledby="como-compras-titulo">
      <div className="container mx-auto px-4">
        <p className="mb-2 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
          <span aria-hidden className="h-px w-6 bg-todopolis-lavender-deep/60" />
          Cómo compras
        </p>
        <h2
          id="como-compras-titulo"
          className="font-serif text-2xl font-extrabold leading-tight tracking-[-0.02em] text-ink-title text-balance md:text-[2rem]"
        >
          Así compras en Todópolis
        </h2>

        <ol className="mt-6 divide-y divide-nav-inactive-border md:mt-8 md:grid md:grid-cols-3 md:divide-x md:divide-y-0">
          {displayPolicies.map((policy, i) => {
            const Icon = IconMap[policy.iconName] || CheckCircle
            return (
              <li
                key={i}
                className="flex gap-4 py-4 first:pt-0 last:pb-0 md:flex-col md:gap-3 md:px-8 md:py-0 md:first:pl-0 md:last:pr-0"
              >
                <div className="flex shrink-0 items-center gap-3 md:gap-4">
                  <span className="w-5 font-serif text-sm font-extrabold tabular-nums text-muted-foreground md:w-auto">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <Icon className="h-6 w-6 text-trust-fg" strokeWidth={1.75} aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="font-serif text-base font-extrabold leading-snug text-ink-title md:text-lg">{policy.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{policy.description}</p>
                </div>
              </li>
            )
          })}
        </ol>

        {whatsappHref && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-todopolis-lavender-deep transition-all hover:gap-2.5 md:mt-8"
          >
            ¿Dudas antes de pedir? Escríbenos por WhatsApp
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </section>
  )
}
