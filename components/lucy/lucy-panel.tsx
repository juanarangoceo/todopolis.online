'use client';

import { useState, useEffect } from 'react';
import { X, Wand2, MessageCircle, Sparkles } from 'lucide-react';
import { LucyAvatar } from './lucy-avatar';
import { LucyDirectChat } from './lucy-direct-chat';
import { LucyMagicForm } from './lucy-magic-form';

type PanelMode = 'welcome' | 'chat' | 'magic';

interface LucyPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  initialMode?: PanelMode;
}

export function LucyPanel({ isOpen, onClose, sessionId, initialMode = 'welcome' }: LucyPanelProps) {
  const [mode, setMode] = useState<PanelMode>(initialMode);

  // Sync mode when initialMode changes (triggered by header icons)
  useEffect(() => {
    if (isOpen) setMode(initialMode);
  }, [isOpen, initialMode]);

  const handleClose = () => {
    onClose();
    // Reset to welcome after animation
    setTimeout(() => setMode('welcome'), 300);
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

        {/* WELCOME SCREEN */}
        {mode === 'welcome' && (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center gap-6">
            {/* Lucy avatar big */}
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FFB4AC] to-[#EDD2F3] flex items-center justify-center shadow-xl">
                <Sparkles className="w-9 h-9 text-white" />
              </div>
              <div className="absolute inset-0 rounded-full border-4 border-[#FFB4AC]/20 animate-ping" />
            </div>

            <div>
              <h2 className="font-serif font-bold text-2xl text-foreground mb-1">
                ¡Hola! Soy Lucy ✨
              </h2>
              <p className="text-sm text-foreground/60 leading-relaxed max-w-xs">
                Tu asesora mágica de Todopolis. ¿Cómo te ayudo hoy?
              </p>
            </div>

            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button
                onClick={() => setMode('magic')}
                className="group flex items-center gap-3 px-5 py-4 rounded-2xl bg-gradient-to-r from-[#FFB4AC] to-[#EDD2F3] text-white font-bold shadow-lg shadow-[#FFB4AC]/30 hover:opacity-90 transition-opacity"
              >
                <Wand2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                <div className="text-left">
                  <p className="text-sm font-bold leading-tight">Cuestionario Mágico</p>
                  <p className="text-[11px] font-normal opacity-80">Encuentro tu producto ideal</p>
                </div>
              </button>

              <button
                onClick={() => setMode('chat')}
                className="group flex items-center gap-3 px-5 py-4 rounded-2xl bg-white border-2 border-[#EDD2F3]/50 hover:border-[#FFB4AC]/60 hover:bg-[#FFF5F8] transition-all"
              >
                <MessageCircle className="w-5 h-5 text-[#F43F5E] group-hover:scale-110 transition-transform" />
                <div className="text-left">
                  <p className="text-sm font-bold text-foreground leading-tight">Hablar con Lucy</p>
                  <p className="text-[11px] text-foreground/50">Chat directo y personalizado</p>
                </div>
              </button>
            </div>

            <p className="text-[11px] text-foreground/30">
              Powered by IA · Tu privacidad es sagrada
            </p>
          </div>
        )}

        {/* DIRECT CHAT */}
        {mode === 'chat' && (
          <LucyDirectChat sessionId={sessionId} onBack={() => setMode('welcome')} />
        )}

        {/* MAGIC FORM */}
        {mode === 'magic' && (
          <LucyMagicForm sessionId={sessionId} onBack={() => setMode('welcome')} />
        )}
      </div>
    </>
  );
}
