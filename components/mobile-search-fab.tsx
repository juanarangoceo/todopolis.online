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
        "md:hidden fixed z-30 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500",
        "bg-surface/95 backdrop-blur-xl border-2 border-todopolis-blue shadow-md shadow-todopolis-blue/30",
        "hover:bg-todopolis-blue/15 hover:shadow-lg active:scale-90",
        "top-24 right-4",
        isVisible
          ? "opacity-100 translate-x-0 scale-100"
          : "opacity-0 translate-x-8 scale-75 pointer-events-none"
      )}
      aria-label="Buscar productos"
    >
      <Search className="w-5 h-5 text-todopolis-blue-deep" />
    </button>
  );
}
