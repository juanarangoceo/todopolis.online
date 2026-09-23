import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE, ADMIN_SESSION_SECONDS, createAdminToken } from '@/lib/admin-session'

// La cookie lleva un token firmado (lib/admin-session.ts) y vive en `path=/`
// para que la reciban también las rutas de API del panel.

export async function POST(request: NextRequest) {
  const { password } = await request.json()
  const correctPassword = process.env.ADMIN_DASHBOARD_PASSWORD

  if (!correctPassword) {
    return NextResponse.json({ error: 'Admin no configurado' }, { status: 500 })
  }

  if (password !== correctPassword) {
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 })
  }

  const token = await createAdminToken()
  if (!token) return NextResponse.json({ error: 'Admin no configurado' }, { status: 500 })

  const response = NextResponse.json({ success: true })
  response.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: ADMIN_SESSION_SECONDS,
    path: '/',
  })
  // La cookie vieja vivía en /admin con el valor fijo; se borra para que no
  // quede una sombra que confunda al navegador. OJO: con `response.cookies.set`
  // dos cookies del MISMO nombre se pisan —gana la última— y el borrado se
  // comía la sesión nueva (nadie podía entrar, 23-sep-2026). Por eso el
  // borrado va como cabecera aparte.
  response.headers.append('Set-Cookie', `${ADMIN_COOKIE}=; Path=/admin; Max-Age=0`)
  return response
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.headers.append('Set-Cookie', `${ADMIN_COOKIE}=; Path=/; Max-Age=0`)
  response.headers.append('Set-Cookie', `${ADMIN_COOKIE}=; Path=/admin; Max-Age=0`)
  return response
}
