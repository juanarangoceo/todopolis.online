// Promesas que la tienda NO cumple, escritas por prompts viejos de la IA y
// guardadas en Sanity. Se limpian AL RENDERIZAR la ficha, como `lib/cta.ts`:
// cubre también lo que se genere mañana, sin depender de que alguien vuelva a
// pasar un script sobre 579 productos.
//
// Auditado el 22-oct-2026 sobre los publicados: 385 textos de cierre, 69
// respuestas de preguntas frecuentes, 48 beneficios («Envío Rápido» como si
// fuera una virtud del producto), 40 titulares de cierre y 10 filas de ficha
// técnica prometían plazos de 24-48 h, «envío rápido», «garantía de
// satisfacción» o «te devolvemos tu dinero si no te convence», y urgencias sin
// fecha («Últimas unidades»).
//
// La política real (`components/store-policies.tsx`, `lib/legal.ts`): llega en
// 3 a 7 días hábiles, envío $12.000 (gratis en Destacados), y los 30 días son
// por DEFECTO de fábrica, no por arrepentimiento. Con tráfico pagado, lo otro
// es publicidad engañosa para la SIC.

// Plazos de entrega inventados.
const DELIVERY_CLAIM =
  /\b24\s*(-|a|y)\s*48\b|\ben 24 horas\b|\b48 horas\b|ma[ñn]ana mismo|esta misma semana|esta semana|env[ií]os? (r[aá]pidos?|express|inmediatos?|veloz|rel[aá]mpago)|entregas? (r[aá]pidas?|inmediatas?|express)|despachos? (r[aá]pidos?|inmediatos?|express)|\bexpress\b/i

// Devolución por satisfacción (la tienda solo cubre defectos de fábrica).
const REFUND_CLAIM =
  /si no te (convence|gusta|encanta)|satisfacci[oó]n (100\s*%\s*)?garantizada|garant[ií]a (total )?de satisfacci[oó]n|te devolvemos (tu|el) dinero|devoluci[oó]n (gratis|garantizada)|sin riesgos?|riesgo cero/i

// Urgencia sin fecha. Con `offerEndsAt` la ficha pinta su propia cuenta
// regresiva; estas frases nunca la tienen detrás.
const URGENCY_CLAIM =
  /[uú]ltimas unidades|stock limitado|por tiempo limitado|solo por hoy|solo hoy|quedan pocas|se agotan?|antes de que se acaben?/i

const ANY_CLAIM = new RegExp(`${DELIVERY_CLAIM.source}|${REFUND_CLAIM.source}|${URGENCY_CLAIM.source}`, 'i')

/** Lo que se dice en lugar de un plazo o una devolución inventados. */
export const DELIVERY_FACT =
  'Llega en 3 a 7 días hábiles a cualquier parte de Colombia. El envío cuesta $12.000, y es gratis en los productos Destacados.'
export const REFUND_FACT =
  'Si llega con un defecto de fábrica, tienes 30 días para escribirnos por WhatsApp con fotos: lo reponemos o te devolvemos el dinero. Además tienes 5 días hábiles de retracto.'
const REFUND_SPEC = '30 días por defecto de fábrica'

export function hasUnsafeClaim(text: string | null | undefined): boolean {
  return typeof text === 'string' && ANY_CLAIM.test(text)
}

// Frases: hasta el punto, signo de cierre o salto de línea. Se conserva el
// separador para no pegar las que quedan.
function sentences(text: string): string[] {
  return text.match(/[^.!?¡¿\n]*[.!?\n]+|[^.!?\n]+$/g) ?? [text]
}

/**
 * Quita las frases que prometen algo falso y deja el resto. Devuelve '' si no
 * queda nada con sentido (menos de 8 letras).
 */
export function stripUnsafeSentences(text: string | null | undefined): string {
  if (typeof text !== 'string') return ''
  if (!hasUnsafeClaim(text)) return text
  const kept = sentences(text)
    // «¡» abre una exclamación que puede haber quedado sola al cortar.
    .filter((s) => !ANY_CLAIM.test(s))
    .join('')
    .replace(/[¡¿]\s*$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
  return kept.replace(/[^\p{L}]/gu, '').length >= 8 ? kept : ''
}

type Faq = { question?: string; answer?: string } & Record<string, unknown>

/**
 * Una respuesta con un plazo inventado se reemplaza ENTERA por la política
 * (cortarle la frase deja «Recibirás un enlace de seguimiento…» sin plazo, que
 * es justo lo que preguntaron). Igual con la devolución. La urgencia solo se
 * corta. Una pregunta que queda vacía se quita.
 */
export function sanitizeFaqs<T extends Faq>(faqs: T[] | null | undefined): T[] {
  return (faqs ?? []).flatMap((faq) => {
    const answer = faq.answer ?? ''
    if (DELIVERY_CLAIM.test(answer)) return [{ ...faq, answer: DELIVERY_FACT }]
    if (REFUND_CLAIM.test(answer)) return [{ ...faq, answer: REFUND_FACT }]
    const clean = stripUnsafeSentences(answer)
    return clean ? [{ ...faq, answer: clean }] : []
  })
}

type Benefit = { title?: string; description?: string } & Record<string, unknown>

/** Un beneficio que es una promesa de envío o devolución no es del producto: fuera. */
export function sanitizeBenefits<T extends Benefit>(benefits: T[] | null | undefined): T[] {
  return (benefits ?? []).flatMap((b) => {
    if (hasUnsafeClaim(b.title)) return []
    const description = stripUnsafeSentences(b.description)
    if (!description && b.description) return []
    return [{ ...b, description }]
  })
}

type Spec = { label?: string; value?: string } & Record<string, unknown>

export function sanitizeSpecs<T extends Spec>(specs: T[] | null | undefined): T[] {
  return (specs ?? []).flatMap((s) => {
    if (REFUND_CLAIM.test(s.value ?? '')) return [{ ...s, value: REFUND_SPEC }]
    if (hasUnsafeClaim(s.value) || hasUnsafeClaim(s.label)) return []
    return [s]
  })
}

/** Titular corto (cierre, subtítulo del hero): si promete algo falso, no se usa. */
export function safeHeadline(text: string | null | undefined): string | undefined {
  const t = text?.trim()
  return t && !hasUnsafeClaim(t) ? t : undefined
}
