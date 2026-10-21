// Lo que el import y la sincronización de Dropi le piden a Sanity, por HTTP y
// con el token del servidor (ve los borradores: el piloto vive en borradores).
import { DROPI_IMAGE_HOST } from './catalog.ts'

const MAX_IMAGE_BYTES = 8 * 1024 * 1024

function config() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const token = process.env.SANITY_API_TOKEN
  if (!projectId || !token) throw new Error('Falta la configuración de Sanity.')
  return {
    projectId,
    token,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
    apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2025-01-01',
  }
}

export function sanityTaxonomyConfig() {
  const { projectId, dataset, apiVersion, token } = config()
  return { projectId, dataset, apiVersion, token }
}

export async function sanityQuery<T>(query: string, params: Record<string, unknown> = {}): Promise<T> {
  const c = config()
  const url = new URL(`https://${c.projectId}.api.sanity.io/v${c.apiVersion}/data/query/${c.dataset}`)
  url.searchParams.set('query', query)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(`$${k}`, JSON.stringify(v))
  // perspective=raw: publicados Y borradores, cada uno con su _id.
  url.searchParams.set('perspective', 'raw')
  const res = await fetch(url, { headers: { Authorization: `Bearer ${c.token}` }, cache: 'no-store' })
  if (!res.ok) throw new Error(`Sanity respondió ${res.status} a la consulta.`)
  return (await res.json()).result as T
}

export async function sanityMutate(mutations: unknown[]): Promise<string[]> {
  const c = config()
  const res = await fetch(`https://${c.projectId}.api.sanity.io/v${c.apiVersion}/data/mutate/${c.dataset}?returnIds=true`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${c.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ mutations }),
  })
  if (!res.ok) throw new Error(`Sanity rechazó la escritura (${res.status}): ${(await res.text()).slice(0, 300)}`)
  return ((await res.json()).results ?? []).map((r: { id: string }) => r.id)
}

/**
 * Baja una foto del CDN de Dropi y la sube a Sanity: la ficha no depende de
 * CloudFront ni hay que autorizar otro dominio en `next.config.ts`.
 */
export async function uploadDropiImage(url: string): Promise<{ assetId: string; url: string } | null> {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:' || u.hostname !== DROPI_IMAGE_HOST) return null
    const img = await fetch(u, { redirect: 'error', signal: AbortSignal.timeout(20_000) })
    const type = img.headers.get('content-type') ?? ''
    if (!img.ok || !/^image\/(jpeg|png|webp|gif)$/.test(type.split(';')[0].trim())) return null
    const body = await img.arrayBuffer()
    if (body.byteLength > MAX_IMAGE_BYTES) return null
    const c = config()
    const name = decodeURIComponent(u.pathname.split('/').pop() ?? 'dropi.jpg').replace(/[^\w.\-]+/g, '-')
    const res = await fetch(`https://${c.projectId}.api.sanity.io/v${c.apiVersion}/assets/images/${c.dataset}?filename=${encodeURIComponent(name)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${c.token}`, 'Content-Type': type },
      body,
    })
    if (!res.ok) return null
    const doc = (await res.json()).document
    return doc?._id ? { assetId: doc._id, url: doc.url } : null
  } catch { return null }
}
