import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseAttribution,
  readStoredAttribution,
  serializeAttribution,
  nextAttribution,
  attributionToColumns,
  ATTRIBUTION_WINDOW_DAYS,
} from './attribution.ts'

const SITE = 'https://todopolis.online'

test('lee los cinco UTM y el fbclid de la URL', () => {
  const a = parseAttribution(
    `${SITE}/producto/x?utm_source=facebook&utm_medium=cpc&utm_campaign=verano&utm_content=video1&utm_term=bici&fbclid=ABC123`
  )
  assert.equal(a?.utm_source, 'facebook')
  assert.equal(a?.utm_medium, 'cpc')
  assert.equal(a?.utm_campaign, 'verano')
  assert.equal(a?.utm_content, 'video1')
  assert.equal(a?.utm_term, 'bici')
  assert.equal(a?.fbclid, 'ABC123')
  assert.equal(a?.landing_path, '/producto/x')
})

test('una visita sin campaña NO se atribuye — si no, pisaría la del anuncio', () => {
  assert.equal(parseAttribution(`${SITE}/`), null)
  assert.equal(parseAttribution(`${SITE}/producto/x?variant=3`), null)
})

test('el fbclid solo ya basta: Meta no siempre manda UTMs', () => {
  const a = parseAttribution(`${SITE}/?fbclid=XYZ`)
  assert.equal(a?.fbclid, 'XYZ')
})

test('el referente se guarda solo si viene de otro sitio', () => {
  const externo = parseAttribution(`${SITE}/?utm_source=ig`, { referrer: 'https://l.instagram.com/' })
  assert.equal(externo?.referrer, 'https://l.instagram.com/')

  // Un clic dentro de la propia tienda no es un origen nuevo.
  const interno = parseAttribution(`${SITE}/?utm_source=ig`, { referrer: `${SITE}/ofertas` })
  assert.equal(interno?.referrer, undefined)
})

test('MANDA LA PRIMERA VISITA, no la última', () => {
  const primera = { utm_campaign: 'anuncio-que-pago' }
  const segunda = { utm_campaign: 'otra' }

  const r = nextAttribution(primera, segunda)
  assert.equal(r?.attribution.utm_campaign, 'anuncio-que-pago')
  assert.equal(r?.shouldWrite, false, 'no debe reescribirse lo ya guardado')
})

test('sin nada guardado sí se escribe la entrante', () => {
  const r = nextAttribution(null, { utm_campaign: 'nueva' })
  assert.equal(r?.attribution.utm_campaign, 'nueva')
  assert.equal(r?.shouldWrite, true)
})

test('visita directa sin nada guardado no inventa atribución', () => {
  assert.equal(nextAttribution(null, null), null)
})

test('la atribución caduca a los 7 días', () => {
  const now = Date.UTC(2026, 8, 17)
  const raw = serializeAttribution({ utm_campaign: 'vieja' }, now)

  const dentro = readStoredAttribution(raw, now + (ATTRIBUTION_WINDOW_DAYS - 1) * 86_400_000)
  assert.equal(dentro?.utm_campaign, 'vieja')

  const fuera = readStoredAttribution(raw, now + (ATTRIBUTION_WINDOW_DAYS + 1) * 86_400_000)
  assert.equal(fuera, null)
})

test('una cookie con fecha futura se descarta, no vale para siempre', () => {
  const now = Date.UTC(2026, 8, 17)
  const raw = serializeAttribution({ utm_campaign: 'x' }, now + 30 * 86_400_000)
  assert.equal(readStoredAttribution(raw, now), null)
})

test('cookie corrupta o vacía no rompe nada', () => {
  assert.equal(readStoredAttribution('no-es-json', Date.now()), null)
  assert.equal(readStoredAttribution('', Date.now()), null)
  assert.equal(readStoredAttribution(null, Date.now()), null)
  assert.equal(readStoredAttribution('{"t":"ayer"}', Date.now()), null)
})

test('los valores largos se recortan para no reventar la columna', () => {
  const largo = 'x'.repeat(500)
  const a = parseAttribution(`${SITE}/?utm_campaign=${largo}`)
  assert.equal(a?.utm_campaign?.length, 200)
})

test('las columnas salen completas, con null donde no hay dato', () => {
  const cols = attributionToColumns({ utm_source: 'facebook' }, { fbp: 'fb.1.2.3' })
  assert.equal(cols.utm_source, 'facebook')
  assert.equal(cols.utm_campaign, null)
  assert.equal(cols.fbp, 'fb.1.2.3')
  assert.equal(cols.fbc, null)
  // Sin atribución ninguna, todas en null y ninguna ausente: un insert parcial
  // dejaría columnas sin tocar en un update.
  const vacio = attributionToColumns(null)
  assert.equal(Object.values(vacio).every((v) => v === null), true)
  assert.equal(Object.keys(vacio).length, 10)
})
