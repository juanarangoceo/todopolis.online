import { NextRequest, NextResponse } from 'next/server'
import { startMastershopSync } from '@/lib/mastershop-sync'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await startMastershopSync()
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[cron] Error en sync:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
