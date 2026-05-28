import { NextResponse } from 'next/server'
import { getSanityProductsCount } from '@/lib/sanity/queries'

// Endpoint público para que el header muestre el contador de productos.
// La query interna está cacheada 60s con tag 'products' — al importar o
// sincronizar productos se hace revalidateTag('products') y la próxima lectura
// trae el número actualizado.
export const revalidate = 60

export async function GET() {
  const count = await getSanityProductsCount()
  return NextResponse.json(
    { count },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    },
  )
}
