import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { generateAndSaveArticle } from '@/lib/generate-article'

// Allow up to 60s — Gemini generation can take 20-30s
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const geminiKey = process.env.GEMINI_API_KEY
  const sanityToken = process.env.SANITY_API_TOKEN
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production'
  const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2025-01-01'

  if (!geminiKey || !sanityToken || !projectId) {
    return NextResponse.json({ error: 'Configuración incompleta en .env' }, { status: 500 })
  }

  let body: { sanityId?: string; mastershopId?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  let resolvedSanityId = body.sanityId

  // Fallback: resolve sanityId from mastershopId when not provided directly
  if (!resolvedSanityId && body.mastershopId) {
    const q = encodeURIComponent(`*[_type == "product" && mastershopId == ${body.mastershopId}][0]._id`)
    const r = await fetch(`https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${q}`, {
      headers: { Authorization: `Bearer ${sanityToken}` },
    })
    if (r.ok) {
      const d = await r.json()
      resolvedSanityId = d.result ?? undefined
    }
  }

  if (!resolvedSanityId) {
    return NextResponse.json({ error: 'Se requiere sanityId o mastershopId' }, { status: 400 })
  }

  // Fetch product data from Sanity
  const productQuery = encodeURIComponent(
    `*[_type == "product" && _id == "${resolvedSanityId}"][0]{ name, "slug": slug.current, shortDescription, category, benefits[]{ title } }`
  )
  const productRes = await fetch(
    `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${productQuery}`,
    { headers: { Authorization: `Bearer ${sanityToken}` } }
  )

  if (!productRes.ok) {
    return NextResponse.json({ error: 'No se pudo consultar Sanity' }, { status: 500 })
  }

  const productData = await productRes.json()
  const product = productData.result

  if (!product) {
    return NextResponse.json({ error: 'Producto no encontrado en Sanity' }, { status: 404 })
  }

  try {
    const result = await generateAndSaveArticle({
      productName: product.name,
      productDescription: product.shortDescription ?? product.name,
      productCategory: product.category ?? 'otros',
      productBenefits: (product.benefits ?? []).map((b: any) => b.title).filter(Boolean),
      sanityProductId: resolvedSanityId,
      productSlug: product.slug,
      geminiKey,
      sanityToken,
      projectId,
      dataset,
      apiVersion,
    })

    revalidatePath('/blog')
    revalidatePath(`/blog/${result.articleSlug}`)
    revalidatePath(`/producto/${product.slug}`)
    return NextResponse.json({ success: true, ...result })
  } catch (err: any) {
    console.error('Error generating article:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
