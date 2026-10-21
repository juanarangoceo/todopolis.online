// Fase 0 de TOD-16. Solo metadatos públicos: no registra clientes, no envía
// credenciales y no llama herramientas. Una coincidencia de issuer es obligatoria.
export const DROPI_MCP_URL = 'https://mcp.dropi.co/mcp'
const RESOURCE_METADATA = 'https://mcp.dropi.co/.well-known/oauth-protected-resource/mcp'
const TRUSTED_AUTH_ORIGIN = 'https://integrations.dropi.co'

export interface DropiOAuthEndpoints {
  authorization: string
  token: string
  registration: string
  revocation?: string
}

export interface DiscoveryCheck { url: string; status: number | null; issuer?: string }
export interface DropiDiscovery {
  checkedAt: string
  status: 'blocked' | 'authorization_required' | 'unavailable'
  code: string
  message: string
  checks: DiscoveryCheck[]
  advertisedIssuer?: string
  metadataIssuer?: string
  // Solo con discovery válido: los endpoints ya pasaron la lista de orígenes.
  endpoints?: DropiOAuthEndpoints
  // Incluso con discovery correcto faltan login y contrato real del catálogo.
  catalogVerified: false
}

export async function inspectDropiDiscovery(fetcher: typeof fetch = fetch): Promise<DropiDiscovery> {
  const checks: DiscoveryCheck[] = []
  const base = { checkedAt: new Date().toISOString(), checks, catalogVerified: false as const }
  const signal = AbortSignal.timeout(15_000)
  async function read(url: string): Promise<Record<string, unknown> | null> {
    const res = await fetcher(url, { cache: 'no-store', redirect: 'error', signal, headers: { Accept: 'application/json' } })
    const check: DiscoveryCheck = { url, status: res.status }
    checks.push(check)
    if (!res.ok) { await res.body?.cancel(); return null }
    const data = await res.json()
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null
    if (typeof data.issuer === 'string') check.issuer = data.issuer
    return data
  }
  try {
    const resource = await read(RESOURCE_METADATA)
    if (!resource) return { ...base, status: 'unavailable', code: 'resource_unavailable', message: 'No se pudieron consultar los metadatos públicos de Dropi.' }
    if (resource.resource !== DROPI_MCP_URL) return { ...base, status: 'blocked', code: 'resource_mismatch', message: 'Los metadatos no identifican el MCP esperado de Dropi.' }
    const issuers = resource.authorization_servers
    if (!Array.isArray(issuers) || issuers.length !== 1 || typeof issuers[0] !== 'string') {
      return { ...base, status: 'blocked', code: 'issuer_configuration', message: 'La lista de servidores de autorización cambió. Requiere revisión técnica.' }
    }
    const advertisedIssuer = issuers[0]
    const issuer = new URL(advertisedIssuer)
    if (issuer.origin !== TRUSTED_AUTH_ORIGIN || issuer.username || issuer.password || issuer.search || issuer.hash) {
      return { ...base, status: 'blocked', code: 'untrusted_issuer', message: 'Dropi anuncia un servidor de autorización distinto del verificado. Requiere revisión técnica.' }
    }
    const path = issuer.pathname === '/' ? '' : issuer.pathname.replace(/\/$/, '')
    // RFC 8414, OpenID Discovery y ruta histórica publicada por Dropi. La
    // última permite diagnosticar el fallo, nunca saltar la validación.
    const urls = [...new Set([
      `${issuer.origin}/.well-known/oauth-authorization-server${path}`,
      `${issuer.origin}/.well-known/openid-configuration${path}`,
      `${issuer.origin}${path}/.well-known/openid-configuration`,
      `${issuer.origin}${path}/.well-known/oauth-authorization-server`,
    ])]
    let mismatch: string | undefined
    for (const url of urls) {
      const metadata = await read(url)
      if (!metadata) continue
      if (metadata.issuer !== advertisedIssuer) {
        mismatch = typeof metadata.issuer === 'string' ? metadata.issuer : '(ausente)'
        continue
      }
      const endpointsValid = ['authorization_endpoint', 'token_endpoint', 'registration_endpoint', 'revocation_endpoint'].every((key) => {
        if (metadata[key] === undefined && key === 'revocation_endpoint') return true
        if (typeof metadata[key] !== 'string') return false
        try {
          const endpoint = new URL(metadata[key])
          return ['https://oauth.dropi.co', TRUSTED_AUTH_ORIGIN].includes(endpoint.origin) && !endpoint.username && !endpoint.password && !endpoint.hash
        } catch { return false }
      })
      const contains = (key: string, item: string) => Array.isArray(metadata[key]) && metadata[key].includes(item)
      if (!endpointsValid || !contains('code_challenge_methods_supported', 'S256') || !contains('grant_types_supported', 'authorization_code') || !contains('grant_types_supported', 'refresh_token')) {
        return { ...base, advertisedIssuer, status: 'blocked', code: 'oauth_capabilities', message: 'Dropi no anuncia todos los requisitos de OAuth, PKCE y renovación esperados para el piloto.' }
      }
      const endpoints: DropiOAuthEndpoints = {
        authorization: String(metadata.authorization_endpoint),
        token: String(metadata.token_endpoint),
        registration: String(metadata.registration_endpoint),
        revocation: typeof metadata.revocation_endpoint === 'string' ? metadata.revocation_endpoint : undefined,
      }
      return { ...base, advertisedIssuer, metadataIssuer: String(metadata.issuer), endpoints, status: 'authorization_required', code: 'discovery_valid', message: 'Los metadatos de Dropi son válidos. Falta autorizar la cuenta.' }
    }
    return { ...base, advertisedIssuer, metadataIssuer: mismatch, status: 'blocked', code: mismatch ? 'issuer_mismatch' : 'metadata_missing', message: mismatch ? 'Dropi anuncia un servidor de autorización cuyo issuer no coincide. La conexión permanece bloqueada hasta que Dropi corrija sus metadatos.' : 'Dropi no ofrece metadatos compatibles en las rutas de descubrimiento comprobadas.' }
  } catch {
    return { ...base, status: 'unavailable', code: 'discovery_failed', message: 'No se pudo completar la comprobación de Dropi. Puedes volver a intentarlo.' }
  }
}
