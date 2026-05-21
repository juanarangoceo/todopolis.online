import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { startMastershopSync } from '@/lib/mastershop-sync'

export const maxDuration = 300

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await startMastershopSync()

    // Revalidate blog listing and each product page that got a new article
    if (result.articlesCreated.length > 0) {
      revalidatePath('/blog')
      for (const slug of result.articlesCreated) {
        revalidatePath(`/blog`)
        revalidatePath(`/producto/${slug}`)
      }
    }

    // Si entraron productos nuevos, refresca el home y el catálogo de inmediato.
    if (result.imported > 0) {
      revalidateTag('products', 'max')
      revalidatePath('/')
    }

    return NextResponse.json({ ok: true, ...result })
  } catch (err: any) {
    console.error('[cron] Error en sync:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
