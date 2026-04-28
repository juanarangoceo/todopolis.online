'use client';

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MobileSearchFab() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let lastScrollY = 0;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      // Show after scrolling down 200px
      if (currentScrollY > 200 && currentScrollY > lastScrollY) {
        setIsVisible(true);
      } else if (currentScrollY <= 150) {
        setIsVisible(false);
      }
      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleClick = () => {
    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // After scroll finishes, focus the search input
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('magic-search:focus'));
    }, 500);
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "md:hidden fixed z-50 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500",
        "bg-white/90 backdrop-blur-xl border-2 border-[#FFB4AC] shadow-lg shadow-[#FFB4AC]/30",
        "hover:bg-[#FFD5E5] hover:shadow-xl hover:shadow-[#FFB4AC]/40 active:scale-90",
        "top-24 right-4",
        isVisible
          ? "opacity-100 translate-x-0 scale-100"
          : "opacity-0 translate-x-8 scale-75 pointer-events-none"
      )}
      aria-label="Buscar productos"
    >
      <Search className="w-5 h-5 text-[#F43F5E]" />
    </button>
  );
}
