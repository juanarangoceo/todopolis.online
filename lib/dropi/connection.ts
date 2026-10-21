// La conexión guardada con Dropi: quién la usa pide `getDropiAccessToken()` y
// no sabe nada de cifrado, renovación ni concurrencia.
//
// Una sola fila en `dropi_connection`. Local y Vercel comparten la base, así
// que conectar desde cualquiera de los dos deja conectada a la tienda entera.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { inspectDropiDiscovery, type DropiOAuthEndpoints } from './discovery.ts'
import { DropiOAuthError, refreshTokens, revokeToken, type DropiTokens } from './oauth.ts'
import { open, seal } from './secret-box.ts'

// Renovar un minuto antes de que venza: una llamada larga no debe quedarse
// sin token a medio camino.
const REFRESH_MARGIN_MS = 60_000

export class DropiNotConnectedError extends Error {
  readonly reason: 'missing' | 'needs_reauth'
  constructor(reason: 'missing' | 'needs_reauth') {
    super(reason === 'missing' ? 'Dropi no está conectado.' : 'La conexión con Dropi venció. Vuelve a conectar desde /admin/dropi.')
    this.reason = reason
  }
}

interface Row {
  client_id: string
  access_token_enc: string
  refresh_token_enc: string | null
  expires_at: string
  scope: string | null
  version: number
  status: 'connected' | 'needs_reauth'
  last_error: string | null
  connected_at: string
  updated_at: string
}

export interface DropiConnectionSummary {
  connected: boolean
  status: 'missing' | 'connected' | 'needs_reauth'
  connectedAt?: string
  expiresAt?: string
  lastError?: string | null
}

