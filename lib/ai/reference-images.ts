import type { InlineImage } from './gemini.ts'

const IMAGE_HOSTS = new Set(['cdn.sanity.io', 'cdn.bemaster.com'])
const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_BYTES = 5 * 1024 * 1024

// Solo fuentes del catálogo conocidas. No seguir redirecciones hacia redes
// privadas ni aceptar una URL arbitraria enviada por el navegador.
export function isReferenceImageUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && IMAGE_HOSTS.has(url.hostname)
  } catch { return false }
}

export async function fetchInlineImages(urls: string[], timeoutMs = 8000): Promise<InlineImage[]> {
  const images = await Promise.all([...new Set(urls)].slice(0, 3).map(async (url) => {
    if (!isReferenceImageUrl(url)) return null
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), redirect: 'error' })
      const mimeType = res.headers.get('content-type')?.split(';')[0].trim() ?? ''
      if (!res.ok || !TYPES.has(mimeType) || Number(res.headers.get('content-length')) > MAX_BYTES || !res.body) {
        await res.body?.cancel()
        return null
      }
      const reader = res.body.getReader()
      const chunks: Uint8Array[] = []
      let length = 0
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        length += value.length
        if (length > MAX_BYTES) { await reader.cancel(); return null }
        chunks.push(value)
      }
      if (!length) return null
      return { mimeType, data: Buffer.concat(chunks).toString('base64') }
    } catch { return null }
  }))
  return images.filter((image): image is InlineImage => image !== null)
}
