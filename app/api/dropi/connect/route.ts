import { NextRequest, NextResponse } from 'next/server'
import { inspectDropiDiscovery } from '@/lib/dropi/discovery'
import { findOAuthClient, saveOAuthClient } from '@/lib/dropi/connection'
import { DROPI_OAUTH_COOKIE, authorizeUrl, callbackAllowed, callbackUrl, pkceChallenge, publicOrigin, randomToken, registerClient } from '@/lib/dropi/oauth'
import { seal, secretBoxConfigured } from '@/lib/dropi/secret-box'

export const maxDuration = 30

// Arranca el login con Dropi. La sesión del panel la exige el proxy
// (`/api/dropi/` está en ADMIN_API_PREFIXES).
export async function GET(request: NextRequest) {
  const origin = publicOrigin(request.headers, request.url)
  const back = (error: string) => NextResponse.redirect(new URL(`/admin/dropi?error=${error}`, origin))

  if (!secretBoxConfigured()) return back('config')
  const redirectUri = callbackUrl(origin)
  if (!callbackAllowed(redirectUri)) return back('host')

  const discovery = await inspectDropiDiscovery()
  if (!discovery.endpoints) return back('discovery')

  let clientId: string | null
  try {
    clientId = await findOAuthClient(redirectUri)
  } catch (error) {
    console.error('[dropi] connect', error)
    return back('storage')
  }
  try {
    if (!clientId) {
      clientId = await registerClient(discovery.endpoints, redirectUri)
      await saveOAuthClient(redirectUri, clientId)
    }
    const state = randomToken()
    const verifier = randomToken(48)
    const response = NextResponse.redirect(authorizeUrl(discovery.endpoints, { clientId, redirectUri, state, challenge: await pkceChallenge(verifier) }))
    // State y verificador viajan cifrados en una cookie de 10 minutos que solo
    // recibe el callback, y se borran al usarse: un solo uso.
    response.cookies.set(DROPI_OAUTH_COOKIE, await seal(JSON.stringify({ state, verifier, redirectUri, clientId, exp: Date.now() + 600_000 })), {
      httpOnly: true,
      secure: origin.startsWith('https:'),
      // lax: el regreso desde oauth.dropi.co es una navegación GET de otro sitio.
      sameSite: 'lax',
      maxAge: 600,
      path: '/api/dropi/callback',
    })
    return response
  } catch (error) {
    console.error('[dropi] connect', error)
    return back('register')
  }
}
