'use client'

import { useId, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProductDisclosureProps {
  id?: string
  title: string
  description: string
  children: ReactNode
}

// Cada sección conserva su estado: consultar las medidas no cierra los usos
// ni mueve el punto de lectura. El contenido se entrega en el HTML inicial.
export function ProductDisclosure({ id, title, description, children }: ProductDisclosureProps) {
  const [expanded, setExpanded] = useState(false)
  const disclosureId = useId()
  const triggerId = `${disclosureId}-trigger`
  const titleId = `${disclosureId}-title`
  const descriptionId = `${disclosureId}-description`
  const panelId = `${disclosureId}-panel`

  return (
    <section id={id} className="scroll-mt-24 bg-surface">
      <div className="container mx-auto px-4">
        <div className="border-b border-nav-inactive-border">
          <h2>
            <button
              id={triggerId}
              type="button"
              aria-expanded={expanded}
              aria-controls={panelId}
              aria-labelledby={titleId}
              aria-describedby={descriptionId}
              onClick={() => setExpanded((value) => !value)}
              className={cn(
                'group flex w-full cursor-pointer items-center justify-between gap-5 rounded-xl px-3 py-6 text-left transition-colors duration-200 hover:bg-surface-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-todopolis-lavender-deep motion-reduce:transition-none md:px-5 md:py-7',
                expanded && 'bg-surface-soft',
              )}
            >
              <span className="min-w-0">
                <span id={titleId} className="block font-serif text-xl font-extrabold leading-snug tracking-[-0.02em] text-ink-title md:text-2xl">
                  {title}
                </span>
                <span id={descriptionId} className="mt-1.5 block text-sm font-normal leading-relaxed text-muted-foreground">
                  {description}
                </span>
              </span>
              <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-nav-inactive-border text-todopolis-lavender-deep group-hover:border-todopolis-lavender-deep/40">
                <ChevronDown className={cn('h-5 w-5 transition-transform duration-200 motion-reduce:transition-none', expanded && 'rotate-180')} />
              </span>
            </button>
          </h2>
          <div id={panelId} role="region" aria-labelledby={triggerId} hidden={!expanded}>
            <div className="px-3 pt-6 pb-8 md:px-5 md:pt-8 md:pb-10">{children}</div>
          </div>
        </div>
      </div>
    </section>
  )
}
