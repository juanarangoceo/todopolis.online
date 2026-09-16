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

import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_VALUES,
  isProductCategory,
  normalizeProductCategory,
} from '../lib/categories.ts'

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

interface ProductRow {
  _id: string
  name: string
  shortDescription?: string
  category?: string
}

interface Fix {
  product: ProductRow
  from: string
  to: string
  how: 'normalizado' | 'clasificado'
}

// ─── 1) Trae los productos con categoría ausente o fuera de la lista ──────────
async function fetchDirtyProducts(): Promise<ProductRow[]> {
  const valores = PRODUCT_CATEGORY_VALUES.map((v) => `"${v}"`).join(', ')
  const q = encodeURIComponent(
    `*[_type=="product" && !(_id in path("drafts.**")) && (!defined(category) || !(category in [${valores}]))]{
      _id, name, shortDescription, category
    } | order(name asc)`,
  )
  const res = await fetch(`${SANITY_BASE}/query/${DATASET}?query=${q}`, {
    headers: { Authorization: `Bearer ${SANITY_TOKEN}` },
  })
  if (!res.ok) throw new Error(`Sanity query falló: ${res.status} ${await res.text()}`)
  const { result } = (await res.json()) as { result: ProductRow[] }
  return result ?? []
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

async function classifyAll(products: ProductRow[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  let siguiente = 0

  async function worker() {
    while (siguiente < products.length) {
      const product = products[siguiente++]
      const categoria = await classify(product)
      if (categoria) out.set(product._id, categoria)
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, products.length) }, worker))
  return out
}

// ─── 3) Escritura en Sanity ───────────────────────────────────────────────────
async function writeFixes(fixes: Fix[]): Promise<void> {
  for (let i = 0; i < fixes.length; i += MUTATION_BATCH) {
    const lote = fixes.slice(i, i + MUTATION_BATCH)
    const mutations = lote.map((fix) => ({
      patch: { id: fix.product._id, set: { category: fix.to } },
    }))
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
  const sucios = await fetchDirtyProducts()
  console.log(`Productos con categoría ausente o inválida: ${sucios.length}\n`)
  if (sucios.length === 0) return

  const fixes: Fix[] = []
  const paraClasificar: ProductRow[] = []

  for (const product of sucios) {
    const normalizado = normalizeProductCategory(product.category)
    if (normalizado) {
      fixes.push({ product, from: product.category ?? '(vacía)', to: normalizado, how: 'normalizado' })
    } else {
      paraClasificar.push(product)
    }
  }

  console.log(`  ${fixes.length} se arreglan normalizando (tildes / mayúsculas)`)
  console.log(`  ${paraClasificar.length} necesitan clasificarse con IA\n`)

  if (paraClasificar.length > 0) {
    console.log('Clasificando con Gemini...')
    const clasificados = await classifyAll(paraClasificar)
    for (const product of paraClasificar) {
      const categoria = clasificados.get(product._id)
      if (categoria) {
        fixes.push({ product, from: product.category ?? '(vacía)', to: categoria, how: 'clasificado' })
      }
    }
    const fallidos = paraClasificar.length - clasificados.size
    if (fallidos > 0) console.log(`\n${fallidos} sin clasificar: se dejan como están para revisarlos a mano.`)
  }

  console.log('\n─── Cambios ───────────────────────────────────────────────')
  for (const fix of fixes) {
    console.log(`  ${fix.how === 'normalizado' ? '=' : '~'} ${fix.product.name.slice(0, 52).padEnd(54)} ${fix.from} → ${fix.to}`)
  }

  const resumen = fixes.reduce<Record<string, number>>((acc, f) => {
    acc[f.to] = (acc[f.to] ?? 0) + 1
    return acc
  }, {})
  console.log('\nDestino:', Object.entries(resumen).map(([k, v]) => `${k}=${v}`).join(' '))

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
