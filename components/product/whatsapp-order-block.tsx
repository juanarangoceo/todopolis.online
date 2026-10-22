import { Check } from 'lucide-react'
import { WhatsAppIcon } from '@/components/whatsapp-icon'
import { DestacadoSection, DestacadoSectionHeader, DestacadoSplit } from './destacados/destacado-section-header'

// «Pídelo por WhatsApp» (22-oct-2026). En Colombia mucha gente prefiere pedir
// por chat que llenar un formulario: la burbuja ya existe, pero es un botón
// que no dice qué pasa al tocarlo. Este bloque va justo después del cierre,
// para quien llegó al botón y no lo tocó, y abre el chat con el producto y el
// precio ya escritos.
//
// Solo promete lo que pasa: mismo precio, mismas formas de pago y mismo plazo
// (`store-policies.tsx`). No dice «te atiende una persona»: el chat lo puede
// responder el asesor de Nitro.
const POINTS = [
  'Te ayudamos a elegir talla, color o modelo.',
  'Confirmas el pedido en el chat, sin llenar formularios.',
  'Mismo precio y pagas igual: al recibir o con Confío.',
]

export function WhatsAppOrderBlock({ href }: { href: string | null }) {
  if (!href) return null
  return (
    <DestacadoSection>
      <DestacadoSplit
        header={
          <DestacadoSectionHeader
            eyebrow="¿Prefieres el chat?"
            title="Pídelo por WhatsApp"
            subtitle="Escríbenos y te tomamos el pedido por chat. El mensaje ya va con el producto y el precio."
            className="lg:mb-0"
          />
        }
      >
        <div className="rounded-3xl border border-nav-inactive-border bg-surface p-5 shadow-sm md:p-7">
          <ul className="space-y-3">
            {POINTS.map((point) => (
              <li key={point} className="flex gap-3 text-base leading-snug text-foreground/80">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-trust-fg" strokeWidth={2.5} />
                <span>{point}</span>
              </li>
            ))}
          </ul>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#25D366] px-6 py-4 text-base font-bold text-white shadow-sm transition-transform active:scale-[0.98] md:w-auto md:inline-flex"
          >
            <WhatsAppIcon className="h-5 w-5" />
            Pedir por WhatsApp
          </a>
          <p className="mt-3 text-sm text-muted-foreground">Llega en 3 a 7 días hábiles a cualquier parte de Colombia.</p>
        </div>
      </DestacadoSplit>
    </DestacadoSection>
  )
}
