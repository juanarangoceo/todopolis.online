import Image from 'next/image'
import { VipStep } from '@/lib/types'
import { VipSectionHeader } from './vip-section-header'
import { VipSlider } from './vip-slider'
import { ExpandableText } from '../expandable-text'

interface Props {
  steps: VipStep[]
}

export function VipSteps({ steps }: Props) {
  const valid = steps.filter((s) => s.title)
  if (valid.length === 0) return null

  return (
    <section className="py-8 md:py-10">
      <div className="container mx-auto px-4">
        <VipSectionHeader
          eyebrow="Cómo se usa"
          title="Tan fácil como esto"
          subtitle="Sin manual, sin curva de aprendizaje. Lo agarras y lo usas."
        />

        <VipSlider slideClassName="w-[80%] sm:w-[280px]">
          {valid.map((step, i) => (
            <div
              key={step._key ?? i}
              className="relative flex flex-col h-full bg-surface rounded-2xl border border-amber-200/60 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              {step.image && (
                <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                  <Image
                    src={step.image}
                    alt={step.imageAlt || step.title}
                    fill
                    sizes="290px"
                    className="object-cover"
                  />
                </div>
              )}
              <div className="relative p-5 md:p-6 flex-1">
                <span
                  className="inline-flex items-center justify-center w-9 h-9 rounded-xl font-black text-base mb-3 shadow-sm border border-amber-300"
                  style={{
                    background: 'linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%)',
                    color: '#5A3A0A',
                  }}
                >
                  {i + 1}
                </span>
                <h3 className="font-bold text-lg text-foreground leading-snug mb-1.5">
                  {step.title}
                </h3>
                <ExpandableText text={step.description} threshold={90} />
              </div>
            </div>
          ))}
        </VipSlider>
      </div>
    </section>
  )
}
