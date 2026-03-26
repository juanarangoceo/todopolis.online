'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Instagram, Facebook, Sparkles, Heart, X } from 'lucide-react';

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
          <p className="text-gray-600 text-sm">Manejamos pago contra entrega (pagas cuando recibes tu producto en casa). No se requiere tarjeta de crédito.</p>
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
          <p className="text-gray-600 text-sm">El costo de envío es de $12.000 COP. Pedidos mayores a $150.000 tienen envío gratis.</p>
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
  'Politica de Privacidad': {
    title: 'Política de Privacidad',
    body: (
      <div className="space-y-4 text-gray-600 text-sm leading-relaxed">
        <p>En Todopolis nos comprometemos a proteger tu información personal. Los datos que recopilamos (nombre, teléfono, dirección) se usan exclusivamente para procesar y entregar tu pedido.</p>
        <p>No vendemos ni compartimos tu información con terceros salvo las transportadoras necesarias para el envío.</p>
        <p>Puedes solicitar la eliminación de tus datos en cualquier momento contactándonos por WhatsApp.</p>
        <p>Al realizar un pedido aceptas esta política de privacidad.</p>
      </div>
    ),
  },
  'Terminos y Condiciones': {
    title: 'Términos y Condiciones',
    body: (
      <div className="space-y-4 text-gray-600 text-sm leading-relaxed">
        <p><strong className="text-gray-800">Uso del sitio:</strong> Al navegar en Todopolis aceptas que el contenido es de carácter informativo y comercial.</p>
        <p><strong className="text-gray-800">Pedidos:</strong> Un pedido se confirma solo cuando es verificado por nuestro equipo vía WhatsApp. Nos reservamos el derecho de cancelar pedidos con información incompleta.</p>
        <p><strong className="text-gray-800">Precios:</strong> Los precios pueden cambiar sin previo aviso. El precio válido es el mostrado al momento de realizar el pedido.</p>
        <p><strong className="text-gray-800">Responsabilidad:</strong> Todopolis no se hace responsable por retrasos causados por la transportadora una vez despachado el paquete.</p>
        <p><strong className="text-gray-800">Jurisdicción:</strong> Estos términos se rigen por las leyes de Colombia.</p>
      </div>
    ),
  },
};

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
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#FFB4AC]/10 to-[#EDD2F3]/10">
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

export function Footer() {
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const supportItems = ['Preguntas Frecuentes', 'Envios y Devoluciones', 'Politica de Privacidad', 'Terminos y Condiciones'];

  return (
    <>
      <footer className="relative mt-24 overflow-hidden">
        {/* Curved top decoration */}
        <div className="absolute top-0 left-0 right-0 h-24 -translate-y-full">
          <svg viewBox="0 0 1440 100" fill="none" className="w-full h-full" preserveAspectRatio="none">
            <path d="M0,50 Q360,100 720,50 T1440,50 L1440,100 L0,100 Z" fill="#2D2D2D" />
          </svg>
        </div>
        
        <div className="bg-[#2D2D2D] text-white">
          <div className="container mx-auto px-4 py-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {/* Brand */}
              <div>
                <h3 className="font-sans text-3xl font-black mb-2">
                  Todo<span className="text-[#FFB4AC]">polis</span>
                </h3>
                <p className="text-white/60 text-sm leading-relaxed font-serif mb-6">
                  Tu tienda online favorita con todo lo que necesitas. Moda, tecnologia, hogar, belleza y mucho mas en un solo lugar.
                </p>
                <div className="flex gap-3">
                  <Link 
                    href="#" 
                    className="p-3 rounded-xl bg-[#FFB4AC]/20 hover:bg-[#FFB4AC] hover:text-white transition-all duration-300 group" 
                    aria-label="Instagram"
                  >
                    <Instagram className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </Link>
                  <Link 
                    href="#" 
                    className="p-3 rounded-xl bg-[#A2D2FF]/20 hover:bg-[#A2D2FF] hover:text-white transition-all duration-300 group" 
                    aria-label="Facebook"
                  >
                    <Facebook className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </Link>
                </div>
              </div>
              
              {/* Explore Links */}
              <div>
                <h4 className="font-sans font-bold mb-6 flex items-center gap-2">
                  <span className="w-8 h-0.5 bg-[#FFB4AC]" />
                  Explorar
                </h4>
                <ul className="space-y-4">
                  {['Inicio', 'Productos', 'Categorias', 'Ofertas'].map((item) => (
                    <li key={item}>
                      <Link 
                        href="/" 
                        className="text-sm text-white/60 hover:text-[#FFB4AC] transition-colors font-serif flex items-center gap-2 group"
                      >
                        <span className="w-0 group-hover:w-2 h-0.5 bg-[#FFB4AC] transition-all duration-300" />
                        {item}
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
                </ul>
              </div>
            </div>
            
            {/* Bottom bar */}
            <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-sm text-white/40 font-serif">
                2024 Todopolis. Todos los derechos reservados.
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
