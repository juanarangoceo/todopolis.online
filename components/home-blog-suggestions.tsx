'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { ArrowUpRight, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import type { HomeArticle } from '@/lib/home-articles'

const ROTATION_MS = 10_000
const MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const subscribeMotion = (notify: () => void) => {
  const query = window.matchMedia(MOTION_QUERY)
  query.addEventListener('change', notify)
  return () => query.removeEventListener('change', notify)
}
const reducedMotion = () => window.matchMedia(MOTION_QUERY).matches
const subscribeVisibility = (notify: () => void) => {
  document.addEventListener('visibilitychange', notify)
  return () => document.removeEventListener('visibilitychange', notify)
}
const pageVisible = () => document.visibilityState === 'visible'
const serverMotion = () => true
const serverVisible = () => false

export function HomeBlogSuggestions({ articles }: { articles: HomeArticle[] }) {
  const [index, setIndex] = useState(0)
  const [rotationChoice, setRotationChoice] = useState<boolean | null>(null)
  const [hovered, setHovered] = useState(false)
  const [inView, setInView] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const pointerRotation = useRef<boolean | null>(null)
  const prefersReducedMotion = useSyncExternalStore(subscribeMotion, reducedMotion, serverMotion)
  const isPageVisible = useSyncExternalStore(subscribeVisibility, pageVisible, serverVisible)
  const automatic = rotationChoice ?? !prefersReducedMotion
  const running = automatic && !hovered && inView && isPageVisible && articles.length > 1

  useEffect(() => {
    const node = rootRef.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio >= 0.6), { threshold: 0.6 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [articles.length])

  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % articles.length), ROTATION_MS)
    return () => window.clearInterval(timer)
  }, [running, articles.length])

  const activeIndex = articles.length ? index % articles.length : 0
  const current = articles[activeIndex]
  if (!current) return null

  const change = (direction: number) => {
    setRotationChoice(false)
    setIndex((value) => (value + direction + articles.length) % articles.length)
  }
  const control = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-muted hover:text-todopolis-lavender-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-todopolis-lavender-deep motion-reduce:transition-none'

  return (
    <div
      ref={rootRef}
      role="region"
      aria-label="Lecturas del blog"
      aria-roledescription="carrusel"
      onPointerEnter={(event) => { if (event.pointerType === 'mouse') setHovered(true) }}
      onPointerLeave={(event) => { if (event.pointerType === 'mouse') setHovered(false) }}
      onFocusCapture={() => setRotationChoice(false)}
      onTouchStart={() => setRotationChoice(false)}
      className="min-w-0 rounded-2xl border border-nav-inactive-border bg-surface-soft px-3 pb-2 md:px-4"
    >
      <div className="flex min-h-11 items-center justify-between gap-1">
        <p className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-[11px] text-muted-foreground">
          <span className="font-bold text-todopolis-lavender-deep">Del blog</span>
          {Number.isFinite(current.readingTime) && (current.readingTime ?? 0) > 0 && (
            <span>· {current.readingTime} min</span>
          )}
        </p>
        <div className="-mr-2 flex shrink-0 items-center">
      {articles.length > 1 && (
        <button
          type="button"
          className={control}
          aria-label={automatic ? 'Pausar sugerencias del blog' : 'Reanudar sugerencias del blog'}
          title={automatic ? 'Pausar sugerencias' : 'Reanudar sugerencias'}
          onPointerDown={() => { pointerRotation.current = automatic }}
          onPointerCancel={() => { pointerRotation.current = null }}
          onClick={(event) => {
            // El foco pausa antes del clic. Conserva la intención del puntero
            // para que pulsar «Pausar» no reactive la rotación por accidente.
            const wasAutomatic = event.detail > 0 && pointerRotation.current !== null ? pointerRotation.current : automatic
            pointerRotation.current = null
            setRotationChoice(!wasAutomatic)
          }}
        >
          {automatic ? <Pause aria-hidden="true" className="h-3.5 w-3.5" /> : <Play aria-hidden="true" className="h-3.5 w-3.5" />}
        </button>
      )}
      {articles.length > 1 && (
        <div className="flex shrink-0">
          <button type="button" className={control} onClick={() => change(-1)} aria-label="Lectura anterior" title="Lectura anterior">
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </button>
          <button type="button" className={control} onClick={() => change(1)} aria-label="Siguiente lectura" title="Siguiente lectura">
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      )}
        </div>
      </div>
      <div aria-live={automatic ? 'off' : 'polite'} aria-atomic="true">
        <div role="group" aria-roledescription="lectura" aria-label={`${activeIndex + 1} de ${articles.length}`}>
          <Link
            href={`/blog/${current.slug}`}
            prefetch={false}
            title={current.title}
            aria-label={`Leer guía: ${current.title}`}
            className="group flex min-h-11 items-start gap-3 rounded-sm text-sm font-bold leading-5 text-ink-title underline-offset-4 hover:text-todopolis-lavender-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-todopolis-lavender-deep"
          >
            <span className="min-w-0 flex-1 line-clamp-2 group-hover:underline">{current.title}</span>
            <ArrowUpRight aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-todopolis-lavender-deep" />
          </Link>
        </div>
      </div>
    </div>
  )
}
