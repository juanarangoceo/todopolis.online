'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Sparkles, X, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MagicSearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  compact?: boolean;
}

export function MagicSearchBar({ onSearch, placeholder = "Busca tu producto magico...", compact = false }: MagicSearchBarProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, onSearch]);

  const handleClear = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  return (
    <div className={cn("relative w-full", compact ? "max-w-full" : "max-w-3xl mx-auto px-4")}>
      {/* Magical glow effect */}
      <div 
        className={cn(
          "absolute inset-0 rounded-2xl md:rounded-3xl transition-all duration-700 mx-2 md:mx-4",
          isFocused 
            ? "bg-gradient-to-r from-[#FFB4AC]/40 via-[#EDD2F3]/40 to-[#A2D2FF]/40 blur-2xl scale-110 opacity-100" 
            : "bg-gradient-to-r from-[#FFD5E5]/20 to-[#EDD2F3]/20 blur-xl scale-100 opacity-50"
        )}
      />
      
      {/* Floating particles when focused */}
      {isFocused && (
        <>
          <div className="absolute -top-4 left-1/4 w-2 h-2 bg-[#FFB4AC] rounded-full animate-bounce opacity-60" style={{ animationDuration: '1.5s' }} />
          <div className="absolute -top-2 right-1/3 w-1.5 h-1.5 bg-[#A2D2FF] rounded-full animate-bounce opacity-70" style={{ animationDuration: '2s', animationDelay: '0.3s' }} />
          <div className="absolute -bottom-3 left-1/3 w-2 h-2 bg-[#EDD2F3] rounded-full animate-bounce opacity-60" style={{ animationDuration: '1.8s', animationDelay: '0.5s' }} />
          <div className="absolute -bottom-2 right-1/4 w-1.5 h-1.5 bg-[#E7FBBE] rounded-full animate-bounce opacity-70" style={{ animationDuration: '2.2s', animationDelay: '0.7s' }} />
        </>
      )}
      
      {/* Search container */}
      <div 
        className={cn(
          "relative flex items-center gap-2 transition-all duration-500",
          compact
            ? "px-4 py-1.5 rounded-xl bg-white/95 backdrop-blur-2xl"
            : "gap-4 px-3 py-3 md:px-6 md:py-5 rounded-2xl md:rounded-3xl bg-white/95 backdrop-blur-2xl mx-0",
          isFocused 
            ? "border-2 border-[#F43F5E] shadow-lg shadow-[#F43F5E]/20 scale-[1.01]" 
            : "border-2 border-[#FFB4AC] shadow-md shadow-[#FFB4AC]/10"
        )}
      >
        {/* Wand icon */}
        <div className={cn(
          "hidden md:block rounded-xl transition-all duration-300",
          compact ? "p-1.5" : "p-2.5",
          isFocused 
            ? "bg-gradient-to-br from-[#FFB4AC] to-[#FFD5E5]" 
            : "bg-[#FFD5E5]/30"
        )}>
          <Wand2 
            className={cn(
              "transition-all duration-300",
              compact ? "w-4 h-4" : "w-5 h-5",
              isFocused ? "text-white" : "text-[#FFB4AC]"
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
              "rounded-xl hover:bg-[#FFD5E5]/30 transition-colors",
              compact ? "p-1.5" : "p-2"
            )}
            aria-label="Limpiar busqueda"
          >
            <X className={cn("text-foreground/50", compact ? "w-4 h-4" : "w-5 h-5")} />
          </button>
        )}
        
        {/* Search button */}
        <button
          className={cn(
            "rounded-xl transition-all duration-300 shrink-0",
            compact ? "p-2" : "p-2 md:p-3",
            "bg-gradient-to-br from-[#F43F5E] to-[#FFB4AC]",
            "hover:from-[#E11D48] hover:to-[#F43F5E]",
            "shadow-lg shadow-[#F43F5E]/30 hover:shadow-xl hover:shadow-[#F43F5E]/40",
            "hover:scale-105"
          )}
          aria-label="Buscar"
        >
          <Search className={cn("text-white", compact ? "w-4 h-4" : "w-4 h-4 md:w-5 md:h-5")} />
        </button>
      </div>
      
      {/* Helper text */}
      {!compact && (
        <p className={cn(
          "text-center mt-4 text-sm text-foreground/50 font-medium transition-all duration-300",
          isFocused ? "opacity-100" : "opacity-0"
        )}>
          <Sparkles className="inline w-3 h-3 mr-1 text-[#FFB4AC]" />
          Escribe para encontrar productos increibles
        </p>
      )}
    </div>
  );
}
