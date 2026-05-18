import { NextRequest } from 'next/server'
import { getSanityClient } from '@/lib/sanity/client'

// Esta ruta es dinámica: cada request consulta Sanity en vivo para detectar
// asistentes recién publicados sin esperar revalidate. El header de cache
// permite a Vercel/CDN guardar la respuesta unos segundos para no martillar
// Sanity en visitas seguidas a la misma landing.
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')?.trim()
  if (!slug) {
    return Response.json({ enabled: false })
  }

  try {
    const client = getSanityClient()
    const count: number = await client.fetch(
      `count(*[_type == "voiceAssistant" && enabled == true && product->slug.current == $slug])`,
      { slug },
    )
    return new Response(JSON.stringify({ enabled: count > 0 }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=15, stale-while-revalidate=60',
      },
    })
  } catch (err) {
    console.error('[voice-assistant-status]', err)
    return Response.json({ enabled: false })
  }
}
