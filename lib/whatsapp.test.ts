import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildWhatsAppPrefill,
  buildWhatsAppUrl,
  normalizeWhatsAppPhone,
  pathHasNamedSubject,
  productNameFromTitle,
  resolveWhatsAppPhone,
} from './whatsapp'

test('el número se limpia a dígitos y se rechaza si no sirve', () => {
  assert.equal(normalizeWhatsAppPhone('+57 312 7511852'), '573127511852')
  assert.equal(normalizeWhatsAppPhone('573127511852'), '573127511852')
  assert.equal(normalizeWhatsAppPhone(''), null)
  assert.equal(normalizeWhatsAppPhone(undefined), null)
  assert.equal(normalizeWhatsAppPhone('123'), null)
  assert.equal(normalizeWhatsAppPhone('1'.repeat(16)), null)
})

test('el prefill SIEMPRE lleva la URL: es lo que clasifica el canal `web` en Nitro Bot', () => {
  const url = 'https://todopolis.online/producto/audifonos-m10'
  assert.match(buildWhatsAppPrefill(url), /https:\/\/todopolis\.online/)
  assert.match(buildWhatsAppPrefill(url, 'Audífonos M10'), /https:\/\/todopolis\.online/)
})

test('con nombre de producto el prefill lo nombra; sin él, no inventa', () => {
  const url = 'https://todopolis.online/producto/audifonos-m10'
  assert.equal(buildWhatsAppPrefill(url, 'Audífonos M10'), `Hola, quiero más información de Audífonos M10\n${url}`)
  assert.equal(buildWhatsAppPrefill(url, '   '), `Hola, vengo de la tienda y quiero más información.\n${url}`)
  assert.equal(buildWhatsAppPrefill(url, null), `Hola, vengo de la tienda y quiero más información.\n${url}`)
})

test('sin número válido no hay enlace, para no pintar una burbuja rota', () => {
  assert.equal(buildWhatsAppUrl({ phone: undefined, pageUrl: 'https://todopolis.online/' }), null)
  assert.equal(buildWhatsAppUrl({ phone: 'no-es-un-numero', pageUrl: 'https://todopolis.online/' }), null)
})

test('el enlace va a wa.me con el texto codificado', () => {
  const href = buildWhatsAppUrl({
    phone: '+57 312 7511852',
    pageUrl: 'https://todopolis.online/producto/audifonos-m10',
    productName: 'Audífonos M10',
  })
  assert.ok(href?.startsWith('https://wa.me/573127511852?text='))
  const text = decodeURIComponent(href!.split('?text=')[1])
  assert.equal(text, 'Hola, quiero más información de Audífonos M10\nhttps://todopolis.online/producto/audifonos-m10')
})

test('el nombre sale del title y descarta los que no nombran nada', () => {
  assert.equal(productNameFromTitle('Audífonos M10 | Todopolis'), 'Audífonos M10')
  assert.equal(productNameFromTitle('Set Íntimo Vega Negro  |  Todopolis'), 'Set Íntimo Vega Negro')
  // El layout añade `| Todopolis` por plantilla y la ficha de producto ya lo
  // trae: el título real llega duplicado. Se quita todas las veces.
  assert.equal(
    productNameFromTitle('Conjunto de Blonda Elástica | Todopolis | Todopolis'),
    'Conjunto de Blonda Elástica'
  )
  assert.equal(productNameFromTitle('Todopolis'), null)
  assert.equal(productNameFromTitle('Producto no encontrado'), null)
  assert.equal(productNameFromTitle(''), null)
  assert.equal(productNameFromTitle(undefined), null)
})

test('solo producto y colección tienen un sujeto con nombre en el title', () => {
  assert.equal(pathHasNamedSubject('/producto/audifonos-m10'), true)
  assert.equal(pathHasNamedSubject('/coleccion/belleza'), true)
  assert.equal(pathHasNamedSubject('/'), false)
  assert.equal(pathHasNamedSubject('/ofertas'), false)
})

test('manda Sanity, luego la variable de Vercel, y si no hay nada no se pinta', () => {
  assert.equal(resolveWhatsAppPhone('+57 300 1112233', '573127511852'), '573001112233')
  assert.equal(resolveWhatsAppPhone(null, '573127511852'), '573127511852')
  assert.equal(resolveWhatsAppPhone('   ', '573127511852'), '573127511852')
  // Un valor inservible en Sanity NO debe dejar la tienda sin burbuja.
  assert.equal(resolveWhatsAppPhone('123', '573127511852'), '573127511852')
  assert.equal(resolveWhatsAppPhone(null, undefined), null)
})
