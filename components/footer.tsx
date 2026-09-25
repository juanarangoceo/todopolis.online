'use client';

import { useState } from 'react';
import { ConfioLogo } from './confio-logo';
import Link from 'next/link';
import { Instagram, Facebook, Sparkles, Heart, X } from 'lucide-react';
import { advancePaymentVisible } from '@/components/payment-methods';
import { BUSINESS, SOCIAL } from '@/lib/legal';
import { CookiePreferences } from '@/components/cookie-preferences';
import { FooterSubscribe } from '@/components/footer-subscribe';

// ── Modal content ────────────────────────────────────────────────────────────

const supportContent: Record<string, { title: string; body: React.ReactNode }> = {
  'Preguntas Frecuentes': {
    title: 'Preguntas Frecuentes',
    body: (
      <div className="space-y-5">
        <div>
          <h4 className="font-bold text-gray-800 mb-1">¿Cómo hago un pedido?</h4>
          <p className="text-gray-600 text-sm">Selecciona el producto que deseas, haz clic en "Comprar ahora", completa tus datos de envío y listo. Te contactamos por WhatsApp para confirmar.</p>
        </div>
        <div>
          <h4 className="font-bold text-gray-800 mb-1">¿Cuánto demora el envío?</h4>
          <p className="text-gray-600 text-sm">Los pedidos llegan entre 3 y 7 días hábiles dependiendo de tu ciudad.</p>
        </div>
        <div>
          <h4 className="font-bold text-gray-800 mb-1">¿Cómo pago?</h4>
          {advancePaymentVisible() ? (
            <p className="text-gray-600 text-sm">Tú eliges. <strong>Contraentrega:</strong> pagas en efectivo cuando recibes el producto en casa. <strong>Pago protegido:</strong> pagas ahora con PSE, Nequi o Bancolombia y tu dinero queda en custodia de Confío hasta que confirmes que el pedido llegó. No manejamos tarjeta de crédito ni débito.</p>
          ) : (
            <p className="text-gray-600 text-sm">Manejamos pago contra entrega (pagas cuando recibes tu producto en casa). No se requiere tarjeta de crédito.</p>
          )}
        </div>
        <div>
          <h4 className="font-bold text-gray-800 mb-1">¿Puedo hacer seguimiento a mi pedido?</h4>
          <p className="text-gray-600 text-sm">Sí. Una vez despachado tu pedido te enviamos el número de guía por WhatsApp.</p>
        </div>
      </div>
    ),
  },
  'Envios y Devoluciones': {
    title: 'Envíos y Devoluciones',
    body: (
      <div className="space-y-5">
        <div>
          <h4 className="font-bold text-gray-800 mb-1">Costo de envío</h4>
          {/* Antes prometía envío gratis sobre $150.000. Ese umbral NO existe en
              el código: el checkout cobra $12.000 salvo en productos destacados
              (components/checkout-modal.tsx). Era una promesa falsa sobre dinero. */}
          <p className="text-gray-600 text-sm">El costo de envío es de $12.000 COP a todo el país. Los productos marcados como <strong>Destacados</strong> tienen envío gratis.</p>
        </div>
        <div>
          <h4 className="font-bold text-gray-800 mb-1">Tiempo de entrega</h4>
          <p className="text-gray-600 text-sm">Entre 3 y 7 días hábiles. En ciudades principales puede ser más rápido.</p>
        </div>
        <div>
          <h4 className="font-bold text-gray-800 mb-1">Política de devoluciones</h4>
          <p className="text-gray-600 text-sm">Tienes 30 días desde la recepción para solicitar una devolución por defecto del producto. Contáctanos por WhatsApp con fotos del problema.</p>
        </div>
        <div>
          <h4 className="font-bold text-gray-800 mb-1">Producto no llega</h4>
          <p className="text-gray-600 text-sm">Si tu pedido supera el tiempo estimado, escríbenos y hacemos seguimiento inmediato con la transportadora.</p>
        </div>
      </div>
    ),
  },
};

const EXPLORE_LINKS = [
  { href: '/', label: 'Inicio' },
  { href: '/destacados', label: 'Destacados' },
  { href: '/ofertas', label: 'Ofertas' },
  { href: '/colecciones', label: 'Colecciones' },
  { href: '/blog', label: 'Blog' },
] as const;

const LEGAL_LINKS = [
  { href: '/privacidad', label: 'Política de Privacidad' },
  { href: '/terminos', label: 'Términos y Condiciones' },
] as const;

// ── Support Modal ─────────────────────────────────────────────────────────────

