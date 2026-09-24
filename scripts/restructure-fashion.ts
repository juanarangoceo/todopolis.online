// Reestructuración de moda del 24-sep-2026 (ver `lib/categories.ts`):
//
//   1. Moda se parte: las fajas y moldeadores pasan a `fajas` y el calzado a
//      `calzado`; `moda` queda como Ropa. Se corrigen los mal clasificados
//      evidentes (gafas en Moda, una cosmetiquera, una toalla, un termo).
//   2. Los juguetes para adultos se DESPUBLICAN (quedan como borrador, no se
//      borran): la tienda vende lencería y no juguetes (`lib/adult-policy.ts`).
//      Despublicar y no borrar a propósito: el sync de Mastershop busca por
//      `mastershopId` también entre borradores, así que no los reimporta.
//
// Reglas por nombre y deterministas, no un modelo: son ~50 productos y la
// lista entera se revisa en el dry-run antes de escribir.
//
//   node scripts/restructure-fashion.ts            # dry-run: muestra qué haría
//   node scripts/restructure-fashion.ts --apply    # escribe y revalida la web
//
// Correr --apply SOLO con el código nuevo ya desplegado: con el viejo, los
// productos en `fajas` y `calzado` desaparecen de las pestañas del home.

import { ADULT_CATEGORY, isAllowedAdultProduct } from '../lib/adult-policy.ts'

try {
  process.loadEnvFile('.env.local')
} catch {
  // Variables ya exportadas.
}

const PROJECT = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production'
const API_VERSION = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2025-01-01'
const TOKEN = process.env.SANITY_API_TOKEN
const SITE = process.env.REVALIDATE_SITE_URL ?? 'https://todopolis.online'
const REVALIDATE_SECRET = process.env.SANITY_REVALIDATE_SECRET

if (!PROJECT || !TOKEN) {
  console.error('Faltan NEXT_PUBLIC_SANITY_PROJECT_ID o SANITY_API_TOKEN en .env.local')
  process.exit(1)
}

const apply = process.argv.includes('--apply')
const BASE = `https://${PROJECT}.api.sanity.io/v${API_VERSION}/data`

const FAJAS = /faja|moldead|reductor|levanta cola|shaper|brass?ier (de realce|corrector)|panty control|body (cachetero|reductor|modelador)|enterizo (moldeador|reductor)|cinturilla/i
// Sin «bota»: «bota ancha» es un corte de pantalón, no un zapato.
const CALZADO = /tenis|tennis|sandalia|zapat|calzado|chancla|pantufla/i
// Mal clasificados vistos en la revisión, por nombre.
const MOVES: [RegExp, string][] = [
  [/gafas|gorra|pañoleta|bolso|tr[ií]o escolar/i, 'accesorios'],
  [/cosmetiquera/i, 'belleza'],
  [/toalla/i, 'hogar'],
  [/termo.*mascota/i, 'mascotas'],
]

interface Row {
  _id: string
  name: string
  category: string
  slug?: string
  hasDraft: boolean
}

function target(p: Row): string | null {
  if (p.category === 'moda') {
    if (FAJAS.test(p.name)) return 'fajas'
    if (CALZADO.test(p.name)) return 'calzado'
  }
  if (p.category === 'moda' || p.category === 'accesorios') {
    for (const [re, to] of MOVES) if (re.test(p.name) && to !== p.category) return to
  }
  return null
}

async function query<T>(groq: string): Promise<T> {
  const res = await fetch(`${BASE}/query/${DATASET}?query=${encodeURIComponent(groq)}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  })
  if (!res.ok) throw new Error(`Sanity ${res.status}: ${await res.text()}`)
  return (await res.json()).result as T
}

async function mutate(mutations: unknown[]) {
  const res = await fetch(`${BASE}/mutate/${DATASET}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ mutations }),
  })
  if (!res.ok) throw new Error(`Sanity ${res.status}: ${await res.text()}`)
}

async function revalidate(slug: string | undefined, id: string) {
  if (!REVALIDATE_SECRET) return
  await fetch(`${SITE}/api/revalidate?secret=${encodeURIComponent(REVALIDATE_SECRET)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ _type: 'product', _id: id, slug: { current: slug } }),
  }).catch(() => {})
}

const rows = await query<Row[]>(
  `*[_type == "product" && !(_id in path("drafts.**")) && category in ["moda", "accesorios", "${ADULT_CATEGORY}"]]{
    _id, name, category, "slug": slug.current,
    "hasDraft": defined(*[_id == "drafts." + ^._id][0]._id)
  } | order(category asc, name asc)`,
)

const moves = rows.flatMap((p) => {
  const to = target(p)
  return to ? [{ p, to }] : []
})
const retire = rows.filter((p) => p.category === ADULT_CATEGORY && !isAllowedAdultProduct(p.name))
const lingerie = rows.filter((p) => p.category === ADULT_CATEGORY && isAllowedAdultProduct(p.name))

console.log(`\nCAMBIOS DE CATEGORÍA (${moves.length})`)
for (const { p, to } of moves) console.log(`  ${p.category.padEnd(11)} → ${to.padEnd(11)} ${p.name}${p.hasDraft ? '  [+borrador]' : ''}`)
console.log(`\nSE DESPUBLICAN — juguetes para adultos (${retire.length})`)
for (const p of retire) console.log(`  ${p.name}`)
console.log(`\nSE QUEDAN EN LENCERÍA (${lingerie.length})`)
for (const p of lingerie) console.log(`  ${p.name}`)
const rest = rows.filter((p) => p.category === 'moda' && !target(p))
console.log(`\nSE QUEDAN EN ROPA (${rest.length})`)
for (const p of rest) console.log(`  ${p.name}`)

if (!apply) {
  console.log('\nDry-run. Nada se escribió. Revisa la lista y corre con --apply.')
  process.exit(0)
}

// Categoría: el publicado y, si existe, el borrador (publicarlo después
// pisaría la categoría nueva con la vieja).
const patches = moves.flatMap(({ p, to }) => [
  { patch: { id: p._id, set: { category: to } } },
  ...(p.hasDraft ? [{ patch: { id: `drafts.${p._id}`, set: { category: to } } }] : []),
])
for (let i = 0; i < patches.length; i += 50) await mutate(patches.slice(i, i + 50))
console.log(`\n✓ ${moves.length} productos cambiados de categoría`)

// Despublicar = dejar el contenido como borrador y borrar el publicado. Si ya
// hay borrador, se conserva el borrador (es lo más nuevo del editor).
for (const p of retire) {
  const [doc] = await query<Record<string, unknown>[]>(`*[_id == "${p._id}"]`)
  if (!doc) continue
  const { _rev, _updatedAt, _createdAt, ...content } = doc
  void _rev; void _updatedAt; void _createdAt
  await mutate([
    { createIfNotExists: { ...content, _id: `drafts.${p._id}` } },
    { delete: { id: p._id } },
  ])
}
console.log(`✓ ${retire.length} juguetes despublicados (quedan como borrador en el Studio)`)

if (REVALIDATE_SECRET) {
  for (const { p } of moves) await revalidate(p.slug, p._id)
  for (const p of retire) await revalidate(p.slug, p._id)
  console.log(`✓ Web revalidada (${SITE})`)
} else {
  console.log('⚠ Sin SANITY_REVALIDATE_SECRET: la web tardará en reflejarlo.')
}
