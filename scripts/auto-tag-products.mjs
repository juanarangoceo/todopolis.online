// Auto-etiqueta los productos del catálogo usando Gemini.
// Solo procesa los que todavía no tienen tags (resumible: si se interrumpe, re-ejecutar
// vuelve a tomar solo el remanente gracias al filtro GROQ `!defined(tags) || count(tags) == 0`).
//
// Uso: node --env-file=.env.local scripts/auto-tag-products.mjs

const PROJECT = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production'
const API_VERSION = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2025-01-01'
const SANITY_TOKEN = process.env.SANITY_API_TOKEN
const GEMINI_KEY = process.env.GEMINI_API_KEY

if (!PROJECT || !SANITY_TOKEN || !GEMINI_KEY) {
  console.error('Faltan NEXT_PUBLIC_SANITY_PROJECT_ID, SANITY_API_TOKEN o GEMINI_API_KEY en .env.local')
  process.exit(1)
}

const CONCURRENCY = 5            // peticiones simultáneas a Gemini
const MAX_RETRIES = 3            // por producto, ante fallo de IA o red
const MIN_TAGS = 3
const MAX_TAGS = 6

const SANITY_BASE = `https://${PROJECT}.api.sanity.io/v${API_VERSION}/data`
const GEMINI_MODEL = 'gemini-2.0-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`

// ─── 1) Trae la taxonomía completa de tags ────────────────────────────────────
async function fetchTags() {
  const q = encodeURIComponent(
    '*[_type=="tag" && defined(slug.current)]{ "slug": slug.current, name, group, description }',
  )
  const res = await fetch(`${SANITY_BASE}/query/${DATASET}?query=${q}`, {
    headers: { Authorization: `Bearer ${SANITY_TOKEN}` },
  })
  if (!res.ok) throw new Error(`Sanity tags query falló: ${res.status} ${await res.text()}`)
  const { result } = await res.json()
  return result
}

// ─── 2) Trae solo productos SIN tags ──────────────────────────────────────────
async function fetchPendingProducts() {
  const q = encodeURIComponent(
    `*[_type=="product" && (!defined(tags) || count(tags)==0)]{
      _id, name, shortDescription, category, "image": coalesce(images[0].asset->url, mastershopImageUrl)
    }`,
  )
  const res = await fetch(`${SANITY_BASE}/query/${DATASET}?query=${q}`, {
    headers: { Authorization: `Bearer ${SANITY_TOKEN}` },
  })
  if (!res.ok) throw new Error(`Sanity products query falló: ${res.status} ${await res.text()}`)
  const { result } = await res.json()
  return result
}

// ─── 3) Prompt para Gemini ────────────────────────────────────────────────────
function buildPrompt(tags, product) {
  const grouped = tags.reduce((acc, t) => {
    ;(acc[t.group] ??= []).push(t)
    return acc
  }, {})

  const taxonomy = Object.entries(grouped)
    .map(
      ([group, items]) =>
        `## ${group.toUpperCase()}\n` +
        items.map((t) => `- ${t.slug}: ${t.name} — ${t.description ?? ''}`).join('\n'),
    )
    .join('\n\n')

  return `Eres un experto en e-commerce que clasifica productos con etiquetas para una tienda colombiana (Todopolis).

Tu trabajo: leer un producto y devolver entre ${MIN_TAGS} y ${MAX_TAGS} etiquetas (slugs) de la taxonomía siguiente.

REGLAS:
- Devuelve SOLO slugs que existan en la taxonomía. No inventes ninguno.
- Mezcla grupos: idealmente al menos una de "audiencia", una de "beneficio" o "nicho", y una de "atributo" cuando aplique.
- NO uses tags de "ocasion" estacionales (navidad, dia-de-la-madre, dia-del-padre, san-valentin, amor-y-amistad, halloween) salvo que el producto sea literalmente de esa temporada. Esos se asignan manualmente en campaña.
- NO uses tags de "promo" (nuevo, top-ventas, tendencia, oferta, exclusivo, agotandose). Esos se derivan de otros campos.
- Sé conservador: prefiere ${MIN_TAGS}-4 tags muy buenos antes que ${MAX_TAGS} forzados.
- Si un producto NO encaja en algún tag de un grupo, no rellenes. Es válido devolver solo ${MIN_TAGS}.

TAXONOMÍA:
${taxonomy}

PRODUCTO:
Nombre: ${product.name}
Categoría actual: ${product.category ?? 'sin categoría'}
Descripción: ${product.shortDescription ?? '(sin descripción)'}

Responde ÚNICAMENTE con JSON válido, sin markdown ni texto extra:
{"tags": ["slug1", "slug2", "slug3"]}`
}