function SupportModal({ item, onClose }: { item: string; onClose: () => void }) {
  const content = supportContent[item];
  if (!content) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      {/* Dialog */}
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-300 z-10 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-surface-soft">
          <h2 className="text-lg font-bold text-gray-900">{content.title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Body */}
        <div className="overflow-y-auto p-6 flex-1">
          {content.body}
        </div>
      </div>
    </div>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

// `showPaymentExplainer={false}` en las páginas que ya explican Confío en su
// propio cuerpo (la landing de Destacados, sección «Cómo pagas»): repetirlo en
// el pie, en fondo oscuro y después del botón de compra, no aclara nada.
// `flush`: sin margen superior. La ficha termina en el cierre, que ya tiene su
// propio fondo; los 96 px del margen dejaban una franja blanca suelta entre el
// cierre y el pie.
// `productSlug`: en la ficha, la suscripción del pie guarda desde qué producto
// llegó el suscriptor, como hacía el antiguo formulario de la ficha.
export function Footer({ showPaymentExplainer = true, flush = false, productSlug }: { showPaymentExplainer?: boolean; flush?: boolean; productSlug?: string } = {}) {
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Privacidad y Términos salieron de aquí: ahora son páginas con URL propia
  // (LEGAL_LINKS). En el modal solo queda lo operativo.
  const supportItems = ['Preguntas Frecuentes', 'Envios y Devoluciones'];

  return (
    <>
      <footer id="site-footer" className={`relative overflow-hidden ${flush ? '' : 'mt-24'}`}>
        {/* Curved top decoration */}
        <div className="absolute top-0 left-0 right-0 h-24 -translate-y-full">
          <svg viewBox="0 0 1440 100" fill="none" className="w-full h-full" preserveAspectRatio="none">
            <path d="M0,50 Q360,100 720,50 T1440,50 L1440,100 L0,100 Z" fill="#2D2D2D" />
          </svg>
        </div>
        
        <div className="bg-[#2D2D2D] text-white">
          <div className="container mx-auto px-4 py-16">
            <FooterSubscribe productSlug={productSlug} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {/* Brand */}
              <div>
                <h3 className="font-sans text-3xl font-black mb-2">
                  Todó<span className="text-[#FFB4AC]">polis</span>
                </h3>
                <p className="text-white/60 text-sm leading-relaxed font-serif mb-6">
                  Tu tienda online favorita con todo lo que necesitas. Moda, tecnologia, hogar, belleza y mucho mas en un solo lugar.
                </p>
                {/* Enlaces reales, no `href="#"`. Un enlace que no lleva a
                    ninguna parte es peor que ninguno: en una revisión de negocio
                    de Meta es justo lo que se mira para comprobar que la tienda
                    existe fuera de su propia web. Las URLs están en
                    `lib/legal.ts`. */}
                <div className="flex gap-3">
                  <a
                    href={SOCIAL.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl bg-[#FFB4AC]/20 hover:bg-[#FFB4AC] hover:text-white transition-all duration-300 group"
                    aria-label="Todópolis en Instagram"
                  >
                    <Instagram className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </a>
                  <a
                    href={SOCIAL.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl bg-[#A2D2FF]/20 hover:bg-[#A2D2FF] hover:text-white transition-all duration-300 group"
                    aria-label="Todópolis en Facebook"
                  >
                    <Facebook className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </a>
                </div>
              </div>
              
              {/* Explore Links */}
              <div>
                <h4 className="font-sans font-bold mb-6 flex items-center gap-2">
                  <span className="w-8 h-0.5 bg-[#FFB4AC]" />
                  Explorar
                </h4>
                <ul className="space-y-4">
                  {/* Los cuatro enlaces de antes («Inicio», «Productos»,
                      «Categorias», «Ofertas») llevaban TODOS a «/». */}
                  {EXPLORE_LINKS.map(({ href, label }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        className="text-sm text-white/60 hover:text-[#FFB4AC] transition-colors font-serif flex items-center gap-2 group"
                      >
                        <span className="w-0 group-hover:w-2 h-0.5 bg-[#FFB4AC] transition-all duration-300" />
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Support — modal buttons */}
              <div>
                <h4 className="font-sans font-bold mb-6 flex items-center gap-2">
                  <span className="w-8 h-0.5 bg-[#A2D2FF]" />
                  Soporte
                </h4>
                <ul className="space-y-4">
                  {supportItems.map((item) => (
                    <li key={item}>
                      <button
                        onClick={() => setActiveModal(item)}
                        className="text-sm text-white/60 hover:text-[#A2D2FF] transition-colors font-serif flex items-center gap-2 group text-left"
                      >
                        <span className="w-0 group-hover:w-2 h-0.5 bg-[#A2D2FF] transition-all duration-300 shrink-0" />
                        {item}
                      </button>
                    </li>
                  ))}
                  {/* Privacidad y Términos son ENLACES, no ventanas emergentes:
                      Meta pide una dirección visitable de la política de
                      privacidad, y una que se abre con JavaScript no se puede
                      pegar en un formulario ni la alcanza un revisor. */}
                  {LEGAL_LINKS.map(({ href, label }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        className="text-sm text-white/60 hover:text-[#A2D2FF] transition-colors font-serif flex items-center gap-2 group"
                      >
                        <span className="w-0 group-hover:w-2 h-0.5 bg-[#A2D2FF] transition-all duration-300 shrink-0" />
                        {label}
                      </Link>
                    </li>
                  ))}
                  {/* El interruptor de medición vive aquí y no en un aviso
                      flotante: interrumpir a quien venía a comprar costaba
                      conversión, pero el mecanismo tiene que existir de verdad
                      porque /privacidad afirma que existe. */}
                  <li>
                    <CookiePreferences />
                  </li>
                </ul>
              </div>
            </div>
            
            {/* Pago protegido — la parte de tranquilidad. Solo se pinta si el
                pago anticipado está encendido: si no, prometeríamos una
                custodia que el checkout no puede ofrecer. Mismo criterio que
                PaymentMethods y los prompts de Lucy. */}
            {/* Rehecho el 25-sep-2026. Era una caja con tres cajas dentro,
                números en salmón (un color sin significado en la guía) y un
                titular que empezaba por «Si pagas por adelantado»: el ángulo
                que NO queremos (ver CLAUDE.md → Confío). Ahora es una franja
                separada por filete, con las dos vías en el titular y los
                pasos como texto con filetes, igual que «Así compras». */}
            {showPaymentExplainer && advancePaymentVisible() && (
              <div className="mt-14 border-t border-white/10 pt-10">
                <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white">
                        <ConfioLogo variant="icon" className="h-7 w-7" />
                      </span>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/50">Cómo pagas</p>
                    </div>
                    <h4 className="mt-4 font-serif text-xl font-extrabold leading-tight tracking-[-0.01em] md:text-2xl">
                      Paga al recibir, o paga con Confío
                    </h4>
                    <p className="mt-2 max-w-md text-sm leading-relaxed text-white/60">
                      Con <strong className="font-bold text-white/90">Confío</strong> pagas por PSE, Nequi o
                      Bancolombia y tu plata queda en custodia: nos llega solo cuando confirmas que el
                      pedido está en tus manos.
                    </p>
                  </div>

                  <ol className="grid gap-5 sm:grid-cols-3 sm:gap-6">
                    {[
                      {
                        t: 'Pagas en Confío',
                        d: 'Tus datos bancarios nunca pasan por Todópolis.',
                      },
                      {
                        t: 'Confío guarda el dinero',
                        d: 'Mientras preparamos y enviamos tu pedido. Nosotros no podemos tocarlo.',
                      },
                      {
                        t: 'Confirmas que llegó',
                        d: 'Ahí, y solo ahí, Confío nos entrega el pago. Si no llega, el dinero vuelve a ti.',
                      },
                    ].map((step, i) => (
                      <li key={step.t} className="border-t border-white/15 pt-4">
                        <span className="font-serif text-sm font-extrabold tabular-nums text-white/40">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <p className="mt-1 text-sm font-bold">{step.t}</p>
                        <p className="mt-1 text-xs leading-relaxed text-white/55">{step.d}</p>
                      </li>
                    ))}
                  </ol>
                </div>

                <p className="mt-6 text-xs leading-relaxed text-white/40">
                  El cobro de Confío vence a los 3 días si no lo pagas, sin ningún cargo. Si prefieres
                  no pagar antes, la contraentrega en efectivo sigue disponible en todos los productos.
                </p>
              </div>
            )}

            {/* Bottom bar */}
            <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
              {/* IDENTIFICACIÓN DEL PROVEEDOR — Ley 1480 de 2011, art. 50: el
                  consumidor tiene que poder saber a quién le compra y a quién
                  reclamarle. Todópolis es una marca, no una sociedad; responde
                  una persona natural.

                  Aquí va SOLO el nombre, y el detalle vive en /terminos. La ley
                  pide que el dato sea claro y accesible, no que ocupe el pie de
                  todas las páginas, y el nombre de una persona natural en un
                  sitio indexable conviene dosificarlo. El número de documento no
                  se publica en ninguna parte: no le sirve a quien compra y, si
                  una plataforma lo exige, se entrega por su canal privado de
                  verificación.

                  Sale de `lib/legal.ts` para que el pie y las páginas legales no
                  puedan decir cosas distintas. */}
              <p className="text-xs text-white/35 font-serif leading-relaxed">
                Marca operada por {BUSINESS.legalName} · {BUSINESS.country} ·{' '}
                <Link href="/terminos" className="hover:text-white/60 transition-colors underline underline-offset-2">
                  Información del vendedor
                </Link>
              </p>
              <p className="text-sm text-white/40 font-serif">
                © {new Date().getFullYear()} {BUSINESS.brand}. Todos los derechos reservados.
              </p>
              <p className="text-sm text-white/40 font-serif flex items-center gap-2">
                Hecho con <Heart className="w-4 h-4 text-[#FFB4AC] fill-[#FFB4AC]" /> en Colombia
                <Sparkles className="w-4 h-4 text-[#EDD2F3]" />
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Support Modals */}
      {activeModal && (
        <SupportModal item={activeModal} onClose={() => setActiveModal(null)} />
      )}
    </>
  );
}
