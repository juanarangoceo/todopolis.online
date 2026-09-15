import assert from 'node:assert/strict'
import test from 'node:test'
import { signCatalogControlRequest, verifyCatalogControlRequest } from './control-auth'

test('firma el método, la ruta y el cuerpo del control de catálogo', () => {
  const timestamp = '1789443600000'
  const input = { secret: 'shared-secret', timestamp, method: 'POST', pathname: '/api/integrations/nitro/catalog', body: '{"external_ids":["abc"]}' }
  const signature = signCatalogControlRequest(input)

  assert.equal(verifyCatalogControlRequest({ ...input, signature, now: Number(timestamp) }), true)
  assert.equal(verifyCatalogControlRequest({ ...input, signature, method: 'GET', now: Number(timestamp) }), false)
  assert.equal(verifyCatalogControlRequest({ ...input, signature, pathname: '/otro', now: Number(timestamp) }), false)
  assert.equal(verifyCatalogControlRequest({ ...input, signature, body: '{}', now: Number(timestamp) }), false)
})

test('rechaza firmas vencidas y formatos inválidos', () => {
  const timestamp = '1789443600000'
  const input = { secret: 'shared-secret', timestamp, method: 'GET', pathname: '/api/integrations/nitro/catalog', body: '' }
  const signature = signCatalogControlRequest(input)

  assert.equal(verifyCatalogControlRequest({ ...input, signature, now: Number(timestamp) + 300_001 }), false)
  assert.equal(verifyCatalogControlRequest({ ...input, signature: 'no-es-hex', now: Number(timestamp) }), false)
})
