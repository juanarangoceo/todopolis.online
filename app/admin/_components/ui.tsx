import type { ReactNode } from 'react'

// Piezas comunes del panel. Mismo lenguaje que la tienda
// (docs/identidad-de-marca.md): antetítulo gris con filete, titular en
// Montserrat, tarjetas blancas con borde fino, color solo cuando significa algo.
// Sin 'use client': sirven igual en páginas de servidor y de cliente.

export function AdminPage({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-2 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              <span aria-hidden className="h-px w-6 bg-todopolis-lavender-deep/60" />
              {eyebrow}
            </p>
          )}
          <h1 className="font-serif text-2xl font-extrabold leading-tight tracking-[-0.02em] text-ink-title md:text-[2rem]">{title}</h1>
          {description && <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </header>
      {children}
    </div>
  )
}

export function Section({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-8 md:mt-10">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg font-extrabold text-ink-title">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-nav-inactive-border bg-surface ${className}`}>{children}</div>
}

export function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint?: string
  /** warn = ámbar (algo pendiente), danger = rojo coral de oferta/alerta. */
  tone?: 'warn' | 'danger' | 'ok'
}) {
  const color = tone === 'danger' ? 'text-sale' : tone === 'warn' ? 'text-amber-700' : tone === 'ok' ? 'text-trust-fg' : 'text-ink-title'
  return (
    <div className="rounded-3xl border border-nav-inactive-border bg-surface p-4 md:p-5">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 font-serif text-2xl font-extrabold tabular-nums md:text-[1.75rem] ${color}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

const PILL = {
  ok: 'bg-trust-bg text-trust-fg border-trust-border',
  warn: 'bg-amber-50 text-amber-800 border-amber-200',
  danger: 'bg-sale-soft text-sale border-sale/25',
  info: 'bg-tag-active-bg text-tag-active-fg border-todopolis-lavender-deep/20',
  muted: 'bg-surface-muted text-foreground/60 border-nav-inactive-border',
} as const

export function StatusPill({ tone, children }: { tone: keyof typeof PILL; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${PILL[tone]}`}>
      {children}
    </span>
  )
}

/** Hace `days` días, en ISO. Fuera del render para que la página quede pura. */
export function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86400_000).toISOString()
}