function db(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Falta la configuración de Supabase.')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

async function readRow(client = db()): Promise<Row | null> {
  const { data, error } = await client.from('dropi_connection').select('*').eq('id', 'default').maybeSingle()
  if (error) throw new Error(`No se pudo leer la conexión con Dropi: ${error.message}`)
  return data as Row | null
}

async function endpoints(): Promise<DropiOAuthEndpoints> {
  const discovery = await inspectDropiDiscovery()
  if (!discovery.endpoints) throw new Error(discovery.message)
  return discovery.endpoints
}

export async function findOAuthClient(redirectUri: string): Promise<string | null> {
  const { data, error } = await db().from('dropi_oauth_clients').select('client_id').eq('redirect_uri', redirectUri).maybeSingle()
  if (error) throw new Error(`No se pudo leer el registro OAuth de Dropi: ${error.message}`)
  return data?.client_id ?? null
}

export async function saveOAuthClient(redirectUri: string, clientId: string): Promise<void> {
  const { error } = await db().from('dropi_oauth_clients').upsert({ redirect_uri: redirectUri, client_id: clientId })
  if (error) throw new Error(`No se pudo guardar el registro OAuth de Dropi: ${error.message}`)
}

export async function saveDropiConnection(clientId: string, tokens: DropiTokens): Promise<void> {
  const now = new Date().toISOString()
  const { error } = await db().from('dropi_connection').upsert({
    id: 'default',
    client_id: clientId,
    access_token_enc: await seal(tokens.accessToken),
    refresh_token_enc: tokens.refreshToken ? await seal(tokens.refreshToken) : null,
    expires_at: new Date(tokens.expiresAt).toISOString(),
    scope: tokens.scope,
    version: Date.now(),
    status: 'connected',
    last_error: null,
    connected_at: now,
    updated_at: now,
  })
  if (error) throw new Error(`No se pudo guardar la conexión con Dropi: ${error.message}`)
}

export async function dropiConnectionSummary(): Promise<DropiConnectionSummary> {
  const row = await readRow()
  if (!row) return { connected: false, status: 'missing' }
  // Si la clave cambió, el token ya no se descifra: para el panel es una
  // conexión vencida, no una conectada.
  const readable = (await open(row.access_token_enc)) !== null
  const status = row.status === 'connected' && readable ? 'connected' : 'needs_reauth'
  return { connected: status === 'connected', status, connectedAt: row.connected_at, expiresAt: row.expires_at, lastError: readable ? row.last_error : 'DROPI_TOKEN_KEY cambió: hay que volver a conectar.' }
}

async function markNeedsReauth(client: SupabaseClient, version: number, reason: string): Promise<void> {
  await client.from('dropi_connection').update({ status: 'needs_reauth', last_error: reason, updated_at: new Date().toISOString() }).eq('id', 'default').eq('version', version)
}

/**
 * Token vigente para llamar al MCP. `force` renueva aunque no haya vencido:
 * lo usa el cliente MCP cuando Dropi responde 401 con un token "vigente".
 */
export async function getDropiAccessToken({ force = false } = {}): Promise<string> {
  const client = db()
  const row = await readRow(client)
  if (!row) throw new DropiNotConnectedError('missing')
  if (row.status !== 'connected') throw new DropiNotConnectedError('needs_reauth')

  const access = await open(row.access_token_enc)
  if (!access) throw new DropiNotConnectedError('needs_reauth')
  if (!force && new Date(row.expires_at).getTime() - Date.now() > REFRESH_MARGIN_MS) return access

  const refresh = await open(row.refresh_token_enc)
  if (!refresh) {
    await markNeedsReauth(client, row.version, 'Dropi no entregó un token de renovación.')
    throw new DropiNotConnectedError('needs_reauth')
  }

  let tokens: DropiTokens
  try {
    tokens = await refreshTokens(await endpoints(), { clientId: row.client_id, refreshToken: refresh })
  } catch (error) {
    // Otro proceso pudo renovar con el mismo refresh token un instante antes
    // (si Dropi los rota, el nuestro ya no vale). Antes de dar la conexión por
    // perdida, se mira si hay un token nuevo.
    const latest = await readRow(client)
    if (latest && latest.version !== row.version && latest.status === 'connected') {
      const theirs = await open(latest.access_token_enc)
      if (theirs) return theirs
    }
    if (error instanceof DropiOAuthError && ['invalid_grant', 'invalid_client', 'unauthorized_client'].includes(error.code)) {
      await markNeedsReauth(client, row.version, `Dropi rechazó la renovación (${error.code}).`)
      throw new DropiNotConnectedError('needs_reauth')
    }
    throw error
  }

  const { data, error } = await client.from('dropi_connection').update({
    access_token_enc: await seal(tokens.accessToken),
    refresh_token_enc: tokens.refreshToken ? await seal(tokens.refreshToken) : row.refresh_token_enc,
    expires_at: new Date(tokens.expiresAt).toISOString(),
    scope: tokens.scope ?? row.scope,
    version: Date.now(),
    last_error: null,
    updated_at: new Date().toISOString(),
  }).eq('id', 'default').eq('version', row.version).select('version')
  if (error) throw new Error(`No se pudo guardar el token renovado de Dropi: ${error.message}`)
  if (!data?.length) {
    // Perdimos el CAS: otro proceso ya guardó su renovación. La suya manda.
    const latest = await readRow(client)
    const theirs = await open(latest?.access_token_enc)
    if (theirs) return theirs
  }
  return tokens.accessToken
}

/** Revoca en Dropi (mejor esfuerzo) y borra la fila. */
export async function disconnectDropi(): Promise<void> {
  const client = db()
  const row = await readRow(client)
  if (!row) return
  try {
    const ep = await endpoints()
    const refresh = await open(row.refresh_token_enc)
    const access = await open(row.access_token_enc)
    if (refresh) await revokeToken(ep, { clientId: row.client_id, token: refresh, hint: 'refresh_token' })
    if (access) await revokeToken(ep, { clientId: row.client_id, token: access, hint: 'access_token' })
  } catch { /* desconectar no depende de que Dropi responda */ }
  const { error } = await client.from('dropi_connection').delete().eq('id', 'default')
  if (error) throw new Error(`No se pudo borrar la conexión con Dropi: ${error.message}`)
}
