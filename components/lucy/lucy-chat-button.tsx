'use client';

import { useState, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { LucyPanel } from './lucy-panel';

function getOrCreateSessionId() {
  if (typeof window === 'undefined') return '';
  let sid = sessionStorage.getItem('lucy_session_id');
  if (!sid) {
    sid = `lucy_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem('lucy_session_id', sid);
  }
  return sid;
}

export function LucyChatButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(false);

  useEffect(() => {
    setSessionId(getOrCreateSessionId());

    // Show hint bubble after 4s if not opened
    const timer = setTimeout(() => {
      if (!isOpen) setShowHint(true);
    }, 4000);

    const handleOpenChat = () => {
      setIsOpen(true);
      setShowHint(false);
      setHintDismissed(true);
    };

    window.addEventListener('lucy:open-chat', handleOpenChat);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('lucy:open-chat', handleOpenChat);
    };
  }, [isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    setShowHint(false);
    setHintDismissed(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const dismissHint = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowHint(false);
    setHintDismissed(true);
  };

  return (
    <>
      {/* Floating button area */}
      {isHomePage && (
        <div className="fixed bottom-6 right-4 sm:right-6 z-[60] flex flex-col items-end gap-2">
          {/* Hint bubble */}
          {showHint && !hintDismissed && !isOpen && (
            <div className="relative flex items-start gap-1.5 max-w-[210px]"
              style={{ animation: 'lucyFadeInUp 0.4s ease-out' }}>
              <div className="bg-white text-foreground text-xs font-medium px-3.5 py-2.5 rounded-2xl rounded-br-sm shadow-xl border border-[#EDD2F3]/50 leading-snug">
                ¡Hola! ¿Te ayudo a encontrar algo especial? ✨
              </div>
              <button
                onClick={dismissHint}
                className="p-0.5 rounded-full text-foreground/30 hover:text-foreground/60 mt-1 shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Main button — hides when panel is open */}
          <button
            onClick={handleOpen}
            aria-label="Abrir chat con Lucy"
            className={`relative group w-14 h-14 rounded-full shadow-2xl shadow-[#FFB4AC]/40 transition-all duration-300 hover:scale-110 active:scale-95 ${
              isOpen ? 'opacity-0 pointer-events-none scale-90' : 'opacity-100'
            }`}
          >
            {/* Gradient bg */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#FFB4AC] to-[#EDD2F3]" />

            {/* Pulse ring (while hint is active) */}
            {!hintDismissed && (
              <div className="absolute inset-0 rounded-full border-4 border-[#FFB4AC]/40 animate-ping" />
            )}

            {/* Spinning dashed ring */}
            <div className="absolute inset-[-3px] rounded-full border-2 border-dashed border-[#EDD2F3]/50 animate-spin"
              style={{ animationDuration: '10s' }} />

            {/* Icon */}
            <div className="relative z-10 w-full h-full flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white group-hover:rotate-12 transition-transform duration-300" />
            </div>

            {/* Online dot */}
            <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            </div>
          </button>
        </div>
      )}

      {/* Lucy panel */}
      <LucyPanel
        isOpen={isOpen}
        onClose={handleClose}
        sessionId={sessionId}
      />

      <style jsx global>{`
        @keyframes lucyFadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
