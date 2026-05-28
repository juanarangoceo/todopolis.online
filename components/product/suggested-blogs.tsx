import Link from 'next/link'
import { BookOpen, ArrowRight, Clock } from 'lucide-react'
import { SanityArticle } from '@/lib/types'

interface SuggestedBlogsProps {
  articles: SanityArticle[]
}

const CATEGORY_LABELS: Record<string, string> = {
  belleza: 'Belleza',
  hogar: 'Hogar',
  electronica: 'Electrónica',
  moda: 'Moda',
  accesorios: 'Accesorios',
  juguetes: 'Juguetes',
  deportes: 'Deportes',
  otros: 'Otros',
}

export function SuggestedBlogs({ articles }: SuggestedBlogsProps) {
  if (!articles || articles.length === 0) return null

  return (
    <div className="relative h-full rounded-3xl p-7 md:p-8 overflow-hidden border border-todopolis-blue/30 shadow-md bg-gradient-to-br from-todopolis-blue/12 via-surface to-todopolis-lime/15">
      {/* Decorative blobs — paleta brand (azul + lima, contrast vs lila del form) */}
      <div aria-hidden className="absolute top-0 left-0 w-56 h-56 bg-todopolis-blue/30 rounded-full blur-3xl -translate-y-1/3 -translate-x-1/4 pointer-events-none" />
      <div aria-hidden className="absolute bottom-0 right-0 w-44 h-44 bg-todopolis-lime/40 rounded-full blur-3xl translate-y-1/4 translate-x-1/4 pointer-events-none" />

      <div className="relative flex flex-col h-full">
        {/* Header */}
        <div className="mb-5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface/85 backdrop-blur border border-todopolis-blue/40 mb-3 shadow-sm">
            <BookOpen className="w-3.5 h-3.5 text-todopolis-blue-deep" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-todopolis-blue-deep">
              Mientras decides
            </span>
          </div>
          <h3 className="font-serif text-2xl md:text-[1.75rem] font-bold text-foreground leading-tight mb-2 text-balance">
            Lecturas que aclaran dudas.
          </h3>
          <p className="text-foreground/65 text-sm leading-relaxed">
            Guías cortas y honestas del equipo Todopolis para que compres con criterio.
          </p>
        </div>

        {/* Article list */}
        <ul className="space-y-2.5 flex-1">
          {articles.slice(0, 3).map((article) => {
            const category = CATEGORY_LABELS[article.category ?? ''] ?? article.category ?? 'General'
            return (
              <li key={article._id}>
                <Link
                  href={`/blog/${article.slug}`}
                  className="group flex items-start gap-3 p-3.5 rounded-2xl bg-surface/80 backdrop-blur-sm border border-todopolis-blue/25 hover:border-todopolis-blue-deep/50 hover:bg-surface hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                >
                  <span className="shrink-0 w-9 h-9 rounded-xl bg-todopolis-blue/25 border border-todopolis-blue/40 flex items-center justify-center group-hover:bg-todopolis-blue/40 transition-colors">
                    <BookOpen className="w-4 h-4 text-todopolis-blue-deep" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-todopolis-blue-deep">
                        {category}
                      </span>
                      {article.readingTime ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-foreground/55 font-medium">
                          <Clock className="w-2.5 h-2.5" />
                          {article.readingTime} min
                        </span>
                      ) : null}
                    </div>
                    <p className="font-semibold text-sm text-foreground leading-snug line-clamp-2 group-hover:text-todopolis-blue-deep transition-colors">
                      {article.title}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-todopolis-blue-deep/50 shrink-0 mt-1 group-hover:translate-x-0.5 group-hover:text-todopolis-blue-deep transition-all" />
                </Link>
              </li>
            )
          })}
        </ul>

        {/* Footer link */}
        <div className="mt-5 pt-4 border-t border-todopolis-blue/20">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-todopolis-blue-deep hover:gap-2.5 transition-all"
          >
            Ver todo el blog
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
