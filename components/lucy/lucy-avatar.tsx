'use client';

import Image from 'next/image';
import { Sparkles } from 'lucide-react';

interface LucyAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  isTyping?: boolean;
  className?: string;
}

const sizes = {
  sm: { container: 'w-8 h-8', dots: 'w-1 h-1' },
  md: { container: 'w-10 h-10', dots: 'w-1.5 h-1.5' },
  lg: { container: 'w-14 h-14', dots: 'w-2 h-2' },
};

export function LucyAvatar({ size = 'md', isTyping = false, className = '' }: LucyAvatarProps) {
  const s = sizes[size];

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      <div
        className={`${s.container} rounded-full bg-gradient-to-br from-[#FFB4AC] to-[#EDD2F3] flex items-center justify-center shadow-md overflow-hidden`}
      >
        <Sparkles className="w-4 h-4 text-white" />
      </div>

      {/* Online indicator */}
      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full" />

      {/* Typing indicator overlay */}
      {isTyping && (
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#FFB4AC]/80 to-[#EDD2F3]/80 flex items-center justify-center">
          <div className="flex gap-0.5 items-center">
            <div className={`${s.dots} bg-white rounded-full animate-bounce`} style={{ animationDelay: '0ms' }} />
            <div className={`${s.dots} bg-white rounded-full animate-bounce`} style={{ animationDelay: '150ms' }} />
            <div className={`${s.dots} bg-white rounded-full animate-bounce`} style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}
    </div>
  );
}
