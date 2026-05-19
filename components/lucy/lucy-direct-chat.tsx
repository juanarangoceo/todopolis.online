'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, ArrowLeft } from 'lucide-react';
import { LucyAvatar } from './lucy-avatar';

interface Message {
  role: 'user' | 'model';
  text: string;
  imageUrl?: string;
}

interface LucyDirectChatProps {
  sessionId: string;
  onBack: () => void;
}

const WELCOME_MSG: Message = {
  role: 'model',
  text: 'Hola, soy Lucy, asesora de Todopolis. ¿Qué estás buscando hoy o qué te gustaría resolver?',
};

export function LucyDirectChat({ sessionId, onBack }: LucyDirectChatProps) {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MSG]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  // Reanudar conversación si el usuario reabre el navegador. Solo reemplaza
  // los mensajes si la sesión guardada tiene contenido real.
  useEffect(() => {
    if (!sessionId || historyLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/lucy-chat/history?sessionId=${encodeURIComponent(sessionId)}`);
        if (!res.ok) return;
        const data = await res.json();
        const prior: Message[] = Array.isArray(data?.messages) ? data.messages : [];
        // La conversación persistida ya incluye el mensaje de bienvenida porque
        // el API guarda el array completo. Usarla como fuente de verdad si trae
        // al menos un turno del usuario.
        const hasUserTurn = prior.some((m) => m.role === 'user');
        if (!cancelled && hasUserTurn) {
          setMessages(prior);
        }
      } catch {
        /* offline o sesión nueva: dejamos el welcome */
      } finally {
        if (!cancelled) setHistoryLoaded(true);
      }
    })();
    return () => { cancelled = true };
  }, [sessionId, historyLoaded]);

  const sendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    const newUserMsg: Message = { role: 'user', text };
    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/lucy-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, text: m.text })),
          sessionId,
          mode: 'direct',
        }),
      });

      const data = await res.json();
      
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Error fetching chat');
      }

      let newText = data.text ?? '¡Ay, se me cruzaron los cables! ¿Me repites? 🙈';
      let extractedImage: string | undefined = undefined;

      const imageMatch = newText.match(/<<<IMAGE:([^>]+)>>>/);
      if (imageMatch) {
         extractedImage = imageMatch[1].trim();
         newText = newText.replace(/<<<IMAGE:[^>]+>>>/g, '').trim();
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: newText,
          imageUrl: extractedImage,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'model', text: '¡Ay! Algo falló (quizás la conexión). Inténtalo de nuevo 🙈' },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, messages, isLoading, sessionId]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#EDD2F3]/30 bg-white/80 backdrop-blur-sm shrink-0">
        <button
          onClick={onBack}
          className="p-1.5 rounded-full hover:bg-[#FFD5E5]/40 text-foreground/60 hover:text-foreground transition-colors"
          aria-label="Volver"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <LucyAvatar size="sm" isTyping={isLoading} />
        <div>
          <p className="font-bold text-sm text-foreground leading-tight">Lucy</p>
          <p className="text-[11px] text-[#F43F5E] font-medium">
            {isLoading ? 'Escribiendo...' : 'Asesora Todopolis ✨'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ scrollbarWidth: 'none' }}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'model' && <LucyAvatar size="sm" className="mt-1 shrink-0" />}
            <div className="max-w-[82%]">
              <div
                className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-[#FFB4AC] to-[#EDD2F3] text-white rounded-br-sm'
                    : 'bg-white border border-[#EDD2F3]/40 text-foreground rounded-bl-sm shadow-sm'
                }`}
              >
                {msg.text}
              </div>
              {msg.imageUrl && (
                <div className="mt-2 rounded-xl overflow-hidden border border-[#EDD2F3]/40 shadow-sm sm:max-w-[200px] max-w-[150px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={msg.imageUrl} alt="Producto recomendado" className="w-full h-auto object-cover" />
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex gap-2 justify-start">
            <LucyAvatar size="sm" isTyping className="mt-1 shrink-0" />
            <div className="bg-white border border-[#EDD2F3]/40 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center h-4">
                <div className="w-1.5 h-1.5 bg-[#FFB4AC] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-[#FFB4AC] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-[#FFB4AC] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={sendMessage}
        className="flex gap-2 p-3 border-t border-[#EDD2F3]/30 bg-white/80 backdrop-blur-sm shrink-0"
        style={{ touchAction: 'manipulation' }}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escríbele a Lucy..."
          readOnly={isLoading}
          enterKeyHint="send"
          autoComplete="off"
          autoCorrect="on"
          spellCheck
          inputMode="text"
          className="flex-1 bg-[#FFF5F8] border border-[#EDD2F3]/50 rounded-full px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#FFB4AC]/50 placeholder:text-foreground/40"
          style={{ fontSize: '16px', touchAction: 'manipulation' }}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          onPointerDown={(e) => {
            // Evita que el input pierda foco antes del submit (iOS cierra el
            // teclado y la reflow puede tragarse el click).
            if (document.activeElement === inputRef.current) e.preventDefault()
          }}
          className="w-11 h-11 shrink-0 bg-gradient-to-br from-[#FFB4AC] to-[#EDD2F3] text-white rounded-full flex items-center justify-center active:scale-95 hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          aria-label="Enviar mensaje"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
