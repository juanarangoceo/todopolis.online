import { NextRequest, NextResponse } from 'next/server'
import { authorizeEditorialRequest } from '@/lib/ai/authorize'
import { DropiNotConnectedError, getDropiAccessToken } from '@/lib/dropi/connection'
import { DropiMcpClient } from '@/lib/dropi/mcp'
import { searchDropiProducts } from '@/lib/dropi/catalog'
import { sanityQuery } from '@/lib/dropi/sanity-store'

export const maxDuration = 60

// Buscar en el catálogo de Dropi desde /admin/dropi. Marca los que ya se
// importaron para no duplicarlos.
export async function GET(request: NextRequest) {
  const denied = await authorizeEditorialRequest(request)
  if (denied) return denied
  const q = request.nextUrl.searchParams.get('q')?.slice(0, 120) ?? ''
  const start = Math.max(0, Number(request.nextUrl.searchParams.get('start')) || 0)
  const client = new DropiMcpClient(getDropiAccessToken)
  try {
    const { products, hasMore } = await searchDropiProducts(client, { search: q, startData: start, pageSize: 24 })
    const ids = products.map((p) => p.id)
    const imported = ids.length
      ? await sanityQuery<Array<{ _id: string; dropiId: number }>>('*[_type == "product" && dropiId in $ids]{ _id, dropiId }', { ids })
      : []
    return NextResponse.json({
      products: products.map((p) => ({ ...p, sanityId: imported.find((d) => d.dropiId === p.id)?._id.replace(/^drafts\./, '') ?? null })),
      next: hasMore ? start + 24 : null,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo consultar Dropi.' }, { status: error instanceof DropiNotConnectedError ? 409 : 502 })
  } finally {
    await client.close()
  }
}
