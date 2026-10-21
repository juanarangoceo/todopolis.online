import test from 'node:test'
import assert from 'node:assert/strict'
import { authorizeUrl, callbackAllowed, exchangeCode, pkceChallenge, publicOrigin, refreshTokens, DropiOAuthError } from './oauth.ts'
import { DROPI_MCP_URL } from './discovery.ts'

const endpoints = {
  authorization: 'https://oauth.dropi.co/oauth/authorize',
  token: 'https://integrations.dropi.co/oauth/token',
  registration: 'https://integrations.dropi.co/oauth/register',
  revocation: 'https://integrations.dropi.co/oauth/revoke',
}

test('PKCE S256 coincide con el vector del RFC 7636', async () => {
  assert.equal(await pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'), 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
})

test('solo callbacks que Dropi acepta: https o localhost', () => {
  assert.equal(callbackAllowed('https://todopolis.online/api/dropi/callback'), true)
  assert.equal(callbackAllowed('http://localhost:3001/api/dropi/callback'), true)
  assert.equal(callbackAllowed('http://100.107.182.42:3001/api/dropi/callback'), false)
})

test('el origen público sale de las cabeceras del proxy, no de la URL interna', () => {
  const h = new Headers({ 'x-forwarded-host': 'todopolis.online', 'x-forwarded-proto': 'https' })
  assert.equal(publicOrigin(h, 'http://localhost:3000/api/dropi/connect'), 'https://todopolis.online')
  assert.equal(publicOrigin(new Headers({ host: 'localhost:3001' }), 'http://0.0.0.0:3000/x'), 'http://localhost:3001')
})

test('la URL de autorización lleva PKCE, state y el recurso MCP', () => {
  const url = new URL(authorizeUrl(endpoints, { clientId: 'c1', redirectUri: 'http://localhost:3001/api/dropi/callback', state: 's', challenge: 'ch' }))
  assert.equal(url.origin, 'https://oauth.dropi.co')
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256')
  assert.equal(url.searchParams.get('resource'), DROPI_MCP_URL)
  assert.equal(url.searchParams.get('state'), 's')
})

test('intercambia el código como cliente público y calcula el vencimiento', async () => {
  let sent: URLSearchParams | null = null
  const tokens = await exchangeCode(endpoints, { clientId: 'c1', redirectUri: 'r', code: 'k', verifier: 'v' }, async (_url, init) => {
    sent = new URLSearchParams(String(init?.body))
    return Response.json({ access_token: 'a', refresh_token: 'r1', expires_in: 600 })
  }, 1_000)
  assert.equal(sent!.get('code_verifier'), 'v')
  assert.equal(sent!.get('client_secret'), null)
  assert.equal(tokens.expiresAt, 601_000)
  assert.equal(tokens.refreshToken, 'r1')
})

test('si Dropi no rota el refresh token se conserva el anterior', async () => {
  const tokens = await refreshTokens(endpoints, { clientId: 'c1', refreshToken: 'viejo' }, async () => Response.json({ access_token: 'a2' }))
  assert.equal(tokens.refreshToken, 'viejo')
})

test('invalid_grant llega con su código para pedir reconexión', async () => {
  await assert.rejects(
    refreshTokens(endpoints, { clientId: 'c1', refreshToken: 'x' }, async () => Response.json({ error: 'invalid_grant' }, { status: 400 })),
    (e: unknown) => e instanceof DropiOAuthError && e.code === 'invalid_grant',
  )
})
