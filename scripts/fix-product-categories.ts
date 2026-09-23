// Limpia el campo `category` de los productos del catálogo.
//
// En el dataset conviven tres problemas: productos sin categoría, valores con
// tilde o mayúscula que no están en la lista ('electrónica', 'Otros') y
// etiquetas crudas de Mastershop que nunca se mapearon ('Hogar, Muebles,
// Cocina'). Las dos primeras se salvan de casualidad por el fallback de
// `normalizeCategory` en components/product-browser.tsx; la tercera deja al
// producto fuera de todas las pestañas del home salvo "Todos".
//
// Dos caminos, en este orden:
//   1. Normalizar — mismo valor, otra forma (tildes, mayúsculas). Determinista.
//   2. Clasificar con Gemini — el valor no corresponde a ninguna categoría, o
//      no hay valor. Se valida contra la lista antes de escribir.
//
// Uso:
//   node scripts/fix-product-categories.ts            # dry-run, no escribe nada
//   node scripts/fix-product-categories.ts --apply    # escribe en Sanity

// Limpia y reclasifica el campo `category` de los productos del catálogo.
//
// Historia: el 16-sep-2026 se corrió para 66 productos con la categoría vacía,
// con tilde o con la etiqueta cruda de Mastershop, clasificándolos con Gemini.
// El 23-sep-2026 la taxonomía creció (Cocina, Salud y bienestar, Bebés,
// Mascotas, Carro y moto) y el clasificador pasó a JEV
// (`lib/category-classifier.ts`), el mismo que usan el import y el Studio.
//
// Qué productos revisa:
//   - por defecto: categoría vacía, inválida o «otros» (170 al 23-sep).
//   - con --all: todo el catálogo. Un producto solo cambia si JEV está SEGURO
//     (confianza ≥ MIN_CONFIDENCE); si duda, conserva la categoría que tenía.
// «Bienestar Íntimo» no se toca nunca: de esa categoría dependen el aviso de
// edad y que el Píxel no cargue, y no se decide con un modelo.
//
// Orden por producto: normalizar (tildes, mayúsculas) → JEV → Gemini si JEV
// no responde o duda.
//
// Uso:
//   node scripts/fix-product-categories.ts                # dry-run
//   node scripts/fix-product-categories.ts --all          # dry-run, catálogo entero
//   node scripts/fix-product-categories.ts --apply [--all] # escribe en Sanity
//
// JEV necesita AI_GATEWAY_API_KEY o un VERCEL_OIDC_TOKEN vigente
// (`vercel env pull` lo renueva; dura 12 h).

import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_VALUES,
  isProductCategory,
  normalizeProductCategory,
} from '../lib/categories.ts'
import { askJev, decideCategory, jevConfigured, MIN_CONFIDENCE } from '../lib/category-classifier.ts'

try {
  process.loadEnvFile('.env.local')
} catch {
  // CI y ejecuciones con variables exportadas no necesitan un archivo local.
}

const PROJECT = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production'
const API_VERSION = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2025-01-01'
const SANITY_TOKEN = process.env.SANITY_API_TOKEN
const GEMINI_KEY = process.env.GEMINI_API_KEY

if (!PROJECT || !SANITY_TOKEN || !GEMINI_KEY) {
  console.error('Faltan NEXT_PUBLIC_SANITY_PROJECT_ID, SANITY_API_TOKEN o GEMINI_API_KEY en .env.local')
  process.exit(1)
}

const SANITY_BASE = `https://${PROJECT}.api.sanity.io/v${API_VERSION}/data`
const GEMINI_MODEL = 'gemini-3.8-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`

const CONCURRENCY = 5
const MAX_RETRIES = 2
const MUTATION_BATCH = 50

const apply = process.argv.includes('--apply')
const all = process.argv.includes('--all')
// --env=archivo: variables que PISAN a las de .env.local (process.loadEnvFile
// no sobrescribe). Sirve para pasar un VERCEL_OIDC_TOKEN recién bajado sin
// tocar .env.local.
const envFile = process.argv.find((a) => a.startsWith('--env='))?.slice(6)
if (envFile) Object.assign(process.env, parseEnv(readFileSync(envFile, 'utf8')))

interface ProductRow {
  _id: string
  /** Si hay borrador abierto se parchea también: publicarlo pisaría la categoría nueva. */
  hasDraft?: boolean
  name: string
  shortDescription?: string
  category?: string
}

interface Fix {
  product: ProductRow
  from: string
  to: string
  how: 'normalizado' | 'jev' | 'gemini'
  confidence?: number | null
}

