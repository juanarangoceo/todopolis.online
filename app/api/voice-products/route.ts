import { getSanityClient } from '@/lib/sanity/client'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() ?? ''

  try {
    const client = getSanityClient()

    const groqQuery = q
      ? `*[_type == "product" && category != "bienestar-intimo" && defined(slug.current) && (
          name match $q || category match $q || shortDescription match $q
        )] | order(_createdAt desc) [0...6] {
          "id": slug.current,
          name,
          "descripcion": shortDescription,
          price,
          category,
          isNew,
          isBestSeller,
          "imagen": coalesce(mastershopImageUrl, images[0].asset->url)
        }`
      : `*[_type == "product" && category != "bienestar-intimo" && defined(slug.current)
        ] | order(isBestSeller desc, _createdAt desc) [0...6] {
          "id": slug.current,
          name,
          "descripcion": shortDescription,
          price,
          category,
          isNew,
          isBestSeller,
          "imagen": coalesce(mastershopImageUrl, images[0].asset->url)
        }`

    const params = q ? { q: `*${q}*` } : {}
    const products = await client.fetch(groqQuery, params)

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
