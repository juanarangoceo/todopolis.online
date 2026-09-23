'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MagicSearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  compact?: boolean;
  /** Texto con el que monta. La barra de la cabecera entra por un portal
   *  DESPUÉS de que el home lee `?q=`, así que no alcanza a oír el aviso. */
  initialQuery?: string;
}

export function MagicSearchBar({ onSearch, placeholder = "Buscar productos…", compact = false, initialQuery = '' }: MagicSearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // El primer render no avisa: con `?q=` en la URL, mandar '' a los 300 ms
  // borraba la búsqueda que el navegador acababa de restaurar.
  // Se compara con lo último avisado y no con un «primer render»: en modo
  // estricto los efectos corren dos veces y esa bandera fallaba.
  const lastSent = useRef(query);
  useEffect(() => {
    if (query === lastSent.current) return;
    const timer = setTimeout(() => {
      lastSent.current = query;
      onSearch(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, onSearch]);

  // Quien filtra desde fuera (la × de la búsqueda en «filtros aplicados», el
  // logo que resetea el home, un `?q=` en la URL) fija el texto por aquí. Hay
  // dos instancias —cabecera y móvil— y las dos tienen que mostrar lo mismo.
  useEffect(() => {
    const handleSet = (e: Event) => setQuery((e as CustomEvent<string>).detail ?? '');
    window.addEventListener('magic-search:set', handleSet);
    return () => window.removeEventListener('magic-search:set', handleSet);
  }, []);

  // Listen for focus event from mobile search FAB
  useEffect(() => {
    const handleFocusEvent = () => {
      inputRef.current?.focus();
    };
    window.addEventListener('magic-search:focus', handleFocusEvent);
    return () => window.removeEventListener('magic-search:focus', handleFocusEvent);
  }, []);

  const handleClear = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  return (
    <div className={cn("relative w-full", compact ? "max-w-full" : "max-w-3xl mx-auto px-4")}>
      {/* Sin halo difuminado, sin partículas rebotando y sin varita: la barra
          es una herramienta, y lo que se mueve alrededor de un campo de texto
          distrae justo cuando alguien está escribiendo. El foco se nota en el
          borde. */}
      <div
        className={cn(
          "relative flex items-center gap-2 transition-colors duration-200",
          compact
            ? "h-11 pl-3.5 pr-1.5 rounded-xl bg-surface"
            : "gap-3 px-3 py-3 md:px-5 md:py-4 rounded-2xl md:rounded-3xl bg-surface mx-0",
          isFocused
            ? "border-2 border-todopolis-lavender-deep/50 shadow-md"
            : "border-2 border-nav-inactive-border shadow-sm hover:border-todopolis-lavender-deep/25"
        )}
      >
        <Search
          aria-hidden
          className={cn("shrink-0 transition-colors", compact ? "w-4 h-4" : "w-5 h-5", isFocused ? "text-todopolis-lavender-deep" : "text-foreground/40")}
        />

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          // Enter busca YA (sin esperar los 300 ms) y, en móvil, baja el
          // teclado para que se vean los resultados.
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            lastSent.current = query;
            onSearch(query);
            inputRef.current?.blur();
          }}
          enterKeyHint="search"
          aria-label="Buscar productos"
          placeholder={placeholder}
          className={cn(
            "flex-1 w-full min-w-0 bg-transparent text-foreground placeholder:text-foreground/40 focus:outline-none font-sans font-medium",
            compact ? "text-sm md:text-base px-2" : "text-base md:text-lg px-2 md:px-0"
          )}
        />
        
        {query && (
          <button
            onClick={handleClear}
            className={cn(
              "shrink-0 rounded-lg hover:bg-surface-muted transition-colors",
              compact ? "p-1.5" : "p-2"
            )}
            aria-label="Limpiar busqueda"
          >
            <X className={cn("text-foreground/50", compact ? "w-4 h-4" : "w-5 h-5")} />
          </button>
        )}

        {/* La búsqueda es en vivo (300 ms), así que no hay botón «Buscar»:
            el que había no hacía nada y, al pasar el ratón, se ponía azul
            oscuro con el ícono también azul oscuro encima. */}
      </div>

      {/* Helper text */}
      {!compact && (
        <p className={cn(
          "text-center mt-4 text-sm text-foreground/50 font-medium transition-all duration-300",
          isFocused ? "opacity-100" : "opacity-0"
        )}>
          <Sparkles className="inline w-3 h-3 mr-1 text-todopolis-lavender-deep" />
          Escribe para encontrar productos increibles
        </p>
      )}
    </div>
  );
}
