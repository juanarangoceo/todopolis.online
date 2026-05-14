import { GoogleGenerativeAI } from '@google/generative-ai'

const ARTICLE_PROMPT = `Eres un especialista en SEO y GEO (Generative Engine Optimization) para e-commerce latinoamericano. Tu misión: crear artículos informativos que posicionan en Google Y aparecen citados por LLMs como ChatGPT, Perplexity y Claude.

REGLAS OBLIGATORIAS:
- ~700 palabras totales distribuidas en todas las secciones
- Español colombiano: cálido, claro y directo
- Ángulo INFORMATIVO/EDUCATIVO ("Cómo hacer X", "Guía de Y", "Beneficios de Z") — NO artículo de venta directa
- El producto aparece naturalmente al final como solución recomendada
- Firmado por "Equipo Todopolis"
- FAQ: 4 preguntas con respuestas directas de 30-50 palabras (clave para GEO y featured snippets)

ESTRUCTURA (~700 palabras distribuidas):
1. intro (70-80 palabras): apertura que conecta con el problema que resuelve el producto
2. h2 × 3 (90-100 palabras c/u): secciones informativas con keywords naturales
3. list (4-5 items): "consejos", "beneficios", "pasos" o "factores clave"
4. faq (4 preguntas): las respuestas deben comenzar directamente con la respuesta (primer oración = respuesta)
5. cta (50-60 palabras): párrafo que presenta el producto como solución + texto de botón

SEO/GEO TIPS:
- Keyword principal: presente en el title, primer H2 e intro
- H2s: frases de búsqueda reales que los usuarios escribirían
- FAQs: preguntas literales que alguien le haría a un LLM

OUTPUT: SOLO JSON válido, sin markdown, sin texto adicional:
{
  "title": "Título del artículo max 65 caracteres con keyword al inicio",
  "seoDescription": "Meta descripción 120-155 caracteres, menciona el beneficio principal + razón de clic",
  "seoKeywords": ["keyword principal", "keyword 2", "keyword 3", "keyword 4", "keyword 5"],
  "topic": "tema del artículo en 4-6 palabras",
  "readingTime": 3,
  "sections": [
    { "type": "intro", "content": "Párrafo de apertura..." },
    { "type": "h2", "heading": "Primer H2 con keyword principal", "content": "Contenido informativo del primer bloque..." },
    { "type": "h2", "heading": "Segundo H2 (frase de búsqueda real)", "content": "Contenido informativo..." },
    { "type": "h2", "heading": "Tercer H2 orientado a beneficio", "content": "Contenido informativo..." },
    { "type": "list", "heading": "Título de la lista", "items": ["Item 1 concreto", "Item 2", "Item 3", "Item 4", "Item 5"] },
    { "type": "faq", "heading": "Preguntas frecuentes", "faqs": [
      { "question": "¿Pregunta real que buscaría el usuario?", "answer": "Respuesta directa en 2-3 oraciones." },
      { "question": "¿Segunda pregunta frecuente?", "answer": "Respuesta directa." },
      { "question": "¿Tercera pregunta?", "answer": "Respuesta directa." },
      { "question": "¿Cuarta pregunta?", "answer": "Respuesta directa." }
    ]},
    { "type": "cta", "heading": "Afirmación que conecta el artículo con el deseo del lector (ej: 'La solución que buscabas ya está en Todopolis')", "content": "Oración 1: refuerza el beneficio principal del artículo y lo conecta con el producto. Oración 2: micro-compromiso — el primer paso es solo 'ver el producto', sin presión. Oración 3 (opcional): garantía implícita o facilidad de compra (contraentrega, envío gratis).", "buttonText": "Texto de acción específico — NO 'Ver producto'. Opciones: 'Quiero este producto →' | 'Ver precio y envío →' | 'Lo quiero ahora →' | 'Llevarlo a mi casa →' | 'Sí, lo quiero →'. Elige el más natural para el producto." }
  ]
}

REGLA ESPECIAL PARA EL CTA DEL ARTÍCULO:
- El heading NO puede ser genérico. Debe conectar específicamente el tema del artículo con la solución que ofrece el producto.
- El buttonText NUNCA puede ser "Ver producto" — ese texto no convierte. Usa lenguaje de primera persona y orientado a la acción.
- El content debe crear deseo sin presión: el lector ya leyó el artículo, solo necesita el empujón final.`

