import { NextRequest, NextResponse } from 'next/server'
import { inspectDropiDiscovery } from '@/lib/dropi/discovery'
import { saveDropiConnection } from '@/lib/dropi/connection'
import { DROPI_OAUTH_COOKIE, exchangeCode, publicOrigin } from '@/lib/dropi/oauth'
import { open } from '@/lib/dropi/secret-box'

export const maxDuration = 30

interface Pending { state: string; verifier: string; redirectUri: string; clientId: string; exp: number }

export async function GET(request: NextRequest) {
  const origin = publicOrigin(request.headers, request.url)
  const done = (query: string) => {
    const response = NextResponse.redirect(new URL(`/admin/dropi?${query}`, origin))
    response.cookies.set(DROPI_OAUTH_COOKIE, '', { path: '/api/dropi/callback', maxAge: 0 })
    return response
  }

  let pending: Pending | null = null
  try { pending = JSON.parse((await open(request.cookies.get(DROPI_OAUTH_COOKIE)?.value)) ?? 'null') } catch { pending = null }
  const params = request.nextUrl.searchParams
  if (!pending || pending.exp < Date.now() || params.get('state') !== pending.state) return done('error=state')
  if (params.get('error')) return done('error=denied')
  const code = params.get('code')
  if (!code) return done('error=state')

  const discovery = await inspectDropiDiscovery()
  if (!discovery.endpoints) return done('error=discovery')
  try {
    const tokens = await exchangeCode(discovery.endpoints, { clientId: pending.clientId, redirectUri: pending.redirectUri, code, verifier: pending.verifier })
    await saveDropiConnection(pending.clientId, tokens)
    return done('connected=1')
  } catch (error) {
    console.error('[dropi] callback', error)
    return done('error=token')
  }
}
