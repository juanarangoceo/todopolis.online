import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'admin_session'
const COOKIE_MAX_AGE = 60 * 60 * 8 // 8 horas

export async function POST(request: NextRequest) {
  const { password } = await request.json()
  const correctPassword = process.env.ADMIN_DASHBOARD_PASSWORD

  if (!correctPassword) {
    return NextResponse.json({ error: 'Admin no configurado' }, { status: 500 })
  }

  if (password !== correctPassword) {
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 })
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set(COOKIE_NAME, 'authenticated', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/admin',
  })
  return response
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete(COOKIE_NAME)
  return response
}
