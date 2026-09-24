import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/admin-session'

// Rutas de API que solo usa el panel. Antes quedaban abiertas: el proxy solo
// miraba /admin y la cookie no viajaba a /api. `/api/mastershop/sync` NO va
// aquí: es el cron y se autentica con CRON_SECRET.
const ADMIN_API_PREFIXES = ['/api/mastershop/import', '/api/mastershop/products', '/api/mastershop/sanity-ids']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Panel /admin: sesión firmada (lib/admin-session.ts).
  // `/admin` o `/admin/…`, no cualquier cosa que empiece por «/admin»: el
  // manifest de la app del panel es `/admin.webmanifest`. `/admin/launch.html`
  // queda fuera del matcher (ver abajo).
  const isAdminPage = pathname === '/admin' || pathname.startsWith('/admin/')
  if (isAdminPage && !pathname.startsWith('/admin/login')) {
    if (!(await verifyAdminToken(request.cookies.get(ADMIN_COOKIE)?.value))) {
      const loginUrl = new URL('/admin/login', request.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  if (ADMIN_API_PREFIXES.some((p) => pathname.startsWith(p))) {
    if (!(await verifyAdminToken(request.cookies.get(ADMIN_COOKIE)?.value))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
  }

  const { supabaseResponse } = await updateSession(request)

  // Favoritos now uses localStorage — no auth required.
  // Login redirect logic removed.

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     *
     * La app instalable del panel (`public/admin.webmanifest` y
     * `public/admin/launch.html`) va fuera a propósito. El navegador pide el
     * manifest SIN cookies, y el minador de la WebAPK de Android pide el
     * start_url también sin cookies: con el portón de sesión, los dos recibían
     * un 307 a /admin/login y la app no se podía instalar (pasó en nitro_bot).
     * Ninguno de los dos tiene datos: launch.html solo salta a /admin, donde el
     * portón sigue intacto.
     */
    '/((?!_next/static|_next/image|favicon.ico|admin/launch\\.html$|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webmanifest)$).*)',
  ],
}
