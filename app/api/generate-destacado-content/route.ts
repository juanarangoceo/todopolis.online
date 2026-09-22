import { NextRequest, NextResponse } from 'next/server'
import { fetchInlineImages, generateDestacadoContent, type DestacadoNeeds } from '@/lib/destacado-content'
import { urlForImage } from '@/lib/sanity/image'

// Texto para completar un Destacado (titular, historia, pasos, caja). Solo
// genera: el botón del Studio decide qué guardar y lo escribe en el borrador.
// Las fotos del galería van por /api/generate-ai-image, una por llamada.
//
// Pendiente conocido (CLAUDE.md → Creación de productos): como las demás rutas
// de IA, no tiene autenticación.
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY no está configurada.' }, { status: 500 })

  const body = await request.json().catch(() => null)
  if (!body?.name) return NextResponse.json({ error: 'Falta el nombre del producto.' }, { status: 400 })

  const needs: DestacadoNeeds = {
    headline: !!body.needs?.headline,
    story: !!body.needs?.story,
    steps: !!body.needs?.steps,
    box: !!body.needs?.box,
  }

  // Mismas fotos que usa «Generar Landing»: 3 primeras a 1024 px en JPG, o la
  // de Mastershop si el producto no tiene assets en Sanity.
  const refs: string[] = (Array.isArray(body.imageRefs) ? body.imageRefs : [])
    .filter((r: unknown): r is string => typeof r === 'string' && r.startsWith('image-'))
    .slice(0, 3)
  const urls = refs.map((ref) => urlForImage(ref).width(1024).height(1024).fit('max').format('jpg').quality(80).url())
  if (urls.length === 0 && typeof body.mastershopImageUrl === 'string') urls.push(body.mastershopImageUrl)

  try {
    const images = await fetchInlineImages(urls)
    const content = await generateDestacadoContent({
      apiKey,
      needs,
      images,
      input: {
        name: String(body.name),
        shortDescription: body.shortDescription,
        heroTitle: body.heroTitle,
        specifications: body.specifications,
        benefits: body.benefits,
      },
    })
    return NextResponse.json({ ...content, imagesAnalyzed: images.length })
  } catch (error: any) {
    console.error('[generate-destacado-content]', error?.message ?? error)
    return NextResponse.json({ error: `Error al generar: ${error?.message ?? 'desconocido'}` }, { status: 500 })
  }
}
