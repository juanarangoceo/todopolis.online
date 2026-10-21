// Catálogo de Dropi: qué herramientas del MCP puede llamar Todópolis y cómo se
// traduce un producto de Dropi a lo que guarda Sanity.
//
// Lo que entrega `list_products` (verificado el 21-oct-2026, en TOON):
//   sale_price      lo que Dropi le COBRA a la tienda (costo)
//   suggested_price precio de venta que sugiere el proveedor
//   stock           del producto; en uno VARIABLE vale 0 y el real va por variación
//   variations[]    id, stock, sale_price, attributes[{name,value}]
//   gallery[]       urlS3 (CloudFront de Dropi)
//   categories[]    las que marca el proveedor, a menudo de más
// No trae descripción: el copy sale del nombre y de las fotos.
import { toolPayload, type DropiMcpClient, type McpToolResult } from './mcp.ts'

/**
 * Lista POSITIVA a propósito. El MCP expone `create_order`, que registra un
 * despacho real al cliente final; un `callTool` genérico con el nombre de una
 * herramienta que llega de fuera podría dispararlo. Todo lo que llame Dropi
 * pasa por aquí.
 */
export const DROPI_READ_TOOLS = [
  'list_products',
  'list_categories',
  'quote_shipping',
  'list_carriers',
  'search_cities',
  'list_departments',
] as const

/** Único host de fotos de Dropi visto en el catálogo. */
export const DROPI_IMAGE_HOST = 'd39ru7awumhhs2.cloudfront.net'

export interface DropiVariation {
  id: number
  sku: string | null
  stock: number
  cost: number
  suggestedPrice: number
  /** «M/ROJO»: valores de los atributos en orden, como los parte `lib/variant-options.ts`. */
  name: string
}

export interface DropiProduct {
  id: number
  sku: string | null
  name: string
  cost: number
  suggestedPrice: number
  /** Del producto o, si tiene variaciones, la suma de las suyas. */
  stock: number
  supplierId: number | null
  categories: string[]
  images: string[]
  variations: DropiVariation[]
}

type Raw = Record<string, unknown>

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() && v !== 'null' ? v.trim() : null)

function imageUrl(entry: unknown): string | null {
  const url = str(typeof entry === 'string' ? entry : (entry as Raw | null)?.urlS3)
  if (!url) return null
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && u.hostname === DROPI_IMAGE_HOST ? u.toString() : null
  } catch { return null }
}

export function normalizeDropiProduct(raw: Raw): DropiProduct {
  const variations = (Array.isArray(raw.variations) ? raw.variations as Raw[] : []).map((v): DropiVariation => {
    const attributes = Array.isArray(v.attributes) ? v.attributes as Raw[] : []
    const name = attributes.map((a) => str(a.value)).filter(Boolean).join('/') || `Variación ${num(v.id)}`
    return { id: num(v.id), sku: str(v.sku), stock: num(v.stock), cost: num(v.sale_price), suggestedPrice: num(v.suggested_price), name }
  }).filter((v) => v.id > 0)
  return {
    id: num(raw.id),
    sku: str(raw.sku),
    name: str(raw.name) ?? `Producto Dropi ${num(raw.id)}`,
    cost: num(raw.sale_price),
    suggestedPrice: num(raw.suggested_price),
    stock: variations.length ? variations.reduce((sum, v) => sum + Math.max(0, v.stock), 0) : num(raw.stock),
    supplierId: num(raw.supplier_id) || null,
    categories: Array.isArray(raw.categories) ? raw.categories.map(str).filter((c): c is string => !!c) : [],
    images: [...new Set((Array.isArray(raw.gallery) ? raw.gallery : []).map(imageUrl).filter((u): u is string => !!u))],
    variations,
  }
}

/** El proveedor la marcó para adultos. Se decide con `lib/adult-policy.ts`, como en Mastershop. */
export function dropiMarkedAdult(p: Pick<DropiProduct, 'categories'>): boolean {
  return p.categories.some((c) => /sex\s*shop|adult|er[oó]tic/i.test(c))
}

/** Variantes para Sanity (`variants[]`). `price` es el COSTO, igual que en Mastershop. */
export function sanityVariants(p: DropiProduct, previous: Array<{ idVariant?: number; _key?: string }> = []) {
  return p.variations.map((v) => ({
    _type: 'variant',
    // Se conserva la _key de la variante que ya existía: el Studio y los
    // borradores la usan para seguir el elemento entre ediciones.
    _key: previous.find((old) => old.idVariant === v.id)?._key ?? `dropi-${v.id}`,
    idVariant: v.id,
    name: v.name,
    sku: v.sku ?? '',
    price: v.cost,
    stock: v.stock,
    isEnable: true,
  }))
}

/** Campos `dropi*` que escriben el import y la sincronización. */
export function dropiFields(p: DropiProduct, now = new Date()) {
  return {
    dropiId: p.id,
    dropiName: p.name,
    dropiSupplierId: p.supplierId,
    dropiCost: p.cost,
    dropiSuggestedPrice: p.suggestedPrice,
    dropiStock: p.stock,
    dropiSyncedAt: now.toISOString(),
  }
}

export interface DropiSearch {
  search?: string
  category?: string
  startData?: number
  pageSize?: number
  supplierId?: number | null
}

type ToolCaller = Pick<DropiMcpClient, 'callTool'>

/** El error de una herramienta es texto plano: no se decodifica como TOON. */
function errorText(result: McpToolResult): string {
  return (result.content ?? []).map((c) => c.text ?? '').join(' ').trim() || 'error sin detalle'
}

export async function searchDropiProducts(client: ToolCaller, q: DropiSearch): Promise<{ products: DropiProduct[]; hasMore: boolean }> {
  const pageSize = Math.min(Math.max(q.pageSize ?? 20, 1), 100)
  const args = {
    ...(q.search?.trim() && { search: q.search.trim() }),
    ...(q.category && { category: q.category }),
    ...(q.supplierId && { supplier_id: q.supplierId }),
    start_data: Math.max(0, q.startData ?? 0),
    page_size: pageSize,
    get_stock: true,
  }
  let result = await client.callTool('list_products', args)
  // El backend de Dropi a veces responde 504 a la primera; un reintento basta.
  if (result.isError && /\b50[234]\b/.test(errorText(result))) result = await client.callTool('list_products', args)
  if (result.isError) throw new Error(`Dropi no pudo listar productos: ${errorText(result).slice(0, 200)}`)
  const payload = toolPayload(result) as { items?: Raw[] } | null
  const items = Array.isArray(payload?.items) ? payload.items : []
  // Dropi devuelve menos ítems que page_size aun habiendo más páginas (21 de
  // 24 en la primera del catálogo, 21-oct-2026): solo una página vacía es el final.
  return { products: items.map(normalizeDropiProduct).filter((p) => p.id > 0), hasMore: items.length > 0 }
}

/**
 * `list_products` no filtra por id: se busca por el nombre original (y el
 * proveedor, si se conoce) y se elige el que tenga ese id. `null` = Dropi ya
 * no lo lista (retirado, inactivo o renombrado).
 */
export async function findDropiProduct(client: ToolCaller, ref: { id: number; name: string; supplierId?: number | null }): Promise<DropiProduct | null> {
  for (const supplierId of ref.supplierId ? [ref.supplierId, null] : [null]) {
    const { products } = await searchDropiProducts(client, { search: ref.name, supplierId, pageSize: 50 })
    const hit = products.find((p) => p.id === ref.id)
    if (hit) return hit
  }
  return null
}
