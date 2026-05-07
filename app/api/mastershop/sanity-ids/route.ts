import { NextResponse } from 'next/server'

export async function GET() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production'
  const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2025-01-01'
  const token = process.env.SANITY_API_TOKEN

  if (!projectId || !token) {
    return NextResponse.json({ error: 'Sanity no configurado' }, { status: 500 })
  }

  try {
    // Query all products that have a mastershopId
    const query = encodeURIComponent(
      `*[_type == "product" && defined(mastershopId)]{ mastershopId, _id, name, slug }`
    )
    const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${query}`

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 0 },
    })

    if (!res.ok) {
      throw new Error(`Sanity GROQ error: ${res.status}`)
    }

    const data = await res.json()
    const imported: { mastershopId: number; sanityId: string; name: string; slug: string }[] = (
      data.result ?? []
    ).map((d: any) => ({
      mastershopId: d.mastershopId,
      sanityId: d._id,
      name: d.name,
      slug: d.slug?.current ?? '',
    }))

    return NextResponse.json({ imported })
  } catch (err: any) {
    console.error('Error querying Sanity for mastershopIds:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
