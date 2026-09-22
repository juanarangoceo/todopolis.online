'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ShieldCheck, ShoppingBag, Truck } from 'lucide-react'

const LOGO_URL =
  'https://res.cloudinary.com/dohwyszdj/image/upload/f_auto,q_auto,w_320/v1779801383/logo_nuevo_todopolis_1_ljlqn6.png'

/**
 * Cabecera deliberadamente corta para tráfico de anuncios. Mantiene marca,
 * confianza y una salida hacia compra, pero elimina las rutas que invitan a
 * abandonar el producto antes de entender la oferta.
 */
export function CampaignHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-nav-inactive-border bg-surface/92 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between gap-3 px-4">
        {/* El logo lleva a la tienda, como en cualquier sitio: es lo primero
            que se toca para "ver quién vende esto", y un logo que no responde
            se lee como página rota, no como embudo cuidado. */}
        <Link href="/" aria-label="Todópolis — ir a la tienda" className="shrink-0">
          <Image
            src={LOGO_URL}
            alt="Todópolis"
            width={128}
            height={40}
            priority
            className="object-contain"
          />
        </Link>

        <div className="hidden items-center gap-4 text-xs font-bold text-trust-fg md:flex">
          <span className="inline-flex items-center gap-1.5">
            <Truck className="h-4 w-4" />
            Envío gratis
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4" />
            Pago protegido o contraentrega
          </span>
        </div>

        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('product:buy'))}
          className="inline-flex items-center gap-2 rounded-xl bg-cta px-3.5 py-2.5 text-sm font-extrabold text-cta-fg shadow-md shadow-cta-ring transition-transform hover:scale-[1.02] active:scale-[0.98] sm:px-5"
        >
          <ShoppingBag className="h-4 w-4" />
          <span className="hidden sm:inline">Comprar ahora</span>
          <span className="sm:hidden">Comprar</span>
        </button>
      </div>
    </header>
  )
}
