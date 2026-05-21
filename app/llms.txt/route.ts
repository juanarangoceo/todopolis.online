import { getSanityProducts, getArticles } from '@/lib/sanity/queries'

// Índice en texto plano para crawlers LLM (ChatGPT, Perplexity, etc.).
// Estándar emergente: https://llmstxt.org
// Se regenera cada hora con ISR — sin paso de build, siempre fresco.
export const revalidate = 3600

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://todopolis.online'

function clean(s?: string): string {
  return (s ?? '').replace(/\s+/g, ' ').trim()
}

export async function GET() {
  const [products, articles] = await Promise.all([
    getSanityProducts().catch(() => []),
    getArticles().catch(() => []),
  ])

  // Se excluye bienestar-intimo, igual que en el sitemap.
  const visibleProducts = (products as any[]).filter(
    (p) => p?.slug && p.category !== 'bienestar-intimo',
  )

  const lines: string[] = [
    '# Todopolis',
    '',
    '> Tienda online colombiana de productos de belleza, hogar, tecnología, moda, deportes y más. Pago contraentrega en toda Colombia con envío rápido.',
    '',
    'Cada producto tiene su propia landing page con descripción, beneficios, especificaciones y preguntas frecuentes. El blog publica guías de compra relacionadas con los productos.',
    '',
    `## Productos (${visibleProducts.length})`,
    '',
  ]

  for (const p of visibleProducts) {
    const desc = clean(p.shortDescription).slice(0, 150)
    const price = p.price ? ` ($${Number(p.price).toLocaleString('es-CO')} COP)` : ''
    lines.push(
      `- [${clean(p.name)}](${BASE_URL}/producto/${p.slug})${desc ? `: ${desc}` : ''}${price}`,
    )
  }

  lines.push('', `## Blog (${(articles as any[]).length})`, '')

  for (const a of articles as any[]) {
    if (!a?.slug) continue
    const desc = clean(a.seoDescription || a.topic).slice(0, 150)
    lines.push(`- [${clean(a.title)}](${BASE_URL}/blog/${a.slug})${desc ? `: ${desc}` : ''}`)
  }

  lines.push('')

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
