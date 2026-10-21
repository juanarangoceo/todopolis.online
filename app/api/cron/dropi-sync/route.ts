import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { DropiNotConnectedError, getDropiAccessToken } from '@/lib/dropi/connection'
import { DropiMcpClient } from '@/lib/dropi/mcp'
import { dropiFields, findDropiProduct, sanityVariants } from '@/lib/dropi/catalog'
import { sanityMutate, sanityQuery } from '@/lib/dropi/sanity-store'

export const maxDuration = 300

interface Doc { _id: string; dropiId: number; dropiName?: string; name: string; dropiSupplierId?: number | null; variants?: Array<{ idVariant?: number; _key?: string }> }

// Sincroniza costo, stock y variantes de los productos de Dropi (publicados y
// borradores), cada hora. El PRECIO de venta no se toca: es editorial.
export async function GET(request: NextRequest) {
  // Sin CRON_SECRET la comparación aceptaría «Bearer undefined».
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const docs = await sanityQuery<Doc[]>('*[_type == "product" && defined(dropiId)]{ _id, dropiId, dropiName, name, dropiSupplierId, variants }')
  if (!docs.length) return NextResponse.json({ ok: true, products: 0 })

  const client = new DropiMcpClient(getDropiAccessToken)
  const report = { updated: 0, missing: [] as number[], failed: [] as number[] }
  let publishedChanged = false
  try {
    // Publicado y borrador comparten dropiId: una sola consulta a Dropi por producto.
    for (const dropiId of [...new Set(docs.map((d) => d.dropiId))]) {
      const mine = docs.filter((d) => d.dropiId === dropiId)
      const ref = mine[0]
      try {
        const product = await findDropiProduct(client, { id: dropiId, name: ref.dropiName ?? ref.name, supplierId: ref.dropiSupplierId })
        if (!product) {
          // Dropi ya no lo lista: se marca sin stock en vez de borrar nada.
          report.missing.push(dropiId)
          await sanityMutate(mine.map((d) => ({ patch: { id: d._id, set: { dropiStock: 0, dropiSyncedAt: new Date().toISOString() } } })))
          continue
        }
        await sanityMutate(mine.map((d) => ({ patch: { id: d._id, set: { ...dropiFields(product), ...(product.variations.length && { variants: sanityVariants(product, d.variants) }) } } })))
        report.updated++
        if (mine.some((d) => !d._id.startsWith('drafts.'))) publishedChanged = true
      } catch (error) {
        if (error instanceof DropiNotConnectedError) throw error
        console.error(`[dropi-sync] ${dropiId}`, error)
        report.failed.push(dropiId)
      }
    }
  } catch (error) {
    if (error instanceof DropiNotConnectedError) return NextResponse.json({ error: error.message }, { status: 409 })
    throw error
  } finally {
    await client.close()
  }
  if (publishedChanged) revalidateTag('products', 'max')
  return NextResponse.json({ ok: true, products: docs.length, ...report })
}
