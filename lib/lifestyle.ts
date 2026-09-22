// Vive fuera del componente porque el componente es 'use client' y esta
// función la llama la página, que es de servidor.

export interface LifestyleImage {
  url: string
  alt?: string
}

/** Junta la imagen principal y la galería, sin huecos ni repetidos. */
export function lifestyleImages(
  main: string | undefined,
  gallery: Array<{ url?: string; alt?: string }> | undefined,
): LifestyleImage[] {
  const out: LifestyleImage[] = []
  const seen = new Set<string>()
  const push = (url?: string, alt?: string) => {
    if (!url || seen.has(url)) return
    seen.add(url)
    out.push({ url, alt })
  }
  push(main)
  for (const g of gallery ?? []) push(g.url, g.alt)
  return out
}
