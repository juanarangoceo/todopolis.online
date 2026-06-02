// Clasifica un producto con la taxonomía de tags usando Gemini.
// Usado por /api/mastershop/import al crear productos nuevos.
//
// Usa la REST API directa (no el SDK) porque el script batch corre fuera del
// runtime de Next y mantener un solo camino simplifica la mantención.

const GEMINI_MODEL = 'gemini-3.5-flash'
const MIN_TAGS = 3
const MAX_TAGS = 6
const TAG_RETRIES = 2

export interface TagDef {
  slug: string
  name: string
  group: string
  description?: string
}

interface ProductInput {
  name: string
  shortDescription?: string
  category?: string
}

function buildPrompt(tags: TagDef[], product: ProductInput): string {
  const grouped = tags.reduce<Record<string, TagDef[]>>((acc, t) => {
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

TAXONOMÍA:
${taxonomy}

PRODUCTO:
Nombre: ${product.name}
Categoría actual: ${product.category ?? 'sin categoría'}
Descripción: ${product.shortDescription ?? '(sin descripción)'}

Responde ÚNICAMENTE con JSON válido, sin markdown ni texto extra:
{"tags": ["slug1", "slug2", "slug3"]}`
}

// Trae la taxonomía completa desde Sanity (vía REST, sin cliente).
export async function fetchTagTaxonomy(opts: {
  projectId: string
  dataset: string
  apiVersion: string
  token: string
}): Promise<TagDef[]> {
  const q = encodeURIComponent(
    '*[_type=="tag" && defined(slug.current)]{ "slug": slug.current, name, group, description }',
  )
  const url = `https://${opts.projectId}.api.sanity.io/v${opts.apiVersion}/data/query/${opts.dataset}?query=${q}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${opts.token}` },
    // Server-side: cache la taxonomía 1h. Cambios manuales tardan máx 1h en propagarse.
    next: { revalidate: 3600, tags: ['tags'] },
  })
  if (!res.ok) throw new Error(`Sanity tags query: ${res.status} ${await res.text()}`)
  const data = (await res.json()) as { result: TagDef[] }
  return data.result ?? []
}

// Llama Gemini y devuelve slugs válidos. Si falla todos los reintentos, devuelve [].
// NO lanza: el auto-tagging es best-effort — un producto sin tags se puede etiquetar manualmente
// después, no debe bloquear el import.
export async function classifyProductTags(
  tags: TagDef[],
  product: ProductInput,
  geminiKey: string,
): Promise<string[]> {
  if (tags.length === 0) return []

  const validSlugs = new Set(tags.map((t) => t.slug))
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiKey}`

  for (let attempt = 1; attempt <= TAG_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: buildPrompt(tags, product) }] }],
          generationConfig: { temperature: 0.3 },
        }),
      })

      if (!res.ok) throw new Error(`Gemini ${res.status}`)
      const data = await res.json()

      const parts = data?.candidates?.[0]?.content?.parts ?? []
      const rawText = parts
        .filter((p: any) => !p.thought && typeof p.text === 'string' && p.text.trim())
        .map((p: any) => p.text)
        .join('')

      if (!rawText) throw new Error('Respuesta vacía')

      const clean = rawText.replace(/```json/gi, '').replace(/```/g, '').trim()
      const parsed = JSON.parse(clean)
      const slugs: string[] = Array.isArray(parsed.tags) ? parsed.tags : []
      const filtered = slugs.filter((s) => validSlugs.has(s)).slice(0, MAX_TAGS)
      if (filtered.length === 0) throw new Error('Ningún slug válido')

      return filtered
    } catch (err) {
      if (attempt === TAG_RETRIES) {
        console.error('[auto-tag] falló para producto:', product.name, err)
        return []
      }
      await new Promise((r) => setTimeout(r, 500 * attempt))
    }
  }
  return []
}

// Helper: convierte slugs a referencias Sanity con _key estable.
export function tagSlugsToReferences(slugs: string[]): Array<{ _type: 'reference'; _ref: string; _key: string }> {
  return slugs.map((slug) => ({
    _type: 'reference' as const,
    _ref: `tag-${slug}`,
    _key: Math.random().toString(36).substring(2, 9),
  }))
}