// ─── 1) Trae los productos a revisar ──────────────────────────────────────────
async function fetchTargets(): Promise<ProductRow[]> {
  const valores = PRODUCT_CATEGORY_VALUES.filter((v) => v !== 'otros').map((v) => `"${v}"`).join(', ')
  const filtro = all
    ? `category != "bienestar-intimo"`
    : `(!defined(category) || !(category in [${valores}]))`
  const q = encodeURIComponent(
    `*[_type=="product" && !(_id in path("drafts.**")) && ${filtro}]{
      _id, name, shortDescription, category, "hasDraft": defined(*[_id == "drafts." + ^._id][0]._id)
    } | order(name asc)`,
  )
  const res = await fetch(`${SANITY_BASE}/query/${DATASET}?query=${q}`, {
    headers: { Authorization: `Bearer ${SANITY_TOKEN}` },
  })
  if (!res.ok) throw new Error(`Sanity query falló: ${res.status} ${await res.text()}`)
  const { result } = (await res.json()) as { result: ProductRow[] }
  return (result ?? []).filter((p) => p.category !== 'bienestar-intimo')
}

// ─── 2) Clasificación con Gemini para lo que no se puede normalizar ───────────
function buildPrompt(product: ProductRow): string {
  const lista = PRODUCT_CATEGORIES.map((c) => `- ${c.value}: ${c.title}`).join('\n')
  return `Clasifica este producto de una tienda online colombiana en UNA categoría.

CATEGORÍAS (devuelve el slug de la izquierda, nunca el título):
${lista}

REGLAS:
- Elige la categoría donde un comprador colombiano iría a buscar el producto, no la que describe su material.
- "bienestar-intimo" es para productos sexuales o de lencería íntima. No lo uses para masajeadores corporales ni cosmética.
- Si ninguna encaja de verdad, usa "otros". No inventes slugs.

PRODUCTO:
Nombre: ${product.name}
Categoría actual (sucia o vacía): ${product.category ?? '(vacía)'}
Descripción: ${product.shortDescription ?? '(sin descripción)'}

Responde ÚNICAMENTE con JSON válido, sin markdown:
{"category": "slug"}`
}

async function classify(product: ProductRow): Promise<string | null> {
  for (let intento = 0; intento <= MAX_RETRIES; intento++) {
    try {
      const res = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: buildPrompt(product) }] }],
          generationConfig: { temperature: 0 },
        }),
      })
      if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`)

      const data = await res.json()
      const parts = data?.candidates?.[0]?.content?.parts ?? []
      const rawText = parts
        .filter((p: any) => !p.thought && typeof p.text === 'string' && p.text.trim())
        .map((p: any) => p.text)
        .join('')
      if (!rawText) throw new Error('Gemini no devolvió texto')

      const clean = rawText.replace(/```json/gi, '').replace(/```/g, '').trim()
      const { category } = JSON.parse(clean) as { category?: string }

      // Se valida contra la lista: un slug inventado ensucia igual que el valor
      // que estamos arreglando.
      if (isProductCategory(category)) return category
      throw new Error(`Gemini devolvió una categoría inexistente: ${category}`)
    } catch (err) {
      if (intento === MAX_RETRIES) {
        console.error(`  ✗ ${product.name.slice(0, 60)}: ${(err as Error).message}`)
        return null
      }
      await new Promise((r) => setTimeout(r, 500 * (intento + 1)))
    }
  }
  return null
}

interface Classified { category: string; how: 'jev' | 'gemini'; confidence: number | null }

// JEV primero; Gemini solo si JEV no responde o duda. La categoría actual, si
// es válida y no es «otros», es el último respaldo: dudar no mueve nada.
async function classifyOne(product: ProductRow): Promise<Classified | null> {
  const current = normalizeProductCategory(product.category)
  const jev = await askJev({ name: product.name, description: product.shortDescription })
  if (jev && jev.confidence !== null && jev.confidence >= MIN_CONFIDENCE) {
    return { category: jev.category, how: 'jev', confidence: jev.confidence }
  }
  if (all && current && current !== 'otros') return null // en --all, sin certeza no se toca
  const gemini = await classify(product)
  const d = decideCategory(jev, [gemini, current])
  if (d.source === 'otros') return null
  return { category: d.category, how: d.source === 'respaldo' ? 'gemini' : 'jev', confidence: d.confidence }
}

async function classifyAll(products: ProductRow[]): Promise<Map<string, Classified>> {
  const out = new Map<string, Classified>()
  let siguiente = 0
  let hechos = 0

  async function worker() {
    while (siguiente < products.length) {
      const product = products[siguiente++]
      const r = await classifyOne(product)
      if (r) out.set(product._id, r)
      if (++hechos % 25 === 0) console.log(`  ${hechos}/${products.length}`)
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, products.length) }, worker))
  return out
}

// ─── 3) Escritura en Sanity ───────────────────────────────────────────────────
async function writeFixes(fixes: Fix[]): Promise<void> {
  for (let i = 0; i < fixes.length; i += MUTATION_BATCH) {
    const lote = fixes.slice(i, i + MUTATION_BATCH)
    const mutations = lote.flatMap((fix) => [
      { patch: { id: fix.product._id, set: { category: fix.to } } },
      ...(fix.product.hasDraft ? [{ patch: { id: `drafts.${fix.product._id}`, set: { category: fix.to } } }] : []),
    ])
    const res = await fetch(`${SANITY_BASE}/mutate/${DATASET}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SANITY_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mutations }),
    })
    if (!res.ok) throw new Error(`Sanity mutate falló: ${res.status} ${await res.text()}`)
    console.log(`  escritos ${Math.min(i + MUTATION_BATCH, fixes.length)}/${fixes.length}`)
  }
}

