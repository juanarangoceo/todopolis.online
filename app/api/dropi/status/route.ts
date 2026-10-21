import { NextRequest, NextResponse } from 'next/server'
import { authorizeEditorialRequest } from '@/lib/ai/authorize'
import { inspectDropiDiscovery } from '@/lib/dropi/discovery'
import { dropiConnectionSummary } from '@/lib/dropi/connection'
import { secretBoxConfigured } from '@/lib/dropi/secret-box'

export const maxDuration = 30

export async function GET(request: NextRequest) {
  const denied = await authorizeEditorialRequest(request)
  if (denied) return denied
  const [discovery, connection] = await Promise.all([
    inspectDropiDiscovery(),
    dropiConnectionSummary().catch((e: Error) => ({ connected: false, status: 'missing' as const, lastError: e.message })),
  ])
  return NextResponse.json({ discovery, connection, configured: secretBoxConfigured() }, { headers: { 'Cache-Control': 'no-store' } })
}
