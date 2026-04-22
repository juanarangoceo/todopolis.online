'use client';

import { useState, useEffect } from 'react';
import { X, Wand2, MessageCircle, Sparkles } from 'lucide-react';
import { LucyAvatar } from './lucy-avatar';
import { LucyDirectChat } from './lucy-direct-chat';
import { LucyMagicForm } from './lucy-magic-form';

interface LucyPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
}

export function LucyPanel({ isOpen, onClose, sessionId }: LucyPanelProps) {
  const handleClose = () => {
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/20 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        className={`fixed bottom-0 right-0 z-50 flex flex-col transition-all duration-300 ease-out
          sm:bottom-6 sm:right-6 sm:rounded-3xl sm:shadow-2xl sm:shadow-black/20
          w-full sm:w-[380px] h-[85vh] sm:h-[600px]
          bg-gradient-to-b from-[#FFF5F8] to-white
          border border-[#EDD2F3]/30
          rounded-t-3xl
          ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-full sm:translate-y-8 opacity-0 pointer-events-none'}
        `}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/80 hover:bg-white border border-[#EDD2F3]/30 text-foreground/50 hover:text-foreground transition-all shadow-sm"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* DIRECT CHAT (Always rendered so it preserves state) */}
        <LucyDirectChat sessionId={sessionId} onBack={handleClose} />
      </div>
    </>
  );
}
