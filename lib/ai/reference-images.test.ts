import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchInlineImages, isReferenceImageUrl } from './reference-images.ts'

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const WEBP = Buffer.from('524946460400000057454250', 'hex')

test('solo acepta HTTPS del CDN conocido, sin credenciales, puertos ni dominios parecidos', () => {
  for (const url of ['http://cdn.sanity.io/a', 'https://cdn.sanity.io.evil.test/a', 'https://user:pass@cdn.sanity.io/a', 'http://127.0.0.1', 'https://cdn.sanity.io:8443/a', 'file:///etc/passwd']) assert.equal(isReferenceImageUrl(url), false, url)
  assert.equal(isReferenceImageUrl('https://cdn.sanity.io/images/project/dataset/a.jpg'), true)
  assert.equal(isReferenceImageUrl('https://cdn.bemaster.com/a.jpg'), true)
})

test('rechaza HTML y archivos grandes; impide redirecciones; conserva solo referencias válidas', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    assert.equal(init.redirect, 'error')
    if (url.includes('html')) return new Response('<html>', { headers: { 'content-type': 'text/html' } })
    if (url.includes('large')) return new Response('x', { headers: { 'content-type': 'image/jpeg', 'content-length': String(6 * 1024 * 1024) } })
    return new Response(PNG, { headers: { 'content-type': 'image/png' } })
  })
  const images = await fetchInlineImages(['https://cdn.sanity.io/html', 'https://cdn.sanity.io/large', 'https://cdn.bemaster.com/ok'])
  assert.equal(images.length, 1)
  assert.equal(images[0].mimeType, 'image/png')
})

test('lee el JPEG de Mastershop aunque el CDN lo sirva como archivo genérico', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JPEG, {
    headers: { 'content-type': 'application/octet-stream', 'content-length': String(JPEG.length) },
  }))
  const images = await fetchInlineImages(['https://cdn.bemaster.com/mastershop/media/images/products/product.jpeg'])
  assert.deepEqual(images, [{ mimeType: 'image/jpeg', data: JPEG.toString('base64') }])
})

test('reconoce PNG y WebP sin depender de la extensión o de una cabecera de imagen', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url: string) => url.endsWith('/png')
    ? new Response(PNG, { headers: { 'content-type': 'application/octet-stream' } })
    : new Response(WEBP))
  const images = await fetchInlineImages(['https://cdn.sanity.io/png', 'https://cdn.bemaster.com/webp'])
  assert.deepEqual(images.map((image) => image.mimeType), ['image/png', 'image/webp'])
})

test('no acepta HTML ni otros archivos disfrazados con extensión o cabecera de imagen', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url: string) => new Response('<html>Error del CDN</html>', {
    headers: { 'content-type': url.includes('generic') ? 'application/octet-stream' : 'image/jpeg' },
  }))
  assert.deepEqual(await fetchInlineImages(['https://cdn.bemaster.com/generic.jpeg', 'https://cdn.sanity.io/fake.jpeg']), [])
})

test('conserva el límite de descarga aunque el archivo genérico no anuncie su tamaño', async (t) => {
  let cancelled = false
  t.mock.method(globalThis, 'fetch', async () => new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(JPEG)
      controller.enqueue(new Uint8Array(5 * 1024 * 1024))
    },
    cancel() { cancelled = true },
  }), { headers: { 'content-type': 'application/octet-stream' } }))
  assert.deepEqual(await fetchInlineImages(['https://cdn.bemaster.com/large.jpeg']), [])
  assert.equal(cancelled, true)
})
