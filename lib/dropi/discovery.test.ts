import test from 'node:test'
import assert from 'node:assert/strict'
import { inspectDropiDiscovery, DROPI_MCP_URL } from './discovery.ts'

const advertised = 'https://integrations.dropi.co/bff'
const resource = { resource: DROPI_MCP_URL, authorization_servers: [advertised] }
const metadata = {
  issuer: advertised, authorization_endpoint: 'https://oauth.dropi.co/oauth/authorize', token_endpoint: 'https://integrations.dropi.co/oauth/token', registration_endpoint: 'https://integrations.dropi.co/oauth/register',
  grant_types_supported: ['authorization_code', 'refresh_token'], code_challenge_methods_supported: ['S256'],
}

test('reproduce el issuer inconsistente de Dropi y nunca lo declara conectado', async () => {
  const result = await inspectDropiDiscovery(async (url, init) => {
    assert.equal(init?.redirect, 'error')
    assert.equal(init?.headers && new Headers(init.headers).get('authorization'), null)
    if (String(url).includes('protected-resource')) return Response.json(resource)
    if (String(url).endsWith('/bff/.well-known/oauth-authorization-server')) return Response.json({ ...metadata, issuer: 'https://integrations.dropi.co' })
    return new Response('', { status: 404 })
  })
  assert.equal(result.code, 'issuer_mismatch')
  assert.equal(result.status, 'blocked')
  assert.equal(result.catalogVerified, false)
  assert.equal(result.advertisedIssuer, advertised)
  assert.equal(result.metadataIssuer, 'https://integrations.dropi.co')
})

test('discovery válido todavía requiere OAuth y no implica acceso al inventario', async () => {
  const result = await inspectDropiDiscovery(async (url) => Response.json(String(url).includes('protected-resource') ? resource : metadata))
  assert.equal(result.status, 'authorization_required')
  assert.equal(result.catalogVerified, false)
  assert.equal(result.endpoints?.registration, 'https://integrations.dropi.co/oauth/register')
  assert.equal(result.endpoints?.authorization, 'https://oauth.dropi.co/oauth/authorize')
})

test('bloquea cambio de recurso o servidor no confiable sin seguir enlaces arbitrarios', async () => {
  for (const data of [{ ...resource, resource: 'https://evil.test/mcp' }, { ...resource, authorization_servers: ['http://127.0.0.1'] }]) {
    let calls = 0
    const result = await inspectDropiDiscovery(async () => { calls++; return Response.json(data) })
    assert.equal(result.status, 'blocked')
    assert.equal(calls, 1)
  }
})

test('no acepta OAuth sin PKCE S256 o sin refresh token', async () => {
  for (const data of [{ ...metadata, code_challenge_methods_supported: ['plain'] }, { ...metadata, grant_types_supported: ['authorization_code'] }]) {
    const result = await inspectDropiDiscovery(async (url) => Response.json(String(url).includes('protected-resource') ? resource : data))
    assert.equal(result.code, 'oauth_capabilities')
  }
})

test('fallos de red son visibles sin exponer detalles internos', async () => {
  const result = await inspectDropiDiscovery(async () => { throw new Error('private') })
  assert.equal(result.status, 'unavailable')
  assert.equal(result.message.includes('private'), false)
})