// ─── 4) Llama Gemini (REST) y devuelve array de slugs válidos ─────────────────
async function classifyProduct(tags, product) {
  const validSlugs = new Set(tags.map((t) => t.slug))
  let lastError

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: buildPrompt(tags, product) }] }],
          generationConfig: { temperature: 0.3 },
        }),
      })

      if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`)
      const data = await res.json()

      const parts = data?.candidates?.[0]?.content?.parts ?? []
      const rawText = parts
        .filter((p) => !p.thought && typeof p.text === 'string' && p.text.trim())
        .map((p) => p.text)
        .join('')

      if (!rawText) throw new Error('Gemini devolvió respuesta vacía')

      const clean = rawText.replace(/```json/gi, '').replace(/```/g, '').trim()
      const parsed = JSON.parse(clean)
      const slugs = Array.isArray(parsed.tags) ? parsed.tags : []

      const filtered = slugs.filter((s) => validSlugs.has(s)).slice(0, MAX_TAGS)
      if (filtered.length === 0) throw new Error(`Ningún slug válido en respuesta: ${JSON.stringify(slugs)}`)

      return filtered
    } catch (err) {
      lastError = err
      if (attempt < MAX_RETRIES) {
        const backoff = 500 * attempt
        await new Promise((r) => setTimeout(r, backoff))
      }
    }
  }
  throw lastError
}

// ─── 5) Persiste los tags en Sanity ───────────────────────────────────────────
async function writeTags(productId, slugs) {
  const references = slugs.map((slug) => ({
    _type: 'reference',
    _ref: `tag-${slug}`,
    _key: Math.random().toString(36).substring(2, 9),
  }))

  const mutateRes = await fetch(`${SANITY_BASE}/mutate/${DATASET}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SANITY_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mutations: [{ patch: { id: productId, set: { tags: references } } }],
    }),
  })

  if (!mutateRes.ok) {
    throw new Error(`Sanity patch ${productId}: ${mutateRes.status} ${await mutateRes.text()}`)
  }
}

// ─── 6) Pool de concurrencia simple ───────────────────────────────────────────
async function pool(items, worker, concurrency) {
  let i = 0
  let ok = 0
  let fail = 0
  const failures = []

  async function next() {
    while (i < items.length) {
      const idx = i++
      const item = items[idx]
      try {
        await worker(item, idx)
        ok++
      } catch (err) {
        fail++
        failures.push({ id: item._id, name: item.name, error: err?.message ?? String(err) })
        console.error(`   ✗ [${idx + 1}] ${item.name}: ${err?.message ?? err}`)
      }
      if ((ok + fail) % 10 === 0 || ok + fail === items.length) {
        console.log(`   ── progreso: ${ok + fail}/${items.length} (✓ ${ok} · ✗ ${fail})`)
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, next))
  return { ok, fail, failures }
}

// ─── 7) Main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log(`📂 Conectando a ${PROJECT}/${DATASET}...`)

  const [tags, pending] = await Promise.all([fetchTags(), fetchPendingProducts()])
  console.log(`🏷️  Taxonomía: ${tags.length} tags`)
  console.log(`📦 Productos sin etiquetar: ${pending.length}`)

  if (pending.length === 0) {
    console.log('✨ Nada que hacer. Todos los productos ya tienen tags.')
    return
  }

  const t0 = Date.now()
  const { ok, fail, failures } = await pool(
    pending,
    async (product) => {
      const slugs = await classifyProduct(tags, product)
      await writeTags(product._id, slugs)
    },
    CONCURRENCY,
  )

  const secs = Math.round((Date.now() - t0) / 1000)
  console.log(`\n⏱️  Tiempo total: ${secs}s`)
  console.log(`✅ Etiquetados: ${ok}`)
  console.log(`❌ Fallaron: ${fail}`)

  if (failures.length) {
    console.log('\n── Fallos ─────────────────────────────────────────────')
    for (const f of failures) console.log(`   • ${f.name} (${f.id}): ${f.error}`)
    console.log(
      '\n💡 Re-ejecuta el script: solo reintentará los productos que sigan sin tags.',
    )
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('💥 Error fatal:', err)
  process.exit(1)
})
