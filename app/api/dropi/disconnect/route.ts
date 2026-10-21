import { NextRequest, NextResponse } from 'next/server'
import { authorizeEditorialRequest } from '@/lib/ai/authorize'
import { disconnectDropi } from '@/lib/dropi/connection'

export async function POST(request: NextRequest) {
  const denied = await authorizeEditorialRequest(request)
  if (denied) return denied
  await disconnectDropi()
  return NextResponse.json({ ok: true })
}
