import { FALLBACK_USD_COP } from './pricing'

// TRM oficial (Superfinanciera) publicada en datos.gov.co. Se cachea un día:
// cambia una vez por día hábil y el panel no necesita más precisión.
const TRM_URL = 'https://www.datos.gov.co/resource/32sa-8pi3.json?$order=vigenciadesde%20DESC&$limit=1'

export interface Trm {
  rate: number
  /** Día de vigencia (YYYY-MM-DD), o null si se usó el respaldo. */
  day: string | null
}

export async function getTrm(): Promise<Trm> {
  try {
    const res = await fetch(TRM_URL, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(4000) })
    if (!res.ok) throw new Error(String(res.status))
    const [row] = (await res.json()) as { valor?: string; vigenciadesde?: string }[]
    const rate = Number(row?.valor)
    if (!Number.isFinite(rate) || rate < 1000 || rate > 10000) throw new Error('TRM fuera de rango')
    return { rate, day: row?.vigenciadesde?.slice(0, 10) ?? null }
  } catch {
    return { rate: FALLBACK_USD_COP, day: null }
  }
}
