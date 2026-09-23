'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import Link from 'next/link'
import { categoryTitle } from '@/lib/categories'
import { X, Clock, BookOpen } from 'lucide-react'
import { ArticleSections } from '@/components/blog/article-sections'
import { SanityArticle } from '@/lib/types'

// Lee el blog sin salir de la landing del producto: el artículo se abre en un
// modal sobre la página. Los triggers siguen siendo <a href="/blog/slug"> reales
// (SEO + abrir en pestaña nueva con ctrl/cmd-click siguen funcionando); solo se
// intercepta el click normal.


interface ArticleModalContextValue {
  openArticle: (slug: string) => void
}

const ArticleModalContext = createContext<ArticleModalContextValue | null>(null)

export function ArticleModalProvider({
  children,
  currentProductSlug,
}: {
  children: ReactNode
  currentProductSlug?: string
}) {
  const [slug, setSlug] = useState<string | null>(null)
  const [article, setArticle] = useState<SanityArticle | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  // Cache en memoria: reabrir un artículo ya leído es instantáneo.
  const cache = useRef(new Map<string, SanityArticle>())
  const closeRef = useRef<HTMLButtonElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  // Guarda el foco del trigger para devolverlo al cerrar.
  const lastFocused = useRef<HTMLElement | null>(null)

  // El estado se fija en el handler, no en un efecto: abrir un artículo ya
  // cacheado es instantáneo y no dispara un render en cascada.
  const openArticle = useCallback((next: string) => {
    lastFocused.current = document.activeElement as HTMLElement | null
    const cached = cache.current.get(next)
    setSlug(next)
    setArticle(cached ?? null)
    setStatus(cached ? 'idle' : 'loading')
  }, [])

  const close = useCallback(() => {
    setSlug(null)
    setArticle(null)
    setStatus('idle')
    lastFocused.current?.focus?.()
  }, [])

  // Carga del artículo. Se cancela si cambias de artículo antes de que responda.
  useEffect(() => {
    if (!slug || cache.current.has(slug)) return

    const controller = new AbortController()

    fetch(`/api/articles/${encodeURIComponent(slug)}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return (await res.json()) as SanityArticle
      })
      .then((data) => {
        cache.current.set(slug, data)
        setArticle(data)
        setStatus('idle')
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return
        setStatus('error')
      })

    return () => controller.abort()
  }, [slug])

  // Escape cierra + bloqueo del scroll del body mientras el modal está abierto.
  useEffect(() => {
    if (!slug) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKeyDown)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    closeRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [slug, close])

  // Cada artículo nuevo arranca arriba, no donde quedó el anterior.
  useEffect(() => {
    if (slug) scrollRef.current?.scrollTo({ top: 0 })
  }, [slug, article])

  const category = article
    ? categoryTitle(article.category) || 'General'
    : null

  return (
    <ArticleModalContext.Provider value={{ openArticle }}>
      {children}

      {slug && (
        <div
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={article?.title ?? 'Artículo del blog'}
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Cerrar artículo"
            tabIndex={-1}
            onClick={close}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-default"
          />

          <div className="relative w-full sm:max-w-3xl max-h-[92vh] sm:max-h-[88vh] flex flex-col bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
            {/* Cabecera fija */}
            <div className="shrink-0 flex items-start gap-4 px-5 sm:px-8 pt-5 sm:pt-6 pb-4 border-b border-gray-100 bg-surface-soft">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-todopolis-lavender/30 text-todopolis-lavender-deep">
                    <BookOpen className="w-3 h-3" />
                    {category ?? 'Blog'}
                  </span>
                  {article?.readingTime ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 font-medium">
                      <Clock className="w-3 h-3" />
                      {article.readingTime} min de lectura
                    </span>
                  ) : null}
                </div>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-gray-900 leading-tight text-balance">
                  {article?.title ?? (status === 'error' ? 'No pudimos cargar el artículo' : 'Cargando…')}
                </h2>
              </div>

              <button
                ref={closeRef}
                type="button"
                onClick={close}
                aria-label="Cerrar artículo"
                className="shrink-0 w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cuerpo scrolleable */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-8 py-6">
              {status === 'loading' && (
                <div className="space-y-4 animate-pulse" aria-live="polite">
                  <div className="h-4 bg-gray-100 rounded w-11/12" />
                  <div className="h-4 bg-gray-100 rounded w-full" />
                  <div className="h-4 bg-gray-100 rounded w-9/12" />
                  <div className="h-6 bg-gray-100 rounded w-1/2 mt-8" />
                  <div className="h-4 bg-gray-100 rounded w-full" />
                  <div className="h-4 bg-gray-100 rounded w-10/12" />
                </div>
              )}

              {status === 'error' && (
                <div className="py-8 text-center">
                  <p className="text-gray-600 mb-5">
                    Algo falló al cargar esta lectura. Puedes abrirla en el blog.
                  </p>
                  <Link
                    href={`/blog/${slug}`}
                    className="inline-flex items-center gap-2 font-bold text-todopolis-lavender-deep hover:text-todopolis-blue-deep transition-colors"
                  >
                    Abrir en el blog →
                  </Link>
                </div>
              )}

              {article && (
                <ArticleSections
                  sections={article.sections}
                  productSlug={article.productSlug ?? ''}
                  currentProductSlug={currentProductSlug}
                  onSameProductCta={close}
                />
              )}
            </div>

            {/* Pie fijo */}
            {article && (
              <div className="shrink-0 flex items-center justify-between gap-4 px-5 sm:px-8 py-4 border-t border-gray-100 bg-surface-soft">
                <Link
                  href={`/blog/${article.slug}`}
                  className="text-sm font-semibold text-gray-400 hover:text-todopolis-lavender-deep transition-colors"
                >
                  Ver en el blog
                </Link>
                <button
                  type="button"
                  onClick={close}
                  className="text-sm font-bold text-todopolis-lavender-deep hover:text-todopolis-blue-deep transition-colors"
                >
                  Volver al producto →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </ArticleModalContext.Provider>
  )
}

// Envuelve un enlace a /blog/[slug] y lo convierte en disparador del modal.
// Sin provider alrededor, se comporta como un enlace normal.
export function ArticleTrigger({
  slug,
  className,
  children,
}: {
  slug: string
  className?: string
  children: ReactNode
}) {
  const ctx = useContext(ArticleModalContext)

  return (
    <a
      href={`/blog/${slug}`}
      className={className}
      onClick={(e) => {
        // Respeta ctrl/cmd-click, click con rueda y "abrir en pestaña nueva".
        if (!ctx || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
          return
        }
        e.preventDefault()
        ctx.openArticle(slug)
      }}
    >
      {children}
    </a>
  )
}
