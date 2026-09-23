'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';

// Lupa de móvil. Aparece en la cabecera cuando la barra de búsqueda ya se fue
// de la pantalla, y al tocarla sube y enfoca esa barra.
//
// Antes era un botón flotante en `top-24 right-4`: quedaba justo encima del
// corazón de favoritos de la columna derecha del catálogo y se sumaba a las
// burbujas de WhatsApp y Lucy. Ahora se pinta por portal en el hueco
// `#header-mobile-search-slot` de `header.tsx`, así que solo existe en las
// páginas que tienen buscador (en las demás no habría barra que enfocar).
export function MobileSearchFab() {
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  // El hueco se busca al hacer scroll y no al renderizar: al navegar desde otra
  // página el header nuevo todavía no está en el DOM durante el render.
  useEffect(() => {
    const handleScroll = () => {
      const visible = window.scrollY > 200;
      setSlot(visible ? document.getElementById('header-mobile-search-slot') : null);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('magic-search:focus'));
    }, 500);
  };

  if (!slot) return null;

  return createPortal(
    <button
      onClick={handleClick}
      className="md:hidden relative shrink-0 p-[9px] rounded-2xl bg-surface border border-nav-inactive-border shadow-sm active:scale-95 transition-all animate-in fade-in zoom-in-90 duration-200"
      aria-label="Buscar productos"
      style={{ touchAction: 'manipulation' }}
    >
      <Search className="w-5 h-5 text-todopolis-blue-deep" />
    </button>,
    slot,
  );
}
