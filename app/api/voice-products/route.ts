import { getSanityClient } from '@/lib/sanity/client'

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() ?? ''

  try {
    const client = getSanityClient()

    // Traemos todos los productos válidos y filtramos en JS para tolerar tildes,
    // mayúsculas, plurales y variaciones de transcripción del Whisper.
    const all = await client.fetch(
      `*[_type == "product" && category != "bienestar-intimo" && defined(slug.current)] {
        "id": slug.current,
        name,
        "descripcion": shortDescription,
        price,
        category,
        isNew,
        isBestSeller,
        "imagen": coalesce(mastershopImageUrl, images[0].asset->url)
      }`,
    )

    let products: any[] = all
    if (q) {
      const needle = normalize(q)
      const tokens = needle.split(/\s+/).filter(Boolean)

      const scored: { p: any; hits: number }[] = all.map((p: any) => {
        const haystack = normalize(
          [p.name, p.category, p.descripcion].filter(Boolean).join(' '),
        )
        const hits = tokens.filter((t) => haystack.includes(t)).length
        return { p, hits }
      })

      products = scored
        .filter((x) => x.hits > 0)
        .sort((a, b) => b.hits - a.hits)
        .slice(0, 6)
        .map((x) => x.p)
    } else {
      products = all
        .sort((a: any, b: any) => Number(b.isBestSeller ?? 0) - Number(a.isBestSeller ?? 0))
        .slice(0, 6)
    }

    const mapped = products.map((p: any) => ({
      id: p.id,
      nombre: p.name,
      descripcion: p.descripcion ?? '',
      precio: p.price ?? 0,
      precio_formateado: `$${(p.price ?? 0).toLocaleString('es-CO')} COP`,
      imagen: p.imagen ?? null,
      categoria: p.category ?? 'Otros',
      es_nuevo: p.isNew ?? false,
      mas_vendido: p.isBestSeller ?? false,
    }))

    return Response.json(mapped)
  } catch (err) {
    console.error('[voice-products]', err)
    return Response.json([])
  }
}
