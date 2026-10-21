import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchInlineImages, isReferenceImageUrl } from './reference-images.ts'

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
    return new Response('image bytes', { headers: { 'content-type': 'image/png' } })
  })
  const images = await fetchInlineImages(['https://cdn.sanity.io/html', 'https://cdn.sanity.io/large', 'https://cdn.bemaster.com/ok'])
  assert.equal(images.length, 1)
  assert.equal(images[0].mimeType, 'image/png')
})
