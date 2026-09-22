import Image from 'next/image'
import { Check } from 'lucide-react'
import { DestacadoBoxContents as VipBoxContentsData } from '@/lib/types'
import { DestacadoSection, DestacadoSectionHeader } from './destacado-section-header'
import { sanityCdnImage } from '@/lib/sanity/cdn-image'

interface Props {
  data: VipBoxContentsData
}

export function DestacadoBoxContents({ data }: Props) {
  const items = data.items?.filter((i) => i && i.trim().length > 0) ?? []
  if (!data.image && items.length === 0) return null

  return (
    <DestacadoSection>
        <DestacadoSectionHeader
          eyebrow="Qué viene en la caja"
          title={data.title || 'Todo lo que recibes'}
          subtitle={data.intro}
        />

        <div className={`grid gap-8 lg:gap-16 ${data.image ? 'md:grid-cols-2 md:items-center' : ''}`}>
          {data.image && (
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-surface-muted">
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
            <ul className={`divide-y divide-nav-inactive-border border-y border-nav-inactive-border ${data.image ? '' : 'md:columns-2 md:gap-12'}`}>
              {items.map((item, i) => (
                <li key={i} className="flex break-inside-avoid items-start gap-3 py-4">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-todopolis-lavender-deep" strokeWidth={3} />
                  <span className="leading-relaxed text-ink-title">{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
    </DestacadoSection>
  )
}
