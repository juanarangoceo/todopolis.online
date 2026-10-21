// OAuth 2.1 con Dropi: cliente público (sin secreto), PKCE S256 y registro
// dinámico. Los endpoints salen de `inspectDropiDiscovery`, que ya validó sus
// orígenes; aquí no se escribe ninguna URL de Dropi a mano.
//
// Dropi acepta callbacks `https://…` y `http://localhost…`, NO la IP de
// Tailscale (probado el 21-oct-2026: 400 en el registro). En local se conecta
// abriendo el panel por `http://localhost:3001`, que el túnel lleva al Docker.
import { DROPI_MCP_URL, type DropiOAuthEndpoints } from './discovery.ts'

export const DROPI_SCOPE = 'mcp'

export interface DropiTokens {
  accessToken: string
  refreshToken: string | null
  /** Epoch en ms. */
  expiresAt: number
  scope: string | null
}

export class DropiOAuthError extends Error {
  readonly code: string
  readonly status?: number
  constructor(message: string, code: string, status?: number) {
    super(message)
    this.code = code
    this.status = status
  }
}

function base64url(bytes: ArrayBuffer | Uint8Array): string {
  return Buffer.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)).toString('base64url')
}

export function randomToken(bytes = 32): string {
  return base64url(crypto.getRandomValues(new Uint8Array(bytes)))
}

export async function pkceChallenge(verifier: string): Promise<string> {
  return base64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))
}

/** El callback vive en el mismo host desde el que se abrió el panel. */
export function callbackUrl(origin: string): string {
  return `${origin.replace(/\/$/, '')}/api/dropi/callback`
}

/** Dropi solo registra https o localhost. Lo decimos antes de mandar al usuario a un 400. */
export function callbackAllowed(redirectUri: string): boolean {
  try {
    const url = new URL(redirectUri)
    if (url.protocol === 'https:') return true
    return url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)
  } catch { return false }
}

export async function registerClient(endpoints: DropiOAuthEndpoints, redirectUri: string, fetcher: typeof fetch = fetch): Promise<string> {
  const res = await fetcher(endpoints.registration, {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(15_000),
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_name: 'Todopolis',
      redirect_uris: [redirectUri],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      scope: DROPI_SCOPE,
    }),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok || typeof data?.client_id !== 'string') {
    throw new DropiOAuthError('Dropi no aceptó el registro de Todopolis como aplicación.', 'registration_failed', res.status)
  }
  return data.client_id
}

export function authorizeUrl(endpoints: DropiOAuthEndpoints, p: { clientId: string; redirectUri: string; state: string; challenge: string }): string {
  const url = new URL(endpoints.authorization)
  url.search = new URLSearchParams({
    response_type: 'code',
    client_id: p.clientId,
    redirect_uri: p.redirectUri,
    scope: DROPI_SCOPE,
    state: p.state,
    code_challenge: p.challenge,
    code_challenge_method: 'S256',
    resource: DROPI_MCP_URL,
  }).toString()
  return url.toString()
}

async function tokenRequest(endpoints: DropiOAuthEndpoints, body: Record<string, string>, fetcher: typeof fetch, now: number): Promise<DropiTokens> {
  const res = await fetcher(endpoints.token, {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(15_000),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ ...body, resource: DROPI_MCP_URL }).toString(),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok || typeof data?.access_token !== 'string') {
    // invalid_grant = el refresh token ya no vale (revocado, vencido o usado
    // por otra sesión). Es la única respuesta que obliga a reconectar.
    const code = typeof data?.error === 'string' ? data.error : 'token_failed'
    throw new DropiOAuthError('Dropi no entregó el acceso.', code, res.status)
  }
  const expiresIn = Number(data.expires_in)
  return {
    accessToken: data.access_token,
    refreshToken: typeof data.refresh_token === 'string' ? data.refresh_token : null,
    // Sin expires_in se asume una hora: renovar de más no rompe nada.
    expiresAt: now + (Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 3600) * 1000,
    scope: typeof data.scope === 'string' ? data.scope : null,
  }
}

export function exchangeCode(endpoints: DropiOAuthEndpoints, p: { clientId: string; redirectUri: string; code: string; verifier: string }, fetcher: typeof fetch = fetch, now = Date.now()): Promise<DropiTokens> {
  return tokenRequest(endpoints, {
    grant_type: 'authorization_code',
    client_id: p.clientId,
    redirect_uri: p.redirectUri,
    code: p.code,
    code_verifier: p.verifier,
  }, fetcher, now)
}

export async function refreshTokens(endpoints: DropiOAuthEndpoints, p: { clientId: string; refreshToken: string }, fetcher: typeof fetch = fetch, now = Date.now()): Promise<DropiTokens> {
  const tokens = await tokenRequest(endpoints, { grant_type: 'refresh_token', client_id: p.clientId, refresh_token: p.refreshToken }, fetcher, now)
  // Si Dropi no rota el refresh token, se sigue usando el anterior.
  return { ...tokens, refreshToken: tokens.refreshToken ?? p.refreshToken }
}

/** Mejor esfuerzo: desconectar no puede quedarse a medias porque Dropi no responda. */
export async function revokeToken(endpoints: DropiOAuthEndpoints, p: { clientId: string; token: string; hint: 'access_token' | 'refresh_token' }, fetcher: typeof fetch = fetch): Promise<boolean> {
  if (!endpoints.revocation) return false
  try {
    const res = await fetcher(endpoints.revocation, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: p.clientId, token: p.token, token_type_hint: p.hint }).toString(),
    })
    await res.body?.cancel()
    return res.ok
  } catch { return false }
}

/** Origen PÚBLICO de la petición: detrás de Docker o Vercel la URL interna no sirve de callback. */
export function publicOrigin(headers: Headers, fallbackUrl: string): string {
  const fallback = new URL(fallbackUrl)
  const host = headers.get('x-forwarded-host') ?? headers.get('host') ?? fallback.host
  const proto = (headers.get('x-forwarded-proto') ?? fallback.protocol.replace(':', '')).split(',')[0].trim()
  return `${proto}://${host}`
}

/** Cookie con state y verificador PKCE mientras el usuario está en Dropi. */
export const DROPI_OAUTH_COOKIE = 'dropi_oauth'
