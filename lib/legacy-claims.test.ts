import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DELIVERY_FACT,
  REFUND_FACT,
  hasUnsafeClaim,
  safeHeadline,
  sanitizeBenefits,
  sanitizeFaqs,
  sanitizeSpecs,
  stripUnsafeSentences,
} from './legacy-claims.ts'

// Frases reales del dataset (auditoría del 22-oct-2026).
test('reconoce las promesas que la política no cumple', () => {
  for (const text of [
    'Obtén tu gas pimienta con envío rápido y garantía de satisfacción.',
    'Despachamos tu pedido en 24 a 48 horas hábiles desde nuestra bodega.',
    'Despachamos desde nuestra bodega central en 24 horas hábiles.',
    'Luce una figura esculpida y libre de rollitos desde mañana mismo',
    'Últimas unidades en stock, ¡no te quedes sin la tuya!',
    'Satisfacción 100% garantizada o te devolvemos tu dinero',
    'Pruébala por 30 días, si no te convence, te devolvemos tu dinero.',
    '¡Oferta Exclusiva por Tiempo Limitado!',
  ]) assert.ok(hasUnsafeClaim(text), text)
})

test('no toca lo que es verdad ni lo que solo se parece', () => {
  for (const text of [
    'Llega en 3 a 7 días hábiles a cualquier parte de Colombia.',
    'Secado rápido en minutos gracias a su microfibra.',
    'Si llega con un defecto de fábrica, te lo reponemos.',
    'Ideal para la rutina de la mañana.',
    'Pagas contraentrega o con Confío.',
  ]) assert.equal(hasUnsafeClaim(text), false, text)
})

test('corta la frase falsa y conserva el resto', () => {
  assert.equal(
    stripUnsafeSentences('Masaje relajante con doce brazos. Envío rápido a toda Colombia. Pídelo hoy.'),
    'Masaje relajante con doce brazos. Pídelo hoy.',
  )
  assert.equal(stripUnsafeSentences('Envío rápido y garantía de satisfacción.'), '')
  assert.equal(stripUnsafeSentences('Nada que quitar.'), 'Nada que quitar.')
})

test('una pregunta de plazo o devolución recibe la política, no un corte', () => {
  const faqs = sanitizeFaqs([
    { question: '¿Cuánto tarda?', answer: 'Despachamos en 24 a 48 horas hábiles. Recibirás un enlace de seguimiento.' },
    { question: '¿Y si no me gusta?', answer: 'Si no te convence, te devolvemos tu dinero.' },
    { question: '¿Quedan?', answer: 'Últimas unidades.' },
    { question: '¿Material?', answer: 'Silicona platino apta para horno.' },
  ])
  assert.deepEqual(faqs.map((f) => f.answer), [DELIVERY_FACT, REFUND_FACT, 'Silicona platino apta para horno.'])
})

test('«Envío Rápido» no es un beneficio del producto', () => {
  const out = sanitizeBenefits([
    { title: 'Envío Rápido', description: 'Recíbelo en 24 horas.' },
    { title: 'Fácil de limpiar', description: 'Se lava a mano. Llega mañana mismo.' },
  ])
  assert.deepEqual(out, [{ title: 'Fácil de limpiar', description: 'Se lava a mano.' }])
})

test('la garantía de satisfacción de la ficha técnica pasa a la real', () => {
  const out = sanitizeSpecs([
    { label: 'Garantía', value: 'Satisfacción garantizada o te devolvemos tu dinero.' },
    { label: 'Envío', value: 'Express 24 horas' },
    { label: 'Material', value: 'ABS' },
  ])
  assert.deepEqual(out, [{ label: 'Garantía', value: '30 días por defecto de fábrica' }, { label: 'Material', value: 'ABS' }])
})

test('un titular que promete algo falso no se usa', () => {
  assert.equal(safeHeadline('Alimenta a tu mascota a tiempo desde mañana mismo'), undefined)
  assert.equal(safeHeadline('  Tu cocina, en orden  '), 'Tu cocina, en orden')
  assert.equal(safeHeadline(undefined), undefined)
})
