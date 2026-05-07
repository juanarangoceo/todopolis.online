import { NextRequest, NextResponse } from 'next/server'

const MS_BASE = 'https://prod.api.mastershop.com/api'

export async function GET(request: NextRequest) {
  const apiKey = process.env.MASTERSHOP_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'MASTERSHOP_API_KEY no configurada' }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const page = searchParams.get('page') || '1'
  const limit = searchParams.get('limit') || '50'

  try {
    const url = `${MS_BASE}/products?page=${page}&limit=${limit}`
    const res = await fetch(url, {
      headers: { 'ms-api-key': apiKey },
      next: { revalidate: 0 }, // never cache — always fresh
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('Mastershop API error:', res.status, text)
      return NextResponse.json(
        { error: `Mastershop devolvió ${res.status}` },
        { status: res.status }
      )
    }

    const data = await res.json()
    // data.results = array of products, data.resultsCount.totalProducts = total
    return NextResponse.json({
      products: (data.results ?? []).map(normalizeProduct),
      total: data.resultsCount?.totalProducts ?? 0,
      page: Number(page),
      limit: Number(limit),
    })
  } catch (err: any) {
    console.error('Error fetching Mastershop products:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function normalizeProduct(p: any) {
  const firstVariant = p.variation?.[0] ?? {}
  return {
    idProduct: p.idProduct,
    name: p.name ?? '',
    description: p.description ?? '',
    basePrice: p.basePrice ?? firstVariant.price ?? 0,
    suggestedPrice: p.suggestedPrice ?? 0,
    imageUrl: p.urlImageProduct ?? null,
    category: p.prodFormatName ?? '',
    stock: p.stockTotal ?? firstVariant.stock ?? 0,
    sku: firstVariant.sku ?? '',
    idVariant: firstVariant.idVariant ?? null,
    nameState: p.nameState ?? '',
  }
}
