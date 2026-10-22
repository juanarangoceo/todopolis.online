import { Truck, ShieldCheck, WalletCards, Star, RefreshCw, Box, CheckCircle, Headphones, ArrowRight, Banknote } from 'lucide-react'
import { ConfioLogo } from './confio-logo'
import { PaymentLogos } from './payment-logos'
import { StorePolicy } from '@/lib/types'

const IconMap: Record<string, React.ElementType> = {
  Truck, ShieldCheck, WalletCards, Star, RefreshCw, Box, CheckCircle, Headphones,
}

interface PolicyBadgesProps {
  policies: StorePolicy[]
  /** Enlace de WhatsApp para el cierre de la sección. Sin número, no se pinta. */
  whatsappHref?: string | null
  /** Con Confío encendido, las dos formas de pago como tarjetas gemelas. */
  showPayments?: boolean
}

// Las dos formas de pago del home (22-oct-2026), con la misma narrativa que la
// ficha: Confío por RAPIDEZ y medios de pago —nunca custodia, ver
// `lib/payments/narrative.ts`—, contraentrega por no adelantar nada. Son
// enlaces al catálogo: en el home no hay producto que comprar todavía, y una
// tarjeta con borde que no hace nada al tocarla frustra.
const payCard =
  'group flex h-full flex-col rounded-3xl border border-nav-inactive-border bg-surface p-5 shadow-sm transition-colors hover:border-trust-border hover:bg-trust-bg/40 md:p-6'

// «Así compras en Todópolis»: el recorrido de una compra en tres pasos, en el
// home entre Novedades y el catálogo.
//
// Fueron tres recuadros sueltos sin encabezado, con el ícono en su propia caja
// dentro de la tarjeta (cajas dentro de cajas), y en móvil solo el título a
// 11 px. Eran tres datos, no una respuesta. Ahora se leen en orden, que es
// justo la duda del comprador que llega del anuncio: ¿cómo pago?, ¿cuándo me
// llega?, ¿y si llega mal? Listas con filetes, no tarjetas, igual que la ficha.
export function PolicyBadges({ policies, whatsappHref, showPayments = false }: PolicyBadgesProps) {
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

        {showPayments && (
          <div className="mt-8 md:mt-10">
            <p className="mb-3 text-sm font-bold text-ink-title">Elige cómo pagar</p>
            <div className="grid gap-3 md:grid-cols-2 md:gap-4">
              <a href="#productos" className={payCard}>
                <ConfioLogo className="h-7 w-auto self-start" />
                <p className="mt-3 font-serif text-lg font-extrabold leading-snug text-ink-title">Pagar ya con Confío</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Pagas en segundos desde tu celular y se confirma solo en minutos, sin enviar comprobantes.
                </p>
                <PaymentLogos className="mt-4 gap-x-3" logoClassName="h-6" />
                <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-bold text-todopolis-lavender-deep transition-all group-hover:gap-2.5">
                  Elegir producto <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </a>
              <a href="#productos" className={payCard}>
                <span className="flex h-7 items-center gap-2 text-trust-fg">
                  <Banknote className="h-6 w-6" strokeWidth={1.75} aria-hidden />
                </span>
                <p className="mt-3 font-serif text-lg font-extrabold leading-snug text-ink-title">Contraentrega</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  No adelantas nada: le pagas en efectivo al mensajero cuando te llega.
                </p>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-bold text-todopolis-lavender-deep transition-all group-hover:gap-2.5">
                  Elegir producto <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </a>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">Pagues como pagues, llega en 3 a 7 días hábiles.</p>
          </div>
        )}

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
