import Image from 'next/image'
import { DestacadoStep } from '@/lib/types'
import { DestacadoSection, DestacadoSectionHeader } from './destacado-section-header'
import { DestacadoSlider } from './destacado-slider'
import { ExpandableText } from '../expandable-text'
import { sanityCdnImage } from '@/lib/sanity/cdn-image'

interface Props {
  steps: DestacadoStep[]
}

export function DestacadoSteps({ steps }: Props) {
  const valid = steps.filter((s) => s.title)
  if (valid.length === 0) return null

  return (
    <DestacadoSection>
        <DestacadoSectionHeader eyebrow="Cómo se usa" title="Así se usa, paso a paso" />

        <DestacadoSlider slideClassName="w-[80%] sm:w-[280px]">
          {valid.map((step, i) => (
            <div
              key={step._key ?? i}
              className="relative flex flex-col h-full bg-surface rounded-2xl border border-nav-inactive-border overflow-hidden"
            >
              {step.image && (
                <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                  <Image
                    src={sanityCdnImage(step.image, 700)}
                    alt={step.imageAlt || step.title}
                    fill
                    sizes="290px"
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}
              <div className="relative p-5 md:p-6 flex-1">
                <span className="mb-2 block font-serif text-sm font-extrabold tabular-nums text-todopolis-lavender-deep">
                  Paso {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="font-bold text-lg text-foreground leading-snug mb-1.5">
                  {step.title}
                </h3>
                <ExpandableText text={step.description} threshold={90} />
              </div>
            </div>
          ))}
        </DestacadoSlider>
    </DestacadoSection>
  )
}
