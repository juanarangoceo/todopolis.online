/**
 * Pide a Sanity un recurso ya redimensionado y convertido. Los bloques de
 * campaña suelen partir de PNG/HEIF grandes; enviarlos al optimizador local de
 * Next provocaba timeouts y tarjetas vacías durante la primera visita.
 */
export function sanityCdnImage(url: string, width: number): string {
  if (!url.includes('cdn.sanity.io')) return url
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}w=${width}&q=78&auto=format`
}
