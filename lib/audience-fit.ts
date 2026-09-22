// Vive aparte del prompt porque también lo importa el botón del Studio, que
// corre en el navegador: traerse `product-content-prompt.ts` metería el prompt
// entero en el bundle del Studio.
/**
 * `audienceFit` de la respuesta del modelo, listo para guardar en Sanity. Lo
 * usan los tres consumidores del prompt (botón del Studio, import y cron) para
 * no validar tres veces lo mismo. Null si la respuesta no trae nada usable.
 */
export function audienceFitFromAi(raw: unknown): { forWho: string[]; notFor: string[] } | null {
  const fit = raw as { forWho?: unknown; notFor?: unknown } | null | undefined
  const clean = (v: unknown, max: number) =>
    Array.isArray(v)
      ? v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((x) => x.trim()).slice(0, max)
      : []
  const forWho = clean(fit?.forWho, 4)
  if (forWho.length === 0) return null
  return { forWho, notFor: clean(fit?.notFor, 3) }
}
