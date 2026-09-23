// Etiqueta con JEV los productos que no tienen etiquetas.
//
// Al 23-sep-2026 eran 92 de 578: sin etiquetas un producto no sale en ningún
// filtro de «Para quién» / «Para qué» ni en la venta cruzada por parecido
// (lib/related-products.ts). Usa el mismo `classifyProductTags` que el import
// (JEV primero, Gemini de respaldo).
//
// Escribe en el publicado Y en el borrador si existe: si solo se parchea el
// publicado, al publicar un borrador abierto se pierden las etiquetas nuevas
// (el mismo fallo que hacía desaparecer fotos, ver `ensureDraftId`).
//
// Uso:
//   node scripts/retag-products.ts                 # dry-run
//   node scripts/retag-products.ts --apply         # escribe en Sanity
//   --env=archivo  variables que pisan a .env.local (p. ej. un VERCEL_OIDC_TOKEN fresco)

import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { classifyProductTags, fetchTagTaxonomy, tagSlugsToReferences } from '../lib/auto-tag.ts'
import { jevConfigured } from '../lib/jev.ts'

try {
  process.loadEnvFile('.env.local')
} catch {
  // CI y ejecuciones con variables exportadas no necesitan un archivo local.
}
const envFile = process.argv.find((a) => a.startsWith('--env='))?.slice(6)
if (envFile) Object.assign(process.env, parseEnv(readFileSync(envFile, 'utf8')))

const PROJECT = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production'
const API_VERSION = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2025-01-01'
const TOKEN = process.env.SANITY_API_TOKEN
const GEMINI_KEY = process.env.GEMINI_API_KEY ?? ''
const apply = process.argv.includes('--apply')
// Bajo a propósito: con 4 en paralelo JEV respondía «alta demanda» (23-sep-2026).
const CONCURRENCY = 2

if (!PROJECT || !TOKEN) {
  console.error('Faltan NEXT_PUBLIC_SANITY_PROJECT_ID o SANITY_API_TOKEN')
  process.exit(1)
}
const BASE = `https://${PROJECT}.api.sanity.io/v${API_VERSION}/data`

interface Row { _id: string; name: string; shortDescription?: string; category?: string; hasDraft: boolean }

async function query<T>(groq: string): Promise<T> {
  const res = await fetch(`${BASE}/query/${DATASET}?query=${encodeURIComponent(groq)}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  })
  if (!res.ok) throw new Error(`Sanity query: ${res.status} ${await res.text()}`)
  return ((await res.json()) as { result: T }).result
}

async function main() {
  if (!jevConfigured()) console.log('⚠️  JEV no está configurado: se etiqueta con Gemini.\n')
  const taxonomy = await fetchTagTaxonomy({ projectId: PROJECT!, dataset: DATASET, apiVersion: API_VERSION, token: TOKEN! })
  const rows = await query<Row[]>(
    `*[_type=="product" && !(_id in path("drafts.**")) && count(coalesce(tags, [])) == 0]{
      _id, name, shortDescription, category, "hasDraft": defined(*[_id == "drafts." + ^._id][0]._id)
    } | order(name asc)`,
  )
  console.log(`Productos sin etiquetas: ${rows.length} · taxonomía: ${taxonomy.length} etiquetas\n`)

  const results: { row: Row; slugs: string[] }[] = []
  let next = 0
  async function worker() {
    while (next < rows.length) {
      const row = rows[next++]
      const slugs = await classifyProductTags(taxonomy, { name: row.name, shortDescription: row.shortDescription, category: row.category }, GEMINI_KEY)
      results.push({ row, slugs })
      if (results.length % 20 === 0) console.log(`  ${results.length}/${rows.length}`)
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, rows.length) }, worker))

  const names = new Map(taxonomy.map((t) => [t.slug, t.name]))
  for (const { row, slugs } of results.sort((a, b) => a.row.name.localeCompare(b.row.name))) {
    console.log(`  ${row.name.slice(0, 55).padEnd(57)} ${slugs.map((s) => names.get(s) ?? s).join(', ') || '(ninguna)'}`)
  }
  const tagged = results.filter((r) => r.slugs.length > 0)
  console.log(`\nCon etiquetas: ${tagged.length} · sin ninguna: ${results.length - tagged.length}`)

  if (!apply) {
    console.log('\nDRY-RUN: no se escribió nada. Corre con --apply para escribir.')
    return
  }

  const mutations = tagged.flatMap(({ row, slugs }) => {
    const set = { tags: tagSlugsToReferences(slugs) }
    return [
      { patch: { id: row._id, set } },
      ...(row.hasDraft ? [{ patch: { id: `drafts.${row._id}`, set } }] : []),
    ]
  })
  for (let i = 0; i < mutations.length; i += 50) {
    const res = await fetch(`${BASE}/mutate/${DATASET}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mutations: mutations.slice(i, i + 50) }),
    })
    if (!res.ok) throw new Error(`Sanity mutate: ${res.status} ${await res.text()}`)
  }
  console.log(`\n✓ ${tagged.length} productos etiquetados (${mutations.length} documentos).`)

  const site = process.env.NEXT_PUBLIC_SITE_URL
  const secret = process.env.SANITY_REVALIDATE_SECRET
  if (site) {
    const r = await fetch(`${site.replace(/\/$/, '')}/api/revalidate${secret ? `?secret=${encodeURIComponent(secret)}` : ''}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _type: 'product' }),
    }).catch(() => null)
    console.log(r?.ok ? '✓ Home revalidado.' : '⚠️  Revalida el home a mano.')
  }
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
