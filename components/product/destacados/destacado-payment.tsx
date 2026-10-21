import Image from 'next/image'
import { Banknote, Timer, Truck, Zap } from 'lucide-react'
import { ConfioLogo } from '@/components/confio-logo'
import { CONFIO_PAYMENT_LOGOS } from '@/components/payment-logos'
import { DestacadoSection, DestacadoSectionHeader, DestacadoSplit } from './destacado-section-header'

// «Cómo pagas», en la parte blanca de la landing, pegado al cierre: la última
// objeción se resuelve justo antes del botón. Antes esta explicación vivía en
// el pie de página, sobre fondo oscuro, DESPUÉS del botón de compra.
//
// NARRATIVA (21-oct-2026, decisión de Juan): RAPIDEZ y MEDIOS DE PAGO, la de
// Nitro Complete. NO se dice que Confío guarda, retiene o custodia el dinero,
// ni que lo devuelve, ni se le llama «pago protegido» (ver
// lib/payments/narrative.ts, que lo prohíbe también a la IA).
//
// La rapidez es del PAGO —segundos para pagar, minutos para que se confirme
// solo (la reconciliación con Confío corre cada 5 min)—, no del envío: pagues
// como pagues, llega en 3 a 7 días hábiles, y eso va en la misma fila para que
// nadie lea «pago rápido» como «llega antes».
//
// Mismo criterio de encendido que PaymentMethods y el botón del checkout
// (`NEXT_PUBLIC_CONFIO_ENABLED`): si el prepago está apagado no se pinta nada.
// Se lee la variable directamente porque este es un componente de servidor.

// Plazo de entrega: el de `store-policies.tsx`.
const SPEED = [
  { icon: Zap, big: 'Segundos', text: 'Para pagar con Confío desde tu celular.' },
  { icon: Timer, big: 'Minutos', text: 'Para que se confirme solo, sin comprobantes.' },
  { icon: Truck, big: '3 a 7 días', text: 'Hábiles en llegarte, pagues como pagues.' },
]

const CONFIO_STEPS = [
  {
    title: 'Eliges Confío al pedir',
    text: 'Te llevamos a Confío. Tus datos bancarios nunca pasan por Todópolis.',
  },
  {
    title: 'Pagas desde tu celular',
    text: 'Con PSE, Nequi o Bancolombia, lo que ya usas. Toma segundos.',
  },
  {
    title: 'Se confirma solo',
    text: 'En minutos, sin mandar capturas ni comprobantes. Y empezamos a preparar tu pedido.',
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

// Pasos numerados unidos por una línea: se leen como un recorrido, no como
// tres datos sueltos.
function Steps({ steps }: { steps: { title: string; text: string }[] }) {
  return (
    <ol className="mt-6">
      {steps.map((step, i) => (
        <li key={step.title} className="relative flex gap-4 pb-6 last:pb-0">
          {i < steps.length - 1 && (
            <span aria-hidden className="absolute bottom-1 left-[15px] top-9 w-px bg-trust-border" />
          )}
          <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-trust-fg font-serif text-sm font-extrabold text-white">
            {i + 1}
          </span>
          <div className="pt-1">
            <p className="font-bold leading-snug text-ink-title">{step.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

// Una ficha blanca por medio de pago, del mismo alto en las dos tarjetas.
const tile = 'flex h-12 items-center justify-center rounded-xl border border-nav-inactive-border bg-surface px-2'

// Las dos tarjetas son GEMELAS: mismo ancho, mismo alto y la misma estructura
// (cabecera, antetítulo, titular, tres pasos y, abajo, con qué pagas). Las dos
// vías valen igual; el comprador elige en el último paso.
const card = 'flex flex-col rounded-3xl border bg-surface p-6 shadow-sm md:p-7'
const eyebrow = 'text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground'
const cardTitle = 'mt-1 font-serif text-xl font-extrabold leading-tight tracking-[-0.01em] text-ink-title md:text-2xl'

export function DestacadoPayment() {
  if (process.env.NEXT_PUBLIC_CONFIO_ENABLED !== 'true') return null

  return (
    <DestacadoSection id="como-pagas" className="scroll-mt-24">
      <DestacadoSplit
        header={
          <DestacadoSectionHeader
            eyebrow="Cómo pagas"
            title="Paga en segundos con Confío, o al recibir"
            subtitle="Tú eliges en el último paso: ya mismo con lo que tienes en el celular, o en efectivo cuando te llega. Sin tarjeta."
            className="lg:mb-0"
          />
        }
      >
        <dl className="grid grid-cols-3 gap-2 sm:gap-4">
          {SPEED.map(({ icon: Icon, big, text }) => (
            <div key={big} className="rounded-2xl bg-trust-bg p-3 sm:rounded-3xl sm:p-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-trust-fg sm:h-10 sm:w-10">
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </span>
              <dt className="mt-3 font-serif text-base font-extrabold leading-tight tracking-[-0.02em] text-ink-title sm:text-2xl">
                {big}
              </dt>
              <dd className="mt-1 text-xs leading-snug text-foreground/70 sm:text-sm sm:leading-relaxed">{text}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className={`${card} border-trust-border`}>
            <div className="mb-5 flex h-10 items-center">
              <ConfioLogo className="h-9 md:h-10" />
            </div>
            <p className={eyebrow}>Pagas ya</p>
            <h3 className={cardTitle}>Pagas en segundos</h3>
            <Steps steps={CONFIO_STEPS} />
            <div className="mt-auto pt-7">
              <p className="text-xs font-bold text-muted-foreground">Pagas con lo que ya tienes en el celular</p>
              <ul className="mt-3 grid grid-cols-3 gap-2" aria-label="Medios de pago con Confío">
                {CONFIO_PAYMENT_LOGOS.map((logo) => (
                  <li key={logo.src} className={tile}>
                    <Image src={logo.src} alt={logo.alt} width={200} height={60} className="h-auto max-h-8 w-full object-contain" />
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className={`${card} border-nav-inactive-border`}>
            <div className="mb-5 flex h-10 items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-trust-bg text-trust-fg">
                <Banknote className="h-5 w-5" />
              </span>
              <span className="font-serif text-lg font-extrabold text-ink-title">Contraentrega</span>
            </div>
            <p className={eyebrow}>Pagas al recibir</p>
            <h3 className={cardTitle}>No adelantas nada</h3>
            <Steps steps={COD_STEPS} />
            <div className="mt-auto pt-7">
              <p className="text-xs font-bold text-muted-foreground">Pagas con</p>
              <div className={`${tile} mt-3 gap-2 text-sm font-bold text-ink-title`}>
                <Banknote className="h-4 w-4 text-trust-fg" />
                Efectivo, al mensajero
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
