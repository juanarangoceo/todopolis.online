// Completa con IA el TEXTO que les falta a los productos Destacados: titular
// de campaña, historia, pasos de uso y «qué viene en la caja». Es el mismo
// generador que el botón «🤖 Completar Destacado con IA» del Studio
// (`lib/destacado-content.ts`); las fotos de galería no se generan aquí.
//
//   node scripts/complete-destacados.ts            # dry-run: muestra lo que generaría
//   node scripts/complete-destacados.ts --apply    # lo escribe en BORRADORES
//
// Escribe en borradores y no en el documento publicado, igual que los botones
// del Studio (`ensureDraftId`): el texto de la IA pasa por un humano antes de
// salir a una landing de campaña. Solo llena lo que está vacío.

import { generateDestacadoContent, fetchInlineImages, type DestacadoNeeds } from '../lib/destacado-content.ts'

try {
  process.loadEnvFile('.env.local')
} catch {}

const PROJECT = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production'
const API_VERSION = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2025-01-01'
const TOKEN = process.env.SANITY_API_TOKEN
const GEMINI_KEY = process.env.GEMINI_API_KEY

if (!PROJECT || !TOKEN || !GEMINI_KEY) {
  console.error('Faltan NEXT_PUBLIC_SANITY_PROJECT_ID, SANITY_API_TOKEN o GEMINI_API_KEY en .env.local')
  process.exit(1)
}

const apply = process.argv.includes('--apply')
const base = `https://${PROJECT}.api.sanity.io/v${API_VERSION}/data`
const auth = { Authorization: `Bearer ${TOKEN}` }
const key = () => Math.random().toString(36).slice(2, 12)

async function query<T>(groq: string): Promise<T> {
  const res = await fetch(`${base}/query/${DATASET}?query=${encodeURIComponent(groq)}&perspective=raw`, { headers: auth })
  if (!res.ok) throw new Error(`query ${res.status}: ${await res.text()}`)
  return (await res.json()).result
}

async function mutate(mutations: unknown[]) {
  const res = await fetch(`${base}/mutate/${DATASET}`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ mutations }),
  })
  if (!res.ok) throw new Error(`mutate ${res.status}: ${await res.text()}`)
}

type Doc = Record<string, any> & { _id: string }

// Para cada Destacado publicado, se trabaja sobre su borrador si ya existe
// (el editor puede tener cambios sin publicar) o sobre el publicado.
const published = await query<Doc[]>(`*[_type == "product" && isVip == true && !(_id in path("drafts.**"))]`)
const drafts = await query<Doc[]>(`*[_type == "product" && _id in path("drafts.**") && isVip == true]`)
const draftById = new Map(drafts.map((d) => [d._id, d]))

console.log(`${published.length} Destacados. Modo: ${apply ? 'APPLY (escribe borradores)' : 'dry-run'}\n`)

for (const pub of published) {
  const draftId = `drafts.${pub._id}`
  const doc = draftById.get(draftId) ?? pub
  const needs: DestacadoNeeds = {
    headline: !doc.destacadoHeadline?.trim(),
    story: !doc.vipStory?.problemTitle,
    steps: !(doc.vipSteps?.length > 0),
    box: !(doc.vipBoxContents?.items?.length > 0),
  }
  const slug = doc.slug?.current ?? doc._id
  const pending = Object.entries(needs).filter(([, v]) => v).map(([k]) => k)
  if (pending.length === 0) {
    console.log(`· ${slug}: completo`)
    continue
  }

  const imageRefs: string[] = (doc.images ?? []).map((i: any) => i?.asset?._ref).filter(Boolean).slice(0, 3)
  const urls = imageRefs.map((ref) => {
    const [, id, dims, ext] = ref.split('-')
    return `https://cdn.sanity.io/images/${PROJECT}/${DATASET}/${id}-${dims}.${ext}?w=1024&h=1024&fit=max&fm=jpg&q=80`
  })
  if (urls.length === 0 && doc.mastershopImageUrl) urls.push(doc.mastershopImageUrl)

  const images = await fetchInlineImages(urls)
  const content = await generateDestacadoContent({
    apiKey: GEMINI_KEY,
    needs,
    images,
    input: {
      name: doc.name,
      shortDescription: doc.shortDescription,
      heroTitle: doc.heroTitle,
      specifications: doc.specifications,
      benefits: doc.benefits,
    },
  })

  console.log(`\n━━ ${slug} (faltaba: ${pending.join(', ')}; ${images.length} foto/s)`)
  console.log(JSON.stringify(content, null, 2))

  const set: Record<string, unknown> = {}
  if (content.headline) set.destacadoHeadline = content.headline
  if (content.story) set.vipStory = { ...(doc.vipStory ?? {}), ...content.story }
  if (content.steps) set.vipSteps = content.steps.map((s) => ({ _type: 'step', _key: key(), ...s }))
  if (content.box) set.vipBoxContents = { ...(doc.vipBoxContents ?? {}), ...content.box }

  if (apply && Object.keys(set).length) {
    // El borrador nace como copia del publicado (sin campos de sistema) y
    // luego se parchea: así «Publish» en el Studio publica todo junto.
    const { _id, _rev, _createdAt, _updatedAt, ...rest } = pub
    await mutate([
      { createIfNotExists: { ...rest, _id: draftId } },
      { patch: { id: draftId, set } },
    ])
    console.log(`→ escrito en ${draftId}`)
  }
}

if (!apply) console.log('\nDry-run: no se escribió nada. Corre con --apply para guardarlo en borradores.')
