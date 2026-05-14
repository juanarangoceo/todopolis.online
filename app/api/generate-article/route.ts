import { NextRequest, NextResponse } from 'next/server'
import { generateAndSaveArticle } from '@/lib/generate-article'

export async function POST(request: NextRequest) {
  const geminiKey = process.env.GEMINI_API_KEY
  const sanityToken = process.env.SANITY_API_TOKEN
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production'
  const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2025-01-01'

  if (!geminiKey || !sanityToken || !projectId) {
    return NextResponse.json({ error: 'Configuración incompleta en .env' }, { status: 500 })
  }

  let body: { sanityId: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { sanityId } = body
  if (!sanityId) {
    return NextResponse.json({ error: 'Se requiere sanityId' }, { status: 400 })
  }

  // Fetch product data from Sanity
  const productQuery = encodeURIComponent(
    `*[_type == "product" && _id == "${sanityId}"][0]{ name, "slug": slug.current, shortDescription, category, benefits[]{ title } }`
  )
  const productUrl = `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${productQuery}`
  const productRes = await fetch(productUrl, {
    headers: { Authorization: `Bearer ${sanityToken}` },
  })

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
      sanityProductId: sanityId,
      productSlug: product.slug,
      geminiKey,
      sanityToken,
      projectId,
      dataset,
      apiVersion,
    })

    return NextResponse.json({ success: true, ...result })
  } catch (err: any) {
    console.error('Error generating article:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
