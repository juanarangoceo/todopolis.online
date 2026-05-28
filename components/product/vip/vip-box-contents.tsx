import Image from 'next/image'
import { Package, Check } from 'lucide-react'
import { VipBoxContents as VipBoxContentsData } from '@/lib/types'
import { VipSectionHeader } from './vip-section-header'

interface Props {
  data: VipBoxContentsData
}

export function VipBoxContents({ data }: Props) {
  const items = data.items?.filter((i) => i && i.trim().length > 0) ?? []
  if (!data.image && items.length === 0) return null

  return (
    <section className="py-10 md:py-14 bg-surface-soft">
      <div className="container mx-auto px-4">
        <VipSectionHeader
          eyebrow="Qué viene en la caja"
          title={data.title || 'Todo lo que recibes'}
          subtitle={data.intro}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-center max-w-5xl mx-auto">
          {data.image ? (
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-amber-200/60 shadow-md bg-muted">
              <Image
                src={data.image}
                alt={data.imageAlt || 'Contenido de la caja'}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="aspect-[4/3] rounded-2xl border-2 border-dashed border-amber-200 flex items-center justify-center bg-amber-50">
              <Package className="w-16 h-16 text-amber-400" />
            </div>
          )}

          {items.length > 0 && (
            <ul className="space-y-3">
              {items.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className="shrink-0 mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center border border-amber-300 shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%)' }}
                  >
                    <Check className="w-3.5 h-3.5 text-amber-900" strokeWidth={3} />
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
