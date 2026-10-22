import type { InlineImage } from './gemini.ts'

const IMAGE_HOSTS = new Set(['cdn.sanity.io', 'cdn.bemaster.com'])
const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_BYTES = 5 * 1024 * 1024

// Mastershop también sirve fotos como application/octet-stream. El formato
// lo determina la firma del archivo, no la extensión ni solo la cabecera HTTP.
function imageMimeType(bytes: Buffer): string | null {
  if (bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'image/jpeg'
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png'
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'image/webp'
  return null
}

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
      const contentType = res.headers.get('content-type')?.split(';')[0].trim().toLowerCase() ?? ''
      const canReadImage = TYPES.has(contentType) || contentType === 'application/octet-stream' || !contentType
      if (!res.ok || !canReadImage || Number(res.headers.get('content-length')) > MAX_BYTES || !res.body) {
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
      const bytes = Buffer.concat(chunks)
      const mimeType = imageMimeType(bytes)
      return mimeType ? { mimeType, data: bytes.toString('base64') } : null
    } catch { return null }
  }))
  return images.filter((image): image is InlineImage => image !== null)
}
