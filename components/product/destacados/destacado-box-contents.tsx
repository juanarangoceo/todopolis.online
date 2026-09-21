import Image from 'next/image'
import { Check } from 'lucide-react'
import { DestacadoBoxContents as VipBoxContentsData } from '@/lib/types'
import { DestacadoSectionHeader } from './destacado-section-header'
import { sanityCdnImage } from '@/lib/sanity/cdn-image'

interface Props {
  data: VipBoxContentsData
}

export function DestacadoBoxContents({ data }: Props) {
  const items = data.items?.filter((i) => i && i.trim().length > 0) ?? []
  if (!data.image && items.length === 0) return null

  return (
    <section className="py-8 md:py-10 bg-surface-soft">
      <div className="container mx-auto px-4">
        <DestacadoSectionHeader
          eyebrow="Qué viene en la caja"
          title={data.title || 'Todo lo que recibes'}
          subtitle={data.intro}
        />

        <div className={`mx-auto grid max-w-5xl gap-8 ${data.image ? 'md:grid-cols-2 md:items-center' : 'max-w-2xl'}`}>
          {data.image && (
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-todopolis-lavender/50 bg-muted shadow-md">
              <Image
                src={sanityCdnImage(data.image, 1000)}
                alt={data.imageAlt || 'Contenido de la caja'}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
                unoptimized
              />
            </div>
          )}

          {items.length > 0 && (
            <ul className="space-y-3 rounded-3xl border border-nav-inactive-border bg-surface p-6 shadow-sm md:p-8">
              {items.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-todopolis-blue/70 bg-todopolis-blue/30 shadow-sm"
                  >
                    <Check className="h-3.5 w-3.5 text-todopolis-blue-deep" strokeWidth={3} />
                  </span>
                  <span className="text-foreground/85 leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
