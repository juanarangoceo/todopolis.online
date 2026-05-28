import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Opt-in al newsletter de Todopolis. Inserta o reactiva un suscriptor en
// public.newsletter_subscribers. Idempotente vía UPSERT por email (único).

export const runtime = 'nodejs'

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
// WhatsApp colombiano: 10 dígitos (móvil) opcionalmente con prefijo +57. Permite
// guiones y espacios que limpiamos antes. Si el usuario lo deja vacío, lo
// guardamos como NULL.
const WHATSAPP_RX = /^\+?\d{10,13}$/

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

function clean(v: unknown, max: number): string {
  if (typeof v !== 'string') return ''
  return v.trim().slice(0, max)
}

export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Servicio de suscripción no configurado.' }, { status: 500 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 })
  }

  const name = clean(body.name, 80)
  const email = clean(body.email, 200).toLowerCase()
  const whatsappRaw = clean(body.whatsapp, 30).replace(/[\s-]/g, '')
  const productSlug = clean(body.productSlug, 200) || null
  const source = clean(body.source, 40) || 'product_landing'
  const termsAccepted = body.termsAccepted === true

  if (!name) {
    return NextResponse.json({ error: 'Cuéntanos tu nombre para escribirte mejor.' }, { status: 400 })
  }
  if (!EMAIL_RX.test(email)) {
    return NextResponse.json({ error: 'Revisa el email — no se ve completo.' }, { status: 400 })
  }
  if (whatsappRaw && !WHATSAPP_RX.test(whatsappRaw)) {
    return NextResponse.json({ error: 'El WhatsApp no parece válido. Ejemplo: +573001234567.' }, { status: 400 })
  }
  if (!termsAccepted) {
    return NextResponse.json({ error: 'Necesitamos que aceptes los términos.' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const now = new Date().toISOString()

  const { error } = await supabase
    .from('newsletter_subscribers')
    .upsert(
      {
        email,
        first_name: name,
        whatsapp: whatsappRaw || null,
        terms_accepted: true,
        terms_accepted_at: now,
        source,
        source_product_slug: productSlug,
        unsubscribed: false,
        unsubscribed_at: null,
      },
      { onConflict: 'email' },
    )

  if (error) {
    console.error('[subscribe] insert error', error)
    return NextResponse.json({ error: 'No pudimos guardar tu suscripción. Inténtalo en un momento.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
