import { NextRequest, NextResponse } from 'next/server'
import { sendCapiEvent } from '@/lib/meta-capi'

// Espejo server-side de los eventos del Pixel del navegador (ViewContent,
// AddToCart, InitiateCheckout). El Purchase se envía directo desde el server
// action de la orden (con matching avanzado), no por aquí.

function clientIpFrom(req: NextRequest): string | undefined {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? undefined
}

export async function POST(req: NextRequest) {
  let body: {
    eventName?: string
    eventId?: string
    eventSourceUrl?: string
    customData?: Record<string, unknown>
    userData?: { phone?: string; name?: string; city?: string; email?: string }
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  if (!body.eventName || !body.eventId) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  // Cookies del Pixel para mejor matching.
  const fbp = req.cookies.get('_fbp')?.value
  const fbc = req.cookies.get('_fbc')?.value

  await sendCapiEvent({
    eventName: body.eventName,
    eventId: body.eventId,
    eventSourceUrl: body.eventSourceUrl,
    customData: body.customData,
    userData: body.userData,
    fbp,
    fbc,
    clientIp: clientIpFrom(req),
    clientUserAgent: req.headers.get('user-agent') ?? undefined,
  })

  return NextResponse.json({ ok: true })
}
