import { NextResponse } from 'next/server'
import { getArticleBySlug } from '@/lib/sanity/queries'

// Sirve un artículo del blog en JSON para el modal de la landing de producto.
// Evita que el usuario salga de la página al leer una guía.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  try {
    const article = await getArticleBySlug(slug)
    if (!article) {
      return NextResponse.json({ error: 'Artículo no encontrado' }, { status: 404 })
    }
    return NextResponse.json(article, {
      headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
    })
  } catch (err) {
    // getArticleBySlug lanza si la consulta falla tras los reintentos — un fallo
    // transitorio no debe cachearse como 404.
    console.error(`[api/articles] fallo leyendo ${slug}:`, err)
    return NextResponse.json({ error: 'No se pudo cargar el artículo' }, { status: 502 })
  }
}
