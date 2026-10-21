import { EditorialError } from './gemini.ts'

const text = { type: 'string' }
const strings = { type: 'array', items: text }
function object(fields: string[]) {
  return { type: 'object', properties: Object.fromEntries(fields.map((f) => [f, text])), required: fields, additionalProperties: false }
}
function list(fields: string[]) { return { type: 'array', items: object(fields) } }
const copyFields = ['improvedName', 'improvedDescription', 'heroTitle', 'heroSubtitle', 'heroCta', 'ctaHeadline', 'ctaText']
const storyFields = ['eyebrow', 'problemTitle', 'problemText', 'turningPointTitle', 'turningPointText', 'outcomeTitle', 'outcomeText']
const arrayFields = {
  benefits: ['title', 'description'], specifications: ['label', 'value'],
  testimonials: ['text'], faqs: ['question', 'answer'],
}

export const PRODUCT_CONTENT_SCHEMA = {
  type: 'object',
  properties: {
    ...Object.fromEntries(copyFields.map((f) => [f, text])),
    ...Object.fromEntries(Object.entries(arrayFields).map(([k, fields]) => [k, list(fields)])),
    campaignStory: object(storyFields),
    audienceFit: { type: 'object', properties: { forWho: strings, notFor: strings }, required: ['forWho', 'notFor'], additionalProperties: false },
    suggestedCategory: text,
  },
  required: [...copyFields, ...Object.keys(arrayFields), 'campaignStory', 'audienceFit'],
  additionalProperties: false,
}

function record(v: unknown): v is Record<string, unknown> { return !!v && typeof v === 'object' && !Array.isArray(v) }
const validText = (v: unknown) => typeof v === 'string' && v.length <= 10_000

/** La ficha nunca se escribe con null, listas de strings donde van objetos o
 * campos indispensables ausentes. Arrays vacíos son válidos: no inventar para
 * completar un número de características. */
export function validateProductContent(value: Record<string, unknown>): void {
  const stringsValid = (obj: Record<string, unknown>, fields: string[]) => fields.every((f) => validText(obj[f]))
  if (!stringsValid(value, copyFields) || !String(value.improvedName).trim() || !String(value.heroTitle).trim()) {
    throw new EditorialError('La ficha generada está incompleta. Revisa los datos del producto.')
  }
  for (const [key, fields] of Object.entries(arrayFields)) {
    const items = value[key]
    if (!Array.isArray(items) || items.length > 30 || !items.every((item) => record(item) && stringsValid(item, fields))) {
      throw new EditorialError(`La ficha generada tiene un formato inválido en ${key}.`)
    }
  }
  if (!record(value.campaignStory) || !stringsValid(value.campaignStory, storyFields)) throw new EditorialError('La historia generada está incompleta.')
  const audience = value.audienceFit
  if (!record(audience) || !['forWho', 'notFor'].every((k) => Array.isArray(audience[k]) && audience[k].length <= 20 && audience[k].every(validText))) {
    throw new EditorialError('El público sugerido tiene un formato inválido.')
  }
}
