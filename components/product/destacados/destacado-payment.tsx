import { Banknote, Landmark, Smartphone } from 'lucide-react'
import { ConfioLogo } from '@/components/confio-logo'
import { DestacadoSection, DestacadoSectionHeader, DestacadoSplit } from './destacado-section-header'

// «Cómo pagas», en la parte blanca de la landing, entre las preguntas y el
// cierre: la última objeción se resuelve justo antes del botón. Antes esta explicación vivía en el pie de página,
// sobre fondo oscuro, DESPUÉS del botón de compra: quien tenía la duda
// «¿y si pago y no llega?» la resolvía cuando ya se había ido.
//
// Mismo criterio de encendido que PaymentMethods y el botón del checkout
// (`NEXT_PUBLIC_CONFIO_ENABLED`): si el prepago está apagado no se pinta nada,
// porque el hero y el cierre ya dicen «paga al recibir» y no hay nada más que
// explicar. Se lee la variable directamente porque este componente es de
// servidor y `advancePaymentVisible` vive en un módulo de cliente.
//
// CUIDADO CON LA PROMESA (ver CLAUDE.md → Confío): Confío retiene el PAGO, no
// garantiza la ENTREGA. Aquí se dice quién guarda el dinero y cuándo lo
// suelta; del despacho respondemos nosotros y eso no se le atribuye a Confío.
const STEPS = [
  {
    title: 'Pagas en Confío',
    text: 'Con PSE, Nequi o Bancolombia. Tus datos bancarios nunca pasan por Todópolis.',
  },
  {
    title: 'Confío guarda el dinero',
    text: 'Queda en custodia mientras preparamos y enviamos tu pedido. Nosotros no podemos tocarlo.',
  },
  {
    title: 'Confirmas que llegó',
    text: 'Ahí, y solo ahí, Confío nos entrega el pago. Si no llega, el dinero vuelve a ti.',
  },
]

export function DestacadoPayment() {
  if (process.env.NEXT_PUBLIC_CONFIO_ENABLED !== 'true') return null

  return (
    <DestacadoSection id="como-pagas" className="scroll-mt-24">
      <DestacadoSplit
        header={
          <DestacadoSectionHeader
            eyebrow="Cómo pagas"
            title="Paga al recibir, o paga con Confío"
            subtitle="Tú eliges en el último paso. En las dos vías el dinero no nos llega hasta que el pedido está en tus manos."
            className="lg:mb-0"
          />
        }
      >
        <div className="grid gap-4 md:grid-cols-5 md:items-start">
          {/* Contraentrega — la de siempre, corta: no hay nada que explicar. */}
          <div className="flex flex-col rounded-3xl border border-nav-inactive-border p-6 md:col-span-2 md:p-7">
            <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-trust-bg text-trust-fg">
              <Banknote className="h-5 w-5" />
            </span>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Contraentrega</p>
            <h3 className="mt-1 font-serif text-xl font-bold leading-tight text-ink-title">
              Pagas en efectivo cuando te lo entregan
            </h3>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              No adelantas nada. Recibes el paquete, lo miras y le pagas al mensajero.
            </p>
          </div>

          {/* Confío — la que necesita explicación: quién guarda la plata y
              cuándo la suelta. */}
          <div className="rounded-3xl border border-trust-border bg-trust-bg/60 p-6 md:col-span-3 md:p-7">
            <div className="mb-5 flex items-center justify-between gap-3">
              <ConfioLogo className="h-8 md:h-9" />
              <div className="flex flex-wrap justify-end gap-1.5">
                {[
                  { icon: Landmark, label: 'PSE' },
                  { icon: Smartphone, label: 'Nequi' },
                  { icon: Landmark, label: 'Bancolombia' },
                ].map(({ icon: Icon, label }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1 rounded-full border border-trust-border bg-surface px-2.5 py-1 text-[11px] font-bold text-trust-fg"
                  >
                    <Icon className="h-3 w-3" />
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-trust-fg/70">Pago protegido</p>
            <h3 className="mt-1 font-serif text-xl font-bold leading-tight text-ink-title">
              Pagas ahora, pero la plata la guarda Confío
            </h3>

            <ol className="mt-6 space-y-5">
              {STEPS.map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface font-serif text-sm font-extrabold text-trust-fg ring-1 ring-trust-border">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-bold leading-snug text-ink-title">{step.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
          Si no pagas el cobro de Confío en 3 días, vence solo y no se genera ningún cargo. No manejamos tarjeta de crédito ni débito.
        </p>
      </DestacadoSplit>
    </DestacadoSection>
  )
}
