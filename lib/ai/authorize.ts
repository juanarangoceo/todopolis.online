import { NextResponse, type NextRequest } from 'next/server'
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/admin-session'

export async function authorizeEditorialRequest(request: NextRequest): Promise<NextResponse | null> {
  if (!(await verifyAdminToken(request.cookies.get(ADMIN_COOKIE)?.value))) {
    return NextResponse.json({ error: 'Inicia sesión en /admin/login y vuelve al Studio para generar contenido.' }, { status: 401 })
  }
  const origin = request.headers.get('origin')
  // Next recibe una URL interna dentro de Docker/Vercel. Compara contra el
  // host público de la petición, como las Server Actions, no contra :3000.
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  let sameOrigin = !origin
  try { if (origin) sameOrigin = ['http:', 'https:'].includes(new URL(origin).protocol) && new URL(origin).host === host } catch { sameOrigin = false }
  if (!sameOrigin || request.headers.get('sec-fetch-site') === 'cross-site') {
    return NextResponse.json({ error: 'Origen no autorizado.' }, { status: 403 })
  }
  if (Number(request.headers.get('content-length')) > 100_000) {
    return NextResponse.json({ error: 'La solicitud de contenido es demasiado grande.' }, { status: 413 })
  }
  return null
}
