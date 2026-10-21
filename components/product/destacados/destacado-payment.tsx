import { Banknote } from 'lucide-react'
import { ConfioLogo } from '@/components/confio-logo'
import { PaymentLogos } from '@/components/payment-logos'
import { DestacadoSection, DestacadoSectionHeader, DestacadoSplit } from './destacado-section-header'

// «Cómo pagas», en la parte blanca de la landing, pegado al cierre: la última
// objeción se resuelve justo antes del botón. Antes esta explicación vivía en
// el pie de página, sobre fondo oscuro, DESPUÉS del botón de compra: quien
// tenía la duda «¿y si pago y no llega?» la resolvía cuando ya se había ido.
//
// Narrativa de oct 2026, la de Nitro Complete: RAPIDEZ del pago y los logos de
// los medios con que se paga. La rapidez es del PAGO —segundos para pagar,
// minutos para que se confirme solo (la reconciliación con Confío corre cada
// 5 min)—, no del envío: pagues como pagues, llega en 3 a 7 días hábiles, y
// eso se dice en la misma fila para que nadie lea «pago rápido» como «llega
// antes».
//
// Mismo criterio de encendido que PaymentMethods y el botón del checkout
// (`NEXT_PUBLIC_CONFIO_ENABLED`): si el prepago está apagado no se pinta nada,
// porque el hero y el cierre ya dicen «paga al recibir» y no hay nada más que
// explicar. Se lee la variable directamente porque este es un componente de
// servidor.
//
// CUIDADO CON LA PROMESA (ver CLAUDE.md → Confío): Confío retiene el PAGO, no
// garantiza la ENTREGA. Aquí se dice quién guarda el dinero y cuándo lo
// suelta; del despacho respondemos nosotros y eso no se le atribuye a Confío.

// Plazo de entrega: el de `store-policies.tsx`.
const SPEED = [
  { big: 'Segundos', text: 'Lo que tardas en pagar con Confío desde tu celular.' },
  { big: 'Minutos', text: 'Lo que tarda en confirmarse tu pago, solo. Sin mandar capturas ni comprobantes.' },
  { big: '3 a 7 días hábiles', text: 'Lo que tarda en llegarte el pedido, pagues como pagues.' },
]

const CONFIO_STEPS = [
  {
    title: 'Pagas desde tu celular',
    text: 'Con PSE, Nequi o Bancolombia, en segundos. Tus datos bancarios nunca pasan por Todópolis.',
  },
  {
    title: 'Confío guarda el dinero',
    text: 'El pago se confirma solo y queda en custodia mientras preparamos y enviamos tu pedido. Nosotros no podemos tocarlo.',
  },
  {
    title: 'Confirmas que llegó',
    text: 'Ahí, y solo ahí, Confío nos entrega el pago. Si no llega, el dinero vuelve a ti.',
  },
]

const COD_STEPS = [
  {
    title: 'Pides sin pagar nada',
    text: 'Solo llenas tus datos de entrega. No te pedimos tarjeta ni transferencia.',
  },
  {
    title: 'Te llega en 3 a 7 días hábiles',
    text: 'A la dirección que nos diste, en cualquier parte del país.',
  },
  {
    title: 'Pagas en efectivo al recibirlo',
    text: 'Le pagas al mensajero el total del pedido, con el envío incluido.',
  },
]

function Steps({ steps }: { steps: { title: string; text: string }[] }) {
  return (
    <ol className="mt-6 space-y-5">
      {steps.map((step, i) => (
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
  )
}

// Las dos tarjetas son GEMELAS: mismo ancho, mismo alto y la misma estructura
// (cabecera, antetítulo, titular, tres pasos y, abajo, con qué pagas). Eran
// 2/5 contra 3/5 y la de contraentrega quedaba chata al lado de la de Confío:
// se veía descuadrado y, peor, sugería que una vía era la de verdad y la otra
// un apéndice. Las dos valen igual; el comprador elige en el último paso.
const card = 'flex flex-col rounded-3xl border p-6 md:p-7'
// El pie de las dos se alinea abajo aunque los pasos ocupen distinto alto.
const cardFoot = 'mt-auto pt-6'

export function DestacadoPayment() {
  if (process.env.NEXT_PUBLIC_CONFIO_ENABLED !== 'true') return null

  return (
    <DestacadoSection id="como-pagas" className="scroll-mt-24">
      <DestacadoSplit
        header={
          <DestacadoSectionHeader
            eyebrow="Cómo pagas"
            title="Paga al recibir, o paga con Confío en segundos"
            subtitle="Tú eliges en el último paso. En las dos vías el dinero no nos llega hasta que el pedido está en tus manos."
            className="lg:mb-0"
          />
        }
      >
        {/* Filetes, no tarjetas: las tarjetas vienen justo debajo. */}
        <dl className="grid gap-x-6 border-y border-nav-inactive-border py-5 sm:grid-cols-3">
          {SPEED.map((item, i) => (
            <div
              key={item.big}
              className={i > 0 ? 'mt-4 border-t border-nav-inactive-border pt-4 sm:mt-0 sm:border-t-0 sm:pt-0' : undefined}
            >
              <dt className="font-serif text-xl font-extrabold tracking-[-0.02em] text-ink-title md:text-2xl">{item.big}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.text}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className={`${card} border-nav-inactive-border bg-surface`}>
            <div className="mb-5 flex h-9 items-center">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-trust-bg text-trust-fg">
                <Banknote className="h-5 w-5" />
              </span>
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Contraentrega</p>
            <h3 className="mt-1 font-serif text-xl font-bold leading-tight text-ink-title">
              No adelantas nada: pagas cuando te lo entregan
            </h3>
            <Steps steps={COD_STEPS} />
            <div className={cardFoot}>
              <div className="border-t border-nav-inactive-border pt-5">
                <p className="text-xs font-bold text-muted-foreground">Pagas con</p>
                <p className="mt-2 flex h-7 items-center gap-1.5 text-sm font-bold text-trust-fg">
                  <Banknote className="h-4 w-4" />
                  Efectivo, al mensajero
                </p>
              </div>
            </div>
          </div>

          <div className={`${card} border-trust-border bg-trust-bg/60`}>
            <div className="mb-5 flex h-9 items-center">
              <ConfioLogo className="h-8 md:h-9" />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Pago protegido</p>
            <h3 className="mt-1 font-serif text-xl font-bold leading-tight text-ink-title">
              Pagas en segundos, y la plata la guarda Confío
            </h3>
            <Steps steps={CONFIO_STEPS} />
            <div className={cardFoot}>
              <div className="border-t border-trust-border pt-5">
                <p className="text-xs font-bold text-muted-foreground">Pagas con lo que ya tienes en el celular</p>
                <PaymentLogos className="mt-2 gap-x-2 md:gap-x-4" logoClassName="h-6 md:h-7" />
              </div>
            </div>
          </div>
        </div>

        <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
          Si no pagas el cobro de Confío en 3 días, vence solo y no se genera ningún cargo. No manejamos tarjeta de crédito ni débito.
        </p>
      </DestacadoSplit>
    </DestacadoSection>
  )
}