// Cambiar categorías mueve productos entre pestañas del home, que está cacheado.
// Sin esto el cambio no se ve hasta el siguiente deploy o revalidación.
async function revalidateHome(): Promise<void> {
  const site = process.env.NEXT_PUBLIC_SITE_URL
  const secret = process.env.SANITY_REVALIDATE_SECRET
  if (!site) {
    console.log('\n⚠️  NEXT_PUBLIC_SITE_URL no está definida: revalida el home a mano.')
    return
  }
  const url = `${site.replace(/\/$/, '')}/api/revalidate${secret ? `?secret=${encodeURIComponent(secret)}` : ''}`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _type: 'product' }),
    })
    console.log(res.ok ? '\n✓ Home revalidado.' : `\n⚠️  Revalidación respondió ${res.status}: revalida a mano.`)
  } catch (err) {
    console.log(`\n⚠️  No se pudo revalidar (${(err as Error).message}): hazlo a mano.`)
  }
}

// ─── main ─────────────────────────────────────────────────────────────────────
async function main() {
  if (!jevConfigured()) {
    console.log('⚠️  JEV no está configurado (AI_GATEWAY_API_KEY o VERCEL_OIDC_TOKEN vigente): se clasifica solo con Gemini.\n')
  }
  const productos = await fetchTargets()
  console.log(`Productos a revisar${all ? ' (catálogo entero)' : ' (vacíos, inválidos u «otros»)'}: ${productos.length}\n`)
  if (productos.length === 0) return

  const fixes: Fix[] = []
  const paraClasificar: ProductRow[] = []

  for (const product of productos) {
    const normalizado = normalizeProductCategory(product.category)
    if (normalizado && normalizado !== product.category) {
      fixes.push({ product, from: product.category ?? '(vacía)', to: normalizado, how: 'normalizado' })
    } else {
      paraClasificar.push(product)
    }
  }

  console.log(`  ${fixes.length} se arreglan normalizando (tildes / mayúsculas)`)
  console.log(`  ${paraClasificar.length} se clasifican con JEV\n`)

  const clasificados = await classifyAll(paraClasificar)
  for (const product of paraClasificar) {
    const r = clasificados.get(product._id)
    if (r && r.category !== product.category) {
      fixes.push({ product, from: product.category ?? '(vacía)', to: r.category, how: r.how, confidence: r.confidence })
    }
  }

  console.log('\n─── Cambios ───────────────────────────────────────────────')
  for (const fix of fixes.sort((a, b) => a.to.localeCompare(b.to))) {
    const conf = typeof fix.confidence === 'number' ? ` (${Math.round(fix.confidence * 100)}%)` : ''
    console.log(`  ${fix.how.padEnd(11)} ${fix.product.name.slice(0, 56).padEnd(58)} ${fix.from} → ${fix.to}${conf}`)
  }

  const resumen = fixes.reduce<Record<string, number>>((acc, f) => {
    acc[f.to] = (acc[f.to] ?? 0) + 1
    return acc
  }, {})
  console.log('\nDestino:', Object.entries(resumen).map(([k, v]) => `${k}=${v}`).join(' '))
  console.log(`Se quedan igual: ${productos.length - fixes.length}`)

  if (!apply) {
    console.log(`\nDRY-RUN: no se escribió nada. Corre con --apply para aplicar los ${fixes.length} cambios.`)
    return
  }

  console.log(`\nEscribiendo ${fixes.length} cambios en Sanity...`)
  await writeFixes(fixes)
  await revalidateHome()
  console.log('\nListo.')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
