'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Sparkles, X, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MagicSearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  compact?: boolean;
  /** Texto con el que monta. La barra de la cabecera entra por un portal
   *  DESPUÉS de que el home lee `?q=`, así que no alcanza a oír el aviso. */
  initialQuery?: string;
}

export function MagicSearchBar({ onSearch, placeholder = "Busca tu producto mágico…", compact = false, initialQuery = '' }: MagicSearchBarProps) {
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
      {/* Glow neutro: azul + lila, sin coral. Búsqueda = herramienta universal */}
      <div
        className={cn(
          "absolute inset-0 rounded-2xl md:rounded-3xl transition-all duration-700 mx-2 md:mx-4",
          isFocused
            ? "bg-gradient-to-r from-todopolis-blue/35 via-todopolis-lavender/30 to-todopolis-blue/35 blur-2xl scale-110 opacity-100"
            : "bg-surface-muted/30 blur-xl scale-100 opacity-50"
        )}
      />

      {/* Floating particles when focused */}
      {isFocused && (
        <>
          <div className="absolute -top-4 left-1/4 w-2 h-2 bg-todopolis-blue rounded-full animate-bounce opacity-60" style={{ animationDuration: '1.5s' }} />
          <div className="absolute -top-2 right-1/3 w-1.5 h-1.5 bg-todopolis-lavender rounded-full animate-bounce opacity-70" style={{ animationDuration: '2s', animationDelay: '0.3s' }} />
          <div className="absolute -bottom-3 left-1/3 w-2 h-2 bg-todopolis-blue rounded-full animate-bounce opacity-60" style={{ animationDuration: '1.8s', animationDelay: '0.5s' }} />
          <div className="absolute -bottom-2 right-1/4 w-1.5 h-1.5 bg-todopolis-lime rounded-full animate-bounce opacity-70" style={{ animationDuration: '2.2s', animationDelay: '0.7s' }} />
        </>
      )}

      {/* Search container — border azul al hacer focus */}
      <div
        className={cn(
          "relative flex items-center gap-2 transition-all duration-500",
          compact
            ? "px-4 py-1.5 rounded-xl bg-surface/95 backdrop-blur-2xl"
            : "gap-4 px-3 py-3 md:px-6 md:py-5 rounded-2xl md:rounded-3xl bg-surface/95 backdrop-blur-2xl mx-0",
          isFocused
            ? "border-2 border-todopolis-blue shadow-lg shadow-todopolis-blue/20 scale-[1.01]"
            : "border-2 border-nav-inactive-border shadow-sm"
        )}
      >
        {/* Wand icon */}
        <div className={cn(
          "hidden md:block rounded-xl transition-all duration-300",
          compact ? "p-1.5" : "p-2.5",
          isFocused
            ? "bg-todopolis-blue/30"
            : "bg-surface-muted"
        )}>
          <Wand2
            className={cn(
              "transition-all duration-300",
              compact ? "w-4 h-4" : "w-5 h-5",
              "text-todopolis-blue-deep"
            )}
          />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
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
              "rounded-xl hover:bg-surface-muted transition-colors",
              compact ? "p-1.5" : "p-2"
            )}
            aria-label="Limpiar busqueda"
          >
            <X className={cn("text-foreground/50", compact ? "w-4 h-4" : "w-5 h-5")} />
          </button>
        )}

        {/* Search button — azul, no coral */}
        <button
          className={cn(
            "rounded-xl transition-all duration-300 shrink-0",
            compact ? "p-2" : "p-2 md:p-3",
            "bg-todopolis-blue hover:bg-todopolis-blue-deep",
            "shadow-md shadow-todopolis-blue/30",
            "hover:scale-105"
          )}
          aria-label="Buscar"
        >
          <Search className={cn("text-todopolis-blue-deep", compact ? "w-4 h-4" : "w-4 h-4 md:w-5 md:h-5")} />
        </button>
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