interface ArticleSection {
  type: string
  heading?: string
  content?: string
  items?: string[]
  faqs?: { question: string; answer: string }[]
  buttonText?: string
}

interface GeneratedArticle {
  title: string
  seoDescription: string
  seoKeywords: string[]
  topic: string
  readingTime: number
  sections: ArticleSection[]
}

export async function generateAndSaveArticle({
  productName,
  productDescription,
  productCategory,
  productBenefits = [],
  sanityProductId,
  productSlug,
  geminiKey,
  sanityToken,
  projectId,
  dataset,
  apiVersion,
}: {
  productName: string
  productDescription: string
  productCategory: string
  productBenefits?: string[]
  sanityProductId: string
  productSlug: string
  geminiKey: string
  sanityToken: string
  projectId: string
  dataset: string
  apiVersion: string
}): Promise<{ articleSlug: string; articleId: string; alreadyExists?: boolean }> {

  // Check if article already exists for this product
  const checkQuery = encodeURIComponent(
    `*[_type == "article" && relatedProduct._ref == "${sanityProductId}"][0]{ _id, "slug": slug.current }`
  )
  const checkUrl = `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${checkQuery}`
  const checkRes = await fetch(checkUrl, { headers: { Authorization: `Bearer ${sanityToken}` } })
  if (checkRes.ok) {
    const checkData = await checkRes.json()
    if (checkData.result?._id) {
      return { articleSlug: checkData.result.slug, articleId: checkData.result._id, alreadyExists: true }
    }
  }

  // Generate article content with Gemini
  const genAI = new GoogleGenerativeAI(geminiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const benefitsText = productBenefits.length > 0
    ? `\nBeneficios del producto: ${productBenefits.join(', ')}`
    : ''
  const userPrompt = `Producto: ${productName}\nCategoría: ${productCategory}\nDescripción: ${productDescription}${benefitsText}`

  const aiResult = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: ARTICLE_PROMPT + '\n\n' + userPrompt }] }],
    generationConfig: { temperature: 0.9 } as any,
  })

  const candidate = aiResult.response.candidates?.[0]
  const parts = candidate?.content?.parts ?? []
  const rawText =
    parts
      .filter((p: any) => !p.thought && typeof p.text === 'string' && p.text.trim())
      .map((p: any) => p.text)
      .join('') || aiResult.response.text?.()

  if (!rawText) throw new Error('Gemini no devolvió contenido para el artículo')

  let article: GeneratedArticle
  try {
    const clean = rawText.replace(/```json/gi, '').replace(/```/g, '').trim()
    article = JSON.parse(clean)
  } catch {
    throw new Error('La IA no devolvió un JSON válido para el artículo')
  }

  // Slugify the article title
  const articleSlug = article.title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .substring(0, 96)

  const randomKey = () => Math.random().toString(36).substring(2, 9)

  const articleDoc = {
    _type: 'article',
    title: article.title,
    slug: { _type: 'slug', current: articleSlug },
    topic: article.topic ?? '',
    seoDescription: article.seoDescription ?? '',
    seoKeywords: article.seoKeywords ?? [],
    readingTime: article.readingTime ?? 3,
    category: productCategory,
    publishedAt: new Date().toISOString(),
    productSlug,
    relatedProduct: { _type: 'reference', _ref: sanityProductId },
    sections: (article.sections ?? []).map((s: ArticleSection) => {
      const base: any = {
        _type: 'articleSection',
        _key: randomKey(),
        type: s.type,
        heading: s.heading ?? '',
        content: s.content ?? '',
        buttonText: s.buttonText ?? '',
      }
      if (s.items) base.items = s.items
      if (s.faqs) {
        base.faqs = s.faqs.map((f) => ({
          _key: randomKey(),
          question: f.question,
          answer: f.answer,
        }))
      }
      return base
    }),
  }

  const mutateUrl = `https://${projectId}.api.sanity.io/v${apiVersion}/data/mutate/${dataset}`
  const mutateRes = await fetch(mutateUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sanityToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ mutations: [{ create: articleDoc }] }),
  })

  if (!mutateRes.ok) {
    const errText = await mutateRes.text()
    throw new Error(`Sanity article error ${mutateRes.status}: ${errText}`)
  }

  const mutateData = await mutateRes.json()
  const articleId = mutateData.results?.[0]?.id ?? null

  return { articleSlug, articleId }
}
